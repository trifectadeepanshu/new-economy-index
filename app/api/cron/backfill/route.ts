import { NextRequest, NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { fetchHistorical } from "@/lib/yahoo-finance";
import { upsertStockSnapshot, upsertIndexSnapshot, ensureSchema } from "@/lib/db";
import { format, eachDayOfInterval, parseISO } from "date-fns";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5-minute Vercel function limit

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const fromDate = new Date("2021-01-01");
  const toDate = new Date();

  // Step 1: Fetch historical prices for all companies
  const allPrices: Record<string, Record<string, number>> = {}; // ticker -> date -> close

  for (const company of COMPANIES) {
    const effectiveFrom = company.listedDate > "2021-01-01"
      ? parseISO(company.listedDate)
      : fromDate;

    const rows = await fetchHistorical(company.yfTicker, effectiveFrom, toDate);
    allPrices[company.ticker] = {};
    for (const r of rows) {
      allPrices[company.ticker][r.date] = r.close;
    }

    // Persist stock snapshots
    for (const r of rows) {
      await upsertStockSnapshot(r.date, company.ticker, r.close, null);
    }
  }

  // Step 2: For each trading day, calculate index value
  const days = eachDayOfInterval({ start: fromDate, end: toDate });

  // Build base prices: earliest available close per ticker
  const basePrices: Record<string, number> = {};
  for (const [ticker, dateMap] of Object.entries(allPrices)) {
    const sortedDates = Object.keys(dateMap).sort();
    if (sortedDates.length > 0) {
      basePrices[ticker] = dateMap[sortedDates[0]];
    }
  }

  let savedCount = 0;
  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");

    const eligible = COMPANIES.filter(
      (c) =>
        c.listedDate <= dateStr &&
        basePrices[c.ticker] !== undefined &&
        allPrices[c.ticker]?.[dateStr] !== undefined
    );

    if (eligible.length < 3) continue;

    const avgRatio =
      eligible.reduce((s, c) => s + allPrices[c.ticker][dateStr] / basePrices[c.ticker], 0) /
      eligible.length;

    const indexValue = 1000 * avgRatio;
    await upsertIndexSnapshot(dateStr, indexValue, null, eligible.length);
    savedCount++;
  }

  return NextResponse.json({
    message: "Backfill complete",
    daysProcessed: savedCount,
    companiesProcessed: COMPANIES.length,
  });
}
