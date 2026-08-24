"use client";

import { useState } from "react";
import latency from "@/results/latency.json";
import { LineChart } from "./charts";
import { Card, Inferred, Section, Stat, TableView, Toggle, useTheme } from "./ui";
import { GESTURE_COLORS } from "@/lib/palette";
import { pct } from "@/lib/format";

const MODELS = [
  { key: "td_lda_znorm", name: "1993 measurements, rescaled" },
  { key: "td_lda", name: "1993 measurements" },
  { key: "cnn_latent_logreg", name: "Neural net, then classifier" },
  { key: "cnn_e2e", name: "Neural net, end to end" },
] as const;

export default function Latency() {
  const mode = useTheme();
  const [xAxis, setXAxis] = useState<"window" | "endtoend">("window");
  const [pick, setPick] = useState(6);
  const colors = GESTURE_COLORS[mode];
  const sweep = latency.sweep;

  const best = latency.knees.td_lda_znorm;
  const row = sweep[Math.min(pick, sweep.length - 1)];
  // quote compute at the knee, not at whichever window happens to be first
  const kneeRow = sweep.find((r) => r.window_ms === best.knee_window_ms) ?? sweep[0];

  const xOf = (r: (typeof sweep)[number], m: string) =>
    xAxis === "window"
      ? r.window_ms
      : r.window_ms + (m.startsWith("cnn") ? r.timing.cnn_cpu_ms : r.timing.td_features_ms);

  const series = MODELS.map((m, i) => ({
    name: m.name,
    color: [colors[1], colors[3], colors[4], colors[2]][i],
    dashed: m.key.startsWith("cnn"),
    points: sweep.map((r) => {
      const e = r.models[m.key as keyof typeof r.models];
      return { x: xOf(r, m.key), y: e.accuracy, lo: e.accuracy_ci[0], hi: e.accuracy_ci[1] };
    }),
  }));

  return (
    <Section
      id="latency"
      eyebrow="04 · Speed"
      title="How fast can you read a hand?"
      lede={
        <>
          If a decoder needs a full second of muscle activity before it answers, it is no
          good for controlling anything. Every point here is tested on a person the model
          has not seen. I also kept the step between windows fixed, so each setting trains
          on the same amount of data and the curve shows the effect of window length on
          its own.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value={`${best.knee_window_ms} ms`} label="Sweet spot"
              sub={`Shortest window still within 1 point of the best score (${pct(best.peak_accuracy)})`} tone="accent" />
        <Stat value={pct(sweep[0].models.td_lda_znorm.accuracy)} label={`With only ${sweep[0].window_ms} ms`}
              sub="Even a flicker of muscle activity carries something" />
        <Stat value={`${kneeRow.timing.td_features_ms.toFixed(2)} ms`} label="Compute per decode"
              sub={`Measuring and classifying at ${best.knee_window_ms} ms, on one core`} />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-medium">Accuracy against how long you wait</h3>
          <Toggle value={xAxis} onChange={setXAxis} label="x-axis"
                  options={[{ value: "window", label: "Wait only" },
                            { value: "endtoend", label: "Plus compute" }]} />
        </div>
        <LineChart
          series={series}
          height={340}
          yDomain={[0.74, 1.0]}
          xLabel={xAxis === "window" ? "Length of signal used (ms)" : "Total time before an answer (ms)"}
          yLabel="Accuracy on a new person"
          logScale
          xTicks={[25, 50, 100, 200, 400, 1000]}
          fmtX={(v) => String(Math.round(v))}
          fmtY={(v) => `${Math.round(v * 100)}%`}
          fmtTipX={(v) => `${Math.round(v)} ms`}
          fmtTipY={(v) => pct(v, 1)}
          annotations={[{ x: best.knee_window_ms, label: `sweet spot, ${best.knee_window_ms} ms` }]}
        />
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          The shaded bands show how much the score moves depending on which people you
          test on. They are wide because eight people is not many. That width is real
          uncertainty, so I left it in rather than hiding it.
        </p>
        <TableView
          headers={["Signal used (ms)", "1993, rescaled", "1993", "Net + classifier", "Net, end to end", "Compute (ms)"]}
          rows={sweep.map((r) => [
            r.window_ms,
            pct(r.models.td_lda_znorm.accuracy, 2),
            pct(r.models.td_lda.accuracy, 2),
            pct(r.models.cnn_latent_logreg.accuracy, 2),
            pct(r.models.cnn_e2e.accuracy, 2),
            r.timing.td_features_ms.toFixed(3),
          ])}
        />
      </Card>

      <Card className="mt-4">
        <h3 className="mb-3 text-[14px] font-medium">Pick how long you are willing to wait</h3>
        <input
          type="range" min={0} max={sweep.length - 1} value={pick}
          onChange={(e) => setPick(Number(e.target.value))}
          className="focusable w-full accent-[var(--accent)]"
          aria-label="Length of signal used"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="tnum font-[family-name:var(--font-mono)] text-4xl" style={{ color: "var(--accent)" }}>
            {row.window_ms}<span className="text-xl"> ms</span>
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            An answer every <strong style={{ color: "var(--text-primary)" }}>{row.window_ms} ms</strong>{" "}
            <Inferred>assumes 1 kHz</Inferred>, at{" "}
            <strong style={{ color: "var(--text-primary)" }}>{pct(row.models.td_lda_znorm.accuracy)}</strong>{" "}
            accuracy on someone the model has never seen. The maths takes{" "}
            {row.timing.td_features_ms.toFixed(2)} ms, so waiting for the signal costs{" "}
            {Math.round(row.window_ms / row.timing.td_features_ms)} times more time than
            the computing does. Speed here is about biology, not hardware.
          </p>
        </div>
      </Card>
    </Section>
  );
}
