import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "MyoDecode — How fast can you read a hand?",
  description:
    "Decoding hand gestures from four channels of forearm EMG: how fast, how few electrodes, and how much reported accuracy is leakage.",
  openGraph: {
    title: "MyoDecode — How fast can you read a hand?",
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
        {children}
      </body>
    </html>
  );
}
