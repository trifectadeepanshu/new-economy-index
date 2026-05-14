import { MarketBadge } from "./MarketBadge";
import { INDEX_NAME, INDEX_SHORT } from "@/lib/companies";
import { TrifectaMark } from "@/components/TrifectaMark";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#162c54]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 xl:px-[52px]">
        <div className="flex h-16 items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <TrifectaMark className="h-8 w-8 shrink-0" title="Trifecta Capital" />
            <div className="flex min-w-0 flex-col gap-1 leading-none">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#E24929]">
                Trifecta Capital
              </span>
              <span className="tr-heading truncate text-sm font-semibold text-white">
                {INDEX_NAME}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <MarketBadge />
            <span className="hidden border border-white/10 bg-[#0f1e41] px-2.5 py-1 font-sans text-[11px] font-semibold tracking-[0.16em] text-white/70 sm:inline-flex">
              {INDEX_SHORT}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
