import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./styles/nei-shared.css";

const GOOGLE_ANALYTICS_ID = "G-4D3GGBND18";

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
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <Analytics />
      </body>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ANALYTICS_ID}');
        `}
      </Script>
    </html>
  );
}
