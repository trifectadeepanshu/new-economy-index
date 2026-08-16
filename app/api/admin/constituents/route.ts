import { NextRequest, NextResponse } from "next/server";
import {
  listConstituents,
  recomputeAndPersistIndex,
  upsertConstituent,
  type ConstituentInput,
} from "@/lib/db";
import { onboardConstituent, type OnboardSummary } from "@/lib/onboard";
import { refreshConstituentData } from "@/lib/data-refresh";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { isIsoDate, isTicker } from "@/lib/api-validation";
import { SECTORS } from "@/lib/companies";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEADERS = { "Cache-Control": "no-store" };

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: HEADERS });
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return unauthorized();
  try {
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

  if (!isTicker(ticker)) return { error: "Ticker must be 1-30 letters, numbers, dots, ampersands, or hyphens" };
  if (!name || name.length > 200) return { error: "Name must be 1-200 characters" };
  if (displayName.length > 200) return { error: "Display name must be at most 200 characters" };
  if (!/^[A-Z0-9.^&=_-]{1,40}$/i.test(yfTicker)) return { error: "Invalid Yahoo ticker" };
  if (!SECTORS.includes(sector as (typeof SECTORS)[number])) {
    return { error: `Sector must be one of: ${SECTORS.join(", ")}` };
  }
  if (!isIsoDate(listedDate)) {
    return { error: "Listing date must be yyyy-mm-dd" };
  }
  const ipoRaw = b.ipoPrice;
  const ipoPrice =
    ipoRaw === null || ipoRaw === "" || ipoRaw === undefined ? null : Number(ipoRaw);
  if (ipoPrice !== null && (!Number.isFinite(ipoPrice) || ipoPrice <= 0 || ipoPrice > 1_000_000_000)) {
    return { error: "IPO price must be a positive number" };
  }

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
  if (!isAdminAuthorized(req, true)) return unauthorized();
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const parsed = parseBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400, headers: HEADERS });
    }

    // Onboard (price/share/detail backfill) when the ticker is new, or when a
    // re-backfill is explicitly requested. Do it before adding a new ticker so a
    // bad symbol is rejected up front rather than breaking the daily cron.
    const existingConstituents = await listConstituents();
    const isNew = !existingConstituents.some((r) => r.ticker === parsed.ticker);
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

    // A genuinely new ticker creates a new rebalance date (its first-priced day),
    // which the divisor engine chain-links from the rest of the universe's
    // point-in-time shares *at that same date*. Without refreshing everyone
    // else's shares here too, they'd silently carry forward whatever their last
    // known figure was — sometimes months stale — permanently distorting the
    // divisor from this rebalance onward. (recomputeAndPersistIndex runs inside
    // refreshConstituentData, so only call it separately on the backfill-only path.)
    if (isNew) {
      const others = existingConstituents.filter((r) => r.isActive);
      await refreshConstituentData(others, {
        includeShares: true,
        includeFinancials: false,
        includeMeta: false,
      });
    } else {
      await recomputeAndPersistIndex();
    }

    return NextResponse.json(
      { ok: true, ticker: parsed.ticker, onboard, constituents: await listConstituents() },
      { headers: HEADERS }
    );
  } catch (err) {
    console.error("[/api/admin/constituents] POST", err);
    return NextResponse.json({ error: "Failed to save constituent" }, { status: 500, headers: HEADERS });
  }
}
