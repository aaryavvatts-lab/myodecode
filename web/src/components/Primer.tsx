import { Card, Section } from "./ui";

export default function Primer() {
  return (
    <Section
      id="primer"
      eyebrow="00 — Mechanism"
      title="Why a muscle leaks electricity"
      lede="Two paragraphs of physiology, because the rest of this page is meaningless without them."
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            A motor unit is one motor neuron plus every muscle fibre it controls. To
            contract harder, your nervous system recruits more units and fires them faster.
            Each firing sends an action potential sweeping along the fibre membrane, and
            that travelling charge sets up a small potential difference in the tissue and
            skin above it — on the order of tens of microvolts to a few millivolts.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            A surface electrode measures the sum of all of that: hundreds of motor units,
            firing asynchronously, filtered through fat and skin. The result looks like
            noise, and in a sense it is — but its <em>amplitude</em> tracks recruitment, and
            because different gestures recruit different muscles in different proportions,
            the pattern <em>across</em> four electrodes is a fingerprint of what the hand is
            doing. That is the entire basis of the decoder on this page.
          </p>
        </Card>
        <Card>
          <h3 className="mb-3 text-[14px] font-medium">What the decoder actually measures</h3>
          <dl className="space-y-3 text-[13px]">
            {[
              ["Mean absolute value", "average rectified amplitude — a direct proxy for how many motor units are active"],
              ["Root mean square", "signal power, less sensitive to isolated spikes than MAV"],
              ["Waveform length", "total path the trace travels — combines amplitude and firing rate in one number"],
              ["Zero crossings", "how often the signal changes sign — rises with firing rate, falls with fatigue"],
              ["Slope sign changes", "direction reversals — a coarse read on spectral content"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-medium">{k}</dt>
                <dd style={{ color: "var(--text-secondary)" }}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Five numbers per channel, twenty in total. Hudgins and colleagues proposed this
            set in 1993. It is still the thing to beat.
          </p>
        </Card>
      </div>
    </Section>
  );
}
