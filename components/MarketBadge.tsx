"use client";

import { useEffect, useState } from "react";
import { isMarketOpen } from "@/lib/market-hours";

export function MarketBadge() {
  const [open, setOpen] = useState(() => isMarketOpen());

  useEffect(() => {
    const interval = window.setInterval(() => setOpen(isMarketOpen()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 border px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] ${
        open
          ? "border-[#E24929]/30 bg-[#E24929]/10 text-white"
          : "border-white/10 bg-[#0f1e41] text-white/45"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          open ? "animate-pulse bg-[#E24929]" : "bg-white/30"
        }`}
      />
      {open ? "Market Open" : "Market Closed"}
    </span>
  );
}
