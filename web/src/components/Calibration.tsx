"use client";

import calibration from "@/results/calibration.json";
import { LineChart } from "./charts";
import { Card, Section, TableView, useTheme } from "./ui";
import { GESTURE_COLORS } from "@/lib/palette";
import { pct } from "@/lib/format";

export default function Calibration() {
  const mode = useTheme();
  const c = GESTURE_COLORS[mode];
  const withN = calibration.curves.with_free_normalisation;
  const without = calibration.curves.without_normalisation;
  const s = calibration.summary;

  const series = [
    { name: "With the free rescaling step", color: c[1],
      points: withN.map((r) => ({ x: r.seconds, y: r.accuracy, lo: r.accuracy_ci[0], hi: r.accuracy_ci[1] })) },
    { name: "Without it", color: c[3], dashed: true,
      points: without.map((r) => ({ x: r.seconds, y: r.accuracy, lo: r.accuracy_ci[0], hi: r.accuracy_ci[1] })) },
  ];

  return (
    <Section
      id="calibration"
      eyebrow="06 · Setup"
      title="Should you make people do a setup routine?"
      lede={
        <>
          The usual fix for people being different is to ask each new user to hold every
          gesture for a few seconds while the device learns their arm. It is also the most
          annoying part of owning one. So I checked what that actually buys you, compared
          with just rescaling the signal against itself, which is free and needs nobody to
          hold anything.
        </>
      }
    >
      <Card>
        <LineChart
          series={series}
          height={300}
          yDomain={[0.88, 1.0]}
          xLabel="Seconds the new user spends holding gestures"
          yLabel="Accuracy on a new person"
          xTicks={withN.map((r) => r.seconds)}
          fmtX={(v) => String(v)}
          fmtY={(v) => `${(v * 100).toFixed(0)}%`}
          fmtTipX={(v) => (v === 0 ? "no setup at all" : `${v} s total, ${(v / 5).toFixed(1)} s per gesture`)}
          fmtTipY={(v) => pct(v, 2)}
        />
        <TableView
          headers={["Setup time (s)", "Per gesture (s)", "With rescaling", "Without"]}
          rows={withN.map((r, i) => [
            r.seconds, (r.seconds / 5).toFixed(1), pct(r.accuracy, 2), pct(without[i].accuracy, 2),
          ])}
        />
      </Card>

      <Card className="mt-4">
        <h3 className="mb-1 text-body font-medium">The answer is no</h3>
        <p className="text-body leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Rescaling each person&apos;s measurements against their own signal costs nothing,
          happens instantly, and needs no help from the user. It is worth{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {((s.with_free_normalisation.zero_shot - s.without_normalisation.zero_shot) * 100).toFixed(1)} pp
          </strong>{" "}
          ({pct(s.without_normalisation.zero_shot)} → {pct(s.with_free_normalisation.zero_shot)}).
          Adding up to twelve seconds of the user holding poses on top of that is worth
          another{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {(s.with_free_normalisation.gain * 100).toFixed(1)} pp
          </strong>{" "}
          , which is well inside the noise. In other words, nothing you could measure.
          The setup routine only looks useful if you skipped the free step first, and even
          then it is just winning back ground you gave away.
        </p>
      </Card>
    </Section>
  );
}
