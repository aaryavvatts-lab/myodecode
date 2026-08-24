/**
 * Lazy loader for the CNN decoder.
 *
 * onnxruntime-web pulls an 11 MB WebAssembly runtime, so it is only fetched when
 * the visitor explicitly turns the CNN on. Threads are disabled deliberately:
 * multi-threaded WASM needs cross-origin isolation headers, which would complicate
 * the deployment for no benefit at this model size.
 */
export interface CnnMeta {
  window_samples: number;
  n_channels: number;
  held_out: number;
  held_out_accuracy: number;
  onnx_bytes: number;
}

export interface CnnResult {
  probs: number[];
  pred: number;
  ms: number;
}

export async function createCnn() {
  const [ort, meta] = await Promise.all([
    import("onnxruntime-web"),
    fetch("/model/cnn_meta.json").then((r) => r.json() as Promise<CnnMeta>),
  ]);
  ort.env.wasm.wasmPaths = "/ort/";
  ort.env.wasm.numThreads = 1;
  ort.env.logLevel = "error";

  const session = await ort.InferenceSession.create("/model/cnn.onnx", {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  const { window_samples: W, n_channels: C } = meta;
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];

  return {
    meta,
    async run(win: Float32Array): Promise<CnnResult> {
      const t0 = performance.now();
      const out = await session.run({ [inputName]: new ort.Tensor("float32", win, [1, C, W]) });
      const logits = Array.from(out[outputName].data as Float32Array);
      const max = Math.max(...logits);
      const exps = logits.map((v) => Math.exp(v - max));
      const sum = exps.reduce((a, b) => a + b, 0);
      return {
        probs: exps.map((e) => e / sum),
        pred: logits.indexOf(max),
        ms: performance.now() - t0,
      };
    },
  };
}

export type Cnn = Awaited<ReturnType<typeof createCnn>>;
