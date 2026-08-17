import http from "k6/http";
import exec from "k6/execution";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3000";
const PROFILE = __ENV.LOAD_PROFILE || "smoke";

const PROFILES = {
  smoke: { executor: "constant-arrival-rate", rate: 1, timeUnit: "1s", duration: "15s", preAllocatedVUs: 2, maxVUs: 5 },
  baseline: { executor: "constant-arrival-rate", rate: 10, timeUnit: "1s", duration: "3m", preAllocatedVUs: 20, maxVUs: 50 },
  stress: { executor: "ramping-arrival-rate", startRate: 10, timeUnit: "1s", preAllocatedVUs: 50, maxVUs: 500, stages: [{ target: 50, duration: "2m" }, { target: 100, duration: "2m" }, { target: 100, duration: "1m" }] },
  spike: { executor: "ramping-arrival-rate", startRate: 1, timeUnit: "1s", preAllocatedVUs: 100, maxVUs: 1000, stages: [{ target: 200, duration: "30s" }, { target: 200, duration: "1m" }, { target: 10, duration: "30s" }] },
  soak: { executor: "constant-arrival-rate", rate: 25, timeUnit: "1s", duration: "30m", preAllocatedVUs: 50, maxVUs: 200 },
};

const PATHS = [
  "/api/index/live?currency=inr",
  "/api/index/live?currency=inr",
  "/api/index/live?currency=inr",
  "/api/index/live?currency=inr",
  "/api/index/live?currency=inr",
  "/",
  "/",
  "/api/index/history?range=1W&includeSectors=1&benchmarks=1&portfolio=1",
  "/api/index/history?range=1M&includeSectors=1&benchmarks=1&portfolio=1",
  "/api/index/history?range=1Y&includeSectors=1&benchmarks=1&portfolio=1",
  "/api/index/history?range=ALL&includeSectors=1&benchmarks=1&portfolio=1",
  "/api/index/history?from=2025-01-01&to=2025-12-31&includeSectors=1&benchmarks=1&portfolio=1",
  "/api/index/prices-on-date?date=2025-01-02",
  "/api/company/ETERNAL?currency=inr",
];

export const options = {
  scenarios: { traffic: PROFILES[PROFILE] || PROFILES.smoke },
  thresholds: {
    http_req_failed: ["rate<0.005"],
    http_req_duration: PROFILE === "smoke"
      ? ["p(95)<3000"]
      : ["p(95)<800", "p(99)<1500"],
    checks: ["rate>0.995"],
  },
};

export function setup() {
  const host = new URL(BASE_URL).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local && __ENV.ALLOW_REMOTE_LOAD_TEST !== "1") {
    throw new Error("Set ALLOW_REMOTE_LOAD_TEST=1 only for an approved staging load test.");
  }
}

export default function trafficScenario() {
  const path = PATHS[exec.scenario.iterationInTest % PATHS.length];
  const response = http.get(`${BASE_URL}${path}`, {
    headers: {
      "User-Agent": "nei-k6-load-test/1.0",
      "X-NEI-Load-Test": PROFILE,
    },
    tags: { endpoint: path.split("?")[0] },
    timeout: "10s",
  });

  check(response, {
    "status is 200": (res) => res.status === 200,
    "response is nonempty": (res) => Boolean(res.body && res.body.length > 20),
  });
}
