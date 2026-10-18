"use client";
import Link from "next/link";
// Dev-only: renders a single section at the top of the page for visual checking.
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Calibration from "@/components/Calibration";
import Confusion from "@/components/Confusion";
import Electrodes from "@/components/Electrodes";
import Latency from "@/components/Latency";
import LatentSpace from "@/components/LatentSpace";
import Leakage from "@/components/Leakage";
import LiveDecoder from "@/components/LiveDecoder";
import Methods from "@/components/Methods";
import Primer from "@/components/Primer";
import References from "@/components/References";
import SignalExplorer from "@/components/SignalExplorer";

const MAP: Record<string, React.ComponentType> = {
  leakage: Leakage, data: SignalExplorer, primer: Primer, latency: Latency,
  electrodes: Electrodes, calibration: Calibration, confusion: Confusion, latent: LatentSpace,
  live: LiveDecoder, methods: Methods, references: References,
};

function Inner() {
  const key = useSearchParams().get("s") ?? "leakage";
  const C = MAP[key] ?? Leakage;
  return <main style={{ marginTop: -60 }}><C /></main>;
}

export default function Preview() {
  // Development aid only: the deployed site has no /preview route.
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24">
        <p className="text-body" style={{ color: "var(--text-secondary)" }}>
          This route is a development aid. Go to <Link href="/" className="link">the site</Link>.
        </p>
      </main>
    );
  }
  return <Suspense><Inner /></Suspense>;
}
