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
import SignalExplorer from "@/components/SignalExplorer";
import Reveal from "@/components/Reveal";

function Pair({ stem, alt, w, h }: { stem: string; alt: string; w: number; h: number }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="only-light" src={`/pictures/${stem}-light.png`} alt={alt} width={w} height={h} loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="only-dark" src={`/pictures/${stem}-dark.png`} alt={alt} width={w} height={h} loading="lazy" decoding="async" />
    </>
  );
}

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <Leakage />
      <SignalExplorer />
      <Reveal as="div" className="mx-auto max-w-6xl wrap pair" aria-label="Two figures from the data">
        <figure>
          <Pair stem="gestures" alt="One person's five gestures, four channels of raw muscle signal each, drawn from the data set" w={1600} h={500} />
          <figcaption>One person, five gestures, four sensors each. The pattern across sensors, not any one trace, is what separates them.</figcaption>
        </figure>
        <figure>
          <Pair stem="latent" alt="Two scatter plots of 4,000 windows projected to two dimensions, coloured by gesture: the network's internal space and the 1993 measurements" w={1400} h={700} />
          <figcaption>4,000 windows laid out in two dimensions, coloured by gesture. Left, the network&apos;s internal space. Right, the 1993 measurements.</figcaption>
        </figure>
      </Reveal>
      <Primer />
      <Reveal as="div" className="plate">
        <div>
          <h2>The muscles under the band</h2>
          <p className="mt-4">
            The forearm holds the muscles that close the fingers and bend the wrist. They sit in layers,
            and a sensor on the skin picks up whichever of them are tightening beneath it, blurred
            together. That blur is why four sensors are enough for five gestures, and also why the
            signal looks different on every arm.
          </p>
        </div>
        <div className="mx-auto w-full max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pictures/forearm-muscles-openstax.jpg" alt="Anatomical plate of the muscles that move the forearm and hand" width={1920} height={2369} loading="lazy" decoding="async" />
          <p className="mt-2 text-small" style={{ color: "var(--muted)" }}>Muscles that move the forearm. OpenStax, CC BY 4.0.</p>
        </div>
      </Reveal>
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
