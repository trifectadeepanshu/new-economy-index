import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "NOT SET";
  const masked = url.replace(/:([^:@]+)@/, ":***@");
  try {
    const sql = neon(url);
    const [idx, stk] = await Promise.all([
      sql`SELECT COUNT(*) as count, MIN(date)::text as min, MAX(date)::text as max FROM index_snapshots`,
      sql`SELECT COUNT(*) as count FROM stock_snapshots`,
    ]);
    return NextResponse.json({ db: masked, index_snapshots: idx[0], stock_snapshots: stk[0] });
  } catch (e: any) {
    return NextResponse.json({ db: masked, error: e.message });
  }
}
