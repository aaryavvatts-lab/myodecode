import Calibration from "@/components/Calibration";
import Confusion from "@/components/Confusion";
import Electrodes from "@/components/Electrodes";
import Hero from "@/components/Hero";
import Latency from "@/components/Latency";
import LatentSpace from "@/components/LatentSpace";
import Leakage from "@/components/Leakage";
import LiveDecoder from "@/components/LiveDecoder";
import Methods from "@/components/Methods";
import Primer from "@/components/Primer";
import SignalExplorer from "@/components/SignalExplorer";

export default function Home() {
  return (
    <main>
      <Hero />
      <Leakage />
      <SignalExplorer />
      <Primer />
      <Latency />
      <Electrodes />
      <Calibration />
      <Confusion />
      <LatentSpace />
      <LiveDecoder />
      <Methods />
      <footer className="border-t py-10">
        <div className="mx-auto max-w-5xl px-5 text-[12px]" style={{ color: "var(--text-muted)" }}>
          MyoDecode — decoding hand gestures from four channels of forearm EMG.
          All accuracies are leave-one-subject-out unless stated otherwise.
        </div>
      </footer>
    </main>
  );
}
