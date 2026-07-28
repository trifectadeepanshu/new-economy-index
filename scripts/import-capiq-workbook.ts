/**
 * One-time historical seed for the canonical CapIQ workbook cache.
 *
 * Do not use this for ongoing refreshes. The CMS owns constituent additions and
 * Yahoo-backed cron jobs append prices, shares, financials, profiles, and
 * analyst data going forward. This script is kept only to recreate or audit the
 * frozen 2020-to-mid-2026 CapIQ history if the database ever needs reseeding.
 *
 * Dry-run:
 *   npx tsx scripts/import-capiq-workbook.ts --workbook "/path/to/TLF New Economy Index Data_v2 (1).xlsx"
 *
 * Apply:
 *   npx tsx scripts/import-capiq-workbook.ts --workbook "/path/to/TLF New Economy Index Data_v2 (1).xlsx" --apply
 *
 * The import replaces current-universe price rows over the workbook's covered
 * date range, replaces current-universe share-count rows, and then recomputes
 * index snapshots with the same TypeScript engine used by the app.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { COMPANIES } from "../lib/companies";
import { ensureSchema, recomputeAndPersistIndex } from "../lib/db";
import { STOCK_SOURCE_CAPIQ } from "../lib/quote-snapshots";

const DEFAULT_WORKBOOK =
  "/Users/deepanshu/Downloads/TLF New Economy Index Data_new version_2.xlsx";
const STOCK_CHUNK_SIZE = 5_000;
const SHARE_CHUNK_SIZE = 500;
const STOCK_SOURCE_CHANGE_PCT_DIGITS = 6;

type Args = {
  workbook: string;
  apply: boolean;
  pruneExtra: boolean;
};

type WorkbookSheet = Map<string, string>;

type PriceRow = {
  date: string;
  ticker: string;
  close: number;
  changePct: number | null;
  providerSymbol: string;
};

type ShareRow = {
  ticker: string;
  asOf: string;
  shares: number;
};

type SqlClient = NeonQueryFunction<false, false>;

type ParsedWorkbook = {
  minPriceDate: string;
  maxPriceDate: string;
  lastEffectiveQuarter: string;
  priceRows: PriceRow[];
  shareRows: ShareRow[];
  workbookTickers: string[];
  universeMismatches: string[];
  missingPriceTickers: string[];
  missingShareTickers: string[];
  blockingMissingShareTickers: string[];
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    workbook: DEFAULT_WORKBOOK,
    apply: false,
    pruneExtra: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--workbook") {
      const next = argv[++i];
      if (!next) throw new Error("--workbook requires a path");
      args.workbook = next;
    } else if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--prune-extra") {
      args.pruneExtra = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    process.env[key] ??= value;
  }
}

function readZipEntry(workbook: string, entry: string) {
  return execFileSync("unzip", ["-p", workbook, entry], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function decodeXml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) =>
      String.fromCharCode(Number.parseInt(n, 16))
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function attr(xml: string, name: string) {
  const match = xml.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1] ?? null;
}

function textFromTags(xml: string, tag: string) {
  const values: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) values.push(decodeXml(match[1]));
  return values.join("");
}

function loadSharedStrings(workbook: string) {
  const xml = readZipEntry(workbook, "xl/sharedStrings.xml");
  const strings: string[] = [];
  const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) strings.push(textFromTags(match[1], "t"));
  return strings;
}

function sheetTargets(workbook: string) {
  const workbookXml = readZipEntry(workbook, "xl/workbook.xml");
  const relsXml = readZipEntry(workbook, "xl/_rels/workbook.xml.rels");
  const rels = new Map<string, string>();
  const relRe = /<Relationship\b([^>]*)\/>/g;
  let relMatch: RegExpExecArray | null;
  while ((relMatch = relRe.exec(relsXml))) {
    const id = attr(relMatch[1], "Id");
    const target = attr(relMatch[1], "Target");
    if (id && target) rels.set(id, target.startsWith("xl/") ? target : `xl/${target}`);
  }

  const targets = new Map<string, string>();
  const sheetRe = /<sheet\b([^>]*)\/>/g;
  let sheetMatch: RegExpExecArray | null;
  while ((sheetMatch = sheetRe.exec(workbookXml))) {
    const name = attr(sheetMatch[1], "name");
    const relId = attr(sheetMatch[1], "r:id");
    const target = relId ? rels.get(relId) : null;
    if (name && target) targets.set(name, target);
  }
  return targets;
}

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function colToNumber(col: string) {
  let value = 0;
  for (const char of col) value = value * 26 + char.charCodeAt(0) - 64;
  return value;
}

function splitCellRef(ref: string) {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return { row: Number(match[2]), col: colToNumber(match[1]) };
}

function loadSheet(workbook: string, target: string, sharedStrings: string[]): WorkbookSheet {
  const xml = readZipEntry(workbook, target);
  const sheet: WorkbookSheet = new Map();
  const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
  let match: RegExpExecArray | null;

  while ((match = cellRe.exec(xml))) {
    const ref = attr(match[1], "r");
    if (!ref) continue;
    const parsed = splitCellRef(ref);
    if (!parsed) continue;

    const type = attr(match[1], "t");
    const valueText = textFromTags(match[2], "v");
    const inlineText = textFromTags(match[2], "t");
    let value: string | null = null;

    if (type === "s" && valueText) {
      value = sharedStrings[Number(valueText)] ?? null;
    } else if (type === "inlineStr") {
      value = inlineText || null;
    } else if (valueText) {
      value = valueText;
    }

    if (value !== null) sheet.set(cellKey(parsed.row, parsed.col), value);
  }

  return sheet;
}

function getCell(sheet: WorkbookSheet, row: number, col: number) {
  return sheet.get(cellKey(row, col)) ?? null;
}

function excelDate(value: string | null) {
  if (!value) return null;
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const millis = (serial - 25_569) * 86_400 * 1_000;
  return new Date(millis).toISOString().slice(0, 10);
}

function quarterEndOnOrBefore(date: string) {
  let year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  let quarterEndMonth = Math.ceil(month / 3) * 3;
  let quarterEnd = new Date(Date.UTC(year, quarterEndMonth, 0)).toISOString().slice(0, 10);

  if (quarterEnd <= date) return quarterEnd;

  quarterEndMonth -= 3;
  if (quarterEndMonth <= 0) {
    quarterEndMonth += 12;
    year -= 1;
  }
  quarterEnd = new Date(Date.UTC(year, quarterEndMonth, 0)).toISOString().slice(0, 10);
  return quarterEnd;
}

function nextQuarterEnd(date: string) {
  let year = Number(date.slice(0, 4));
  let month = Number(date.slice(5, 7)) + 3;
  if (month > 12) {
    month -= 12;
    year += 1;
  }
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function finiteNumber(value: string | null) {
  if (!value || value === "NA") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTicker(rawTicker: string) {
  const ticker = rawTicker.includes(":") ? rawTicker.split(":").at(-1)! : rawTicker;
  return ticker.toUpperCase();
}

function roundChangePct(value: number) {
  const factor = 10 ** STOCK_SOURCE_CHANGE_PCT_DIGITS;
  return Math.round(value * factor) / factor;
}

function readHeaders(sheet: WorkbookSheet, expectedTickers: Set<string>) {
  const headers: Array<{ col: number; ticker: string; rawTicker: string }> = [];
  for (let col = 2; col <= 256; col++) {
    const raw = getCell(sheet, 2, col);
    if (!raw || raw === "0") continue;
    const ticker = normalizeTicker(raw);
    if (expectedTickers.has(ticker)) headers.push({ col, ticker, rawTicker: raw });
  }
  return headers;
}

function parseUniverse(sheet: WorkbookSheet) {
  const universe = new Map<string, { rawTicker: string; listedDate: string | null }>();
  for (let row = 3; row <= 300; row++) {
    const rawTicker = getCell(sheet, row, 2);
    if (!rawTicker) continue;
    universe.set(normalizeTicker(rawTicker), {
      rawTicker,
      listedDate: excelDate(getCell(sheet, row, 4)),
    });
  }
  return universe;
}

function parseWorkbook(workbook: string): ParsedWorkbook {
  if (!existsSync(workbook)) throw new Error(`Workbook not found: ${workbook}`);

  const expectedTickers = new Set(COMPANIES.map((company) => company.ticker));
  const sharedStrings = loadSharedStrings(workbook);
  const targets = sheetTargets(workbook);

  const requiredSheets = [
    "Universe Master",
    "CapIQ_Daily_Prices",
    "CapIQ_Quarterly_Shares",
  ];
  for (const sheetName of requiredSheets) {
    if (!targets.has(sheetName)) throw new Error(`Missing worksheet: ${sheetName}`);
  }

  const universe = parseUniverse(
    loadSheet(workbook, targets.get("Universe Master")!, sharedStrings)
  );
  const daily = loadSheet(workbook, targets.get("CapIQ_Daily_Prices")!, sharedStrings);
  const quarterlyShares = loadSheet(
    workbook,
    targets.get("CapIQ_Quarterly_Shares")!,
    sharedStrings
  );
  const headers = readHeaders(daily, expectedTickers);

  const universeMismatches: string[] = [];
  for (const company of COMPANIES) {
    const entry = universe.get(company.ticker);
    if (!entry) {
      universeMismatches.push(`${company.ticker}: missing from workbook universe`);
    } else if (entry.listedDate !== company.listedDate) {
      universeMismatches.push(
        `${company.ticker}: listing date app=${company.listedDate} workbook=${entry.listedDate}`
      );
    }
  }
  for (const ticker of universe.keys()) {
    if (!expectedTickers.has(ticker)) {
      universeMismatches.push(`${ticker}: present in workbook but missing from app universe`);
    }
  }

  const priceRows: PriceRow[] = [];
  const pricesByTicker = new Map<
    string,
    { providerSymbol: string; rows: Array<{ date: string; close: number }> }
  >();
  for (let row = 3; row <= 10_000; row++) {
    const date = excelDate(getCell(daily, row, 1));
    if (!date) continue;

    for (const header of headers) {
      const close = finiteNumber(getCell(daily, row, header.col));
      if (close === null || close <= 0) continue;
      let tickerPrices = pricesByTicker.get(header.ticker);
      if (!tickerPrices) {
        pricesByTicker.set(
          header.ticker,
          (tickerPrices = { providerSymbol: header.rawTicker, rows: [] })
        );
      }
      tickerPrices.rows.push({ date, close });
    }
  }

  for (const [ticker, { providerSymbol, rows }] of pricesByTicker) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
    let previousClose: number | null = null;
    for (const row of rows) {
      priceRows.push({
        date: row.date,
        ticker,
        close: row.close,
        changePct:
          previousClose !== null && previousClose !== 0
            ? roundChangePct((row.close / previousClose - 1) * 100)
            : null,
        providerSymbol,
      });
      previousClose = row.close;
    }
  }
  priceRows.sort((a, b) => a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker));

  const shareRows: ShareRow[] = [];
  const shareTickers = new Set<string>();
  let previousShareDate: string | null = null;
  for (let row = 3; row <= 500; row++) {
    let asOf = excelDate(getCell(quarterlyShares, row, 1));
    const rowValues = headers
      .map((header) => ({
        ticker: header.ticker,
        shares: finiteNumber(getCell(quarterlyShares, row, header.col)),
      }))
      .filter((entry) => entry.shares !== null && entry.shares > 0);

    // Some workbook rows use shared formula metadata without a cached value in
    // column A. The data row is still a normal quarter row, so infer the date
    // from the previous quarter-end rather than dropping all share counts.
    if (!asOf && previousShareDate && rowValues.length) {
      asOf = nextQuarterEnd(previousShareDate);
    }
    if (!asOf) continue;
    previousShareDate = asOf;

    for (const entry of rowValues) {
      shareRows.push({ ticker: entry.ticker, asOf, shares: Math.round(entry.shares!) });
      shareTickers.add(entry.ticker);
    }
  }
  shareRows.sort((a, b) => a.ticker.localeCompare(b.ticker) || a.asOf.localeCompare(b.asOf));

  const priceTickers = new Set(priceRows.map((row) => row.ticker));
  const missingPriceTickers = COMPANIES.map((company) => company.ticker).filter(
    (ticker) => !priceTickers.has(ticker)
  );
  const missingShareTickers = COMPANIES.map((company) => company.ticker).filter(
    (ticker) => !shareTickers.has(ticker)
  );
  const minPriceDate = priceRows[0]?.date;
  const maxPriceDate = priceRows.at(-1)?.date;
  if (!minPriceDate || !maxPriceDate) throw new Error("No price rows found in workbook");
  const lastEffectiveQuarter = quarterEndOnOrBefore(maxPriceDate);
  const blockingMissingShareTickers = COMPANIES.filter(
    (company) =>
      !shareTickers.has(company.ticker) && company.listedDate <= lastEffectiveQuarter
  ).map((company) => company.ticker);

  return {
    minPriceDate,
    maxPriceDate,
    lastEffectiveQuarter,
    priceRows,
    shareRows,
    workbookTickers: headers.map((header) => header.ticker),
    universeMismatches,
    missingPriceTickers,
    missingShareTickers,
    blockingMissingShareTickers,
  };
}

async function insertPriceRows(sql: SqlClient, rows: PriceRow[]) {
  for (let i = 0; i < rows.length; i += STOCK_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + STOCK_CHUNK_SIZE);
    await sql`
      INSERT INTO stock_snapshots (
        date,
        ticker,
        close_price,
        change_pct,
        source,
        provider_symbol,
        observed_at
      )
      SELECT * FROM unnest(
        ${chunk.map((row) => row.date)}::date[],
        ${chunk.map((row) => row.ticker)}::varchar[],
        ${chunk.map((row) => row.close)}::decimal[],
        ${chunk.map((row) => row.changePct)}::decimal[],
        ${chunk.map(() => STOCK_SOURCE_CAPIQ)}::varchar[],
        ${chunk.map((row) => row.providerSymbol)}::varchar[],
        ${chunk.map(() => new Date().toISOString())}::timestamptz[]
      ) AS t(date, ticker, close_price, change_pct, source, provider_symbol, observed_at)
      ON CONFLICT (date, ticker) DO UPDATE
        SET close_price = EXCLUDED.close_price,
            change_pct = EXCLUDED.change_pct,
            source = EXCLUDED.source,
            provider_symbol = EXCLUDED.provider_symbol,
            observed_at = EXCLUDED.observed_at
    `;
  }
}

async function insertShareRows(sql: SqlClient, rows: ShareRow[]) {
  for (let i = 0; i < rows.length; i += SHARE_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + SHARE_CHUNK_SIZE);
    await sql`
      INSERT INTO share_counts (ticker, as_of, shares, source)
      SELECT * FROM unnest(
        ${chunk.map((row) => row.ticker)}::varchar[],
        ${chunk.map((row) => row.asOf)}::date[],
        ${chunk.map((row) => row.shares)}::numeric[],
        ${chunk.map(() => "excel-capiq")}::varchar[]
      ) AS t(ticker, as_of, shares, source)
      ON CONFLICT (ticker, as_of) DO UPDATE
        SET shares = EXCLUDED.shares,
            source = EXCLUDED.source
    `;
  }
}

async function applyImport(parsed: ParsedWorkbook, pruneExtra: boolean) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const sql = neon(databaseUrl);
  const tickers = COMPANIES.map((company) => company.ticker);
  const shareTickers = [...new Set(parsed.shareRows.map((row) => row.ticker))];

  await ensureSchema();

  await sql`
    DELETE FROM stock_snapshots
    WHERE ticker IN (SELECT * FROM unnest(${tickers}::varchar[]))
      AND date >= ${parsed.minPriceDate}::date
      AND date <= ${parsed.maxPriceDate}::date
  `;
  await sql`
    DELETE FROM share_counts
    WHERE ticker IN (SELECT * FROM unnest(${shareTickers}::varchar[]))
  `;

  if (pruneExtra) {
    await sql`
      DELETE FROM stock_snapshots
      WHERE ticker NOT IN (SELECT * FROM unnest(${tickers}::varchar[]))
    `;
    await sql`
      DELETE FROM share_counts
      WHERE ticker NOT IN (SELECT * FROM unnest(${tickers}::varchar[]))
    `;
  }

  await insertPriceRows(sql, parsed.priceRows);
  await insertShareRows(sql, parsed.shareRows);

  return recomputeAndPersistIndex();
}

function printSummary(parsed: ParsedWorkbook, apply: boolean, pruneExtra: boolean) {
  const priceTickers = new Set(parsed.priceRows.map((row) => row.ticker));
  const shareTickers = new Set(parsed.shareRows.map((row) => row.ticker));

  console.log("CapIQ workbook import summary");
  console.log(`  workbook tickers: ${parsed.workbookTickers.length}`);
  console.log(`  app universe: ${COMPANIES.length}`);
  console.log(
    `  price rows: ${parsed.priceRows.length} across ${priceTickers.size} tickers ` +
      `(${parsed.minPriceDate} -> ${parsed.maxPriceDate})`
  );
  console.log(`  last effective quarter in workbook: ${parsed.lastEffectiveQuarter}`);
  console.log(`  share rows: ${parsed.shareRows.length} across ${shareTickers.size} tickers`);
  console.log(`  mode: ${apply ? "apply" : "dry-run"}`);
  console.log(`  prune extra DB tickers: ${pruneExtra ? "yes" : "no"}`);

  if (parsed.universeMismatches.length) {
    console.log("\nUniverse mismatches:");
    for (const mismatch of parsed.universeMismatches) console.log(`  - ${mismatch}`);
  }
  if (parsed.missingPriceTickers.length) {
    console.log(`\nMissing price tickers: ${parsed.missingPriceTickers.join(", ")}`);
  }
  if (parsed.missingShareTickers.length) {
    console.log(
      `\nMissing share tickers in workbook cache: ${parsed.missingShareTickers.join(", ")}`
    );
    console.log("Existing DB share rows for these tickers will be preserved on apply.");
  }
  if (parsed.blockingMissingShareTickers.length) {
    console.log(
      `\nBlocking missing share tickers: ${parsed.blockingMissingShareTickers.join(", ")}`
    );
  }
  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply to replace DB inputs and recompute.");
  }
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const parsed = parseWorkbook(args.workbook);
  printSummary(parsed, args.apply, args.pruneExtra);

  if (parsed.universeMismatches.length) {
    throw new Error("Workbook universe does not match lib/companies.ts");
  }
  if (parsed.missingPriceTickers.length || parsed.blockingMissingShareTickers.length) {
    throw new Error("Workbook has missing canonical price/share inputs");
  }
  if (!args.apply) return;

  const result = await applyImport(parsed, args.pruneExtra);
  console.log(
    `\nImport applied. Latest index: ${result.latestDate} = ${result.latestValue} ` +
      `(n=${result.numCompanies})`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
