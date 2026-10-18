import leakage from "@/results/leakage.json";
import latency from "@/results/latency.json";
import Reveal from "./Reveal";
import { pct } from "@/lib/format";

/* The product performs: the first screen is a real four-channel recording from the data set
   beside the question, and the three figures beneath are the ones the experiments produced. */
export default function Hero() {
  const leaky = leakage.ladder.find((e) => e.scheme === "random_within" && e.model === "td_lda")!;
  const honest = leakage.ladder.find((e) => e.scheme === "loso" && e.model === "td_lda")!;
  const knee = latency.knees.td_lda_znorm;

  return (
    <header>
      <div className="mx-auto max-w-6xl wrap hero">
        <div>
          <h1 className="lines">
            <span className="line"><span data-line style={{ ["--i" as string]: 0 }}>How fast can</span></span>
            <span className="line"><span data-line style={{ ["--i" as string]: 1 }}>you read a hand?</span></span>
          </h1>
          <p className="lead" data-rise style={{ ["--i" as string]: 2 }}>
            Your muscles give off a small electrical signal when they tighten. Stick four
            sensors on a forearm and you can work out which of five hand gestures someone
            is making. That part already works, and it has worked since 1993.
          </p>
          <p className="mt-4 max-w-[62ch]" data-rise style={{ ["--i" as string]: 3 }}>
            So I asked better questions. How fast can it decide? How few sensors does it
            need? And how much of the accuracy people report for this task is real, versus
            an artifact of how they split their data? The last one turned out to matter
            most.
          </p>
          <div className="acts" data-rise style={{ ["--i" as string]: 4 }}>
            <a href="#live" className="btn focusable">Watch it decode</a>
            <a href="#leakage" className="textbtn focusable">Start with the catch</a>
          </div>
        </div>
        <div className="stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="only-light settle" src="/pictures/emg-light.png" alt="Four seconds of raw forearm muscle signal on four sensors, from the data set" width={1200} height={1500} fetchPriority="high" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="only-dark settle" src="/pictures/emg-dark.png" alt="Four seconds of raw forearm muscle signal on four sensors, from the data set" width={1200} height={1500} fetchPriority="high" />
          <p className="cap">Four seconds of raw signal on the four sensors, from one of the eight people. This is what the decoder reads.</p>
        </div>
      </div>

      <Reveal as="div" className="mx-auto max-w-6xl wrap figs" aria-label="Key figures">
        <div><b style={{ color: "var(--warn)" }}>{pct(leaky.accuracy)}</b><span>what the popular method reports</span></div>
        <div><b style={{ color: "var(--accent)" }}>{pct(honest.accuracy)}</b><span>what it gets on a new person</span></div>
        <div><b>{knee.knee_window_ms} ms</b><span>of signal it needs to decide</span></div>
      </Reveal>

      <Reveal as="div" className="plate">
        <div className="mx-auto w-full max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pictures/myo-armband.jpg" alt="A person wearing a Myo armband on the forearm, the kind of sensor band this data came from" width={1920} height={1440} loading="lazy" decoding="async" />
          <p className="mt-2 text-small" style={{ color: "var(--muted)" }}>A forearm band of the type used for this kind of recording. Photograph by Antonio Zugaldia, not from this study.</p>
        </div>
        <div>
          <h2>Four sensors on one arm</h2>
          <p className="mt-4">
            Each sensor sits over a different group of forearm muscles. When the hand closes, points
            or spreads, the muscles under some sensors tighten and others stay quiet, and that pattern
            is what the decoder reads. The <a className="link" href="#primer">how it works</a> section
            explains where the electricity comes from.
          </p>
        </div>
      </Reveal>
    </header>
  );
}
