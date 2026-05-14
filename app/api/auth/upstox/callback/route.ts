import { NextRequest, NextResponse } from "next/server";
import { setUpstoxToken } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/auth/upstox/callback?code=... → exchange code for token, store in DB
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const clientId = process.env.UPSTOX_API_KEY;
  const clientSecret = process.env.UPSTOX_API_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "Missing Upstox env vars" }, { status: 500 });
  }

  const tokenRes = await fetch("https://api.upstox.com/v2/login/authorization/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json({ error: `Token exchange failed: ${text}` }, { status: 502 });
  }

  const data = await tokenRes.json();
  const accessToken: string = data.access_token;

  if (!accessToken) {
    return NextResponse.json({ error: "No access_token in response", data }, { status: 502 });
  }

  await setUpstoxToken(accessToken);

  // Redirect back to home with success flag
  return NextResponse.redirect(new URL("/?auth=success", req.url));
}
