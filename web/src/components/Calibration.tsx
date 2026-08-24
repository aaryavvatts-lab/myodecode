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
    { name: "With free unlabelled normalisation", color: c[1],
      points: withN.map((r) => ({ x: r.seconds, y: r.accuracy, lo: r.accuracy_ci[0], hi: r.accuracy_ci[1] })) },
    { name: "Without normalisation", color: c[3], dashed: true,
      points: without.map((r) => ({ x: r.seconds, y: r.accuracy, lo: r.accuracy_ci[0], hi: r.accuracy_ci[1] })) },
  ];

  return (
    <Section
      id="calibration"
      eyebrow="04b — Setup cost"
      title="Should you make people do a calibration routine?"
      lede={
        <>
          Asking a new wearer to hold each gesture for a few seconds is the standard fix for
          person-to-person variation. It is also the most annoying part of owning such a
          device. So: what does it actually buy, on top of simply standardising the signal
          against itself — which costs nothing and needs no labels at all?
        </>
      }
    >
      <Card>
        <LineChart
          series={series}
          height={300}
          yDomain={[0.88, 1.0]}
          xLabel="Seconds of labelled calibration data from the new wearer"
          yLabel="LOSO accuracy"
          xTicks={withN.map((r) => r.seconds)}
          fmtX={(v) => String(v)}
          fmtY={(v) => `${(v * 100).toFixed(0)}%`}
          fmtTipX={(v) => (v === 0 ? "no calibration" : `${v} s total (${(v / 5).toFixed(1)} s per gesture)`)}
          fmtTipY={(v) => pct(v, 2)}
        />
        <TableView
          headers={["Calibration (s)", "Per gesture (s)", "With normalisation", "Without"]}
          rows={withN.map((r, i) => [
            r.seconds, (r.seconds / 5).toFixed(1), pct(r.accuracy, 2), pct(without[i].accuracy, 2),
          ])}
        />
      </Card>

      <Card className="mt-4">
        <h3 className="mb-1 text-[14px] font-medium">The answer is no</h3>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Standardising each wearer's features against their own unlabelled signal — free,
          instant, no cooperation required — is worth{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {((s.with_free_normalisation.zero_shot - s.without_normalisation.zero_shot) * 100).toFixed(1)} pp
          </strong>{" "}
          ({pct(s.without_normalisation.zero_shot)} → {pct(s.with_free_normalisation.zero_shot)}).
          Adding up to twelve seconds of labelled calibration on top of that is worth a
          further{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {(s.with_free_normalisation.gain * 100).toFixed(1)} pp
          </strong>{" "}
          — well inside the confidence interval, i.e. indistinguishable from nothing.
          Calibration only earns its keep when you skip the free normalisation, and then it
          is merely recovering ground you gave away.
        </p>
      </Card>
    </Section>
  );
}
