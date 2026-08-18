import Image from "next/image";
import Link from "next/link";
import { TickFrame } from "@/components/index-dashboard/DashboardChrome";

export function DashboardFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="nei-footer-v2">
      <TickFrame inset={32} tone="paper" lineLen={36} corner={12} opacity={0.3} padded={false}>
        <div className="nei-footer-inner">
          <div className="nei-footer-top">
            <div className="nei-footer-brand-col">
              <div className="nei-footer-brand">
                <Image
                  src="/trifecta-capital-logo.png"
                  alt="Trifecta Capital"
                  width={1800}
                  height={517}
                  className="nei-footer-logo"
                />
              </div>
              <p>
                Market data sourced from Yahoo Finance, updated during market
                hours. Provided for informational purposes only; not investment
                advice. © {year} Trifecta Capital.
              </p>
            </div>
            <div className="nei-footer-links">
              <div>
                <strong>NEI Top 50</strong>
                <Link href="/#performance">Performance</Link>
                <Link href="/#sectors">Sectors</Link>
                <Link href="/#market-cap">Market Cap</Link>
                <Link href="/#constituents">Constituents</Link>
                <Link href="/methodology">Methodology</Link>
              </div>
              <div>
                <strong>Trifecta Capital</strong>
                <a href="https://trifectacapital.in" target="_blank" rel="noopener noreferrer">
                  trifectacapital.in ↗
                </a>
                <a href="mailto:info@trifectacapital.in">info@trifectacapital.in</a>
              </div>
            </div>
          </div>
          <div className="nei-footer-bottom">
            <span>2015 → {year} →</span>
            <span>Gurugram · Mumbai · Bengaluru</span>
          </div>
        </div>
      </TickFrame>
    </footer>
  );
}
