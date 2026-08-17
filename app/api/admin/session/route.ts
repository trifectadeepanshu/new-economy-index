import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  isAdminAuthorized,
  isAdminPassword,
  isSameOrigin,
  setAdminSessionCookie,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: isAdminAuthorized(req) }, { headers: HEADERS });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: HEADERS });
  }
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  if (!body || !isAdminPassword(body.password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: HEADERS });
  }
  const response = NextResponse.json({ authenticated: true }, { headers: HEADERS });
  setAdminSessionCookie(response);
  return response;
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: HEADERS });
  }
  const response = NextResponse.json({ authenticated: false }, { headers: HEADERS });
  clearAdminSessionCookie(response);
  return response;
}
