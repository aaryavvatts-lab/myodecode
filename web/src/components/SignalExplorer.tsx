"use client";

import { useEffect, useMemo, useState } from "react";
import { CHANNEL_COLORS, GESTURE_COLORS } from "@/lib/palette";
import { Card, Inferred, Section, Toggle, useElementWidth, useTheme } from "./ui";

interface Signals {
  fs: number; decimated_fs: number; envelope_fs: number; scale: number; seconds: number;
  subjects: number[]; classes: number[];
  class_labels: Record<string, string>;
  class_signatures: Record<string, { dominant: number | null; share: number[]; total: number; note: string }>;
  signals: Record<string, { raw: number[][]; envelope: number[][] }>;
}

function Trace({ data, color, height, scale, sharedMax, area }: {
  data: number[]; color: string; height: number; scale: number;
  sharedMax?: number; area?: boolean;
}) {
  const [ref, w] = useElementWidth<HTMLDivElement>();
  const W = Math.max(w, 100);
  const { line, fill } = useMemo(() => {
    if (!data.length) return { line: "", fill: "" };
    const n = data.length;
    // A shared maximum keeps the between-channel amplitude ratios -- which are what
    // actually distinguish the gestures -- visible. Per-trace scaling is only for
    // inspecting waveform shape.
    const amp = (sharedMax ?? Math.max(...data.map(Math.abs))) * scale || 1;
    const px = (i: number) => ((i / (n - 1)) * W).toFixed(1);
    if (area) {
      // A rectified envelope is non-negative, so anchor it to a baseline instead of
      // wasting half the lane mirroring it about a midline.
      const y = (v: number) => (height - 1 - (Math.abs(v) * scale / amp) * (height - 3)).toFixed(1);
      const l = data.map((v, i) => `${i ? "L" : "M"}${px(i)},${y(v)}`).join("");
      return { line: l, fill: `${l}L${W},${height}L0,${height}Z` };
    }
    const y = (v: number) => (height / 2 - (v * scale / amp) * (height / 2 - 2)).toFixed(1);
    return { line: data.map((v, i) => `${i ? "L" : "M"}${px(i)},${y(v)}`).join(""), fill: "" };
  }, [data, W, height, scale, sharedMax, area]);

  return (
    <div ref={ref} className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        {area ? (
          <line x1={0} x2={W} y1={height - 1} y2={height - 1} stroke="var(--grid)" strokeWidth={1} />
        ) : (
          <line x1={0} x2={W} y1={height / 2} y2={height / 2} stroke="var(--grid)" strokeWidth={1} />
        )}
        {fill && <path d={fill} fill={color} opacity={0.3} />}
        <path d={line} fill="none" stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export default function SignalExplorer() {
  const mode = useTheme();
  const [sig, setSig] = useState<Signals | null>(null);
  const [subject, setSubject] = useState(1);
  const [cls, setCls] = useState(1);
  const [view, setView] = useState<"raw" | "envelope">("envelope");

  useEffect(() => {
    fetch("/data/signals.json").then((r) => r.json()).then(setSig).catch(() => {});
  }, []);

  const key = `${subject}_${cls}`;
  const entry = sig?.signals[key];
  const gcol = GESTURE_COLORS[mode];
  const ccol = CHANNEL_COLORS[mode];
  const sigInfo = sig?.class_signatures[String(cls)];
  const sharedMax = entry
    ? Math.max(...entry.envelope.flat().map(Math.abs))
    : undefined;

  return (
    <Section
      id="data"
      eyebrow="02 — The data"
      title="Four electrodes, eight people, five things a hand can do"
      lede={
        <>
          Forty recordings of about twenty seconds each, sampled at 1&nbsp;kHz<Inferred />.
          The dataset ships no gesture names, so each class is described by what its
          muscles actually do. Class&nbsp;0 is near-silent on every channel in every
          subject, which is why it is called Rest.
        </>
      }
    >
      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <Toggle label="Subject" value={String(subject)} onChange={(v) => setSubject(Number(v))}
                  options={(sig?.subjects ?? [1, 2, 3, 4, 5, 6, 7, 8]).map((s) => ({ value: String(s), label: String(s) }))} />
          <Toggle label="View" value={view} onChange={setView}
                  options={[{ value: "raw", label: "Raw" }, { value: "envelope", label: "Envelope" }]} />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((c) => (
            <button key={c} onClick={() => setCls(c)}
              className="focusable rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors"
              style={cls === c
                ? { background: gcol[c], color: "#fff", borderColor: gcol[c] }
                : { color: "var(--text-secondary)" }}>
              {sig?.class_labels[String(c)] ?? `Class ${c}`}
            </button>
          ))}
        </div>

        {sigInfo && (
          <p className="mb-5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {sig?.class_labels[String(cls)]}
            </span>{" "}
            — {sigInfo.note}; total activation{" "}
            <span className="tnum font-[family-name:var(--font-mono)]">{sigInfo.total.toFixed(2)}×</span>{" "}
            the subject average
            {sigInfo.dominant && (
              <>, led by channel <span className="font-[family-name:var(--font-mono)]">{sigInfo.dominant}</span>{" "}
                — the same channel in all eight subjects</>
            )}.
          </p>
        )}

        {entry ? (
          <div className="space-y-1">
            {[0, 1, 2, 3].map((ch) => (
              <div key={ch} className="grid grid-cols-[3.4rem_1fr] items-center gap-2">
                <span className="font-[family-name:var(--font-mono)] text-[11px]" style={{ color: ccol[ch] }}>
                  ch {ch + 1}
                </span>
                <Trace
                  data={view === "raw" ? entry.raw[ch] : entry.envelope[ch]}
                  color={ccol[ch]}
                  height={view === "raw" ? 46 : 38}
                  scale={sig!.scale}
                  sharedMax={view === "envelope" ? sharedMax : undefined}
                  area={view === "envelope"}
                />
              </div>
            ))}
            <div className="grid grid-cols-[3.4rem_1fr] gap-2 pt-1">
              <span />
              <div className="flex justify-between text-[11px]" style={{ color: "var(--text-muted)" }}>
                <span>0 s</span><span>{sig!.seconds} s</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 animate-pulse rounded-lg" style={{ background: "var(--surface-2)" }} />
        )}

        <p className="mt-5 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text-secondary)" }}>Raw</strong> scales each channel
          independently so its waveform shape stays visible.{" "}
          <strong style={{ color: "var(--text-secondary)" }}>Envelope</strong> rectifies and
          smooths, and shares one scale across all four channels — that view is where the
          gesture&apos;s signature is legible, because it is the <em>ratio</em> between
          channels, not any single one, that identifies the gesture. Absolute amplitudes
          differ several-fold between people, which is exactly what the decoder must survive.
        </p>
      </Card>
    </Section>
  );
}
