import Image from "next/image";
import { MarketBadge } from "./MarketBadge";
import { INDEX_NAME, INDEX_SHORT } from "@/lib/companies";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#162c54]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 xl:px-[52px]">
        <div className="flex h-16 items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/trifecta-capital-logo.png"
              alt="Trifecta Capital"
              width={166}
              height={48}
              priority
              className="h-7 w-auto shrink-0 sm:h-8 lg:h-9"
            />
            <div className="hidden min-w-0 border-l border-white/10 pl-3 leading-none sm:block">
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
