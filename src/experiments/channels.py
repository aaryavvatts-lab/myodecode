"""Experiment 3 -- the electrode-cost curve.

Every electrode is money, weight, setup time and a failure mode. All 15 non-empty
subsets of the four channels are evaluated at a fixed window so the accuracy-per-
electrode frontier can be read directly, along with which channels are complementary
and which are redundant.
"""
from __future__ import annotations

from itertools import combinations

from ..models import make_lda
from ..sk_runner import run_sklearn
from ..train import run_cnn_loso
from . import _checkpoint as ckpt
from ._common import epochs, features, ms, save


def all_subsets(n: int = 4):
    for k in range(1, n + 1):
        yield from combinations(range(n), k)


def main(window_ms: int = 250, cnn: bool = True, cnn_epochs: int = 40):
    done = ckpt.load("channels")
    rows = []
    for chs in all_subsets():
        key = "-".join(str(c + 1) for c in chs)
        if key in done:
            rows.append(done[key])
            print(f"  ch[{key}]  (cached)  "
                  f"lda+zn={done[key]['models']['td_lda_znorm']['accuracy']:.4f}", flush=True)
            continue
        ep = epochs(window_ms, tuple(chs))
        F = features(ep)
        r = run_sklearn(make_lda, F, ep, "loso", "td_lda_znorm", znorm=True)
        row = {"channels": [c + 1 for c in chs], "n_channels": len(chs),
               "models": {"td_lda_znorm": r.to_dict()}}
        line = f"  ch{[c+1 for c in chs]!s:16s} n={len(chs)}  lda+zn={r.accuracy:.4f}"
        if cnn:
            _, lat, _ = run_cnn_loso(ep, epochs=cnn_epochs)
            row["models"]["cnn_latent_logreg"] = lat.to_dict()
            line += f"  cnn_lat={lat.accuracy:.4f}"
        rows.append(row)
        ckpt.put("channels", key, row)
        print(line, flush=True)

    frontier = {}
    for m in rows[0]["models"]:
        best = {}
        for r in rows:
            k = r["n_channels"]
            a = r["models"][m]["accuracy"]
            if k not in best or a > best[k]["accuracy"]:
                best[k] = {"accuracy": a, "channels": r["channels"]}
        frontier[m] = best
        for k in sorted(best):
            print(f"  frontier[{m}] {k} ch -> {best[k]['accuracy']:.4f} "
                  f"{best[k]['channels']}")

    return save("channels", {"window_ms": ms(epochs(window_ms).window_len),
                             "subsets": rows, "frontier": frontier})


if __name__ == "__main__":
    main()
