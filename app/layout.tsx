import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import "./styles/nei-shared.css";

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
    "The New Economy Index: a live, market-cap weighted view of India's top 50 institutionally backed, tech-enabled publicly listed companies.",
  icons: {
    icon: "/trifecta-mark.png",
    shortcut: "/trifecta-mark.png",
    apple: "/trifecta-mark.png",
  },
  openGraph: {
    title: "NEI Top 50 | Trifecta Capital",
    description: "The New Economy Index: a live, market-cap weighted view of India's top 50 institutionally backed, tech-enabled publicly listed companies.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEI Top 50 | Trifecta Capital",
    description: "The New Economy Index: a live, market-cap weighted view of India's top 50 institutionally backed, tech-enabled publicly listed companies.",
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
