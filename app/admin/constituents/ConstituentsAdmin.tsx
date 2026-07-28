"use client";

import { FormEvent, useState } from "react";
import { SECTORS } from "@/lib/companies";
import type { ConstituentRecord } from "@/lib/db";

type FormState = {
  ticker: string;
  name: string;
  displayName: string;
  yfTicker: string;
  sector: string;
  listedDate: string;
  ipoPrice: string;
  isPortfolio: boolean;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  ticker: "",
  name: "",
  displayName: "",
  yfTicker: "",
  sector: SECTORS[0],
  listedDate: "",
  ipoPrice: "",
  isPortfolio: false,
  isActive: true,
};

export function ConstituentsAdmin() {
  const [secret, setSecret] = useState("");
  const [rows, setRows] = useState<ConstituentRecord[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const auth = { Authorization: `Bearer ${secret.trim()}` };

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/constituents", { headers: auth, cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows(json.constituents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/constituents", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ipoPrice: form.ipoPrice === "" ? null : form.ipoPrice }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows(json.constituents ?? []);
      setNotice(`Saved ${json.ticker}. Price/share backfill + recompute run in Phase 2 — for now, re-run the snapshot cron to pull its data.`);
      setForm(EMPTY_FORM);
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  function edit(r: ConstituentRecord) {
    setEditing(r.ticker);
    setForm({
      ticker: r.ticker,
      name: r.name,
      displayName: r.displayName,
      yfTicker: r.yfTicker,
      sector: r.sector,
      listedDate: r.listedDate,
      ipoPrice: r.ipoPrice == null ? "" : String(r.ipoPrice),
      isPortfolio: r.isPortfolio,
      isActive: r.isActive,
    });
    setNotice(null);
    setError(null);
  }

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <main className="nei-admin-page">
      <section className="nei-admin-shell">
        <div className="nei-admin-header">
          <div>
            <p className="nei-label">Admin</p>
            <h1 className="nei-heading">Constituents</h1>
          </div>
          <div className="nei-admin-auth">
            <label htmlFor="secret">CRON_SECRET</label>
            <input
              id="secret"
              type="password"
              autoComplete="current-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <button type="button" onClick={load} disabled={busy || !secret.trim()}>
              {busy ? "…" : rows.length ? "Refresh" : "Load"}
            </button>
          </div>
        </div>

        <div className="nei-admin-status-row" aria-live="polite">
          {error && <p className="nei-admin-alert">{error}</p>}
          {notice && <p className="nei-admin-loaded">{notice}</p>}
        </div>

        <form className="nei-admin-form" onSubmit={save}>
          <h2 className="nei-heading">{editing ? `Edit ${editing}` : "Add a company"}</h2>
          <div className="nei-admin-form-grid">
            <label>
              NSE ticker
              <input value={form.ticker} onChange={(e) => set({ ticker: e.target.value.toUpperCase() })}
                placeholder="MEESHO" disabled={!!editing} required />
            </label>
            <label>
              Yahoo ticker
              <input value={form.yfTicker} onChange={(e) => set({ yfTicker: e.target.value })}
                placeholder="(defaults to TICKER.NS)" />
            </label>
            <label>
              Legal name
              <input value={form.name} onChange={(e) => set({ name: e.target.value })}
                placeholder="Meesho Limited" required />
            </label>
            <label>
              Display name
              <input value={form.displayName} onChange={(e) => set({ displayName: e.target.value })}
                placeholder="Meesho" />
            </label>
            <label>
              Sector
              <select value={form.sector} onChange={(e) => set({ sector: e.target.value })}>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Listing date
              <input type="date" value={form.listedDate} onChange={(e) => set({ listedDate: e.target.value })} required />
            </label>
            <label>
              IPO price (₹)
              <input type="number" step="0.01" value={form.ipoPrice} onChange={(e) => set({ ipoPrice: e.target.value })}
                placeholder="111" />
            </label>
            <label className="nei-admin-check">
              <input type="checkbox" checked={form.isPortfolio} onChange={(e) => set({ isPortfolio: e.target.checked })} />
              Trifecta portfolio company
            </label>
            <label className="nei-admin-check">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
              Active (in index)
            </label>
          </div>
          <div className="nei-admin-form-actions">
            <button type="submit" disabled={busy || !secret.trim()}>{editing ? "Save changes" : "Add company"}</button>
            {editing && (
              <button type="button" className="nei-admin-ghost" onClick={() => { setForm(EMPTY_FORM); setEditing(null); }}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="nei-admin-table-wrap">
          <table className="nei-admin-table">
            <thead>
              <tr>
                <th>Ticker</th><th>Name</th><th>Sector</th><th>Listed</th><th>IPO</th><th>Trifecta</th><th>Active</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ticker} className={r.isActive ? "" : "is-inactive"}>
                  <td className="nei-mono">{r.ticker}</td>
                  <td>{r.displayName}</td>
                  <td>{r.sector}</td>
                  <td className="nei-mono">{r.listedDate}</td>
                  <td className="nei-mono">{r.ipoPrice ?? "—"}</td>
                  <td>{r.isPortfolio ? "P" : ""}</td>
                  <td>{r.isActive ? "✓" : "—"}</td>
                  <td><button type="button" className="nei-admin-ghost" onClick={() => edit(r)}>Edit</button></td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={8} className="nei-admin-empty">Enter CRON_SECRET and Load to view constituents.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
