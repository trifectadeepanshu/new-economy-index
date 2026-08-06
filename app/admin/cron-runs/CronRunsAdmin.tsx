"use client";

import { FormEvent, useMemo, useState } from "react";
import type { CronRunRecord, CronRunStatus } from "@/lib/db";

type ApiPayload = {
  runs?: CronRunRecord[];
  error?: string;
};

const STATUS_VALUES: CronRunStatus[] = ["running", "success", "partial", "failed", "skipped"];

const STATUS_LABELS: Record<CronRunStatus, string> = {
  running: "Running",
  success: "Success",
  partial: "Partial",
  failed: "Failed",
  skipped: "Skipped",
};

function emptySummary(): Record<CronRunStatus, number> {
  return {
    running: 0,
    success: 0,
    partial: 0,
    failed: 0,
    skipped: 0,
  };
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function formatNumber(value: number | null, digits = 0) {
  if (value === null || Number.isNaN(value)) return "-";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "-";
  const startedAt = new Date(start).getTime();
  const finishedAt = new Date(end).getTime();
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) return "-";
  const seconds = Math.max(0, Math.round((finishedAt - startedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

function isProblemStatus(status: CronRunStatus) {
  return status === "failed" || status === "partial" || status === "running";
}

export function CronRunsAdmin() {
  const [secret, setSecret] = useState("");
  const [runs, setRuns] = useState<CronRunRecord[]>([]);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const latest = runs[0] ?? null;
  const summary = useMemo(() => {
    const counts = emptySummary();
    for (const run of runs) counts[run.status] += 1;
    return counts;
  }, [runs]);

  async function loadRuns() {
    const token = secret.trim();
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/cron-runs?limit=50", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const json = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`);
      setRuns(json.runs ?? []);
      setLoadedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cron runs");
      setRuns([]);
    } finally {
      setIsLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadRuns();
  }

  return (
    <main className="nei-admin-page">
      <section className="nei-admin-shell" aria-labelledby="cron-title">
        <div className="nei-admin-header">
          <div>
            <p className="nei-label">Admin</p>
            <h1 id="cron-title" className="nei-heading">Cron runs</h1>
          </div>
          <form className="nei-admin-auth" onSubmit={onSubmit}>
            <label htmlFor="cron-secret">CRON_SECRET</label>
            <input
              id="cron-secret"
              name="cron-secret"
              type="password"
              autoComplete="current-password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              required
            />
            <button type="submit" disabled={isLoading || !secret.trim()}>
              {isLoading ? "Loading" : runs.length ? "Refresh" : "Load"}
            </button>
          </form>
        </div>

        <div className="nei-admin-status-row" aria-live="polite">
          {error ? <p className="nei-admin-alert">{error}</p> : null}
          {!error && loadedAt ? (
            <p className="nei-admin-loaded nei-mono">Loaded {formatDateTime(loadedAt.toISOString())}</p>
          ) : null}
        </div>

        <div className="nei-admin-summary-grid">
          <div className="nei-admin-stat">
            <span>Latest status</span>
            <strong className={`nei-admin-status is-${latest?.status ?? "empty"}`}>
              {latest ? STATUS_LABELS[latest.status] : "-"}
            </strong>
          </div>
          <div className="nei-admin-stat">
            <span>Latest run</span>
            <strong className="nei-mono">{latest ? formatDateTime(latest.startedAt) : "-"}</strong>
          </div>
          <div className="nei-admin-stat">
            <span>Rows written</span>
            <strong className="nei-mono">{formatNumber(latest?.stockRows ?? null)}</strong>
          </div>
          <div className="nei-admin-stat">
            <span>Failures in view</span>
            <strong className="nei-mono">{summary.failed}</strong>
          </div>
        </div>

        <div className="nei-admin-counts" aria-label="Cron run status counts">
          {STATUS_VALUES.map((status) => (
            <span className={`nei-admin-pill is-${status}`} key={status}>
              {STATUS_LABELS[status]} <b className="nei-mono">{summary[status]}</b>
            </span>
          ))}
        </div>

        <div className="nei-admin-table-wrap">
          <table className="nei-admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Date</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Rows</th>
                <th>Index</th>
                <th>Missing</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.length ? (
                runs.map((run) => (
                  <tr className={isProblemStatus(run.status) ? "is-problem" : ""} key={run.id}>
                    <td>
                      <span className={`nei-admin-status is-${run.status}`}>
                        {STATUS_LABELS[run.status]}
                      </span>
                    </td>
                    <td className="nei-mono">{formatDate(run.date)}</td>
                    <td className="nei-mono">{formatDateTime(run.startedAt)}</td>
                    <td className="nei-mono">{formatDuration(run.startedAt, run.finishedAt)}</td>
                    <td className="nei-mono">{formatNumber(run.stockRows)}</td>
                    <td className="nei-mono">{formatNumber(run.indexValue, 2)}</td>
                    <td>{run.missingTickers.length ? run.missingTickers.join(", ") : "-"}</td>
                    <td>{run.error ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="nei-admin-empty">
                    {isLoading ? "Loading cron runs" : "No cron runs loaded"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
