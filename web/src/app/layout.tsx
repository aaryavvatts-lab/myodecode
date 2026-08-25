import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Notice, SiteFooter, SkipLink } from "@/components/SiteChrome";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

// Without this the link preview image resolves against localhost. Vercel sets the
// production domain at build time; fall back to the per-deploy URL, then to local.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MyoDecode: how fast can you read a hand?",
  description:
    "Decoding hand gestures from four channels of forearm EMG: how fast, how few electrodes, and how much reported accuracy is leakage.",
  openGraph: {
    title: "MyoDecode: how fast can you read a hand?",
    description:
      "A 1993 feature set beats the CNN, and most of the accuracy everyone reports is an artefact of how the data is split.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} ${serif.variable} font-[family-name:var(--font-sans)] antialiased`}>
        <SkipLink />
        {children}
        <SiteFooter />
        <Notice />
      </body>
    </html>
  );
}
