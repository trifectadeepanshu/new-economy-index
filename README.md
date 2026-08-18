# Trifecta New Economy Index

Public Next.js dashboard for the Trifecta New Economy Index, tracking VC-backed listed companies across sectors with index, sector compare, sector detail, and company views.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local` with:

```bash
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
CRON_SECRET=your-secret-here
```

## Data Jobs

Re-import the canonical CapIQ workbook cache and recompute the index
(only needed when CapIQ issues an updated workbook — dry-run first, then
`--apply` once the summary shows zero universe/share mismatches):

```bash
npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_Final Version_shared Deepanshu.xlsx"
npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_Final Version_shared Deepanshu.xlsx" --apply
```

Daily forward snapshots are handled by the cron route:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://your-domain.com/api/cron/snapshot"
```

Vercel runs `/api/cron/snapshot` on market weekdays via `vercel.json`.

## Operations

Cron run history is available at `/admin/cron-runs`. Enter `CRON_SECRET` to
load the protected `cron_runs` feed from `/api/admin/cron-runs`.

GitHub Actions runs `npm test`, lint, typecheck, and build on every push to
`main` and every pull request. A separate weekday monitor runs after the Vercel
cron window and checks that today's snapshot row was recorded cleanly.

## Checks

`npm run build` does not run the test suite or typecheck `tests/` — run the
full sequence before pushing:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```
