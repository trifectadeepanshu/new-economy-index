import { MarketBadge } from "./MarketBadge";
import { INDEX_NAME, INDEX_SHORT } from "@/lib/companies";

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col leading-none">
              <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">
                Trifecta Capital
              </span>
              <span className="text-sm font-bold text-white">
                {INDEX_NAME}
                <span className="ml-2 text-xs font-normal text-zinc-500">({INDEX_SHORT})</span>
              </span>
            </div>
          </div>
          <MarketBadge />
        </div>
      </div>
    </header>
  );
}
