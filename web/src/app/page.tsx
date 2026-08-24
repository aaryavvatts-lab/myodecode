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
import References from "@/components/References";
import SectionNav from "@/components/SectionNav";
import SignalExplorer from "@/components/SignalExplorer";

export default function Home() {
  return (
    <main id="main">
      <SectionNav />
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
      <References />
    </main>
  );
}
