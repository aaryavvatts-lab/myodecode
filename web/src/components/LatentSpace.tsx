"use client";

import { useEffect, useMemo, useState } from "react";
import { GESTURE_COLORS, GESTURE_NAMES, GESTURE_SHAPES } from "@/lib/palette";
import { Card, Section, Stat, Toggle, useElementWidth, useTheme } from "./ui";
import { pct } from "@/lib/format";

interface Latent {
  window_ms: number; loso_accuracy: number;
  silhouette: Record<"cnn_latent" | "td_features", { by_gesture: number; by_subject: number }>;
  points: {
    gesture: number[]; subject: number[];
    projections: Record<"cnn_latent" | "td_features", number[][]>;
  };
  interpretation: string;
}

const SUBJECT_GREYS_L = ["#111", "#333", "#4d4d4d", "#666", "#808080", "#999", "#b3b3b3", "#cccccc"];
const SUBJECT_GREYS_D = ["#fff", "#e0e0e0", "#c4c4c4", "#a8a8a8", "#8c8c8c", "#707070", "#585858", "#444"];

function Marker({ shape, x, y, r, fill, opacity }: {
  shape: string; x: number; y: number; r: number; fill: string; opacity: number;
}) {
  const p = { fill, opacity };
  if (shape === "square") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} {...p} />;
  if (shape === "triangle") return <polygon points={`${x},${y - r * 1.2} ${x + r},${y + r * 0.8} ${x - r},${y + r * 0.8}`} {...p} />;
  if (shape === "diamond") return <polygon points={`${x},${y - r * 1.3} ${x + r * 1.1},${y} ${x},${y + r * 1.3} ${x - r * 1.1},${y}`} {...p} />;
  if (shape === "cross") return <path d={`M${x - r},${y}h${r * 2}M${x},${y - r}v${r * 2}`} stroke={fill} strokeWidth={r * 0.75} opacity={opacity} fill="none" strokeLinecap="round" />;
  return <circle cx={x} cy={y} r={r} {...p} />;
}

