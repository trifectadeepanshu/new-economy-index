import { IndexDashboard } from "@/components/IndexDashboard";
import { getLiveIndexPayload } from "@/lib/live-index";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Seed the first paint with real data instead of shipping an empty shell —
  // always INR, matching CurrencyProvider's own first-render default (it only
  // syncs from localStorage after mount, to avoid a hydration mismatch).
  const initialLiveData = await getLiveIndexPayload("inr").catch((err) => {
    console.error("[/] Failed to seed initial live data:", err);
    return null;
  });

  return <IndexDashboard initialLiveData={initialLiveData} />;
}
