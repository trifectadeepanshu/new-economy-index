import type { Metadata } from "next";
import { CronRunsAdmin } from "./CronRunsAdmin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cron Runs | NEI Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CronRunsPage() {
  return <CronRunsAdmin />;
}
