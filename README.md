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

The old Yahoo-based `scripts/backfill.ts` and `scripts/backfill-shares.ts`
are intentionally retired; they exit before touching data.

Import the canonical CapIQ workbook cache and recompute the index:

```bash
npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_v2.xlsx"
npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_v2.xlsx" --apply
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

```bash
npm test
npm run lint
npm run build
```
