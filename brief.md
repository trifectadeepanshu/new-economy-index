# NEI — Engineering Brief & Handoff

Handoff doc for continuing the "CMS-add-only, Yahoo-automated data" work on
**India's New Economy Index** (`new-economy-index.vercel.app`).

---

## 1. What the project is

A single-page Next.js (App Router) site that publishes a market-cap-weighted
stock index tracking VC/PE-backed, listed Indian "new economy" companies.

- **Stack:** Next.js 16 (App Router, TS), **Neon** serverless Postgres, deployed
  on **Vercel**. Not Supabase, no Python pipeline (the one `.py` was
  deprecated, then removed 2026-08-18 along with dead `lib/upstox.ts` and the
  self-blocking `backfill.ts`/`backfill-shares.ts` stubs — see Phase 5).
- **Scheduling:** Vercel Cron (`vercel.json` -> `/api/cron/snapshot`, weekdays
  11:00 UTC; `/api/cron/refresh`, quarterly at 03:00 UTC on Jan/Apr/Jul/Oct 1st)
  + two GitHub Actions (`.github/workflows/ci.yml`, `cron-monitor.yml`).
- **Index methodology (canonical):** base **1,000 at 2020-12-31**; holds the
  **top 50 by market cap** (universe is **54**, added Turtlemint 2026-08-18);
  reconstituted at quarter-ends **and each company's first-priced day**; a new
  company is **seeded at its IPO price on the trading day before listing** so
  the listing-day pop counts; market-cap divisor is chain-linked;
  **point-in-time shares**. Engine: `lib/index-engine.ts`.
- **Index level is currency-independent** (a pure number like Nifty). Only
  per-stock prices/market caps convert INR↔USD (`lib/fx.ts`, `USDINR=X`).
- **Benchmark:** **Nifty 500** (`^CRSLDX`) — `lib/benchmarks.ts`.

