import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "NOT SET";
  const masked = url.replace(/:([^:@]+)@/, ":***@");
  const fromDate = "2025-05-14";
  const toDate = "2026-05-14";
  try {
    const sql = neon(url);
    const [idx, stk, histRows] = await Promise.all([
      sql`SELECT COUNT(*) as count, MIN(date)::text as min, MAX(date)::text as max FROM index_snapshots`,
      sql`SELECT COUNT(*) as count FROM stock_snapshots`,
      sql`SELECT date::text, value::float FROM index_snapshots WHERE date >= ${fromDate} AND date <= ${toDate} ORDER BY date ASC LIMIT 3`,
    ]);
    return NextResponse.json({ db: masked, index_snapshots: idx[0], stock_snapshots: stk[0], sample_1y: histRows });
  } catch (e: any) {
    return NextResponse.json({ db: masked, error: e.message });
  }
}
