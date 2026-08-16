import { performance } from "node:perf_hooks";

const PROFILES = {
  smoke: { rps: 2, durationSeconds: 10, maxConcurrency: 5 },
  baseline: { rps: 10, durationSeconds: 30, maxConcurrency: 30 },
  stress: { rps: 50, durationSeconds: 60, maxConcurrency: 150 },
  spike: { rps: 100, durationSeconds: 30, maxConcurrency: 300 },
};

const ENDPOINTS = [
  { name: "live", path: "/api/index/live?currency=inr", kind: "live" },
  { name: "live", path: "/api/index/live?currency=inr", kind: "live" },
  { name: "live", path: "/api/index/live?currency=inr", kind: "live" },
  { name: "live", path: "/api/index/live?currency=inr", kind: "live" },
  { name: "live", path: "/api/index/live?currency=inr", kind: "live" },
  { name: "home", path: "/", kind: "html" },
  { name: "home", path: "/", kind: "html" },
  { name: "history-1w", path: "/api/index/history?range=1W&includeSectors=1&benchmarks=1&portfolio=1", kind: "history" },
  { name: "history-1m", path: "/api/index/history?range=1M&includeSectors=1&benchmarks=1&portfolio=1", kind: "history" },
  { name: "history-1y", path: "/api/index/history?range=1Y&includeSectors=1&benchmarks=1&portfolio=1", kind: "history" },
  { name: "history-max", path: "/api/index/history?range=ALL&includeSectors=1&benchmarks=1&portfolio=1", kind: "history" },
  { name: "history-custom", path: "/api/index/history?from=2025-01-01&to=2025-12-31&includeSectors=1&benchmarks=1&portfolio=1", kind: "history" },
  { name: "prices-on-date", path: "/api/index/prices-on-date?date=2025-01-02", kind: "prices" },
  { name: "company", path: "/api/company/ETERNAL?currency=inr", kind: "company" },
];

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function percentile(sorted, value) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)];
}

function validateBody(kind, body) {
  if (kind === "html") return body.includes("NEI Top 50");

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    return false;
  }

  if (kind === "live") return Array.isArray(json.stocks) && typeof json.numCompanies === "number";
  if (kind === "history") return Array.isArray(json.data) && typeof json.range === "string";
  if (kind === "prices") return typeof json.date === "string" && typeof json.prices === "object";
  if (kind === "company") return typeof json.ticker === "string" && Array.isArray(json.financials);
  return true;
}

function assertAllowedTarget(url) {
  const host = new URL(url).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local && process.env.ALLOW_REMOTE_LOAD_TEST !== "1") {
    throw new Error(
      "Remote load tests are disabled. Set ALLOW_REMOTE_LOAD_TEST=1 only for an approved staging target."
    );
  }
}

const profileName = readArg("profile", process.env.LOAD_PROFILE ?? "smoke");
const profile = PROFILES[profileName];
if (!profile) throw new Error(`Unknown profile: ${profileName}`);

const baseUrl = readArg("base-url", process.env.BASE_URL ?? "http://127.0.0.1:3000");
assertAllowedTarget(baseUrl);

const rps = Number(readArg("rps", process.env.TARGET_RPS ?? profile.rps));
const durationSeconds = Number(
  readArg("duration", process.env.DURATION_SECONDS ?? profile.durationSeconds)
);
const maxConcurrency = Number(
  readArg("max-concurrency", process.env.MAX_CONCURRENCY ?? profile.maxConcurrency)
);
const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000);
const totalRequests = Math.max(1, Math.floor(rps * durationSeconds));
const intervalMs = 1_000 / rps;
const timings = [];
const byEndpoint = new Map();
const cacheStatuses = new Map();
const errors = [];
const active = new Set();

async function runRequest(index) {
  const endpoint = ENDPOINTS[index % ENDPOINTS.length];
  const startedAt = performance.now();
  let ok = false;
  let status = 0;

  try {
    const response = await fetch(new URL(endpoint.path, baseUrl), {
      headers: {
        "User-Agent": "nei-controlled-load-test/1.0",
        "X-NEI-Load-Test": profileName,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = response.status;
    const body = await response.text();
    ok = response.ok && validateBody(endpoint.kind, body);
    const cache = response.headers.get("x-nei-origin-cache") ?? "none";
    cacheStatuses.set(cache, (cacheStatuses.get(cache) ?? 0) + 1);
  } catch (error) {
    if (errors.length < 10) errors.push(`${endpoint.name}: ${error instanceof Error ? error.message : error}`);
  }

  const duration = performance.now() - startedAt;
  timings.push(duration);
  const metric = byEndpoint.get(endpoint.name) ?? { count: 0, failed: 0, timings: [] };
  metric.count += 1;
  metric.failed += ok ? 0 : 1;
  metric.timings.push(duration);
  byEndpoint.set(endpoint.name, metric);

  if (!ok && errors.length < 10 && status) errors.push(`${endpoint.name}: HTTP ${status} or invalid body`);
}

const testStartedAt = performance.now();
for (let index = 0; index < totalRequests; index += 1) {
  const dueAt = testStartedAt + index * intervalMs;
  const waitMs = dueAt - performance.now();
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));

  while (active.size >= maxConcurrency) await Promise.race(active);
  const request = runRequest(index).finally(() => active.delete(request));
  active.add(request);
}
await Promise.all(active);

const sorted = timings.toSorted((a, b) => a - b);
const failed = [...byEndpoint.values()].reduce((sum, metric) => sum + metric.failed, 0);
const elapsedSeconds = (performance.now() - testStartedAt) / 1_000;
const report = {
  target: baseUrl,
  profile: profileName,
  requestedRps: rps,
  achievedRps: Number((timings.length / elapsedSeconds).toFixed(2)),
  durationSeconds: Number(elapsedSeconds.toFixed(2)),
  requests: timings.length,
  failures: failed,
  failureRate: Number((failed / timings.length).toFixed(4)),
  latencyMs: {
    p50: Number(percentile(sorted, 0.5).toFixed(1)),
    p95: Number(percentile(sorted, 0.95).toFixed(1)),
    p99: Number(percentile(sorted, 0.99).toFixed(1)),
    max: Number((sorted.at(-1) ?? 0).toFixed(1)),
  },
  originCache: Object.fromEntries(cacheStatuses),
  endpoints: Object.fromEntries(
    [...byEndpoint].map(([name, metric]) => {
      const endpointTimings = metric.timings.toSorted((a, b) => a - b);
      return [name, {
        requests: metric.count,
        failures: metric.failed,
        p95Ms: Number(percentile(endpointTimings, 0.95).toFixed(1)),
      }];
    })
  ),
  sampleErrors: errors,
};

console.log(JSON.stringify(report, null, 2));

const maxFailureRate = Number(process.env.MAX_FAILURE_RATE ?? 0.005);
const maxP95Ms = Number(process.env.MAX_P95_MS ?? (profileName === "smoke" ? 3_000 : 800));
if (report.failureRate > maxFailureRate || report.latencyMs.p95 > maxP95Ms) process.exitCode = 1;
