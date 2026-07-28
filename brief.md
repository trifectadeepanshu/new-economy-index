# NEI — Engineering Brief & Handoff

Handoff doc for continuing the "CMS-add-only, Yahoo-automated data" work on
**India's New Economy Index** (`new-economy-index.vercel.app`).

---

## 1. What the project is

A single-page Next.js (App Router) site that publishes a market-cap-weighted
stock index tracking VC/PE-backed, listed Indian "new economy" companies.

- **Stack:** Next.js 16 (App Router, TS), **Neon** serverless Postgres, deployed
  on **Vercel**. Not Supabase, no Python pipeline (the one `.py` is deprecated).
- **Scheduling:** Vercel Cron (`vercel.json` -> `/api/cron/snapshot`, weekdays
  11:00 UTC; `/api/cron/refresh`, Sundays 03:00 UTC) + two GitHub Actions
  (`.github/workflows/ci.yml`, `cron-monitor.yml`).
- **Index methodology (canonical):** base **1,000 at 2020-12-31**; holds the
  **top 50 by market cap** (universe is **53**); reconstituted at quarter-ends
  **and each company's first-priced day**; a new company is **seeded at its IPO
  price on the trading day before listing** so the listing-day pop counts;
  market-cap divisor is chain-linked; **point-in-time shares**. Latest value is
  ~**2,308** (base 1,000 · Dec-2020). Engine: `lib/index-engine.ts`.
- **Index level is currency-independent** (a pure number like Nifty). Only
  per-stock prices/market caps convert INR↔USD (`lib/fx.ts`, `USDINR=X`).
- **Benchmark:** **Nifty 500** (`^CRSLDX`) — `lib/benchmarks.ts`.

