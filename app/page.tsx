import Image from "next/image";
import { Header } from "@/components/Header";
import { IndexDashboard } from "@/components/IndexDashboard";

export default function Home() {
  return (
    <div className="tr-grid-bg min-h-screen text-white">
      <Header />
      <IndexDashboard />

      <footer className="border-t border-white/[0.08] py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center font-sans text-[11px] text-white/35 sm:flex-row sm:px-8 sm:text-left xl:px-[52px]">
          <span>Data via Upstox &middot; Real-time during market hours</span>
          <span className="inline-flex items-center gap-2">
            <Image
              src="/trifecta-capital-logo.png"
              alt=""
              width={69}
              height={20}
              className="h-4 w-auto"
            />
            <span>&copy; {new Date().getFullYear()} Trifecta Capital</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
