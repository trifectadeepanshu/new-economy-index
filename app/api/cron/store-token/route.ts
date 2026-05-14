import { NextRequest, NextResponse } from "next/server";
import { setUpstoxToken } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const token: unknown = body?.token;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
  }

  await setUpstoxToken(token);
  return NextResponse.json({ message: "Token stored successfully" });
}
