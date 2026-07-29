import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import "./styles/nei-shared.css";
import "./styles/nei-hero.css";
import "./styles/nei-chart.css";
import "./styles/nei-reference.css";
import "./styles/nei-constituents.css";
import "./styles/nei-methodology.css";
import "./styles/nei-doc.css";
import "./styles/nei-admin.css";
import "./styles/nei-responsive.css";
import "./styles/nei-motion.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});


export const metadata: Metadata = {
  metadataBase: new URL("https://new-economy-index.vercel.app"),
  title: "NEI Top 50 | Trifecta Capital",
  description:
    "The NEI Top 50 tracks the top 50 institutionally backed, technology-driven Indian companies that have gone public — market-cap weighted into a single live index.",
  icons: {
    icon: "/trifecta-mark.png",
    shortcut: "/trifecta-mark.png",
    apple: "/trifecta-mark.png",
  },
  openGraph: {
    title: "NEI Top 50 | Trifecta Capital",
    description: "The NEI Top 50 — the top 50 institutionally backed, technology-driven Indian companies that have gone public, in one market-cap weighted index.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEI Top 50 | Trifecta Capital",
    description: "The NEI Top 50 — the top 50 institutionally backed, technology-driven Indian companies that have gone public, in one market-cap weighted index.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
