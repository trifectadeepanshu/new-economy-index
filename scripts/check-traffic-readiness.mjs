import { readFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL;
const failures = [];
const warnings = [];

const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
if (!Array.isArray(vercel.regions) || !vercel.regions.includes("sin1")) {
  failures.push("Vercel functions are not pinned to the Singapore region.");
}
if (vercel.fluid !== true) failures.push("Fluid compute is not enabled in vercel.json.");

const databaseUrls = {
  DATABASE_READ_URL: process.env.DATABASE_READ_URL,
  DATABASE_WRITE_URL: process.env.DATABASE_WRITE_URL,
};
if (!databaseUrls.DATABASE_READ_URL && !databaseUrls.DATABASE_WRITE_URL) {
  try {
    const localEnvironment = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const name of Object.keys(databaseUrls)) {
      const match = localEnvironment.match(new RegExp(`^${name}=(.+)$`, "m"));
      databaseUrls[name] = match?.[1]?.trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // The production environment normally injects this value directly.
  }
}

for (const [name, value] of Object.entries(databaseUrls)) {
  if (!value) {
    warnings.push(`${name} is unavailable in this shell; verify the production value in Vercel.`);
    continue;
  }
  const database = new URL(value);
  if (!database.hostname.includes("-pooler")) {
    failures.push(`${name} is not a Neon pooled connection string.`);
  }
}

const requiredSecurityHeaders = {
  "content-security-policy": "default-src",
  "cross-origin-opener-policy": "same-origin",
  "permissions-policy": "camera=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

async function checkRemote() {
  const home = await fetch(new URL("/", baseUrl), { signal: AbortSignal.timeout(10_000) });
  if (!home.ok) failures.push(`Landing page returned HTTP ${home.status}.`);
  for (const [name, expected] of Object.entries(requiredSecurityHeaders)) {
    if (!(home.headers.get(name) ?? "").includes(expected)) {
      failures.push(`Landing page is missing the expected ${name} security header.`);
    }
  }

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
