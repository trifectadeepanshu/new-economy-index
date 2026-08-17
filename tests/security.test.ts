import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdminSessionToken,
  secureStringEqual,
  verifyAdminSessionToken,
} from "../lib/admin-auth";
import {
  findDuplicateSearchParam,
  findUnknownSearchParam,
  isIsoDate,
  isTicker,
} from "../lib/api-validation";

test("admin sessions are signed, expire, and reject tampering", () => {
  const previous = process.env.ADMIN_SECRET;
  process.env.ADMIN_SECRET = "test-admin-secret-with-enough-entropy";
  try {
    const now = Date.UTC(2026, 7, 17, 12);
    const token = createAdminSessionToken(now);
    assert.equal(verifyAdminSessionToken(token, now + 60_000), true);
    assert.equal(verifyAdminSessionToken(`${token}x`, now + 60_000), false);
    assert.equal(verifyAdminSessionToken(token, now + 9 * 60 * 60 * 1000), false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = previous;
  }
});

test("constant-time credential helper handles matching and mismatched values", () => {
  assert.equal(secureStringEqual("same-value", "same-value"), true);
  assert.equal(secureStringEqual("same-value", "other-value"), false);
  assert.equal(secureStringEqual("short", "much-longer"), false);
});

test("API validation rejects invalid dates, tickers, unknown keys, and duplicates", () => {
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2026-02-31"), false);
  assert.equal(isTicker("M&M"), true);
  assert.equal(isTicker("../../etc/passwd"), false);

  const params = new URLSearchParams("range=1Y&range=ALL&noise=1");
  assert.equal(findUnknownSearchParam(params, ["range"]), "noise");
  assert.equal(findDuplicateSearchParam(params, ["range"]), "range");
});
