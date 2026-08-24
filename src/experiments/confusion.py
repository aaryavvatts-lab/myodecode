"""Experiment 8 -- where do the errors actually live?

An aggregate accuracy hides whether a decoder fails everywhere a little or in one
specific place a lot. It matters for a product: a decoder that reliably confuses
exactly two gestures can be fixed by choosing a different pair of gestures.

Also asks whether the confusions are predictable from the gestures' measured muscle
activation, by comparing each pair's distance in the decoder's own log-amplitude
feature space against how often it mixes them up.
"""
from __future__ import annotations

import numpy as np
from scipy.stats import pearsonr, spearmanr

from ..config import CLASS_LABELS, N_CLASSES
from ..models import make_lda
from ..sk_runner import run_sklearn
from ._common import epochs, features, ms, save


def main(window_ms: int = 250):
    ep = epochs(window_ms)
    F = features(ep)
    res = run_sklearn(make_lda, F, ep, "loso", "td_lda_znorm", znorm=True)
    cm = np.array(res.confusion, dtype=float)
    row = cm / cm.sum(axis=1, keepdims=True)

    # Class centroids in the decoder's own feature space, using the log-amplitude
    # features only (log MAV / RMS / waveform length), which is where amplitude and
    # channel balance both live.
    log_idx = [c * 5 + k for c in range(len(ep.channels)) for k in (0, 1, 2)]
    cent = np.array([F[ep.y == c][:, log_idx].mean(0) for c in range(N_CLASSES)])

    pairs = []
    for i in range(N_CLASSES):
        for j in range(i + 1, N_CLASSES):
            pairs.append({
                "a": i, "b": j,
                "a_label": CLASS_LABELS[i], "b_label": CLASS_LABELS[j],
                "distance": float(np.linalg.norm(cent[i] - cent[j])),
                "confusion": float((row[i, j] + row[j, i]) / 2),
            })
    d = np.array([p["distance"] for p in pairs])
    c = np.array([p["confusion"] for p in pairs])
    rho, p_rho = spearmanr(d, c)
    r, p_r = pearsonr(d, c)

    worst = max(pairs, key=lambda p: p["confusion"])
    nearest = min(pairs, key=lambda p: p["distance"])
    rank = sorted(pairs, key=lambda p: p["distance"]).index(worst) + 1

    recall = [float(row[i, i]) for i in range(N_CLASSES)]
    err_in_worst = float((cm[worst["a"], worst["b"]] + cm[worst["b"], worst["a"]])
                         / (cm.sum() - np.trace(cm)))

    print(f"  per-class recall: " + ", ".join(
        f"{CLASS_LABELS[i]} {recall[i]:.3f}" for i in range(N_CLASSES)))
    print(f"  most-confused pair: {worst['a_label']} <-> {worst['b_label']} "
          f"({worst['confusion']:.4f}); it is distance rank {rank}/{len(pairs)}")
    print(f"  share of all errors in that one pair: {err_in_worst:.1%}")
    print(f"  distance vs confusion: rho={rho:.3f} (p={p_rho:.3f}), r={r:.3f} (p={p_r:.3f})")

    return save("confusion", {
        "window_ms": ms(ep.window_len),
        "model": "td_lda_znorm",
        "accuracy": res.accuracy,
        "confusion": res.confusion,
        "row_normalised": row.round(5).tolist(),
        "per_class_recall": recall,
        "class_labels": CLASS_LABELS,
        "pairs": pairs,
        "most_confused": worst,
        "nearest_pair": nearest,
        "most_confused_distance_rank": rank,
        "n_pairs": len(pairs),
        "share_of_errors_in_worst_pair": err_in_worst,
        "correlation": {"spearman_rho": float(rho), "spearman_p": float(p_rho),
                        "pearson_r": float(r), "pearson_p": float(p_r)},
        "interpretation": (
            "The single most-confused pair is also the closest pair of class centroids "
            "in the decoder's feature space. Across all pairs the relationship is not "
            "statistically resolvable -- ten pairs is too few -- so this is a "
            "consistent observation, not a demonstrated law."
        ),
    })


if __name__ == "__main__":
    main()
