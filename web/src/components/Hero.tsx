"use client";

import { useEffect, useRef } from "react";
import leakage from "@/results/leakage.json";
import latency from "@/results/latency.json";
import { CHANNEL_COLORS } from "@/lib/palette";
import { pct } from "@/lib/format";
import { useInView, useTheme } from "./ui";

function Scope() {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const [wrap, inView] = useInView<HTMLDivElement>();
  const mode = useTheme();
  useEffect(() => {
    const c = cv.current;
    if (!c || !inView) return;
    let id = 0, t = 0;
    const cols = CHANNEL_COLORS[mode];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Deterministic pseudo-EMG: a slow recruitment envelope gating fast interference,
    // with genuine quiet periods between bursts -- real EMG is not a constant hiss.
    const hash = (x: number) => {
      const v = Math.sin(x * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const envelope = (u: number, ch: number) => {
      const slow = Math.sin(u * 0.16 + ch * 1.9) * 0.5 + Math.sin(u * 0.071 + ch * 3.1) * 0.5;
      return Math.max(0, slow - 0.18) / 0.82;
    };

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
      const g = c.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const lane = h / 4;
      const STEP = 2;
      for (let ch = 0; ch < 4; ch++) {
        g.beginPath();
        g.strokeStyle = cols[ch];
        g.lineWidth = 1;
        const mid = lane * ch + lane / 2;
        for (let px = 0; px <= w; px += STEP) {
          const gx = px + t;
          const amp = envelope(gx * 0.0038, ch);
          const v = (hash(Math.floor(gx / STEP) + ch * 977) - 0.5) * 2 * amp;
          const y = mid - v * (lane * 0.40);
          px === 0 ? g.moveTo(px, y) : g.lineTo(px, y);
        }
        g.stroke();
      }
      if (!reduce) { t += 1.6; id = requestAnimationFrame(draw); }
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [mode, inView]);
  return <div ref={wrap} className="h-full w-full"><canvas ref={cv} className="block h-full w-full" aria-hidden /></div>;
}

export default function Hero() {
  const leaky = leakage.ladder.find((e) => e.scheme === "random_within" && e.model === "td_lda")!;
  const honest = leakage.ladder.find((e) => e.scheme === "loso" && e.model === "td_lda")!;
  const knee = latency.knees.td_lda_znorm;

  return (
    <header className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.22]" style={{ maskImage: "linear-gradient(to bottom, black 10%, transparent 55%)", WebkitMaskImage: "linear-gradient(to bottom, black 10%, transparent 55%)" }}>
        <Scope />
      </div>
      <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-20 sm:pb-24 sm:pt-28">
        <p className="mb-5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em]"
           style={{ color: "var(--text-muted)" }}>
          Muscle signals · 8 people · 4 sensors · 5 gestures
        </p>
        <h1 className="max-w-3xl text-balance font-[family-name:var(--font-serif)] text-5xl leading-[1.03] tracking-tight sm:text-7xl">
          How fast can you read a hand?
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Your muscles give off a small electrical signal when they tighten. Stick four
          sensors on a forearm and you can work out which of five hand gestures someone
          is making. That part already works, and it has worked since 1993.
        </p>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          So I asked better questions. How fast can it decide? How few sensors does it
          need? And how much of the accuracy people report for this task is real, versus
          an artifact of how they split their data? The last one turned out to matter
          most.
        </p>

        <div className="mt-10 grid max-w-3xl gap-px overflow-hidden rounded-xl border sm:grid-cols-3"
             style={{ background: "var(--border)" }}>
          {[
            { v: pct(leaky.accuracy), l: "what the popular method reports", tone: "var(--warn)" },
            { v: pct(honest.accuracy), l: "what it gets on a new person", tone: "var(--accent)" },
            { v: `${knee.knee_window_ms} ms`, l: "of signal it needs to decide", tone: "var(--text-primary)" },
          ].map((s) => (
            <div key={s.l} className="p-5" style={{ background: "var(--surface-0)" }}>
              <div className="tnum font-[family-name:var(--font-mono)] text-3xl leading-none" style={{ color: s.tone }}>
                {s.v}
              </div>
              <div className="mt-2 text-[13px] leading-snug" style={{ color: "var(--text-secondary)" }}>{s.l}</div>
            </div>
          ))}
        </div>

        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
          {[
            ["The catch", "leakage"], ["The data", "data"], ["How it works", "primer"],
            ["Speed", "latency"], ["Sensor count", "electrodes"], ["Setup", "calibration"],
            ["Mistakes", "confusion"], ["Inside the model", "latent"],
            ["Try it", "live"], ["Methods", "methods"], ["Sources", "references"],
          ].map(([label, id]) => (
            <a key={id} href={`#${id}`} className="focusable underline underline-offset-4 hover:opacity-70"
               style={{ color: "var(--text-secondary)" }}>{label}</a>
          ))}
        </nav>
      </div>
    </header>
  );
}
