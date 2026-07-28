import type { Metadata } from "next";
import { ConstituentsAdmin } from "./ConstituentsAdmin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Constituents | NEI Admin",
  robots: { index: false, follow: false },
};

export default function ConstituentsPage() {
  return <ConstituentsAdmin />;
}