The index is validated to reproduce a canonical CapIQ workbook ("TLF New
Economy Index Data") exactly. That workbook is **re-imported whenever CapIQ
issues an updated version** (`scripts/import-capiq-workbook.ts` — see Phase 5),
most recently 2026-08-18 from the "Final Version" workbook, which now covers
**2020-12-31 → 2026-07-15**. Data from **2026-07-16 onward is Yahoo-sourced**
and stays that way going forward; only the CapIQ-covered window gets replaced
on a re-import.

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
  2020–2021 shares. So: **keep the CapIQ history (2020→last CapIQ coverage
  date, 2026-07-15 as of the 2026-08-18 re-import) as the source of truth**;
  Yahoo takes over from the day after. Re-deriving all history from Yahoo would
  shift the index ~1.5% (shares) — rejected. This is **option (A): keep exact
  history, Yahoo forward.**
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
- **Vercel Cron:** originally weekly (Sundays 03:00 UTC); changed to
  **quarterly** (`0 3 1 1,4,7,10 *` — 1st of Jan/Apr/Jul/Oct) the next day in
  `13be992` ("Cron: run fundamentals refresh quarterly, not weekly") to match
  the index's own quarterly rebalance cadence. `vercel.json` is current;
  nothing below this bullet reflects the schedule change.
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

### Phase 5 — CapIQ workbook re-import, Turtlemint added  ✅ (on `staging`, 2026-08-18)
- Trifecta's team recalculated the index independently in Excel and found it
  diverging from the live app by a small margin. Root cause: the DB's frozen
  CapIQ history only covered through 2026-07-06; 2026-07-07 → 2026-07-15 (9
  trading days) was already Yahoo-sourced, plus Turtlemint (IPO'd 2026-06-29)
  had never been in any CapIQ workbook at all. Fix, per explicit instruction:
  **all data through 2026-07-15 from the new "Final Version" CapIQ workbook;
  2026-07-16 onward stays Yahoo** (unchanged from before).
- **Found and fixed a real bug** in `import-capiq-workbook.ts`'s XML cell
  parser: the new workbook writes empty cells as self-closing
  `<c r="I3" s="6"/>` tags, which the old regex (expecting `<c>...</c>` always)
  would mishandle — it silently consumed forward to the next real `</c>` it
  could find, misattributing a later cell's value onto the earlier, actually-
  empty ref. Confirmed concretely (cell I3, empty since Nazara hadn't IPO'd on
  2020-12-31, was reading a later cell's value instead). This was a latent bug
  in the parser itself, independent of the "till 15 July" request.
- Added **Turtlemint** (`TURTLEMINT`, Fintech, listed 2026-06-29, IPO ₹152,
  Trifecta portfolio) to `lib/companies.ts` as company **#54** — it was
  previously onboarded only via the admin CMS with Yahoo data, which is why an
  earlier reconciliation attempt (2026-08-04) couldn't run the import tool at
  all (universe validation requires the workbook and the static seed to match
  exactly).
- Backed up the affected `stock_snapshots`/`share_counts` rows locally before
  applying (this import is a direct production DB mutation, independent of any
  git deploy). Verified the recomputed index against the workbook's own
  `Final_Index_Calculations` sheet for all 2,023 days (2020-12-31 →
  2026-07-15) — matches on every trading day, including the boundary day
  itself. Confirmed no CapIQ-vs-Yahoo price discontinuity at the splice point
  (every ticker's CapIQ close on 07-15 was identical to what Yahoo had already
  reported for that date).
- This closed a previously-accepted, separately-tracked ~0.03% offset from
  30-Jun-2026 onward (a stale share-count revision in an older workbook
  version) — the new workbook apparently already carries the correction.

### Phase 6 — dead code cleanup  ✅ (on `staging`, 2026-08-18)
- Removed **`lib/upstox.ts`** (124 lines, unused since May 2026 — the live
  data source was switched to Upstox and back to Yahoo the same day; the file
  itself was never deleted, and a later commit even kept editing it despite
  nothing importing it). Its two Vercel env vars (`UPSTOX_API_TOKEN`,
  `UPSTOX_ACCESS_TOKEN`, Production only) are now orphaned — remove them in
  Vercel directly, not covered by this commit.
- Removed **`scripts/generate_excel.py`** (the only Python file in the repo;
  a self-blocking deprecated stub, fully superseded by
  `import-capiq-workbook.ts`) and **`scripts/backfill.ts`** /
  **`scripts/backfill-shares.ts`** (same pattern — self-blocking stubs
  pointing at `import:capiq`).
- Updated `README.md` (dropped the now-nonexistent-file callout, fixed the
  example workbook filename, added the missing `tsc --noEmit` step to
  "Checks").

---

## 4. Current state

- **`main` has:** all fixes + Phases 1-4, commit `25f9ec1`. **`staging` also
  has Phase 5** (CapIQ re-import + Turtlemint + parser fix, 2026-08-18) —
  not yet merged to `main` as of this writing.
- **CI:** green on both branches as of the last push.
- **Vercel:** production deployment is Ready and aliased to
  `new-economy-index.vercel.app`; staging previews at the `-git-staging-`
  alias.
- **DB (Neon, shared by staging and production code — the DB itself is not
  branch-scoped):** `constituents` has **54** rows (53 original + Turtlemint).
  CapIQ-sourced rows (`source = excel-capiq`) now cover 2020-12-31 →
  2026-07-15; Yahoo rows (`source = yahoo`) cover 2026-07-16 onward. Re-running
  `import-capiq-workbook.ts --apply` against a newer workbook mutates this DB
  immediately, regardless of which git branch is checked out.
- **CMS / cron admin** work with `CRON_SECRET`:
  `/admin/constituents`, `/admin/cron-runs`.

---

## 5. What's left to do

### Monitor the first scheduled refresh
- The refresh cron is **quarterly**, not weekly (see Phase 3 note) — the only
  `refresh` row in `cron_runs` as of 2026-08-18 is the 2026-07-28 **manual**
  trigger; the schedule hasn't fired on its own yet. Next scheduled run:
  **2026-10-01 03:00 UTC**. Check `/admin/cron-runs` afterward for job
  `refresh`, status `success`, no missing tickers, and a sane index value.

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
  real data has moved it. Quick check: note the latest `index_snapshots` row
  before the change, then compare after recompute — same date/value/n unless
  the change was meant to move it (e.g. a workbook re-import).
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

# manually trigger the (quarterly-scheduled) Yahoo refresh in production
curl -X POST https://new-economy-index.vercel.app/api/cron/refresh \
  -H "Authorization: Bearer $CRON_SECRET"

# re-run only when CapIQ issues an updated workbook (dry-run first, no --apply)
npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_Final Version_shared Deepanshu.xlsx"
# add --apply once the dry-run summary shows zero universe/share mismatches

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
