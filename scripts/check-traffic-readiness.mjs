import { readFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL;
const failures = [];
const warnings = [];

const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
if (!Array.isArray(vercel.regions) || !vercel.regions.includes("sin1")) {
  failures.push("Vercel functions are not pinned to the Singapore region.");
}
if (vercel.fluid !== true) failures.push("Fluid compute is not enabled in vercel.json.");

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  try {
    const localEnvironment = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    const match = localEnvironment.match(/^DATABASE_URL=(.+)$/m);
    databaseUrl = match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
  } catch {
    // The production environment normally injects this value directly.
  }
}

if (databaseUrl) {
  const database = new URL(databaseUrl);
  if (!database.hostname.includes("-pooler")) {
    warnings.push("DATABASE_URL is not a Neon pooled connection string.");
  }
} else {
  warnings.push("DATABASE_URL is unavailable in this shell; verify the production value in Vercel.");
}

async function checkRemote() {
  const home = await fetch(new URL("/", baseUrl), { signal: AbortSignal.timeout(10_000) });
  if (!home.ok) failures.push(`Landing page returned HTTP ${home.status}.`);

  const live = await fetch(new URL("/api/index/live?currency=inr", baseUrl), {
    signal: AbortSignal.timeout(15_000),
  });
  if (!live.ok) failures.push(`Live endpoint returned HTTP ${live.status}.`);
  const cacheControl = live.headers.get("cache-control") ?? "";
  if (!cacheControl.includes("s-maxage") || !cacheControl.includes("stale-if-error")) {
    failures.push("Live endpoint is missing shared-cache or stale-if-error directives.");
  }
  const liveJson = await live.json().catch(() => null);
  if (!liveJson || !Array.isArray(liveJson.stocks) || typeof liveJson.numCompanies !== "number") {
    failures.push("Live endpoint returned an invalid payload.");
  }

  for (const range of ["1W", "1M", "1Y", "ALL"]) {
    const response = await fetch(
      new URL(`/api/index/history?range=${range}&includeSectors=1&benchmarks=1&portfolio=1`, baseUrl),
      { signal: AbortSignal.timeout(15_000) }
    );
    const json = await response.json().catch(() => null);
    if (!response.ok || !json || !Array.isArray(json.data)) {
      failures.push(`History range ${range} failed readiness validation.`);
    }
  }
}

if (baseUrl) await checkRemote();
else warnings.push("Set BASE_URL to include live HTTP and payload checks.");

console.log(JSON.stringify({ ready: failures.length === 0, failures, warnings }, null, 2));
if (failures.length) process.exitCode = 1;
