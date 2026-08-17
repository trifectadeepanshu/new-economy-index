# Traffic readiness runbook

## Before deployment

- Use pooled Neon connections for `DATABASE_READ_URL` and `DATABASE_WRITE_URL`.
- Keep `DATABASE_MIGRATION_URL` out of Vercel runtime environments.
- Use separate, high-entropy values for `CRON_SECRET` and `ADMIN_SECRET`.
- Protect Preview deployments with Vercel Authentication.
- Keep Vercel Firewall rate limiting enabled for `/api/*`.
- Keep Vercel Functions in `sin1`, beside the Neon Singapore database.
- Confirm Fluid compute is enabled after deployment.
- Enable Vercel Speed Insights, Web Analytics, function logs, and spend alerts.
- Enable Vercel bot protection and apply a measured rate limit to `/api/index/*`.
- Never expose `CRON_SECRET` or `ADMIN_SECRET` to a load-test process.

## Verification

Run the production build and automated tests:

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

Start the production server locally and validate configuration and payloads:

```bash
npm run start -- -p 3100
BASE_URL=http://127.0.0.1:3100 npm run traffic:check
npm run load:smoke -- --base-url http://127.0.0.1:3100
```

Use k6 for the longer staging profiles:

```bash
ALLOW_REMOTE_LOAD_TEST=1 BASE_URL=https://APPROVED-STAGING-DOMAIN LOAD_PROFILE=baseline k6 run load-tests/k6-index-traffic.js
ALLOW_REMOTE_LOAD_TEST=1 BASE_URL=https://APPROVED-STAGING-DOMAIN LOAD_PROFILE=stress k6 run load-tests/k6-index-traffic.js
ALLOW_REMOTE_LOAD_TEST=1 BASE_URL=https://APPROVED-STAGING-DOMAIN LOAD_PROFILE=spike k6 run load-tests/k6-index-traffic.js
```

Do not run stress, spike, or soak profiles against production without approval from the hosting provider and the person responsible for the database and market-data provider.

## Publication day

- Deploy and freeze changes before the article is published.
- Warm `/`, `/api/index/live`, and the four chart ranges from the primary audience region.
- Watch function error rate, p95 duration, Neon connections and CPU, cache hit rate, and stale-data status.
- Keep the previous Vercel deployment ready for immediate rollback.
- If Yahoo or Neon degrades, continue serving the last valid snapshot and show the existing stale-data state.
