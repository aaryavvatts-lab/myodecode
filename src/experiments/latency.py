"""Experiment 2 -- the decode-latency curve.

The question a prosthetics engineer actually asks is not "how accurate" but "how
accurate *by when*". Accuracy is reported against end-to-end latency, which is the
window length plus the measured inference time on this machine -- not the window
length alone, which is what papers usually plot.
"""
from __future__ import annotations

import time

import numpy as np
import torch

from ..config import WINDOW_SWEEP_MS
from ..features import extract
from ..models import EMGClassifier, make_lda
from ..sk_runner import run_sklearn
from ..train import get_device, run_cnn_loso
from . import _checkpoint as ckpt
from ._common import epochs, features, ms, save


def measure_inference_ms(window_len: int, n_channels: int = 4, n: int = 200) -> dict:
    """Single-window inference cost, which is what matters for a real-time decoder."""
    x = np.random.randn(1, n_channels, window_len).astype(np.float32)

    t0 = time.perf_counter()
    for _ in range(n):
        extract(x)
    td_ms = (time.perf_counter() - t0) / n * 1000

    dev = get_device()
    model = EMGClassifier(n_channels=n_channels).to(dev).eval()
    xt = torch.from_numpy(x).to(dev)
    with torch.no_grad():
        for _ in range(20):
            model(xt)
        if dev.type == "mps":
            torch.mps.synchronize()
        t0 = time.perf_counter()
        for _ in range(n):
            model(xt)
        if dev.type == "mps":
            torch.mps.synchronize()
        cnn_ms = (time.perf_counter() - t0) / n * 1000

    model_cpu = EMGClassifier(n_channels=n_channels).eval()
    xc = torch.from_numpy(x)
    with torch.no_grad():
        for _ in range(20):
            model_cpu(xc)
        t0 = time.perf_counter()
        for _ in range(n):
            model_cpu(xc)
        cnn_cpu_ms = (time.perf_counter() - t0) / n * 1000

    return {"td_features_ms": round(td_ms, 4),
            "cnn_ms": round(cnn_ms, 4),
            "cnn_cpu_ms": round(cnn_cpu_ms, 4),
            "device": str(dev)}


FIXED_STRIDE = 125   # samples; holds the window count constant across the sweep


def main(windows=WINDOW_SWEEP_MS, cnn: bool = True, cnn_epochs: int = 40,
         stride_samples: int = FIXED_STRIDE):
    done = ckpt.load("latency")
    rows = []
    for w in windows:
        key = f"{w}"
        if key in done:
            rows.append(done[key])
            r = done[key]["models"]
            print(f"  {float(key):7.1f} ms  (cached)  lda={r['td_lda']['accuracy']:.4f}  "
                  f"lda+zn={r['td_lda_znorm']['accuracy']:.4f}", flush=True)
            continue
        ep = epochs(w, stride_samples=stride_samples)
        F = features(ep)
        timing = measure_inference_ms(ep.window_len)

        r_raw = run_sklearn(make_lda, F, ep, "loso", "td_lda")
        r_zn = run_sklearn(make_lda, F, ep, "loso", "td_lda_znorm", znorm=True)
        row = {
            "window_ms": ms(ep.window_len), "window_samples": ep.window_len,
            "n_windows": len(ep), "stride_samples": stride_samples, "timing": timing,
            "models": {"td_lda": r_raw.to_dict(), "td_lda_znorm": r_zn.to_dict()},
        }
        line = (f"  {ms(ep.window_len):7.1f} ms  n={len(ep):6d}  "
                f"lda={r_raw.accuracy:.4f}  lda+zn={r_zn.accuracy:.4f}")

        if cnn:
            e2e, lat, _ = run_cnn_loso(ep, epochs=cnn_epochs)
            row["models"]["cnn_latent_logreg"] = lat.to_dict()
            row["models"]["cnn_e2e"] = e2e.to_dict()
            line += f"  cnn_lat={lat.accuracy:.4f}  cnn_e2e={e2e.accuracy:.4f}"

        rows.append(row)
        ckpt.put("latency", key, row)
        print(line + f"  [infer {timing['td_features_ms']:.3f}/"
                     f"{timing['cnn_cpu_ms']:.2f} ms]", flush=True)

    # knee: smallest window within 1 percentage point of the best result
    best_by_model = {}
    for m in rows[0]["models"]:
        accs = [(r["window_ms"], r["models"][m]["accuracy"]) for r in rows]
        peak = max(a for _, a in accs)
        knee = min(w for w, a in accs if a >= peak - 0.01)
        best_by_model[m] = {"peak_accuracy": peak, "knee_window_ms": knee}
        print(f"  knee[{m}] = {knee} ms (peak {peak:.4f})")

    return save("latency", {"sweep": rows, "knees": best_by_model,
                           "stride_samples": stride_samples,
                           "note": ("A fixed hop of %d samples keeps the number of "
                                    "training windows constant across the sweep, so "
                                    "the curve reflects window length alone and not "
                                    "training-set size." % stride_samples)})


if __name__ == "__main__":
    main()
