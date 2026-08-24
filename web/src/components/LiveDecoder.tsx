"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import realtime from "@/results/realtime.json";
import { CausalGain, CausalStandardiser, classify, extractFeatures, type LdaModel } from "@/lib/decoder";
import { CHANNEL_COLORS, GESTURE_COLORS, GESTURE_NAMES } from "@/lib/palette";
import { Card, Section, Stat, useInView, useTheme } from "./ui";
import { pct } from "@/lib/format";

interface Meta {
  subject: number; fs: number; n_channels: number; n_samples: number;
  block_samples: number; block_order: number[];
  window_samples: number; hop_samples: number;
  warmup_windows: number; warmup_seconds: number;
}

const DISPLAY_S = 3;

function DecoderPanel({ title, subtitle, probs, pred, disabled, acc, n, ms, gcol }: {
  title: string; subtitle: string; probs: number[]; pred: number; disabled: boolean;
  acc: number | null; n: number; ms: number; gcol: string[];
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <div className="text-[13px] font-medium">{title}</div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{subtitle}</div>
        </div>
        <div className="flex items-baseline gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span className="tnum font-[family-name:var(--font-mono)]">{ms.toFixed(2)} ms</span>
          <span className="tnum font-[family-name:var(--font-mono)] text-[14px]"
                style={{ color: "var(--text-primary)" }}>
            {acc === null ? "—" : pct(acc, 1)}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {GESTURE_NAMES.map((name, i) => (
          <div key={i} className="grid grid-cols-[5.5rem_1fr_2.6rem] items-center gap-2">
            <span className="text-[12px]" style={{
              color: i === pred && !disabled ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: i === pred && !disabled ? 600 : 400,
            }}>{name}</span>
            <div className="h-4 rounded-[4px]" style={{ background: "var(--surface-2)" }}>
              <div className="h-full rounded-[4px] transition-[width] duration-100"
                   style={{ width: `${(probs[i] ?? 0) * 100}%`, background: gcol[i] }} />
            </div>
            <span className="tnum text-right font-[family-name:var(--font-mono)] text-[10px]"
                  style={{ color: "var(--text-muted)" }}>
              {Math.round((probs[i] ?? 0) * 100)}%
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        {n > 0 ? `${n} steady-state windows scored` : "waiting for warm-up"}
      </div>
    </div>
  );
}

export default function LiveDecoder() {
  const mode = useTheme();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [scopeWrap, scopeInView] = useInView<HTMLDivElement>();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [model, setModel] = useState<LdaModel | null>(null);
  const sig = useRef<Float32Array | null>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [probs, setProbs] = useState<number[]>([0.2, 0.2, 0.2, 0.2, 0.2]);
  const [pred, setPred] = useState(0);
  const [truth, setTruth] = useState(0);
  const [decodes, setDecodes] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [warm, setWarm] = useState(0);
  const [computeMs, setComputeMs] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  // second decoder: the reel's CNN, run in WASM, racing the linear model
  // Typed structurally so the onnxruntime module stays out of this chunk entirely.
  const cnn = useRef<{ run(w: Float32Array): Promise<{ probs: number[]; pred: number; ms: number }> } | null>(null);
  const [cnnState, setCnnState] = useState<"off" | "loading" | "on" | "failed">("off");
  const [cnnErr, setCnnErr] = useState<string | null>(null);
  const [cnnProbs, setCnnProbs] = useState<number[]>([0.2, 0.2, 0.2, 0.2, 0.2]);
  const [cnnPred, setCnnPred] = useState(-1);
  const [cnnDecodes, setCnnDecodes] = useState(0);
  const [cnnCorrect, setCnnCorrect] = useState(0);
  const [cnnMs, setCnnMs] = useState(0);
  const gain = useRef<CausalGain | null>(null);
  const cnnBusy = useRef(false);

  const pos = useRef(0);
  const std = useRef<CausalStandardiser | null>(null);
  const raf = useRef<number | null>(null);
  const lastT = useRef(0);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const [m, mt, buf] = await Promise.all([
          fetch("/model/td_lda.json").then((r) => r.json()),
          fetch("/data/session_meta.json").then((r) => r.json()),
          fetch("/data/session.bin").then((r) => r.arrayBuffer()),
        ]);
        if (dead) return;
        sig.current = new Float32Array(buf);
        setModel(m);
        setMeta(mt);
        std.current = new CausalStandardiser(m.n_features, mt.warmup_windows, mt.warmup_windows);
        gain.current = new CausalGain(2 * mt.fs);
      } catch {
        if (!dead) setErr("Could not load the decoder assets.");
      }
    })();
    return () => { dead = true; };
  }, []);

  const reset = useCallback(() => {
    pos.current = 0;
    if (model && meta) {
      std.current = new CausalStandardiser(model.n_features, meta.warmup_windows, meta.warmup_windows);
      gain.current = new CausalGain(2 * meta.fs);
    }
    setDecodes(0); setCorrect(0); setWarm(0);
    setProbs([0.2, 0.2, 0.2, 0.2, 0.2]); setPred(0); setTruth(0);
    setCnnDecodes(0); setCnnCorrect(0); setCnnPred(-1);
    setCnnProbs([0.2, 0.2, 0.2, 0.2, 0.2]);
  }, [model, meta]);

  const enableCnn = useCallback(async () => {
    if (cnnState !== "off") return;
    setCnnState("loading");
    try {
      // Imported here, not at module scope: pulling onnxruntime-web into the
      // initial bundle costs every visitor a chunk they will probably never run.
      const { createCnn } = await import("@/lib/onnx");
      cnn.current = await createCnn();
      setCnnState("on");
    } catch (e) {
      console.error("CNN load failed:", e);
      setCnnErr(e instanceof Error ? e.message : String(e));
      setCnnState("failed");
    }
  }, [cnnState]);

  const step = useCallback(() => {
    if (!model || !meta || !sig.current || !std.current) return;
    const { window_samples: W, hop_samples: hop, n_channels: C, block_samples: B } = meta;
    const total = meta.n_samples;
    if (pos.current + W >= total) pos.current = 0;

    // advance the causal RMS gain over the samples newly entering the stream
    if (gain.current) {
      const from = Math.max(0, pos.current + W - hop);
      const frame: number[] = new Array(C);
      for (let t = from; t < pos.current + W; t++) {
        for (let c = 0; c < C; c++) frame[c] = sig.current[t * C + c];
        gain.current.push(frame);
      }
    }

    const win: Float32Array[] = [];
    for (let c = 0; c < C; c++) {
      const a = new Float32Array(W);
      for (let t = 0; t < W; t++) a[t] = sig.current[(pos.current + t) * C + c];
      win.push(a);
    }
    const t0 = performance.now();
    const f = extractFeatures(win, model.zc_ssc_threshold);
    const z = std.current.apply(f);
    const ready = std.current.ready;
    const { probs: p, pred: k } = ready ? classify(model, z) : { probs: [0.2, 0.2, 0.2, 0.2, 0.2], pred: -1 };
    const dt = performance.now() - t0;

    const endSample = pos.current + W - 1;
    const gt = meta.block_order[Math.min(meta.block_order.length - 1, Math.floor(endSample / B))];
    const pure = Math.floor(pos.current / B) === Math.floor(endSample / B);

    // The CNN takes the same window, scaled by a causal RMS gain -- the online
    // stand-in for the per-subject gain it was trained with. It is skipped rather
    // than queued if it has not finished the previous window, so a slow decoder
    // drops frames instead of falling behind, exactly as it would on a device.
    if (cnn.current && ready && !cnnBusy.current && gain.current) {
      cnnBusy.current = true;
      const g = gain.current.value();
      const flat = new Float32Array(C * W);
      for (let c = 0; c < C; c++) {
        for (let t = 0; t < W; t++) flat[c * W + t] = win[c][t] / g;
      }
      const gtNow = gt, pureNow = pure;
      cnn.current.run(flat).then((r) => {
        setCnnProbs(r.probs); setCnnPred(r.pred); setCnnMs(r.ms);
        if (pureNow) {
          setCnnDecodes((d) => d + 1);
          if (r.pred === gtNow) setCnnCorrect((c2) => c2 + 1);
        }
      }).catch(() => setCnnState("failed")).finally(() => { cnnBusy.current = false; });
    }

    setComputeMs(dt);
    setProbs(p);
    setTruth(gt);
    setWarm(std.current.progress);
    if (ready && k >= 0) {
      setPred(k);
      if (pure) {
        setDecodes((d) => d + 1);
        if (k === gt) setCorrect((c) => c + 1);
      }
    }
    pos.current += hop;
  }, [model, meta]);

  // decode loop, paced to the hop interval scaled by playback speed
  useEffect(() => {
    if (!playing || !meta) return;
    const interval = (meta.hop_samples / meta.fs) * 1000;
    const loop = (t: number) => {
      if (t - lastT.current >= interval / speed) { lastT.current = t; step(); }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, speed, step, meta]);

  // scope
  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !meta || !sig.current || !scopeInView) return;
    let id: number;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
      const g = cv.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);

      const C = meta.n_channels;
      const span = DISPLAY_S * meta.fs;
      const start = Math.max(0, pos.current + meta.window_samples - span);
      const lane = h / C;
      const cols = CHANNEL_COLORS[mode];

      for (let c = 0; c < C; c++) {
        let peak = 1e-6;
        for (let i = start; i < start + span; i += 4) {
          const v = Math.abs(sig.current![i * C + c] || 0);
          if (v > peak) peak = v;
        }
        g.beginPath();
        g.strokeStyle = cols[c];
        g.lineWidth = 1;
        for (let px = 0; px < w; px++) {
          const i = start + Math.floor((px / w) * span);
          const v = sig.current![i * C + c] || 0;
          const y = lane * c + lane / 2 - (v / peak) * (lane / 2 - 3);
          px === 0 ? g.moveTo(px, y) : g.lineTo(px, y);
        }
        g.stroke();
      }
      // the window the decoder is currently looking at
      const wx = ((pos.current - start) / span) * w;
      const ww = (meta.window_samples / span) * w;
      g.fillStyle = mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)";
      g.fillRect(wx, 0, ww, h);
      g.strokeStyle = mode === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.28)";
      g.lineWidth = 1;
      g.strokeRect(wx + 0.5, 0.5, ww, h - 1);
      if (playing) id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [meta, mode, scopeInView, playing]);

  const gcol = GESTURE_COLORS[mode];
  const live = decodes > 0 ? correct / decodes : 0;
  const warming = warm < 1;

  return (
    <Section
      id="live"
      eyebrow="06 — Live"
      title="Watch it decode someone it has never met"
      lede={
        <>
          The decoder below is running in this page — extracting the same five features
          per channel and applying the same linear model as the Python pipeline, on raw
          samples, in your browser. The signal is subject&nbsp;{meta?.subject ?? 8}, who was
          held out of training entirely. Nothing here is a replay of stored predictions.
        </>
      }
    >
      {err && (
        <Card className="mb-4"><p className="text-[13px]" style={{ color: "var(--warn)" }}>{err}</p></Card>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={!model || !meta}
            className="focusable rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {playing ? "Pause" : model ? "Start decoding" : "Loading…"}
          </button>
          <button onClick={() => { setPlaying(false); reset(); }}
                  className="focusable rounded-lg border px-3 py-2 text-[13px]">Reset</button>
          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>Speed</span>
            {[0.5, 1, 2, 4].map((s) => (
              <button key={s} onClick={() => setSpeed(s)}
                className="focusable rounded-md border px-2 py-1 font-[family-name:var(--font-mono)] text-[11px]"
                style={speed === s ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : {}}>
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div ref={scopeWrap} className="rounded-lg border" style={{ background: "var(--surface-2)" }}>
          <canvas ref={canvas} className="block h-[180px] w-full" />
        </div>
        <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          Four channels, last {DISPLAY_S} s. The shaded box is the {meta?.window_samples ?? 250}-sample
          window feeding the decoder right now.
        </p>

        {warming && playing && (
          <div className="mt-4 rounded-lg border p-3" style={{ background: "var(--warn-soft)" }}>
            <div className="mb-2 flex items-center justify-between text-[12px]" style={{ color: "var(--warn)" }}>
              <span>Warming up on unlabelled signal ({meta?.warmup_seconds ?? 10}s of wear)…</span>
              <span className="tnum font-[family-name:var(--font-mono)]">{Math.round(warm * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
              <div className="h-full rounded-full transition-[width]" style={{ width: `${warm * 100}%`, background: "var(--warn)" }} />
            </div>
            <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
              No labels are used — only the mean and variance of the signal seen so far,
              exactly what a real device can compute on the wrist.
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
          <div className="space-y-5">
            <DecoderPanel
              title="Time-domain features + LDA"
              subtitle="20 numbers, one matrix multiply"
              probs={probs} pred={pred} disabled={warming}
              acc={decodes ? correct / decodes : null} n={decodes}
              ms={computeMs} gcol={gcol}
            />

            {cnnState === "on" ? (
              <DecoderPanel
                title="CNN encoder → latent → classifier"
                subtitle="53k parameters, running in WebAssembly"
                probs={cnnProbs} pred={cnnPred} disabled={warming || cnnPred < 0}
                acc={cnnDecodes ? cnnCorrect / cnnDecodes : null} n={cnnDecodes}
                ms={cnnMs} gcol={gcol}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-4">
                <div className="text-[13px] font-medium">CNN encoder → latent → classifier</div>
                <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Run the reel&apos;s architecture alongside the linear model and watch them
                  race on the same windows. Needs an 11 MB WebAssembly runtime, so it only
                  downloads if you ask for it.
                </p>
                <button
                  onClick={enableCnn}
                  disabled={cnnState === "loading" || cnnState === "failed"}
                  className="focusable mt-3 rounded-lg border px-3 py-1.5 text-[12px] font-medium disabled:opacity-50">
                  {cnnState === "loading" ? "Loading runtime…"
                    : cnnState === "failed" ? "Failed to load — the linear decoder is unaffected"
                    : "Load the CNN and race them"}
                </button>
                {cnnErr && (
                  <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px]" style={{ color: "var(--warn)" }}>
                    {cnnErr}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border p-4" style={{ background: "var(--surface-2)" }}>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Ground truth
            </div>
            <div className="mt-1 flex items-center gap-2 text-[18px] font-medium">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: gcol[truth] }} />
              {GESTURE_NAMES[truth]}
            </div>
            <dl className="mt-4 space-y-1.5 border-t pt-3 text-[12px]">
              <div className="flex justify-between">
                <dt style={{ color: "var(--text-muted)" }}>Subject</dt>
                <dd className="tnum font-[family-name:var(--font-mono)]">{meta?.subject ?? "—"} (held out)</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--text-muted)" }}>Window</dt>
                <dd className="tnum font-[family-name:var(--font-mono)]">{meta?.window_samples ?? "—"} samples</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: "var(--text-muted)" }}>Hop</dt>
                <dd className="tnum font-[family-name:var(--font-mono)]">{meta?.hop_samples ?? "—"} samples</dd>
              </div>
            </dl>
            {cnnState === "on" && cnnDecodes > 0 && decodes > 0 && (
              <p className="mt-3 border-t pt-3 text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                On the windows both have scored, the linear model is{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {(((correct / decodes) - (cnnCorrect / cnnDecodes)) * 100).toFixed(1)} pp
                </strong>{" "}
                ahead, at{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {(cnnMs / Math.max(computeMs, 1e-6)).toFixed(0)}×
                </strong>{" "}
                less compute.
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat value={pct(realtime.normalisation.causal_ema.accuracy_steady)} label="Offline, same session"
              sub="Steady-state windows, causal normalisation" tone="accent" />
        <Stat value={pct(realtime.normalisation.oracle_global.accuracy_steady)} label="With offline normalisation"
              sub="The upper bound a device cannot reach" />
        <Stat value={pct(realtime.normalisation.causal_ema.accuracy_transition)} label="Mid-gesture-change"
              sub="Nobody can be right here — the window straddles two gestures" tone="warn" />
      </div>

      <Card className="mt-4">
        <h3 className="mb-1 text-[14px] font-medium">How long before it works at all?</h3>
        <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          The running normaliser needs to see enough signal to estimate the wearer&apos;s
          statistics. Until it has, the decoder is guessing. This is a real cost of
          the calibration-free approach, and nobody reports it.
        </p>
        <div className="space-y-1.5">
          {realtime.warmup_curve.map((w) => (
            <div key={w.warmup_s} className="grid grid-cols-[3.6rem_1fr_3.4rem] items-center gap-3">
              <span className="tnum font-[family-name:var(--font-mono)] text-[12px]"
                    style={{ color: "var(--text-secondary)" }}>{w.warmup_s}s</span>
              <div className="h-5 rounded-[4px]" style={{ background: "var(--surface-2)" }}>
                <div className="h-full rounded-[4px]"
                     style={{ width: `${w.accuracy_steady * 100}%`,
                              background: w.warmup_s === realtime.demo_warmup_s ? "var(--accent)" : "var(--border-strong)" }} />
              </div>
              <span className="tnum text-right font-[family-name:var(--font-mono)] text-[12px]">
                {pct(w.accuracy_steady, 1)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
          Highlighted bar is the {realtime.demo_warmup_s}s the demo above uses. Two seconds of
          wear is not enough — accuracy collapses to {pct(realtime.warmup_curve[0].accuracy_steady, 0)}.
        </p>
      </Card>

      <Card className="mt-4">
        <h3 className="mb-1 text-[14px] font-medium">The number the offline score was hiding</h3>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          The headline accuracy leans on standardising features per subject — which needs
          that person's statistics pooled across all five gestures, something no device has
          at power-on. Replacing it with a running estimate over the past only costs{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {((realtime.normalisation.oracle_global.accuracy_steady - realtime.normalisation.causal_ema.accuracy_steady) * 100).toFixed(1)} pp
          </strong>
          , so in this case the offline convenience was not doing unfair work. Dropping
          adaptation entirely costs{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {((realtime.normalisation.oracle_global.accuracy_steady - realtime.normalisation.none.accuracy_steady) * 100).toFixed(1)} pp
          </strong>.
          The real cost is elsewhere: windows spanning a gesture change score{" "}
          {pct(realtime.normalisation.causal_ema.accuracy_transition)}, and a
          per-window average that pools them reports{" "}
          {pct(realtime.normalisation.causal_ema.accuracy_all)} rather than{" "}
          {pct(realtime.normalisation.causal_ema.accuracy_steady)}.
        </p>
      </Card>
    </Section>
  );
}
