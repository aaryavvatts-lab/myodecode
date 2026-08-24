import { Card, Section } from "./ui";

export default function Primer() {
  return (
    <Section
      id="primer"
      eyebrow="03 · How it works"
      title="Why a muscle gives off electricity"
      lede="Two short paragraphs of biology. The rest of the page does not make much sense without them."
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            A motor unit is one nerve cell plus all the muscle fibres it controls. When
            you want to squeeze harder, your nervous system switches on more of these
            units and fires them faster. Every firing sends an electrical pulse running
            along the muscle fibre. That moving charge creates a tiny voltage in the
            tissue and skin above it, somewhere between a few millionths and a few
            thousandths of a volt.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            A sensor on the skin picks up all of that added together. Hundreds of motor
            units, firing out of step, blurred by the fat and skin in between. On screen
            it looks like noise, and mostly it is. But how big it gets tracks how hard the
            muscle is working. Different gestures lean on different muscles by different
            amounts, so the pattern across four sensors works like a fingerprint for what
            the hand is doing. That is the whole idea behind the decoder on this page.
          </p>
        </Card>
        <Card>
          <h3 className="mb-3 text-[14px] font-medium">The five numbers the decoder uses</h3>
          <dl className="space-y-3 text-[13px]">
            {[
              ["Mean absolute value", "How big the signal is on average, ignoring its sign. A rough count of how much muscle is switched on."],
              ["Root mean square", "Signal power. Similar to the one above, but less thrown off by the odd big spike."],
              ["Waveform length", "How far the line travels up and down in total. Mixes size and speed into one number."],
              ["Zero crossings", "How often the signal flips from positive to negative. Goes up as firing gets faster, down as the muscle tires."],
              ["Slope sign changes", "How often the line changes direction. A rough read on how fast the wiggles are."],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-medium">{k}</dt>
                <dd style={{ color: "var(--text-secondary)" }}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Five numbers per sensor, twenty in total. Hudgins and his co-authors wrote
            this set down in 1993. It is still the thing to beat.
          </p>
        </Card>
      </div>
    </Section>
  );
}
