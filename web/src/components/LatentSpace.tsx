"use client";

import { useEffect, useMemo, useState } from "react";
import { GESTURE_COLORS, GESTURE_NAMES, GESTURE_SHAPES } from "@/lib/palette";
import { Card, Section, Stat, Toggle, useElementWidth, useTheme } from "./ui";
import { pct } from "@/lib/format";

interface Latent {
  window_ms: number; loso_accuracy: number;
  silhouette: Record<"cnn_latent" | "td_features", { by_gesture: number; by_subject: number }>;
  cluster_purity: Record<"cnn_latent" | "td_features", {
    n_clusters: number; purity_by_gesture: number; purity_by_subject: number;
    chance_purity_by_subject: number;
  }>;
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

  // Centroid labels anchor gesture identity without relying on colour. When a
  // representation is scattered rather than clustered, the centroids collapse toward
  // the middle and the labels pile up, so drop any that would overlap. The legend
  // still carries identity in that case.
  const centroids = useMemo(() => {
    if (colorBy !== "gesture") return [];
    const all = [0, 1, 2, 3, 4].map((g) => {
      const idx: number[] = [];
      gesture.forEach((v, i) => { if (v === g) idx.push(i); });
      if (!idx.length) return null;
      const cx = idx.reduce((a, i) => a + pts[i][0], 0) / idx.length;
      const cy = idx.reduce((a, i) => a + pts[i][1], 0) / idx.length;
      // how tightly that gesture actually sits around its centre
      const spread = Math.sqrt(idx.reduce((a, i) =>
        a + (pts[i][0] - cx) ** 2 + (pts[i][1] - cy) ** 2, 0) / idx.length);
      return { g, x: cx, y: cy, spread };
    }).filter(Boolean) as { g: number; x: number; y: number; spread: number }[];

    const kept: typeof all = [];
    for (const c of all.sort((a, b) => a.spread - b.spread)) {
      const clash = kept.some((k) => Math.hypot(k.x - c.x, k.y - c.y) < 0.55);
      if (!clash) kept.push(c);
    }
    return kept;
  }, [pts, gesture, colorBy]);

