"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CustomRange } from "@/components/index-chart/useChartHistory";

const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const pretty = (d?: string | null) => (d ? format(parseISO(d), "dd MMM yyyy") : "—");
const monthStartISO = (d: Date) => iso(startOfMonth(d));

/**
 * A custom two-endpoint calendar range picker (the native <input type="date">
 * popup can't be styled). Click a start day, then an end day; the range commits
 * and the popover closes. Days outside [min, max] are disabled.
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
  const [hover, setHover] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [month]);

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next) setMonth(startOfMonth(parseISO(value?.from ?? max)));
      return next;
    });
  }

  function pick(dISO: string) {
    // No start yet, or a complete range → begin a new selection.
    if (!start || (start && end)) {
      setStart(dISO);
      setEnd(null);
      setHover(null);
      return;
    }
    // Start set, picking end. An earlier day restarts the range.
    if (dISO < start) {
      setStart(dISO);
      return;
    }
    setEnd(dISO);
    onChange({ from: start, to: dISO });
    setOpen(false);
  }

  // Highlight bounds — during selection, preview to the hovered day.
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
          {pretty(value?.from)} <em>→</em> {pretty(value?.to)}
        </span>
      </button>

      {open && (
        <div className="nei-dp-pop" role="dialog" aria-label="Select date range">
          <div className="nei-dp-endpoints">
            <div className={`nei-dp-endpoint${!end ? " is-active" : ""}`}>
              <span>Start</span>
              <strong>{pretty(start)}</strong>
            </div>
            <span className="nei-dp-endpoints-arrow" aria-hidden="true">→</span>
            <div className={`nei-dp-endpoint${start && !end ? " is-active" : ""}`}>
              <span>End</span>
              <strong>{pretty(end)}</strong>
            </div>
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
            <span className="nei-dp-month nei-heading">{format(month, "MMMM yyyy")}</span>
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
                  onMouseEnter={() => start && !end && setHover(dISO)}
                  onClick={() => pick(dISO)}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="nei-dp-hint">
            {start && !end ? "Pick an end date" : "Pick a start date"}
          </div>
        </div>
      )}
    </div>
  );
}
