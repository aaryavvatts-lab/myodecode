"use client";

/** Small hand-rolled SVG chart primitives. Thin marks, recessive grid, hover layer. */

import { useState } from "react";
import { Tip, useElementWidth } from "./ui";

export interface Pt { x: number; y: number; lo?: number; hi?: number; }

export function scaleLinear(d0: number, d1: number, r0: number, r1: number) {
  const s = (x: number) => r0 + ((x - d0) / (d1 - d0 || 1)) * (r1 - r0);
  s.invert = (p: number) => d0 + ((p - r0) / (r1 - r0 || 1)) * (d1 - d0);
  return s;
}

export function Axes({
  w, h, m, xTicks, yTicks, xLabel, yLabel, fmtX, fmtY, logX,
}: {
  w: number; h: number; m: { t: number; r: number; b: number; l: number };
  xTicks: number[]; yTicks: number[]; xLabel: string; yLabel: string;
  fmtX: (v: number) => string; fmtY: (v: number) => string;
  logX?: (v: number) => number;
}) {
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  return (
    <g>
      {yTicks.map((t) => {
        const y = m.t + ih * (1 - t);
        return (
          <g key={`y${t}`}>
            <line x1={m.l} x2={m.l + iw} y1={y} y2={y} stroke="var(--grid)" strokeWidth={1} />
            <text x={m.l - 8} y={y + 4} textAnchor="end" className="tnum"
                  style={{ fontSize: 11, fill: "var(--text-muted)" }}>{fmtY(t)}</text>
          </g>
        );
      })}
      {xTicks.map((t) => {
        const x = logX ? logX(t) : t;
        return (
          <text key={`x${t}`} x={x} y={m.t + ih + 18} textAnchor="middle" className="tnum"
                style={{ fontSize: 11, fill: "var(--text-muted)" }}>{fmtX(t)}</text>
        );
      })}
      <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke="var(--border-strong)" strokeWidth={1} />
      <text x={m.l + iw / 2} y={h - 2} textAnchor="middle" style={{ fontSize: 11, fill: "var(--text-muted)" }}>{xLabel}</text>
      <text transform={`translate(11,${m.t + ih / 2}) rotate(-90)`} textAnchor="middle"
            style={{ fontSize: 11, fill: "var(--text-muted)" }}>{yLabel}</text>
    </g>
  );
}

