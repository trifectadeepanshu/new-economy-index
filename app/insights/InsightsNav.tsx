"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getFocusableElements } from "@/components/ui/focus";

const INSIGHTS_NAV_LINKS = [
  ["Performance", "/#performance"],
  ["Sectors", "/#sectors"],
  ["Market Cap", "/#market-cap"],
  ["Constituents", "/#constituents"],
  ["Insights", "/insights"],
  ["Methodology", "/methodology"],
] as const;

export function InsightsNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab" || !navRef.current) return;
      const focusable = getFocusableElements(navRef.current);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !navRef.current.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(
      () => navRef.current?.querySelector<HTMLElement>(".nei-v2-links a")?.focus(),
      0
    );
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="nei-v2-nav nei-insights-primary-nav" ref={navRef}>
      <Link href="/" className="nei-brand-link" aria-label="NEI Top 50 home">
        <Image
          src="/trifecta-capital-logo.png"
          alt="Trifecta Capital"
          width={1800}
          height={517}
          priority
          className="nei-brand-logo"
        />
      </Link>
      <div className="nei-v2-nav-right">
        <nav
          id="nei-insights-navigation"
          className={`nei-v2-links ${isMenuOpen ? "is-open" : ""}`}
          aria-label="Primary navigation"
        >
          {INSIGHTS_NAV_LINKS.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className={label === "Insights" ? "is-current" : undefined}
              aria-current={label === "Insights" ? "page" : undefined}
              onClick={closeMenu}
            >
              {label}
            </Link>
          ))}
          <a
            href="https://trifectacapital.in"
            target="_blank"
            rel="noopener noreferrer"
            className="nei-v2-nav-cta"
            onClick={closeMenu}
          >
            trifectacapital.in ↗
          </a>
        </nav>
        <button
          ref={menuButtonRef}
          type="button"
          className="nei-mobile-menu-button"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="nei-insights-navigation"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
