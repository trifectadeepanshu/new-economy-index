import { NextRequest, NextResponse } from "next/server";
import {
  ensureSchema,
  listConstituents,
  recomputeAndPersistIndex,
  upsertConstituent,
  type ConstituentInput,
} from "@/lib/db";
import { onboardConstituent, type OnboardSummary } from "@/lib/onboard";
import { isBearerAuthorized } from "@/lib/http-auth";
import { SECTORS } from "@/lib/companies";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: HEADERS });
}

export async function GET(req: NextRequest) {
  if (!isBearerAuthorized(req.headers, process.env.CRON_SECRET)) return unauthorized();
  try {
    await ensureSchema();
    return NextResponse.json({ constituents: await listConstituents() }, { headers: HEADERS });
  } catch (err) {
    console.error("[/api/admin/constituents] GET", err);
    return NextResponse.json({ error: "Failed to load constituents" }, { status: 500, headers: HEADERS });
  }
}

function parseBody(body: unknown): ConstituentInput | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Invalid body" };
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const ticker = str(b.ticker).toUpperCase();
  const name = str(b.name);
  const displayName = str(b.displayName) || name;
  const yfTicker = str(b.yfTicker) || `${ticker}.NS`;
  const sector = str(b.sector);
  const listedDate = str(b.listedDate);

  if (!ticker) return { error: "Ticker is required" };
  if (!name) return { error: "Name is required" };
  if (!SECTORS.includes(sector as (typeof SECTORS)[number])) {
    return { error: `Sector must be one of: ${SECTORS.join(", ")}` };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(listedDate)) {
    return { error: "Listing date must be yyyy-mm-dd" };
  }
  const ipoRaw = b.ipoPrice;
  const ipoPrice =
    ipoRaw === null || ipoRaw === "" || ipoRaw === undefined ? null : Number(ipoRaw);
  if (ipoPrice !== null && !Number.isFinite(ipoPrice)) return { error: "IPO price must be a number" };

  return {
    ticker,
    name,
    displayName,
    yfTicker,
    sector,
    listedDate,
    ipoPrice,
    isPortfolio: Boolean(b.isPortfolio),
    isActive: b.isActive === undefined ? true : Boolean(b.isActive),
  };
}

export async function POST(req: NextRequest) {
  if (!isBearerAuthorized(req.headers, process.env.CRON_SECRET)) return unauthorized();
  try {
    await ensureSchema();
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const parsed = parseBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400, headers: HEADERS });
    }

    // Onboard (price/share/detail backfill) when the ticker is new, or when a
    // re-backfill is explicitly requested. Do it before adding a new ticker so a
    // bad symbol is rejected up front rather than breaking the daily cron.
    const isNew = !(await listConstituents()).some((r) => r.ticker === parsed.ticker);
    const shouldOnboard = isNew || body?.backfill === true;

    let onboard: OnboardSummary | null = null;
    if (shouldOnboard) {
      try {
        onboard = await onboardConstituent(parsed);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Onboarding failed" },
          { status: 400, headers: HEADERS }
        );
      }
    }

    await upsertConstituent(parsed);
    await recomputeAndPersistIndex();

    return NextResponse.json(
      { ok: true, ticker: parsed.ticker, onboard, constituents: await listConstituents() },
      { headers: HEADERS }
    );
  } catch (err) {
    console.error("[/api/admin/constituents] POST", err);
    return NextResponse.json({ error: "Failed to save constituent" }, { status: 500, headers: HEADERS });
  }
}
