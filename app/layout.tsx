import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import "./styles/nei-shared.css";
import "./styles/nei-hero.css";
import "./styles/nei-chart.css";
import "./styles/nei-reference.css";
import "./styles/nei-constituents.css";
import "./styles/nei-methodology.css";
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

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://new-economy-index.vercel.app"),
  title: "India's Top 50 New Economy Index | Trifecta Capital",
  description:
    "Tracks the top 50 VC-backed companies that have now gone public — India's new economy as a single market-cap weighted index.",
  icons: {
    icon: "/trifecta-mark.png",
    shortcut: "/trifecta-mark.png",
    apple: "/trifecta-mark.png",
  },
  openGraph: {
    title: "India's Top 50 New Economy Index | Trifecta Capital",
    description: "Tracks the top 50 VC-backed companies that have now gone public.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "India's Top 50 New Economy Index | Trifecta Capital",
    description: "Tracks the top 50 VC-backed companies that have now gone public.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
