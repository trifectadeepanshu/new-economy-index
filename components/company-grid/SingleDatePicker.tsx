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
 * Single-date counterpart to DateRangePicker — same calendar (same CSS
 * classes: trigger, popover, month/year nav, day grid), but for picking one
 * date instead of a from/to range. Used for the constituent table's custom
 * CAGR start date.
 */
export function SingleDatePicker({
  value,
  min,
  max,
  onChange,
  placeholder = "Pick a date",
  selectedPrefix,
  dialogLabel = "Select date",
  inputLabel = "Date",
  hint = "Pick or type a date",
}: {
  value: string | null;
  min: string;
  max: string;
  onChange: (date: string) => void;
  placeholder?: string;
  selectedPrefix?: string;
  dialogLabel?: string;
  inputLabel?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => startOfMonth(parseISO(value ?? max)));
  const [text, setText] = useState(pretty(value));
  const [invalid, setInvalid] = useState(false);
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
      if (next) {
        setMonth(startOfMonth(parseISO(value ?? max)));
        setText(pretty(value));
        setInvalid(false);
      }
      return next;
    });
  }

  function pick(dISO: string) {
    setText(pretty(dISO));
    setInvalid(false);
    onChange(dISO);
    setOpen(false);
  }

  function commitTyped(t: string) {
    const parsed = parseTyped(t);
    if (!parsed || parsed < min || parsed > max) {
      setText(pretty(value));
      setInvalid(true);
      return;
    }
    setMonth(startOfMonth(parseISO(parsed)));
    pick(parsed);
  }

  function jump(y: number, m: number) {
    setMonth(startOfMonth(new Date(y, m, 1)));
  }

  const prevDisabled = monthStartISO(month) <= monthStartISO(parseISO(min));
  const nextDisabled = monthStartISO(month) >= monthStartISO(parseISO(max));
  const displayValue = pretty(value);
  const triggerText =
    displayValue && selectedPrefix ? `${selectedPrefix} ${displayValue}` : displayValue || placeholder;

  return (
    <div className="nei-dp" ref={rootRef}>
      <button
        type="button"
        className={`nei-dp-trigger${open ? " is-open" : ""}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={displayValue ? `${dialogLabel}: ${displayValue}` : dialogLabel}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 9h18M8 3v3M16 3v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="nei-dp-trigger-text">{triggerText}</span>
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
          <div className="nei-dp-pop" role="dialog" aria-label={dialogLabel}>
            <div className="nei-dp-endpoints">
              <label className="nei-dp-endpoint is-active">
                <span>{inputLabel}</span>
                <input
                  className={`nei-dp-field nei-mono${invalid ? " is-invalid" : ""}`}
                  value={text}
                  placeholder="DD MMM YYYY"
                  aria-label={inputLabel}
                  aria-invalid={invalid}
                  onChange={(e) => {
                    setText(e.target.value);
                    setInvalid(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitTyped(text);
                    }
                  }}
                  onBlur={() => commitTyped(text)}
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

            <div className="nei-dp-grid">
              {days.map((d) => {
                const dISO = iso(d);
                const dis = dISO < min || dISO > max;
                const isSelected = dISO === value;
                const cls = [
                  "nei-dp-day",
                  isSameMonth(d, month) ? "" : "is-out",
                  dis ? "is-disabled" : "",
                  isSelected ? "is-end" : "",
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
                    onClick={() => pick(dISO)}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className={`nei-dp-hint${invalid ? " is-error" : ""}`} role={invalid ? "alert" : undefined}>
              {invalid ? "Not a valid date. Try DD MMM YYYY, e.g. 15 Jul 2026" : hint}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
