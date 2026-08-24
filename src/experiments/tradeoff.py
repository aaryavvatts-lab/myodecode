"""Experiment 4 -- the latency x electrode-count tradeoff surface.

The two constraints a real device faces at once. For every window length and every
channel subset, LOSO accuracy; then, for each (latency, n_channels) cell, the best
subset of that size. The iso-accuracy contours answer the design question directly:
"I need 90% -- what is the cheapest configuration that gets me there?"

Uses the time-domain baseline throughout. That is not a shortcut: it is both the
faster model and, per the latency experiment, the more accurate one.
"""
from __future__ import annotations

from itertools import combinations

from ..config import WINDOW_SWEEP_MS
from ..models import make_lda
from ..sk_runner import run_sklearn
from ._common import epochs, features, ms, save

TARGETS = (0.80, 0.85, 0.90, 0.95)


FIXED_STRIDE = 125


def main(windows=WINDOW_SWEEP_MS, stride_samples: int = FIXED_STRIDE):
    subsets = [c for k in range(1, 5) for c in combinations(range(4), k)]
    cells, grid = [], {}
    for w in windows:
        for chs in subsets:
            ep = epochs(w, tuple(chs), stride_samples=stride_samples)
            r = run_sklearn(make_lda, features(ep), ep, "loso", "td_lda_znorm",
                            znorm=True)
            cells.append({"window_ms": ms(ep.window_len), "channels": [c + 1 for c in chs],
                          "n_channels": len(chs), "accuracy": r.accuracy,
                          "accuracy_ci": list(r.accuracy_ci)})
            key = (ms(ep.window_len), len(chs))
            if key not in grid or r.accuracy > grid[key]["accuracy"]:
                grid[key] = {"accuracy": r.accuracy, "channels": [c + 1 for c in chs]}
        print(f"  {w:7.1f} ms done", flush=True)

    heatmap = [{"window_ms": wm, "n_channels": k, **v} for (wm, k), v in sorted(grid.items())]

    cheapest = {}
    for t in TARGETS:
        ok = [c for c in heatmap if c["accuracy"] >= t]
        if ok:
            # cheapest = fewest electrodes, then lowest latency
            best = min(ok, key=lambda c: (c["n_channels"], c["window_ms"]))
            fastest = min(ok, key=lambda c: (c["window_ms"], c["n_channels"]))
            cheapest[f"{t:.2f}"] = {"fewest_electrodes": best, "lowest_latency": fastest}
            print(f"  >={t:.0%}: cheapest {best['n_channels']}ch @ {best['window_ms']}ms "
                  f"{best['channels']}  |  fastest {fastest['window_ms']}ms "
                  f"{fastest['n_channels']}ch")
        else:
            cheapest[f"{t:.2f}"] = None
            print(f"  >={t:.0%}: unreachable")

    return save("tradeoff", {"cells": cells, "heatmap": heatmap,
                             "targets": cheapest, "model": "td_lda_znorm",
                             "stride_samples": stride_samples})


if __name__ == "__main__":
    main()
