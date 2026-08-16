import assert from "node:assert/strict";
import test from "node:test";
import { getNextPollDelay } from "../hooks/useIndexData";

test("market-hours polling starts at 30 seconds", () => {
  assert.equal(
    getNextPollDelay({ marketOpen: true, failureCount: 0, random: () => 0.5 }),
    30_000
  );
});

test("polling backs off exponentially after failures", () => {
  assert.equal(
    getNextPollDelay({ marketOpen: true, failureCount: 2, random: () => 0.5 }),
    120_000
  );
  assert.equal(
    getNextPollDelay({ marketOpen: true, failureCount: 20, random: () => 0.5 }),
    300_000
  );
});

test("polling jitter spreads clients across the refresh window", () => {
  assert.equal(
    getNextPollDelay({ marketOpen: true, failureCount: 0, random: () => 0 }),
    24_000
  );
  assert.equal(
    getNextPollDelay({ marketOpen: true, failureCount: 0, random: () => 1 }),
    36_000
  );
});

test("closed-market polling falls back to the FX refresh cadence", () => {
  assert.equal(
    getNextPollDelay({ marketOpen: false, failureCount: 0, random: () => 0.5 }),
    15 * 60 * 1000
  );
});
