/**
 * Runs the browser decoder over the whole demo session, headlessly, and checks it
 * against the Python result.
 *
 * This exercises the actual shipped modules in src/lib/decoder.ts, so if the
 * TypeScript port ever drifts from the Python pipeline, this fails.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CausalGain, CausalStandardiser, classify, extractFeatures, type LdaModel } from "../src/lib/decoder";

const PUB = join(import.meta.dirname, "..", "public");
const RESULTS = join(import.meta.dirname, "..", "src", "results");

const model: LdaModel = JSON.parse(readFileSync(join(PUB, "model", "td_lda.json"), "utf8"));
const meta = JSON.parse(readFileSync(join(PUB, "data", "session_meta.json"), "utf8"));
const realtime = JSON.parse(readFileSync(join(RESULTS, "realtime.json"), "utf8"));

const buf = readFileSync(join(PUB, "data", "session.bin"));
const sig = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);

const { window_samples: W, hop_samples: hop, n_channels: C, block_samples: B, warmup_windows } = meta;
const std = new CausalStandardiser(model.n_features, warmup_windows, warmup_windows);

let nPure = 0, okPure = 0, nAll = 0, okAll = 0, warmedAt = -1;
const t0 = performance.now();

for (let pos = 0; pos + W <= meta.n_samples; pos += hop) {
  const win: Float32Array[] = [];
  for (let c = 0; c < C; c++) {
    const a = new Float32Array(W);
    for (let t = 0; t < W; t++) a[t] = sig[(pos + t) * C + c];
    win.push(a);
  }
  const f = extractFeatures(win, model.zc_ssc_threshold);
  const z = std.apply(f);
  if (!std.ready) continue;
  if (warmedAt < 0) warmedAt = pos;

  const { pred } = classify(model, z);
  const endSample = pos + W - 1;
  const truth = meta.block_order[Math.min(meta.block_order.length - 1, Math.floor(endSample / B))];
  const pure = Math.floor(pos / B) === Math.floor(endSample / B);

  nAll++; if (pred === truth) okAll++;
  if (pure) { nPure++; if (pred === truth) okPure++; }
}

const elapsed = performance.now() - t0;
const steady = okPure / nPure;
const all = okAll / nAll;

// Python reports the whole session including the warm-up region; this run scores
// only post-warm-up windows, so it should land at or slightly above that figure.
const expected = realtime.warmup_curve.find(
  (w: { warmup_s: number }) => w.warmup_s === realtime.demo_warmup_s,
)!.accuracy_after_warmup;

console.log(`  windows scored     ${nAll} (${nPure} steady-state)`);
console.log(`  steady-state acc   ${(steady * 100).toFixed(2)}%`);
console.log(`  all-window acc     ${(all * 100).toFixed(2)}%`);
console.log(`  python reference   ${(expected * 100).toFixed(2)}%  (${realtime.demo_warmup_s}s warm-up)`);
console.log(`  throughput         ${(nAll / (elapsed / 1000)).toFixed(0)} decodes/s single-threaded`);

const drift = Math.abs(steady - expected);
if (drift > 0.02) {
  console.error(`\n  FAIL: browser decoder is ${(drift * 100).toFixed(2)} pp from the Python result.`);
  process.exit(1);
}
if (steady < 0.9) {
  console.error(`\n  FAIL: steady-state accuracy ${(steady * 100).toFixed(1)}% is implausibly low.`);
  process.exit(1);
}
console.log(`\n  OK: browser decoder matches Python within ${(drift * 100).toFixed(2)} pp.`);


// ---------------------------------------------------------------------------
// Second decoder: the CNN, through the same causal gain the browser applies.
// ---------------------------------------------------------------------------
// Same entry point the browser uses. The default export pulls the WebGPU build,
// which asks for a .jsep.mjs file at runtime; importing it here would let that
// mismatch pass the test and only fail for real visitors.
const ort = await import("onnxruntime-web/wasm");
ort.env.wasm.wasmPaths = join(import.meta.dirname, "..", "node_modules", "onnxruntime-web", "dist") + "/";
ort.env.wasm.numThreads = 1;
ort.env.logLevel = "error";

// The files the runtime will ask for must exist where the site serves them.
for (const f of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  if (!existsSync(join(PUB, "ort", f))) {
    console.error(`\n  FAIL: public/ort/${f} is missing. The live decoder would not start.`);
    process.exit(1);
  }
}

const cnnMeta = JSON.parse(readFileSync(join(PUB, "model", "cnn_meta.json"), "utf8"));
// The web build treats a string as a URL to fetch, so hand it the bytes directly.
const onnxBytes = new Uint8Array(readFileSync(join(PUB, "model", "cnn.onnx")));
const sess = await ort.InferenceSession.create(onnxBytes, { executionProviders: ["wasm"] });
const inName = sess.inputNames[0];
const outName = sess.outputNames[0];

const gain = new CausalGain(2 * meta.fs);
let cnnPure = 0, cnnOk = 0;
const tc0 = performance.now();
let cnnRuns = 0;

for (let pos = 0; pos + W <= meta.n_samples; pos += hop) {
  const from = Math.max(0, pos + W - hop);
  const frame = new Array<number>(C);
  for (let t = from; t < pos + W; t++) {
    for (let c = 0; c < C; c++) frame[c] = sig[t * C + c];
    gain.push(frame);
  }
  if (pos < warmup_windows * hop) continue;

  const g = gain.value();
  const flat = new Float32Array(C * W);
  for (let c = 0; c < C; c++) {
    for (let t = 0; t < W; t++) flat[c * W + t] = sig[(pos + t) * C + c] / g;
  }
  const out = await sess.run({ [inName]: new ort.Tensor("float32", flat, [1, C, W]) });
  const logits = Array.from(out[outName].data as Float32Array);
  const pred = logits.indexOf(Math.max(...logits));
  cnnRuns++;

  const endSample = pos + W - 1;
  const truth = meta.block_order[Math.min(meta.block_order.length - 1, Math.floor(endSample / B))];
  if (Math.floor(pos / B) === Math.floor(endSample / B)) {
    cnnPure++; if (pred === truth) cnnOk++;
  }
}
const cnnElapsed = performance.now() - tc0;
const cnnAcc = cnnOk / cnnPure;

console.log(`\n  CNN (${(cnnMeta.onnx_bytes / 1024).toFixed(0)} KB ONNX, causal gain)`);
console.log(`  steady-state acc   ${(cnnAcc * 100).toFixed(2)}%`);
console.log(`  per-window compute ${(cnnElapsed / cnnRuns).toFixed(2)} ms`);
console.log(`  linear model is    ${((steady - cnnAcc) * 100).toFixed(2)} pp ahead`);

if (cnnAcc < 0.85) {
  console.error(`\n  FAIL: CNN accuracy ${(cnnAcc * 100).toFixed(1)}% is implausibly low — check the gain path.`);
  process.exit(1);
}
console.log(`\n  OK: both decoders verified.`);