function Scatter({ pts, colorBy, gesture, subject, mode }: {
  pts: number[][]; colorBy: "gesture" | "subject"; gesture: number[]; subject: number[]; mode: "light" | "dark";
}) {
  const [ref, w] = useElementWidth<HTMLDivElement>();
  const h = 340;
  const pad = 14;
  const gcol = GESTURE_COLORS[mode];
  const scol = mode === "dark" ? SUBJECT_GREYS_D : SUBJECT_GREYS_L;
  const [xs, ys] = useMemo(() => [pts.map((p) => p[0]), pts.map((p) => p[1])], [pts]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const W = Math.max(w, 200);
  const sx = (v: number) => pad + ((v - x0) / (x1 - x0 || 1)) * (W - pad * 2);
  const sy = (v: number) => h - pad - ((v - y0) / (y1 - y0 || 1)) * (h - pad * 2);

  // centroid labels give gesture identity a colour-independent anchor
  const centroids = useMemo(() => {
    if (colorBy !== "gesture") return [];
    return [0, 1, 2, 3, 4].map((g) => {
      const idx = gesture.map((v, i) => (v === g ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return null;
      return { g, x: idx.reduce((a, i) => a + pts[i][0], 0) / idx.length, y: idx.reduce((a, i) => a + pts[i][1], 0) / idx.length };
    }).filter(Boolean) as { g: number; x: number; y: number }[];
  }, [pts, gesture, colorBy]);

  return (
    <div ref={ref} className="w-full">
      <svg width="100%" height={h} viewBox={`0 0 ${W} ${h}`} role="img"
           aria-label={`Two-dimensional projection coloured by ${colorBy}`}>
        <rect width={W} height={h} rx={8} fill="var(--surface-2)" />
        {pts.map((p, i) => (
          <Marker key={i}
            shape={colorBy === "gesture" ? GESTURE_SHAPES[gesture[i]] : "circle"}
            x={sx(p[0])} y={sy(p[1])} r={colorBy === "gesture" ? 2.4 : 2}
            fill={colorBy === "gesture" ? gcol[gesture[i]] : scol[subject[i] - 1]}
            opacity={0.62} />
        ))}
        {centroids.map((c) => (
          <g key={c.g}>
            <text x={sx(c.x)} y={sy(c.y)} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 12, fontWeight: 700, fill: "var(--surface-2)", stroke: "var(--surface-2)", strokeWidth: 5, paintOrder: "stroke" }}>
              {GESTURE_NAMES[c.g]}
            </text>
            <text x={sx(c.x)} y={sy(c.y)} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 12, fontWeight: 700, fill: gcol[c.g] }}>
              {GESTURE_NAMES[c.g]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function LatentSpace() {
  const mode = useTheme();
  const [d, setD] = useState<Latent | null>(null);
  const [space, setSpace] = useState<"cnn_latent" | "td_features">("cnn_latent");
  const [colorBy, setColorBy] = useState<"gesture" | "subject">("gesture");

  useEffect(() => { fetch("/data/latent.json").then((r) => r.json()).then(setD).catch(() => {}); }, []);

  const sil = d?.silhouette[space];

  return (
    <Section
      id="latent"
      eyebrow="05 — Representation"
      title="Did it learn gestures, or did it learn people?"
      lede={
        <>
          A decoder that generalises should organise its internal representation by what the
          hand is doing and stay indifferent to whose arm it is on. Colour the same projection
          two ways and the answer is visible. Silhouette score makes it a number: high by
          gesture is the goal, high by subject means capacity is going into memorising wearers.
        </>
      }
    >
      {!d ? (
        <Card><div className="h-72 animate-pulse rounded-lg" style={{ background: "var(--surface-2)" }} /></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat value={sil!.by_gesture.toFixed(3)} label="Silhouette by gesture" sub="Higher is better" tone="accent" />
            <Stat value={sil!.by_subject.toFixed(3)} label="Silhouette by subject" sub="Lower is better" />
            <Stat value={(sil!.by_gesture - sil!.by_subject).toFixed(3)} label="Margin"
                  sub="How much more it cares about the gesture than the wearer" />
          </div>

          <Card className="mt-6">
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <Toggle label="Space" value={space} onChange={setSpace}
                      options={[{ value: "cnn_latent", label: "CNN latent (64-d)" },
                                { value: "td_features", label: "Hand-crafted features (20-d)" }]} />
              <Toggle label="Colour by" value={colorBy} onChange={setColorBy}
                      options={[{ value: "gesture", label: "Gesture" }, { value: "subject", label: "Subject" }]} />
            </div>

            <Scatter pts={d.points.projections[space]} colorBy={colorBy}
                     gesture={d.points.gesture} subject={d.points.subject} mode={mode} />

            {colorBy === "gesture" ? (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {GESTURE_NAMES.map((n, i) => (
                  <span key={n} className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <Marker shape={GESTURE_SHAPES[i]} x={6} y={6} r={4} fill={GESTURE_COLORS[mode][i]} opacity={1} />
                    </svg>
                    {n}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                Shaded light to dark by subject 1–8. If the points formed eight clean blobs
                here, the representation would be about people rather than hands.
              </p>
            )}

            <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              UMAP projection of {d.points.gesture.length.toLocaleString()} windows, each
              embedded by the model that had that subject held out. The projection is for
              looking at; the silhouette scores are computed in the full-dimensional space,
              not on these two axes.
            </p>
          </Card>

          <Card className="mt-4">
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Both representations separate gestures far more strongly than they separate
              people, which is why leave-one-subject-out accuracy holds up at all. Notice
              that the twenty hand-crafted numbers do about as well as the sixty-four learned
              ones — the encoder is not finding structure the feature set missed.
            </p>
          </Card>
        </>
      )}
    </Section>
  );
}
