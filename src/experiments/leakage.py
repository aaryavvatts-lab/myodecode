"""Experiment 1 -- how much accuracy is leakage?

Same model, same data, same window. Only the train/test split changes. The gap
between the top and bottom of this ladder is the number this project exists to show.

Also runs a label-permutation test to establish where chance actually sits, so that
the honest number can be read against a real floor rather than an assumed 20%.
"""
from __future__ import annotations

import numpy as np

from ..config import N_PERMUTATIONS, SEED
from ..data import SPLIT_DESCRIPTIONS
from ..models import make_lda
from ..sk_runner import run_sklearn
from ..train import run_cnn_loso
from ._common import epochs, features, ms, save

SCHEMES = ("random_within", "random", "blocked", "loso")


def main(window_ms: int = 250, cnn: bool = True, permutations: int = N_PERMUTATIONS):
    ep = epochs(window_ms)
    F = features(ep)
    print(f"leakage: {len(ep)} windows of {ms(ep.window_len)} ms, {F.shape[1]} features")

    ladder = []
    for scheme in SCHEMES:
        r = run_sklearn(make_lda, F, ep, scheme, "td_lda")
        ladder.append(r.to_dict())
        print(f"  {scheme:14s} td_lda  {r.accuracy:.4f}  "
              f"[{r.accuracy_ci[0]:.3f},{r.accuracy_ci[1]:.3f}]")

    if cnn:
        from ..sk_runner import run_sklearn as _rs  # noqa: F401
        e2e, lat, _ = run_cnn_loso(ep, epochs=40)
        ladder.append(lat.to_dict())
        ladder.append(e2e.to_dict())
        print(f"  {'loso':14s} cnn_latent  {lat.accuracy:.4f}")
        print(f"  {'loso':14s} cnn_e2e     {e2e.accuracy:.4f}")

    # z-normalised baseline: calibration-free, uses no labels from the test subject
    zr = run_sklearn(make_lda, F, ep, "loso", "td_lda_znorm", znorm=True)
    ladder.append(zr.to_dict())
    print(f"  {'loso':14s} td_lda+znorm {zr.accuracy:.4f}")

    # --- permutation test ------------------------------------------------------
    print(f"  permutation test ({permutations} shuffles, LOSO, td_lda)...")
    null = []
    for i in range(permutations):
        r = run_sklearn(make_lda, F, ep, "loso", "td_lda", permute=True, seed=SEED + i)
        null.append(r.accuracy)
    null = np.array(null)
    observed = next(d for d in ladder if d["model"] == "td_lda" and d["scheme"] == "loso")
    p = float((null >= observed["accuracy"]).sum() + 1) / (permutations + 1)
    print(f"    null mean={null.mean():.4f} p95={np.percentile(null,95):.4f} "
          f"max={null.max():.4f}  p={p:.4g}")

    return save("leakage", {
        "window_ms": ms(ep.window_len),
        "n_windows": len(ep),
        "scheme_descriptions": SPLIT_DESCRIPTIONS,
        "ladder": ladder,
        "permutation": {
            "n": permutations, "mean": float(null.mean()), "std": float(null.std()),
            "p95": float(np.percentile(null, 95)), "max": float(null.max()),
            "observed": observed["accuracy"], "p_value": p,
            "theoretical_chance": 0.2,
            "null_distribution": null.round(5).tolist(),
        },
    })


if __name__ == "__main__":
    main()
