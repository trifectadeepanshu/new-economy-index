import { IndexDashboard } from "@/components/IndexDashboard";
import { DashboardFooter } from "@/components/index-dashboard/DashboardFooter";
import "./styles/nei-hero.css";
import "./styles/nei-chart.css";
import "./styles/nei-select-menu.css";
import "./styles/nei-reference.css";
import "./styles/nei-constituents.css";
import "./styles/nei-footer.css";
import "./styles/nei-responsive.css";
import "./styles/nei-motion.css";

export default function Home() {
  // Keep the document itself static so traffic spikes are absorbed by the CDN.
  // The dashboard hydrates from the separately cached live-data endpoint.
  return (
    <div className="nei-dashboard">
      <IndexDashboard />
      <DashboardFooter />
    </div>
  );
}
