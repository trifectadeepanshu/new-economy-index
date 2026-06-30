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

Backfill historical snapshots:

```bash
npx tsx scripts/backfill.ts
```

Import the canonical CapIQ workbook cache and recompute the index:

```bash
npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_v2 (1).xlsx"
npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_v2 (1).xlsx" --apply
```

Vercel runs `/api/cron/snapshot` on market weekdays via `vercel.json`.

## Checks

```bash
npm run lint
npm run build
```
