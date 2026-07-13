import assert from "node:assert/strict";
import test from "node:test";
import { isBearerAuthorized } from "../lib/http-auth";

test("bearer auth requires a configured secret", () => {
  const headers = new Headers({ authorization: "Bearer secret" });

  assert.equal(isBearerAuthorized(headers, undefined), false);
  assert.equal(isBearerAuthorized(headers, ""), false);
});

test("bearer auth rejects missing or mismatched tokens", () => {
  assert.equal(isBearerAuthorized(new Headers(), "secret"), false);
  assert.equal(
    isBearerAuthorized(new Headers({ authorization: "Bearer wrong" }), "secret"),
    false
  );
});

test("bearer auth accepts the exact token", () => {
  const headers = new Headers({ authorization: "Bearer secret" });

  assert.equal(isBearerAuthorized(headers, "secret"), true);
});
