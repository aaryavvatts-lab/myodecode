import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/SiteChrome";

// Erode, by Indian Type Foundry via Fontshare (ITF Free Font License), self-hosted so no font
// host sees a visit.
const erode = localFont({
  variable: "--font-erode",
  display: "swap",
  src: [
    { path: "./fonts/Erode-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Erode-Italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/Erode-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Erode-Semibold.woff2", weight: "600", style: "normal" },
  ],
});

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

// Runs before first paint: marks JavaScript as working and applies a saved theme. The old
// notice key this site used is removed.
const themeHead =
  "(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('theme');" +
  "if(t==='dark'||t==='light')d.setAttribute('data-theme',t);localStorage.removeItem('myodecode-notice');}catch(e){}})();";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={erode.variable} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#f4f3ef" />
        <script dangerouslySetInnerHTML={{ __html: themeHead }} />
      </head>
      <body className="antialiased">
        <SkipLink />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
