"use client";
// Dev-only: renders a single section at the top of the page for visual checking.
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Calibration from "@/components/Calibration";
import Electrodes from "@/components/Electrodes";
import Latency from "@/components/Latency";
import LatentSpace from "@/components/LatentSpace";
import Leakage from "@/components/Leakage";
import LiveDecoder from "@/components/LiveDecoder";
import Methods from "@/components/Methods";
import Primer from "@/components/Primer";
import SignalExplorer from "@/components/SignalExplorer";

const MAP: Record<string, React.ComponentType> = {
  leakage: Leakage, data: SignalExplorer, primer: Primer, latency: Latency,
  electrodes: Electrodes, calibration: Calibration, latent: LatentSpace,
  live: LiveDecoder, methods: Methods,
};

function Inner() {
  const key = useSearchParams().get("s") ?? "leakage";
  const C = MAP[key] ?? Leakage;
  return <main style={{ marginTop: -60 }}><C /></main>;
}

export default function Preview() {
  return <Suspense><Inner /></Suspense>;
}
