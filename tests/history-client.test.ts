import assert from "node:assert/strict";
import test from "node:test";
import { getIndexHistory } from "../components/index-chart/historyClient";

test("identical history requests share one in-flight fetch", async () => {
  const originalFetch = globalThis.fetch;
  const url = `/api/index/history?test=${Date.now()}`;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    await Promise.resolve();
    return Response.json({ range: "ALL", data: [] });
  };

  try {
    const [first, second] = await Promise.all([
      getIndexHistory(url),
      getIndexHistory(url),
    ]);

    assert.equal(calls, 1);
    assert.strictEqual(first, second);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("failed history requests are evicted so a retry can recover", async () => {
  const originalFetch = globalThis.fetch;
  const url = `/api/index/history?retry=${Date.now()}`;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? new Response(null, { status: 503 })
      : Response.json({ range: "ALL", data: [] });
  };

  try {
    await assert.rejects(getIndexHistory(url), /HTTP 503/);
    const recovered = await getIndexHistory(url);

    assert.equal(calls, 2);
    assert.equal(recovered.range, "ALL");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
