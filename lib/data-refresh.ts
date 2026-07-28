import type { Company } from "./companies";
import {
  recomputeAndPersistIndex,
  upsertAnalystRating,
  upsertCompanyProfile,
  upsertQuarterlyFinancials,
  upsertYahooShareCounts,
} from "./db";
import {
  fetchCompanyMeta,
  fetchPointInTimeShares,
  fetchQuarterlyFinancials,
  type CompanyMeta,
  type FinancialRow,
  type SharePoint,
} from "./yahoo-provider";

const DEFAULT_DELAY_MS = 150;
const DEFAULT_CONCURRENCY = 3;

export type RefreshStep = "shares" | "financials" | "meta" | "profile" | "analyst";

export type RefreshFailure = {
  ticker: string;
  step: RefreshStep;
  error: string;
};

export type RefreshCompanySummary = {
  ticker: string;
  shareRowsFetched: number;
  shareRowsWritten: number;
  financialRows: number;
  profile: boolean;
  analyst: boolean;
  errors: RefreshFailure[];
};

export type RefreshRunSummary = {
  companiesProcessed: number;
  companySummaries: RefreshCompanySummary[];
  shareRowsFetched: number;
  shareRowsWritten: number;
  financialRows: number;
  profiles: number;
  analysts: number;
  dataRowsWritten: number;
  failures: RefreshFailure[];
  latestDate: string | null;
  indexValue: number | null;
  numCompanies: number;
};

export type RefreshOptions = {
  includeShares?: boolean;
  includeFinancials?: boolean;
  includeMeta?: boolean;
  delayMs?: number;
  concurrency?: number;
};

export type RefreshDependencies = {
  fetchPointInTimeShares: (yfTicker: string) => Promise<SharePoint[]>;
  fetchQuarterlyFinancials: (yfTicker: string) => Promise<FinancialRow[]>;
  fetchCompanyMeta: (yfTicker: string) => Promise<CompanyMeta>;
  upsertYahooShareCounts: (ticker: string, points: SharePoint[]) => Promise<number>;
  upsertQuarterlyFinancials: (ticker: string, rows: FinancialRow[]) => Promise<void>;
  upsertCompanyProfile: (ticker: string, description: string | null) => Promise<void>;
  upsertAnalystRating: (
    ticker: string,
    analyst: NonNullable<CompanyMeta["analyst"]>
  ) => Promise<void>;
  recomputeAndPersistIndex: typeof recomputeAndPersistIndex;
  wait: (ms: number) => Promise<void>;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_DEPS: RefreshDependencies = {
  fetchPointInTimeShares,
  fetchQuarterlyFinancials,
  fetchCompanyMeta,
  upsertYahooShareCounts,
  upsertQuarterlyFinancials,
  upsertCompanyProfile,
  upsertAnalystRating,
  recomputeAndPersistIndex,
  wait,
};

function errorDetail(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function addFailure(
  company: RefreshCompanySummary,
  failures: RefreshFailure[],
  ticker: string,
  step: RefreshStep,
  err: unknown
) {
  const failure = { ticker, step, error: errorDetail(err) };
  company.errors.push(failure);
  failures.push(failure);
}

export async function refreshConstituentData(
  constituents: Pick<Company, "ticker" | "yfTicker">[],
  options: RefreshOptions = {},
  deps: RefreshDependencies = DEFAULT_DEPS
): Promise<RefreshRunSummary> {
  const includeShares = options.includeShares ?? true;
  const includeFinancials = options.includeFinancials ?? true;
  const includeMeta = options.includeMeta ?? true;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const requestedConcurrency = Math.trunc(options.concurrency ?? DEFAULT_CONCURRENCY);
  const concurrency = Math.max(
    1,
    Math.min(
      constituents.length || 1,
      Number.isFinite(requestedConcurrency) ? requestedConcurrency : DEFAULT_CONCURRENCY
    )
  );

  const companySummaries: RefreshCompanySummary[] = new Array(constituents.length);
  const failures: RefreshFailure[] = [];
  let nextIndex = 0;

  async function refreshOne(c: Pick<Company, "ticker" | "yfTicker">) {
    const company: RefreshCompanySummary = {
      ticker: c.ticker,
      shareRowsFetched: 0,
      shareRowsWritten: 0,
      financialRows: 0,
      profile: false,
      analyst: false,
      errors: [],
    };

    if (includeShares) {
      try {
        const shares = await deps.fetchPointInTimeShares(c.yfTicker);
        company.shareRowsFetched = shares.length;
        company.shareRowsWritten = await deps.upsertYahooShareCounts(c.ticker, shares);
      } catch (err) {
        addFailure(company, failures, c.ticker, "shares", err);
      }
    }

    if (includeFinancials) {
      try {
        const financials = await deps.fetchQuarterlyFinancials(c.yfTicker);
        await deps.upsertQuarterlyFinancials(c.ticker, financials);
        company.financialRows = financials.length;
      } catch (err) {
        addFailure(company, failures, c.ticker, "financials", err);
      }
    }

    if (includeMeta) {
      let meta: CompanyMeta | null = null;
      try {
        meta = await deps.fetchCompanyMeta(c.yfTicker);
      } catch (err) {
        addFailure(company, failures, c.ticker, "meta", err);
      }

      if (meta) {
        try {
          await deps.upsertCompanyProfile(c.ticker, meta.description);
          company.profile = meta.description != null;
        } catch (err) {
          addFailure(company, failures, c.ticker, "profile", err);
        }

        if (meta.analyst) {
          try {
            await deps.upsertAnalystRating(c.ticker, meta.analyst);
            company.analyst = true;
          } catch (err) {
            addFailure(company, failures, c.ticker, "analyst", err);
          }
        }
      }
    }

    return company;
  }

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= constituents.length) return;

      companySummaries[index] = await refreshOne(constituents[index]);
      if (delayMs > 0 && nextIndex < constituents.length) await deps.wait(delayMs);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const index = await deps.recomputeAndPersistIndex();
  const shareRowsFetched = companySummaries.reduce((sum, c) => sum + c.shareRowsFetched, 0);
  const shareRowsWritten = companySummaries.reduce((sum, c) => sum + c.shareRowsWritten, 0);
  const financialRows = companySummaries.reduce((sum, c) => sum + c.financialRows, 0);
  const profiles = companySummaries.filter((c) => c.profile).length;
  const analysts = companySummaries.filter((c) => c.analyst).length;

  return {
    companiesProcessed: companySummaries.length,
    companySummaries,
    shareRowsFetched,
    shareRowsWritten,
    financialRows,
    profiles,
    analysts,
    dataRowsWritten: shareRowsWritten + financialRows + profiles + analysts,
    failures,
    latestDate: index.latestDate,
    indexValue: index.latestValue,
    numCompanies: index.numCompanies,
  };
}

export function summarizeRefreshFailures(failures: RefreshFailure[], limit = 12) {
  if (!failures.length) return null;
  const shown = failures
    .slice(0, limit)
    .map((f) => `${f.ticker}:${f.step}:${f.error}`)
    .join("; ");
  const remaining = failures.length - limit;
  return remaining > 0 ? `${shown}; +${remaining} more` : shown;
}
