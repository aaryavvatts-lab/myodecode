"use client";

import { useState } from "react";
import latency from "@/results/latency.json";
import { LineChart } from "./charts";
import { Card, Inferred, Section, Stat, TableView, Toggle, useTheme } from "./ui";
import { GESTURE_COLORS } from "@/lib/palette";
import { pct } from "@/lib/format";

const MODELS = [
  { key: "td_lda_znorm", name: "Features + LDA (normalised)" },
  { key: "td_lda", name: "Features + LDA" },
  { key: "cnn_latent_logreg", name: "CNN latent + logistic" },
  { key: "cnn_e2e", name: "CNN end-to-end" },
] as const;

export default function Latency() {
  const mode = useTheme();
  const [xAxis, setXAxis] = useState<"window" | "endtoend">("window");
  const [pick, setPick] = useState(6);
  const colors = GESTURE_COLORS[mode];
  const sweep = latency.sweep;

  const best = latency.knees.td_lda_znorm;
  const row = sweep[Math.min(pick, sweep.length - 1)];

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
      eyebrow="03 — Latency"
      title="How fast can you read a hand?"
      lede={
        <>
          A decoder that needs a full second of muscle activity is useless for controlling
          anything. Every point is leave-one-subject-out, and the hop between windows is
          held fixed across the sweep, so the curve reflects window length alone rather
          than how much training data each setting happened to produce.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value={`${best.knee_window_ms} ms`} label="The knee"
              sub={`Shortest window within 1 pp of peak (${pct(best.peak_accuracy)})`} tone="accent" />
        <Stat value={pct(sweep[0].models.td_lda_znorm.accuracy)} label={`At ${sweep[0].window_ms} ms`}
              sub="Even a single blink of muscle carries signal" />
        <Stat value={`${sweep[0].timing.td_features_ms.toFixed(2)} ms`} label="Compute per decode"
              sub="Feature extraction + linear model, one core" />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-medium">Accuracy against decision latency</h3>
          <Toggle value={xAxis} onChange={setXAxis} label="x-axis"
                  options={[{ value: "window", label: "Window only" },
                            { value: "endtoend", label: "+ compute" }]} />
        </div>
        <LineChart
          series={series}
          height={340}
          yDomain={[0.75, 1]}
          xLabel={xAxis === "window" ? "Window length (ms, log scale)" : "End-to-end latency (ms, log scale)"}
          yLabel="LOSO accuracy"
          logScale
          xTicks={[25, 50, 100, 200, 400, 1000]}
          fmtX={(v) => String(Math.round(v))}
          fmtY={(t) => `${Math.round((0.75 + t * 0.25) * 100)}%`}
          fmtTipX={(v) => `${Math.round(v)} ms`}
          fmtTipY={(v) => pct(v, 1)}
          annotations={[{ x: best.knee_window_ms, label: `knee ${best.knee_window_ms} ms` }]}
        />
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Shaded bands are bootstrap 95% confidence intervals over the eight subjects. They
          are wide because eight people is not many — that width is the honest uncertainty,
          not noise to be smoothed away.
        </p>
        <TableView
          headers={["Window (ms)", "Features+LDA (norm.)", "Features+LDA", "CNN latent", "CNN e2e", "Compute (ms)"]}
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
        <h3 className="mb-3 text-[14px] font-medium">Pick a latency budget</h3>
        <input
          type="range" min={0} max={sweep.length - 1} value={pick}
          onChange={(e) => setPick(Number(e.target.value))}
          className="focusable w-full accent-[var(--accent)]"
          aria-label="Window length"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="tnum font-[family-name:var(--font-mono)] text-4xl" style={{ color: "var(--accent)" }}>
            {row.window_ms}<span className="text-xl"> ms</span>
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            A decision every <strong style={{ color: "var(--text-primary)" }}>{row.window_ms} ms</strong>{" "}
            <Inferred>assumes 1 kHz</Inferred>, at{" "}
            <strong style={{ color: "var(--text-primary)" }}>{pct(row.models.td_lda_znorm.accuracy)}</strong>{" "}
            accuracy on a person the model has never seen. Computing it takes{" "}
            {row.timing.td_features_ms.toFixed(2)} ms, so the window is{" "}
            {Math.round(row.window_ms / row.timing.td_features_ms)}× more expensive than the maths.
          </p>
        </div>
      </Card>
    </Section>
  );
}