/** Multi-series line chart with a shared crosshair tooltip. */
export function LineChart({
  series, height = 320, xLabel, yLabel, yDomain, xTicks, fmtX, fmtY, fmtTipX, fmtTipY, logScale, annotations,
}: {
  series: { name: string; color: string; points: Pt[]; dashed?: boolean }[];
  height?: number; xLabel: string; yLabel: string;
  yDomain?: [number, number]; xTicks?: number[];
  fmtX?: (v: number) => string; fmtY?: (v: number) => string;
  fmtTipX?: (v: number) => string; fmtTipY?: (v: number) => string;
  logScale?: boolean;
  annotations?: { x: number; label: string }[];
}) {
  const [ref, w] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { t: 16, r: 18, b: 40, l: 52 };
  const h = height;
  const iw = Math.max(120, w - m.l - m.r), ih = h - m.t - m.b;

  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const tf = (v: number) => (logScale ? Math.log10(Math.max(v, 1e-9)) : v);
  const x0 = tf(Math.min(...xs)), x1 = tf(Math.max(...xs));
  const ally = series.flatMap((s) => s.points.flatMap((p) => [p.lo ?? p.y, p.hi ?? p.y]));
  const [y0, y1] = yDomain ?? [Math.min(...ally) - 0.02, Math.max(...ally) + 0.02];

  const sx = scaleLinear(x0, x1, m.l, m.l + iw);
  const sy = scaleLinear(y0, y1, m.t + ih, m.t);
  const yFracs = [0, 0.25, 0.5, 0.75, 1];
  const clipId = `clip-${xLabel.replace(/\W/g, "")}-${series.length}`;
  const ticks = xTicks ?? [...new Set(xs)].sort((a, b) => a - b);

  const idxOf = (px: number) => {
    const target = sx.invert(px);
    let best = 0, bd = Infinity;
    series[0].points.forEach((p, i) => { const d = Math.abs(tf(p.x) - target); if (d < bd) { bd = d; best = i; } });
    return best;
  };

  return (
    <div ref={ref} className="relative w-full">
      <svg width="100%" height={h} viewBox={`0 0 ${Math.max(w, 200)} ${h}`} role="img"
           onMouseMove={(e) => {
             const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
             setHover(idxOf(((e.clientX - r.left) / r.width) * Math.max(w, 200)));
           }}
           onMouseLeave={() => setHover(null)}>
        <defs>
          <clipPath id={clipId}>
            <rect x={m.l} y={m.t} width={iw} height={ih} />
          </clipPath>
        </defs>
        <Axes w={Math.max(w, 200)} h={h} m={m} xTicks={ticks} yTicks={yFracs}
              xLabel={xLabel} yLabel={yLabel}
              fmtX={fmtX ?? ((v) => String(v))}
              fmtY={(t) => (fmtY ?? ((v: number) => `${Math.round(v * 100)}%`))(y0 + t * (y1 - y0))}
              logX={(v) => sx(tf(v))} />
        {annotations?.map((a) => (
          <g key={a.label}>
            <line x1={sx(tf(a.x))} x2={sx(tf(a.x))} y1={m.t} y2={m.t + ih}
                  stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="3 3" />
            <text x={sx(tf(a.x)) + 5} y={m.t + 12} style={{ fontSize: 10, fill: "var(--text-muted)" }}>{a.label}</text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.name} clipPath={`url(#${clipId})`}>
            {s.points.some((p) => p.lo !== undefined) && (
              <path d={`${s.points.map((p, i) => `${i ? "L" : "M"}${sx(tf(p.x))},${sy(p.hi ?? p.y)}`).join("")}
                        ${s.points.slice().reverse().map((p) => `L${sx(tf(p.x))},${sy(p.lo ?? p.y)}`).join("")}Z`}
                    fill={s.color} opacity={0.10} />
            )}
            <path d={s.points.map((p, i) => `${i ? "L" : "M"}${sx(tf(p.x))},${sy(p.y)}`).join("")}
                  fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                  strokeDasharray={s.dashed ? "5 4" : undefined} />
            {s.points.map((p, i) => (
              <circle key={i} cx={sx(tf(p.x))} cy={sy(p.y)} r={hover === i ? 5 : 3.5}
                      fill={s.color} stroke="var(--surface-0)" strokeWidth={2} />
            ))}
          </g>
        ))}
        {hover !== null && (
          <line x1={sx(tf(series[0].points[hover].x))} x2={sx(tf(series[0].points[hover].x))}
                y1={m.t} y2={m.t + ih} stroke="var(--border-strong)" strokeWidth={1} />
        )}
      </svg>
      {hover !== null && (
        <Tip x={(sx(tf(series[0].points[hover].x)) / Math.max(w, 200)) * w} y={m.t + 6}>
          <div className="mb-1 font-medium">{(fmtTipX ?? String)(series[0].points[hover].x)}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span style={{ color: "var(--text-secondary)" }}>{s.name}</span>
              <span className="tnum ml-auto font-[family-name:var(--font-mono)]">
                {(fmtTipY ?? ((v: number) => v.toFixed(3)))(s.points[hover]?.y ?? NaN)}
              </span>
            </div>
          ))}
        </Tip>
      )}
      <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  if (items.length < 2) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.name} className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: i.color }} />
          {i.name}
        </span>
      ))}
    </div>
  );
}

/** Horizontal bars, 4px rounded data-end anchored to the baseline. */
export function BarRow({
  label, value, max, color, note, highlight, refLine, excessColor,
}: {
  label: React.ReactNode; value: number; max: number; color: string;
  note?: string; highlight?: boolean;
  /** Draws a marker at this value; the part of the bar beyond it is hatched, so the
   *  excess over a baseline is visible without truncating the axis. */
  refLine?: number; excessColor?: string;
}) {
  const over = refLine !== undefined && value > refLine;
  const bar = (
    <div className="relative h-7 overflow-hidden rounded-[4px]" style={{ background: "var(--surface-2)" }}>
      <div className="absolute inset-y-0 left-0 rounded-[4px]" style={{
        width: `${(value / max) * 100}%`, background: color,
        outline: highlight ? "2px solid var(--text-primary)" : undefined, outlineOffset: -1,
      }} />
      {over && (
        <div className="absolute inset-y-0" style={{
          left: `${(refLine! / max) * 100}%`, width: `${((value - refLine!) / max) * 100}%`,
          backgroundImage: `repeating-linear-gradient(135deg, ${excessColor ?? "rgba(255,255,255,.55)"} 0 2px, transparent 2px 5px)`,
        }} />
      )}
      {refLine !== undefined && (
        <div className="absolute inset-y-0 w-px" style={{ left: `${(refLine / max) * 100}%`, background: "var(--text-primary)", opacity: 0.75 }} />
      )}
      {note && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {note}
        </span>
      )}
    </div>
  );
  const readout = (
    <span className="tnum font-[family-name:var(--font-mono)] text-[13px]">
      {(value * 100).toFixed(1)}%
    </span>
  );
  // Narrow screens stack the label above a full-width bar; a fixed label column at
  // 375px would leave the bar a stub.
  return (
    <div className="py-1.5 sm:grid sm:grid-cols-[minmax(0,11rem)_1fr_auto] sm:items-center sm:gap-3">
      <div className="mb-1 flex items-baseline justify-between gap-3 sm:mb-0 sm:block">
        <span className="text-[13px] leading-tight">{label}</span>
        <span className="shrink-0 sm:hidden">{readout}</span>
      </div>
      {bar}
      <div className="hidden w-16 text-right sm:block">{readout}</div>
    </div>
  );
}
