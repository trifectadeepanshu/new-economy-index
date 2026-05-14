import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/auth/upstox → redirect to Upstox OAuth dialog
export async function GET() {
  const clientId = process.env.UPSTOX_API_KEY;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "UPSTOX_API_KEY or UPSTOX_REDIRECT_URI env vars not set" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  return NextResponse.redirect(
    `https://api.upstox.com/v2/login/authorization/dialog?${params}`
  );
}
