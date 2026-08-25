"""Experiment 6 -- what did the encoder actually learn?

A decoder that generalises across people should produce a latent space organised by
gesture and *not* by who is wearing the electrodes. Silhouette score gives that a
number: high by gesture is good, high by subject means the encoder is spending
capacity memorising wearers.

Embeddings come only from held-out subjects -- each subject is embedded by the LOSO
model that never saw them.
"""
from __future__ import annotations

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score

from ..config import SEED, SUBJECTS
from ..features import extract
from ..sk_runner import per_subject_znorm
from ..train import embed_all, get_device, normalize_by_subject, run_cnn_loso
from ._common import epochs, save


def _sil(Z, labels, seed=SEED, n=3000):
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(Z), size=min(n, len(Z)), replace=False)
    return float(silhouette_score(Z[idx], labels[idx]))


def cluster_purity(emb, gesture, subject, eps: float = 0.06, min_samples: int = 15):
    """Find blobs in the 2-D view and ask what each one is made of.

    A blob that holds exactly one person is a blob the model built around that
    person rather than around a gesture. Purity near 1/8 means the blob mixes
    people the way random assignment would.
    """
    lab = DBSCAN(eps=eps, min_samples=min_samples).fit_predict(emb)
    ids = sorted(set(lab) - {-1})
    by_gesture, by_subject = [], []
    for c in ids:
        m = lab == c
        by_gesture.append(np.bincount(gesture[m], minlength=5).max() / m.sum())
        by_subject.append(np.bincount(subject[m], minlength=9).max() / m.sum())
    return {
        "n_clusters": len(ids),
        "unclustered_fraction": float((lab == -1).mean()),
        "purity_by_gesture": float(np.mean(by_gesture)) if ids else None,
        "purity_by_subject": float(np.mean(by_subject)) if ids else None,
        "chance_purity_by_subject": 1 / 8,
        "eps": eps, "min_samples": min_samples,
    }


def main(window_ms: int = 250, cnn_epochs: int = 40, max_points: int = 4000):
    ep = epochs(window_ms)
    Xn = normalize_by_subject(ep)
    device = get_device()

    print("  training LOSO models and embedding held-out subjects...", flush=True)
    _, lat_res, bundle = run_cnn_loso(ep, epochs=cnn_epochs, keep_models=True)

    Z = np.zeros((len(ep), bundle[SUBJECTS[0]]["model"].encoder.latent_dim), np.float32)
    for s, b in bundle.items():
        m = ep.subject == s
        Z[m] = embed_all(b["model"], Xn[m], device)

    # the hand-crafted feature space, for comparison
    Ftd = per_subject_znorm(extract(ep.X), ep.subject)

    scores = {
        "cnn_latent": {"by_gesture": _sil(Z, ep.y), "by_subject": _sil(Z, ep.subject)},
        "td_features": {"by_gesture": _sil(Ftd, ep.y), "by_subject": _sil(Ftd, ep.subject)},
    }
    for k, v in scores.items():
        print(f"  {k:12s} silhouette  gesture={v['by_gesture']:+.3f}  "
              f"subject={v['by_subject']:+.3f}")

    import umap
    rng = np.random.default_rng(SEED)
    keep = rng.choice(len(ep), size=min(max_points, len(ep)), replace=False)
    keep.sort()
    proj, purity = {}, {}
    for name, M in (("cnn_latent", Z), ("td_features", Ftd)):
        print(f"  UMAP on {name}...", flush=True)
        emb = umap.UMAP(n_neighbors=25, min_dist=0.1, random_state=SEED,
                        n_components=2).fit_transform(M[keep])
        emb = (emb - emb.mean(0)) / (emb.std(0) + 1e-8)
        proj[name] = emb.round(3).tolist()
        purity[name] = cluster_purity(emb, ep.y[keep], ep.subject[keep])
        print(f"    {name}: {purity[name]['n_clusters']} clusters, "
              f"person purity {purity[name]['purity_by_subject']:.3f} "
              f"(chance {1/8:.3f})")

    return save("latent", {
        "window_ms": window_ms,
        "loso_accuracy": lat_res.accuracy,
        "silhouette": scores,
        "points": {
            "index": keep.tolist(),
            "gesture": ep.y[keep].tolist(),
            "subject": ep.subject[keep].tolist(),
            "projections": proj,
        },
        "cluster_purity": purity,
        "interpretation": (
            "Higher silhouette by gesture is better. Higher silhouette by subject means "
            "the representation encodes who is wearing the sensors rather than what "
            "their hand is doing. cluster_purity goes further: it finds the blobs in "
            "the 2-D view and reports what each is made of. A person purity near 1.0 "
            "means each blob belongs to a single wearer."
        ),
    })


if __name__ == "__main__":
    main()