  return (
    <div ref={ref} className="w-full">
      <svg width="100%" height={h} viewBox={`0 0 ${W} ${h}`} role="img"
           aria-label={`Flattened two-dimensional view, coloured by ${colorBy}`}>
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
  const pur = d?.cluster_purity[space];

  return (
    <Section
      id="latent"
      eyebrow="08 · Inside the model"
      title="Did it learn gestures, or did it learn people?"
      lede={
        <>
          If a decoder is going to work on a stranger, what it stores internally should be
          sorted by what the hand is doing, not by whose arm it is on. Below is the same
          data coloured two ways, with a score for how tidily it groups. High by gesture is
          good. High by person means the model is spending its effort remembering
          individual people instead. The two approaches come out very differently here.
        </>
      }
    >
      {!d ? (
        <Card><div className="h-72 animate-pulse rounded-lg" style={{ background: "var(--surface-2)" }} /></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat value={sil!.by_gesture.toFixed(3)} label="Grouped by gesture" sub="Higher is better" tone="accent" />
            <Stat value={sil!.by_subject.toFixed(3)} label="Grouped by person" sub="Lower is better" />
            <Stat value={(sil!.by_gesture - sil!.by_subject).toFixed(3)} label="Gesture minus person"
                  sub={sil!.by_gesture > sil!.by_subject
                    ? "Positive, so it cares more about the gesture. Good."
                    : "Negative, so it groups more by person than by gesture."}
                  tone={sil!.by_gesture > sil!.by_subject ? "accent" : "warn"} />
          </div>

          <Card className="mt-6">
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <Toggle label="Space" value={space} onChange={setSpace}
                      options={[{ value: "cnn_latent", label: "What the neural net stores" },
                                { value: "td_features", label: "The 20 simple measurements" }]} />
              <Toggle label="Colour by" value={colorBy} onChange={setColorBy}
                      options={[{ value: "gesture", label: "Gesture" }, { value: "subject", label: "Person" }]} />
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
                Shaded light to dark for people 1 through 8. If these formed eight tidy
                blobs, the model would be sorting by person rather than by gesture. They
                do not, which is the point.
              </p>
            )}

            <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              This flattens {d.points.gesture.length.toLocaleString()} windows down to two
              dimensions so they fit on a screen. Each person was run through the model
              that had never trained on them. The flattening is only for looking at. The
              scores above are worked out in the full space, not from these two axes.
            </p>
          </Card>

          <Card className="mt-4">
            <h3 className="mb-1 text-[14px] font-medium">This one surprised me</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              The twenty numbers I work out by hand group strongly by gesture
              ({d.silhouette.td_features.by_gesture.toFixed(3)}) and slightly less than
              randomly by person ({d.silhouette.td_features.by_subject.toFixed(3)}). That
              is exactly what you want. Whatever they are measuring is about the hand, and
              they are close to blind to whose arm it is.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              The neural network does the opposite. Its sixty-four numbers group only
              weakly by gesture ({d.silhouette.cnn_latent.by_gesture.toFixed(3)}) and more
              strongly by person ({d.silhouette.cnn_latent.by_subject.toFixed(3)}). Given
              free rein to learn any representation it liked, a good chunk of what it
              chose to encode was who was wearing the sensors. Nobody asked it to do that,
              and it is of no use for reading gestures off a stranger.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              It still classifies well, because the linear layer on top can pull out the
              gesture part and ignore the rest. But it explains why it never pulled ahead.
              It spent capacity on something that does not help. Both numbers are small in
              absolute terms, which is normal when you measure grouping in this many
              dimensions. What matters is which way round they sit.
            </p>
          </Card>

          <Card className="mt-4">
            <h3 className="mb-1 text-[14px] font-medium">Look at the shape of it</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Switch the view above to what the network stores and you get a scatter of
              small islands instead of a few big groups. I counted them. There are{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {d.cluster_purity.cnn_latent.n_clusters}
              </strong>
              , against eight people doing five gestures, which is forty combinations. Then
              I checked what each island is made of.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(["td_features", "cnn_latent"] as const).map((k) => {
                const c = d.cluster_purity[k];
                const label = k === "cnn_latent" ? "What the network stores" : "The 20 hand-computed numbers";
                return (
                  <div key={k} className="rounded-lg border p-3" style={{ background: "var(--surface-2)" }}>
                    <div className="text-[12px] font-medium">{label}</div>
                    <dl className="mt-2 space-y-1 text-[12px]">
                      <div className="flex justify-between">
                        <dt style={{ color: "var(--text-muted)" }}>Islands</dt>
                        <dd className="tnum font-[family-name:var(--font-mono)]">{c.n_clusters}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt style={{ color: "var(--text-muted)" }}>Same gesture</dt>
                        <dd className="tnum font-[family-name:var(--font-mono)]">{pct(c.purity_by_gesture, 1)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt style={{ color: "var(--text-muted)" }}>Same person</dt>
                        <dd className="tnum font-[family-name:var(--font-mono)]"
                            style={{ color: c.purity_by_subject > 0.5 ? "var(--warn)" : undefined }}>
                          {pct(c.purity_by_subject, 1)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Every island in the network&apos;s space holds exactly one person. Not most of
              one, all of one. The hand-computed numbers land at{" "}
              {pct(d.cluster_purity.td_features.purity_by_subject, 1)}, which is what you get
              by chance with eight people ({pct(d.cluster_purity.td_features.chance_purity_by_subject, 1)}).
              So the network did not build a space of gestures that happens to vary between
              people. It built a space of people, and put the gestures inside each one.
            </p>
            <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Islands are found with DBSCAN on the flattened view, so the count depends on
              the settings. The gap between 100% and 14% does not.
            </p>
          </Card>
        </>
      )}
    </Section>
  );
}
