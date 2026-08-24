"""Experiment 7 -- streaming decode on a wearer the model has never seen.

Every number above scores a shuffled bag of windows. A real decoder sees samples in
order and must commit to an answer continuously, so this replays a synthesised
session -- the held-out subject cycling through the five gestures in blocks -- and
measures what the offline scores hide.

The sharp question is normalisation. The headline LOSO accuracy leans on per-subject
feature standardisation, which needs that subject's statistics pooled over *all five*
gestures. A device cannot compute that at t=0. So three conditions are compared:

  oracle_global -- the subject's whole-session statistics (what the offline number
                   quietly assumes; not implementable online)
  causal_ema    -- running statistics over only the past, warm-started on the first
                   few seconds of wear (what a device can actually do)
  none          -- training-subject statistics only, no adaptation at all

Windows straddling a gesture change are scored separately: no decoder can be right
during a transition, and pooling them into one number hides where the errors live.
"""
from __future__ import annotations

import time

import numpy as np

from ..config import FS, RESULTS_DIR, SEED, WEB_PUBLIC
from ..data import load_filtered
from ..features import extract
from ..models import make_lda
from ..sk_runner import per_subject_znorm
from ._common import epochs, save

SMOOTH_K = (1, 3, 5, 7, 9, 13, 17, 25)


def build_session(subject: int, block_s: float = 2.0, n_cycles: int = 12,
                  seed: int = SEED):
    """Splice the subject's five recordings into one continuous session in which the
    wearer switches gesture every `block_s` seconds."""
    recs = load_filtered()
    rng = np.random.default_rng(seed)
    B = int(block_s * FS)
    cursors = {c: 0 for c in range(5)}
    chunks, labels, order = [], [], []
    for _ in range(n_cycles):
        for c in rng.permutation(5):
            c = int(c)
            x = recs[(subject, c)]
            if cursors[c] + B > len(x):
                cursors[c] = 0
            chunks.append(x[cursors[c]:cursors[c] + B])
            cursors[c] += B
            labels.append(np.full(B, c, dtype=np.int64))
            order.append(c)
    return (np.concatenate(chunks).astype(np.float32),
            np.concatenate(labels), order, B)


def causal_standardise(Fw: np.ndarray, warmup: int, tau_windows: float):
    """Running mean/std over past windows only. Warm-started on the first `warmup`."""
    a = 1.0 / max(1.0, tau_windows)
    mu = Fw[:warmup].mean(0).astype(np.float64)
    var = Fw[:warmup].var(0).astype(np.float64) + 1e-8
    out = np.empty_like(Fw)
    for i, f in enumerate(Fw):
        out[i] = (f - mu) / np.sqrt(var)
        d = f - mu
        mu += a * d
        var += a * (d * d - var)
    return out


