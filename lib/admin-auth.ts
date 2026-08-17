import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const SESSION_TTL_SECONDS = 8 * 60 * 60;
const SESSION_COOKIE = process.env.NODE_ENV === "production"
  ? "__Host-nei-admin-session"
  : "nei-admin-session";

function adminSecret() {
  return process.env.ADMIN_SECRET;
}

export function secureStringEqual(left: string, right: string) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function sign(timestamp: string, secret: string) {
  return createHmac("sha256", secret).update(`nei-admin:${timestamp}`).digest("base64url");
}

export function createAdminSessionToken(now = Date.now()) {
  const secret = adminSecret();
  if (!secret) throw new Error("ADMIN_SECRET is not configured");
  const timestamp = Math.floor(now / 1000).toString(36);
  return `${timestamp}.${sign(timestamp, secret)}`;
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now()) {
  const secret = adminSecret();
  if (!secret || !token) return false;
  const [timestamp, signature, extra] = token.split(".");
  if (!timestamp || !signature || extra) return false;
  const issuedAt = Number.parseInt(timestamp, 36);
  const age = Math.floor(now / 1000) - issuedAt;
  if (!Number.isFinite(issuedAt) || age < 0 || age > SESSION_TTL_SECONDS) return false;
  return secureStringEqual(signature, sign(timestamp, secret));
}

function hasBearerCredential(req: NextRequest) {
  const secret = adminSecret();
  const authorization = req.headers.get("authorization");
  return !!secret && !!authorization && secureStringEqual(authorization, `Bearer ${secret}`);
}

export function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  return !!origin && origin === req.nextUrl.origin;
}

export function isAdminAuthorized(req: NextRequest, mutation = false) {
  if (hasBearerCredential(req)) return true;
  if (mutation && !isSameOrigin(req)) return false;
  return verifyAdminSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export function isAdminPassword(password: unknown) {
  const secret = adminSecret();
  return typeof password === "string" && !!secret && secureStringEqual(password, secret);
}

export function setAdminSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
