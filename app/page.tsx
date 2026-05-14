import { Header } from "@/components/Header";
import { IndexDashboard } from "@/components/IndexDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <IndexDashboard />

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
        Data via Yahoo Finance · 15-min delayed during market hours · NSE trading days only
        <br />
        © {new Date().getFullYear()} Trifecta Capital. Index is for informational purposes only.
      </footer>
    </div>
  );
}
