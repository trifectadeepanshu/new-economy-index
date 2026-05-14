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
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        open
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-zinc-700/60 text-zinc-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          open ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
        }`}
      />
      {open ? "Market Open" : "Market Closed"}
    </span>
  );
}
