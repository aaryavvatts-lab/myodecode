/**
 * Runs the browser decoder over the whole demo session, headlessly, and checks it
 * against the Python result.
 *
 * This exercises the actual shipped modules in src/lib/decoder.ts, so if the
 * TypeScript port ever drifts from the Python pipeline, this fails.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CausalStandardiser, classify, extractFeatures, type LdaModel } from "../src/lib/decoder";

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
console.log(`\n  OK — browser decoder matches Python within ${(drift * 100).toFixed(2)} pp.`);
