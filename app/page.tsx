import { IndexDashboard } from "@/components/IndexDashboard";

export default function Home() {
  // Keep the document itself static so traffic spikes are absorbed by the CDN.
  // The dashboard hydrates from the separately cached live-data endpoint.
  return <IndexDashboard />;
}
