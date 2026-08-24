/**
 * The time-domain decoder, reimplemented in TypeScript.
 *
 * This is a straight port of src/features.py + the exported LDA. It is not a
 * replay of stored predictions: the browser extracts the same five features per
 * channel from raw samples and applies the same linear model, so what the page
 * shows is the decoder actually running. A round-trip test in the Python export
 * asserts that this linear form reproduces scikit-learn exactly.
 */

export interface LdaModel {
  kind: "td_lda";
  window_samples: number;
  fs: number;
  n_features: number;
  n_channels: number;
  zc_ssc_threshold: number;
  scaler_mean: number[];
  scaler_scale: number[];
  coef: number[][];
  intercept: number[];
  train_mu: number[];
  train_sd: number[];
  trained_on: number[];
  held_out: number;
}

/** Hudgins time-domain features for one window. `win[c][t]` is channel-major. */
export function extractFeatures(win: Float32Array[], threshold: number): Float64Array {
  const nc = win.length;
  const W = win[0].length;
  const out = new Float64Array(nc * 5);
  const eps = 1e-10;

  for (let c = 0; c < nc; c++) {
    const x = win[c];
    let mav = 0, ms = 0, wl = 0, zc = 0, ssc = 0;
    for (let t = 0; t < W; t++) {
      const v = x[t];
      mav += Math.abs(v);
      ms += v * v;
      if (t > 0) {
        const d = v - x[t - 1];
        wl += Math.abs(d);
        if (x[t - 1] * v < 0 && Math.abs(x[t - 1] - v) >= threshold) zc++;
        if (t > 1) {
          const dPrev = x[t - 1] - x[t - 2];
          if (dPrev * d < 0 && (Math.abs(dPrev) >= threshold || Math.abs(d) >= threshold)) ssc++;
        }
      }
    }
    const o = c * 5;
    out[o] = Math.log(mav / W + eps);
    out[o + 1] = Math.log(Math.sqrt(ms / W) + eps);
    out[o + 2] = Math.log(wl + eps);
    out[o + 3] = zc / W;
    out[o + 4] = ssc / W;
  }
  return out;
}

/**
 * Causal running standardiser: mean and variance over past windows only,
 * warm-started on the first `warmup` windows. This is the online stand-in for the
 * per-subject normalisation the offline pipeline does with the whole recording.
 */
export class CausalStandardiser {
  private mu: Float64Array;
  private var_: Float64Array;
  private seen = 0;
  private buffer: Float64Array[] = [];
  constructor(private n: number, private warmup: number, private tau: number) {
    this.mu = new Float64Array(n);
    this.var_ = new Float64Array(n).fill(1);
  }
  get ready() { return this.seen >= this.warmup; }
  get progress() { return Math.min(1, this.seen / this.warmup); }

  apply(f: Float64Array): Float64Array {
    const out = new Float64Array(this.n);
    if (this.seen < this.warmup) {
      this.buffer.push(f.slice());
      this.seen++;
      if (this.seen === this.warmup) {
        for (let i = 0; i < this.n; i++) {
          let m = 0;
          for (const b of this.buffer) m += b[i];
          m /= this.buffer.length;
          let v = 0;
          for (const b of this.buffer) v += (b[i] - m) ** 2;
          this.mu[i] = m;
          this.var_[i] = v / this.buffer.length + 1e-8;
        }
        this.buffer = [];
      }
      for (let i = 0; i < this.n; i++) out[i] = 0;
      return out;
    }
    const a = 1 / Math.max(1, this.tau);
    for (let i = 0; i < this.n; i++) {
      out[i] = (f[i] - this.mu[i]) / Math.sqrt(this.var_[i]);
      const d = f[i] - this.mu[i];
      this.mu[i] += a * d;
      this.var_[i] += a * (d * d - this.var_[i]);
    }
    this.seen++;
    return out;
  }
}

/** Softmax over LDA discriminant scores, for a calibrated-looking confidence bar. */
export function classify(model: LdaModel, z: Float64Array): { probs: number[]; pred: number } {
  const k = model.intercept.length;
  const scores = new Array<number>(k);
  for (let j = 0; j < k; j++) {
    let s = model.intercept[j];
    const row = model.coef[j];
    for (let i = 0; i < z.length; i++) {
      s += row[i] * ((z[i] - model.scaler_mean[i]) / model.scaler_scale[i]);
    }
    scores[j] = s;
  }
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / sum);
  return { probs, pred: scores.indexOf(max) };
}

/**
 * Running RMS gain: the causal stand-in for the CNN's per-subject gain divisor.
 *
 * Offline the CNN's inputs are divided by the RMS of that subject's entire
 * recording. A device cannot know that at power-on, so this tracks it with an
 * exponential moving average over the samples seen so far.
 */
export class CausalGain {
  private run = 0;
  private seen = 0;
  constructor(private tauSamples: number) {}

  push(frame: number[]): number {
    let inst = 0;
    for (const v of frame) inst += v * v;
    inst /= frame.length;
    if (this.seen === 0) this.run = inst;
    else this.run += (1 / this.tauSamples) * (inst - this.run);
    this.seen++;
    return this.value();
  }

  value(): number {
    return Math.sqrt(Math.max(this.run, 1e-12));
  }
}