The index was validated to reproduce a canonical CapIQ workbook ("TLF New
Economy Index Data") to the penny. That workbook was imported **once**
(`scripts/import-capiq-workbook.ts`) and its data lives frozen in the DB; it is
**not** a live dependency.

---

## 2. The problem we set out to solve

Originally the universe was a hardcoded 53-company array in `lib/companies.ts`,
and refreshing shares meant re-importing the CapIQ workbook by hand. Goal:

> **The only manual step is: when a company IPOs, add it in a CMS. Everything
> else (prices, shares, financials, reconstitution) is automated on Yahoo.**

### Data-source decisions (already made — don't relitigate)
- **Yahoo Finance is the single source.** Verified full coverage of all 53
  (incl. micro-caps). It's **unofficial** (no API key/SLA; can rate-limit) —
  accepted, mitigated by retries + cron logging; kept swappable behind
  `lib/yahoo-provider.ts`.
- **Yahoo has point-in-time shares back to ~FY2022** (via `fundamentals-timeseries`,
  paged backward — it caps ~4 periods per request). It does **not** have
  2020–2021 shares. So: **keep the frozen CapIQ history (2020→mid-2026) as-is**;
  Yahoo takes over going forward. Re-deriving all history from Yahoo would shift
  the index ~1.5% (shares) — rejected. This is **option (A): keep exact history,
  Yahoo forward.**
- Rejected: EODHD (cost), SerpApi/Google Finance (coarse history, per-call cost,
  thin fundamentals).
- Auth for the CMS: reuse the existing **bearer secret** (`CRON_SECRET`).

---

## 3. What has been done

### Recent bug fixes (context)
- Rebuilt the index on the canonical 53-name workbook + IPO-pop entry (the big
  correctness fix: was reading ~1,767 vs canonical 2,267).
- Fixed day-change reference (was collapsing to ~0 after the daily cron).
- Chart: NEI shows its **true level**; benchmarks + Trifecta rebased to meet the
  NEI at the range start; "Base 1,000" reference line only on the ALL range.
- Asset turnover uses **TTM revenue / assets** (`lib/company-detail.ts`).
- Copy update per RK review (title dropped "Top 50"; hero "live view"; count
  reads 50 everywhere via `INDEX_SIZE`).
- Portfolio companies flagged with the **Trifecta mark** (`/trifecta-mark.png`),
  not a "P" badge.
- **Fixed CI** (was red): stale asset-turnover test + test mocks missing new
  payload fields.

### Phase 1 — DB-backed universe + CMS  ✅ (on `main`)
- New **`constituents`** table (`ensureSchema` in `lib/db.ts`); seeded from
  `companies.ts` via `scripts/seed-constituents.ts` (53 active, 10 Trifecta).
- **`lib/universe.ts`** → `getUniverse()` (60s cache, DB with `companies.ts`
  fallback) + `invalidateUniverse()`.
- Engine now reads the universe from the DB: `db.ts` `loadEngineMembers()` feeds
  `getIndexHistoryBundle` + `recomputeAndPersistIndex`. **Verified byte-identical
  (2,308.71, n=50) before/after — zero drift.**
- Routes read the universe from the DB (`live`, `cron`). Payload carries
  **`isPortfolio` + `listedDate`**; client (table/cards/modal) is now DB-driven
  and no longer imports the static `PORTFOLIO_TICKERS`.
- **CMS:** `/admin/constituents` page + `/api/admin/constituents` (GET list,
  POST upsert), bearer-secret auth. `companies.ts` kept as the typed seed.

### Phase 2 — on-add onboarding automation  ✅ (on `main`, `f6bfc00`)
- **`lib/yahoo-provider.ts`** — single data module: `fetchDailyPrices` (chart),
  `fetchPointInTimeShares` (fundamentals, paged backward via `SHARE_WINDOWS`),
  `fetchQuarterlyFinancials`, `fetchCompanyMeta` (profile + analyst + current
  shares via `yahoo-finance2`).
- **`lib/onboard.ts`** — `onboardConstituent()`: backfills prices, **seeds the
  IPO price on the day before listing** (guarded: only when the first Yahoo price
  IS the listing day — a genuine recent IPO; old names are not seeded), writes
  point-in-time shares, best-effort financials/profile/analyst.
- **`db.ts`** upsert helpers: `upsertShareCounts`, `upsertQuarterlyFinancials`,
  `upsertCompanyProfile`, `upsertAnalystRating`.
- **CMS POST** now: validates the ticker up front (rejects a bad symbol before
  adding it, so it can't break the cron), onboards on add / on-demand
  re-backfill, then recomputes. UI shows the onboarding summary.
- Verified end-to-end: BAJAJHFL (2024 IPO) seeds 70→165 (+135.7%); IRCTC (2019)
  correctly not seeded; a new constituent enters the index on add; full cleanup
  restores the 2,308.71 baseline. test/lint/tsc/build all green.

### Phase 3 — ongoing Yahoo refresh  ✅ (on `main`, `a267964`)
- New **`lib/data-refresh.ts`** refresh orchestrator: active DB-backed universe,
  Yahoo point-in-time shares, quarterly financials, company profiles, analyst
  ratings, then `recomputeAndPersistIndex()`.
- New **`/api/cron/refresh`** route with bearer auth, `cron_runs` observability,
  bounded warnings for partial Yahoo failures, and `maxDuration = 300`.
- **CapIQ-safe share writes:** `upsertYahooShareCounts()` can insert/revise Yahoo
  rows but does not overwrite `excel-capiq` share rows. CMS re-backfill now uses
  the same safe writer.
- **Vercel Cron:** weekly refresh scheduled Sundays at 03:00 UTC.
- Production manual refresh passed on 2026-07-28: 53 companies processed, 292
  share rows fetched, 124 share rows written, 259 financial rows, 53 profiles,
  50 analyst rows, zero failures; recomputed close stayed **2,308.71 / n=50**.

### Phase 4 — cleanup  ✅ (on `main`, `25f9ec1`)
- `scripts/import-capiq-workbook.ts` is marked as a one-time historical seed,
  not an ongoing refresh path.
- Hero scrolling ticker now uses `tickerTape` from `/api/index/live`, built from
  the full active DB-backed universe, while the constituent table still shows
  the current top 50 index members.
- `PORTFOLIO_TICKERS` is now private to `lib/companies.ts`; no client code
  imports the static portfolio seed.
- Production smoke passed after deploy: homepage 200, live API 200,
  `stocks.length = 50`, `tickerTape.length = 53`, admin cron page/API reachable.

---

## 4. Current state

- **`main` has:** all fixes + Phases 1-4. Latest commit:
  `25f9ec1` (`Phase 4: clean up static universe usage`).
- **CI:** GitHub Actions green for `25f9ec1`.
- **Vercel:** production deployment is Ready and aliased to
  `new-economy-index.vercel.app`.
- **DB (Neon, production):** `constituents` seeded (53); index_snapshots latest
  close **2,308.71** on 2026-07-27 (n=50); live smoke on 2026-07-28 returned
  **2,325.7364** intraday. All per-company tables are populated for the 53.
  CapIQ-sourced rows remain frozen (`source` = `excel-capiq`); Yahoo rows use
  `source` = `yahoo`.
- **CMS / cron admin** work with `CRON_SECRET`:
  `/admin/constituents`, `/admin/cron-runs`.

---

## 5. What's left to do

### Monitor the first scheduled refresh
- Manual `/api/cron/refresh` passed in production.
- The first scheduled Sunday run after this handoff is **2026-08-02 at 03:00 UTC**
  (08:30 IST). Check `/admin/cron-runs` afterward for job `refresh`, status
  `success`, no missing tickers, and a sane index value.

### Open copy item (needs a human decision)
- §05 subheading **"A decade in. Here is what we learned."**
  (`components/index-dashboard/PageSections.tsx`, ~line 198) — Daivik suggested
  alternates ("Here is how we track the performance" / "…capture the full
  picture"). Left as-is pending wording. Do not change without sign-off.

---

## 6. Gotchas / must-know

- **CI runs `npm test` + `npm run lint` + `npx tsc --noEmit` + `npm run build`
  on every push** (`.github/workflows/ci.yml`). **`next build` does NOT run the
  test suite and does NOT typecheck `tests/`.** Always run the **full four**
  before pushing — CI silently went red twice because `build` alone passed.
- **Verify the index-unchanged invariant** after any universe/engine change:
  `recomputeAndPersistIndex()` should preserve the latest stored close unless
  real data has moved it. The current verified close is **2,308.71 / n=50** on
  2026-07-27. Quick check: seed/refresh, then recompute and compare to the
  latest `index_snapshots` row.
- **IPO-seed guard** (`lib/onboard.ts`): only seed the IPO price when the first
  Yahoo price is within ~7 days of `listedDate`. Seeding an old name injects a
  bogus day-one move.
- **Yahoo fundamentals are paginated** (~4 periods/request); page windows
  backward (see `SHARE_WINDOWS` in `yahoo-provider.ts`). Annual share history
  caps at **FY2022** — no 2020/2021, even for 20-year-public names.
- **Share refresh must remain CapIQ-safe:** use `upsertYahooShareCounts()`, not
  the generic historical import path, for Yahoo refresh/onboarding share writes.
- **Neon SQL is tagged-template only** — `sql\`... ${v}\``. No dynamic table
  names via function-call form; write each `DELETE`/`INSERT` explicitly.
- **`recomputeAndPersistIndex` prunes orphan `index_snapshots` rows** (dates the
  engine no longer produces) — don't reintroduce stale rows.
- **Yahoo is unofficial** — no key; handle 401/429 gracefully; it can break.
  Everything Yahoo is behind `lib/yahoo-provider.ts` + `lib/yahoo-finance.ts` for
  a future swap (broker API / EODHD).
- **Admin auth** = `Authorization: Bearer <CRON_SECRET>` (see `lib/http-auth.ts`).

---

## 7. Commands

```bash
# full CI locally (run ALL before pushing)
npm test && npm run lint && npx tsc --noEmit && npm run build

# re-seed constituents from companies.ts (idempotent)
npx tsx scripts/seed-constituents.ts

# manually trigger the weekly Yahoo refresh in production
curl -X POST https://new-economy-index.vercel.app/api/cron/refresh \
  -H "Authorization: Bearer $CRON_SECRET"

# one-time CapIQ historical import (already done; reference only)
npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_new version_2.xlsx" --apply

# env: DATABASE_URL + CRON_SECRET in .env.local (loaded by scripts)
```

## 8. Key files

| Area | File |
|---|---|
| Index engine (divisor, IPO-seed) | `lib/index-engine.ts` |
| Universe loader (DB) | `lib/universe.ts` |
| DB schema, recompute, upserts, constituent CRUD | `lib/db.ts` |
| Yahoo data provider | `lib/yahoo-provider.ts` |
| Onboarding orchestrator | `lib/onboard.ts` |
| Ongoing Yahoo refresh orchestrator | `lib/data-refresh.ts` |
| Company modal detail (quarterly, asset turnover) | `lib/company-detail.ts` |
| Constants (SECTORS, INDEX_*, INDEX_SIZE, seed) | `lib/companies.ts` |
| Live / history / cron routes | `app/api/index/live/route.ts`, `.../history/route.ts`, `app/api/cron/snapshot/route.ts`, `app/api/cron/refresh/route.ts` |
| CMS | `app/admin/constituents/*`, `app/api/admin/constituents/route.ts` |
| Benchmarks / FX | `lib/benchmarks.ts`, `lib/fx.ts` |
| CI / cron monitor | `.github/workflows/ci.yml`, `cron-monitor.yml` |
| Tests | `tests/*.test.ts` |