def main(demo_subject: int = 8, window_ms: int = 250, hop_ms: int = 25,
         block_s: float = 2.0, warmup_s: float = 20.0, export_web: bool = True):
    ep = epochs(window_ms)
    W = ep.window_len
    hop = max(1, int(hop_ms * FS / 1000))

    # --- decoder trained on everyone else ---------------------------------------
    F_all = per_subject_znorm(extract(ep.X), ep.subject)
    tr = ep.subject != demo_subject
    clf = make_lda()
    clf.fit(F_all[tr], ep.y[tr])
    F_tr_raw = extract(ep.X[tr])
    tr_mu, tr_sd = F_tr_raw.mean(0), F_tr_raw.std(0) + 1e-8
    print(f"  trained on subjects {sorted(set(ep.subject[tr].tolist()))}, "
          f"holding out subject {demo_subject}", flush=True)

    # --- synthesise the session --------------------------------------------------
    sig, lab, order, B = build_session(demo_subject, block_s)
    dur = len(sig) / FS
    starts = np.arange(0, len(sig) - W + 1, hop)
    print(f"  session: {dur:.0f} s, {len(order)} gesture blocks of {block_s} s, "
          f"{len(starts)} decodes at {hop_ms} ms hop", flush=True)

    # window features, plus truth and whether the window straddles a switch
    t0 = time.perf_counter()
    idx = starts[:, None] + np.arange(W)[None, :]
    Xw = sig[idx].transpose(0, 2, 1)
    Fw = extract(Xw)
    feat_ms = (time.perf_counter() - t0) / len(starts) * 1000

    y_true = lab[starts + W - 1]
    pure = np.array([len(np.unique(lab[s:s + W])) == 1 for s in starts])

    warm = max(4, int(warmup_s * FS / hop))
    conditions = {
        "oracle_global": (Fw - Fw.mean(0)) / (Fw.std(0) + 1e-8),
        "causal_ema": causal_standardise(Fw, warm, tau_windows=warmup_s * FS / hop),
        "none": (Fw - tr_mu) / tr_sd,
    }

    results, probs = {}, {}
    for name, Fn in conditions.items():
        t0 = time.perf_counter()
        p = clf.predict_proba(Fn)
        infer_ms = (time.perf_counter() - t0) / len(Fn) * 1000
        pred = p.argmax(1)
        probs[name] = p
        results[name] = {
            "accuracy_all": float((pred == y_true).mean()),
            "accuracy_steady": float((pred[pure] == y_true[pure]).mean()),
            "accuracy_transition": float((pred[~pure] == y_true[~pure]).mean()),
            "infer_ms_per_window": round(infer_ms, 4),
        }
        print(f"  {name:14s} all={results[name]['accuracy_all']:.4f}  "
              f"steady={results[name]['accuracy_steady']:.4f}  "
              f"transition={results[name]['accuracy_transition']:.4f}")

    # --- smoothing sweep on the deployable condition -----------------------------
    p = probs["causal_ema"]
    smoothing = []
    for k in SMOOTH_K:
        acc = np.empty_like(p)
        for j in range(len(p)):
            acc[j] = p[max(0, j - k + 1):j + 1].mean(0)
        pr = acc.argmax(1)
        smoothing.append({
            "k": k,
            "accuracy_all": float((pr == y_true).mean()),
            "accuracy_steady": float((pr[pure] == y_true[pure]).mean()),
            "added_latency_ms": (k - 1) * hop_ms,
            "total_latency_ms": window_ms + (k - 1) * hop_ms,
        })
        print(f"  smooth k={k:2d}  steady={smoothing[-1]['accuracy_steady']:.4f}  "
              f"total latency {smoothing[-1]['total_latency_ms']:4d} ms")

    payload = {
        "demo_subject": demo_subject, "window_ms": window_ms, "hop_ms": hop_ms,
        "block_s": block_s, "warmup_s": warmup_s,
        "session_seconds": round(dur, 1), "n_decodes": int(len(starts)),
        "block_order": order,
        "normalisation": results,
        "smoothing": smoothing,
        "compute_ms": {"features": round(feat_ms, 4),
                       "classifier": results["causal_ema"]["infer_ms_per_window"]},
        "note": ("causal_ema is the only condition a device can implement: it uses a "
                 "running mean/variance over past windows only, warm-started on the "
                 "first %g s of wear. oracle_global is the offline assumption behind "
                 "the headline LOSO number and is reported as an upper bound."
                 % warmup_s),
    }

    if export_web:
        d = WEB_PUBLIC / "data"
        d.mkdir(parents=True, exist_ok=True)
        sig.astype(np.float32).tofile(d / "session.bin")
        (d / "session_meta.json").write_text(__import__("json").dumps({
            "subject": demo_subject, "fs": FS, "n_channels": 4,
            "n_samples": int(len(sig)), "block_samples": int(B),
            "block_order": order, "window_samples": W, "hop_samples": int(hop),
            "warmup_windows": int(warm),
            "train_mu": tr_mu.round(6).tolist(), "train_sd": tr_sd.round(6).tolist(),
        }, indent=2))
        print(f"  -> web/public/data/session.bin ({len(sig) * 4 * 4 / 1e6:.1f} MB)")

    return save("realtime", payload)


if __name__ == "__main__":
    main()
