import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";
import "./styles/nei-shared.css";
import "./styles/nei-hero.css";
import "./styles/nei-chart.css";
import "./styles/nei-reference.css";
import "./styles/nei-constituents.css";
import "./styles/nei-methodology.css";
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
  title: "New Economy Index | Trifecta Capital",
  description:
    "53 listed companies. One number. Trifecta Capital's New Economy Index tracks India's next-generation businesses as a single equal-weighted benchmark.",
  openGraph: {
    title: "New Economy Index | Trifecta Capital",
    description: "India's VC-backed new economy companies — tracked as a single index.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "New Economy Index | Trifecta Capital",
    description: "India's VC-backed new economy companies — tracked as a single index.",
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
