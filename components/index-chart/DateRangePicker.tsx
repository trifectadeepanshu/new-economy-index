"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  isValid,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CustomRange } from "@/components/index-chart/useChartHistory";

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// Accepted typed formats, tried in order.
const TYPED_FORMATS = [
  "yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy",
  "dd MMM yyyy", "d MMM yyyy", "dd MMMM yyyy", "d MMMM yyyy",
];

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const pretty = (d?: string | null) => (d ? format(parseISO(d), "dd MMM yyyy") : "");
const monthStartISO = (d: Date) => iso(startOfMonth(d));

/** Parse a hand-typed date into an ISO string, or null if unrecognisable. */
function parseTyped(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  for (const f of TYPED_FORMATS) {
    const d = parse(t, f, new Date());
    if (isValid(d)) return iso(d);
  }
  const asIso = parseISO(t);
  return isValid(asIso) ? iso(asIso) : null;
}

/**
 * Custom two-endpoint calendar range picker: type a date directly into either
 * field, or navigate with the month/year dropdowns and click start → end.
 * Days outside [min, max] are disabled.
 */
export function DateRangePicker({
  value,
  min,
  max,
  onChange,
}: {
  value: CustomRange | null;
  min: string;
  max: string;
  onChange: (r: CustomRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => startOfMonth(parseISO(value?.from ?? max)));
  const [start, setStart] = useState<string | null>(value?.from ?? null);
  const [end, setEnd] = useState<string | null>(value?.to ?? null);
  const [startText, setStartText] = useState(pretty(value?.from));
  const [endText, setEndText] = useState(pretty(value?.to));
  const [hover, setHover] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape. On phones the picker behaves like a
  // bottom sheet, so lock the page underneath while it is open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const mobileQuery = window.matchMedia("(max-width: 640px)");
    const prevOverflow = document.body.style.overflow;
    const syncScrollLock = () => {
      document.body.style.overflow = mobileQuery.matches ? "hidden" : prevOverflow;
    };
    syncScrollLock();
    mobileQuery.addEventListener("change", syncScrollLock);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      mobileQuery.removeEventListener("change", syncScrollLock);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [month]);

  const minY = parseISO(min).getFullYear();
  const maxY = parseISO(max).getFullYear();
  const years = useMemo(
    () => Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i),
    [minY, maxY]
  );

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next) setMonth(startOfMonth(parseISO(value?.from ?? max)));
      return next;
    });
  }

  function apply(from: string, to: string) {
    setStart(from);
    setEnd(to);
    setStartText(pretty(from));
    setEndText(pretty(to));
    onChange({ from, to });
  }

  function pick(dISO: string) {
    // No start yet, or a complete range → begin a new selection.
    if (!start || (start && end)) {
      setStart(dISO);
      setStartText(pretty(dISO));
      setEnd(null);
      setEndText("");
      setHover(null);
      return;
    }
    // An earlier day restarts; otherwise it completes the range and closes.
    if (dISO < start) {
      setStart(dISO);
      setStartText(pretty(dISO));
      return;
    }
    apply(start, dISO);
    setOpen(false);
  }

  // Commit a typed field: validate, clamp to range, keep endpoints ordered.
  function commitTyped(which: "start" | "end", text: string) {
    const parsed = parseTyped(text);
    if (!parsed || parsed < min || parsed > max) {
      // Unrecognised or out of range → revert to the last good value.
      if (which === "start") setStartText(pretty(start));
      else setEndText(pretty(end));
      return;
    }
    setMonth(startOfMonth(parseISO(parsed)));
    const other = which === "start" ? end : start;
    if (!other) {
      // With only one endpoint chosen, treat it as the start.
      setStart(parsed);
      setStartText(pretty(parsed));
      if (which === "end") setEndText("");
      return;
    }
    const both = which === "start" ? [parsed, other] : [other, parsed];
    const [a, b] = both[0] <= both[1] ? both : [both[1], both[0]];
    apply(a, b);
  }

  function jump(y: number, m: number) {
    setMonth(startOfMonth(new Date(y, m, 1)));
  }

  // Highlight bounds — preview to the hovered day while choosing the end.
  const previewEnd = end ?? (start && hover ? hover : start);
  const lo = start && previewEnd ? (start <= previewEnd ? start : previewEnd) : null;
  const hi = start && previewEnd ? (start <= previewEnd ? previewEnd : start) : null;

  const prevDisabled = monthStartISO(month) <= monthStartISO(parseISO(min));
  const nextDisabled = monthStartISO(month) >= monthStartISO(parseISO(max));

  return (
    <div className="nei-dp" ref={rootRef}>
      <button
        type="button"
        className={`nei-dp-trigger${open ? " is-open" : ""}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 9h18M8 3v3M16 3v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="nei-dp-trigger-text">
          {pretty(value?.from) || "Start"} <em>→</em> {pretty(value?.to) || "End"}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="nei-dp-scrim"
            onClick={() => setOpen(false)}
            aria-label="Close date picker"
            tabIndex={-1}
          />
          <div className="nei-dp-pop" role="dialog" aria-label="Select date range">
          <div className="nei-dp-endpoints">
            <label className={`nei-dp-endpoint${!end ? " is-active" : ""}`}>
              <span>Start</span>
              <input
                className="nei-dp-field nei-mono"
                value={startText}
                placeholder="DD MMM YYYY"
                aria-label="Start date"
                onChange={(e) => setStartText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTyped("start", startText);
                  }
                }}
                onBlur={() => commitTyped("start", startText)}
              />
            </label>
            <span className="nei-dp-endpoints-arrow" aria-hidden="true">→</span>
            <label className={`nei-dp-endpoint${start && !end ? " is-active" : ""}`}>
              <span>End</span>
              <input
                className="nei-dp-field nei-mono"
                value={endText}
                placeholder="DD MMM YYYY"
                aria-label="End date"
                onChange={(e) => setEndText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTyped("end", endText);
                  }
                }}
                onBlur={() => commitTyped("end", endText)}
              />
            </label>
          </div>

          <div className="nei-dp-head">
            <button
              type="button"
              className="nei-dp-nav"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              disabled={prevDisabled}
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="nei-dp-selects">
              <select
                className="nei-dp-select"
                value={month.getMonth()}
                aria-label="Month"
                onChange={(e) => jump(month.getFullYear(), Number(e.target.value))}
              >
                {MONTHS.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className="nei-dp-select"
                value={month.getFullYear()}
                aria-label="Year"
                onChange={(e) => jump(Number(e.target.value), month.getMonth())}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="nei-dp-nav"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              disabled={nextDisabled}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="nei-dp-dow" aria-hidden="true">
            {DOW.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="nei-dp-grid" onMouseLeave={() => setHover(null)}>
            {days.map((d) => {
              const dISO = iso(d);
              const dis = dISO < min || dISO > max;
              const isEnd = dISO === lo || dISO === hi;
              const inRange = lo != null && hi != null && dISO > lo && dISO < hi;
              const cls = [
                "nei-dp-day",
                isSameMonth(d, month) ? "" : "is-out",
                dis ? "is-disabled" : "",
                isEnd ? "is-end" : "",
                inRange ? "is-in" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={dISO}
                  type="button"
                  className={cls}
                  disabled={dis}
                  aria-label={format(d, "d MMMM yyyy")}
                  onMouseEnter={() => start && !end && setHover(dISO)}
                  onClick={() => pick(dISO)}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="nei-dp-hint">
            {start && !end ? "Pick an end date, or type it above" : "Pick or type a start date"}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
