"""Export everything the website needs: two trained decoders, and the data to drive them.

Both decoders are shipped so the site can race them live rather than just asserting a
result:

  td_lda  -- Hudgins features into an LDA. It is a linear model, so it exports as a
             handful of numbers and reimplements in ~40 lines of JavaScript.
  cnn     -- the reel's encoder, exported to ONNX for onnxruntime-web.

Both are trained on seven subjects and demonstrated on the eighth, who neither has
ever seen.
"""
from __future__ import annotations

import json

import numpy as np
import torch

from .config import (CLASS_LABELS, CLASS_SIGNATURES, FS, LATENT_DIM, SEED,
                     SUBJECTS, WEB_PUBLIC)
from .data import load_filtered, make_epochs
from .features import extract
from .models import make_lda
from .sk_runner import per_subject_znorm
from .train import (embed_all, get_device, normalize_by_subject, subject_gains,
                    train_one, _val_subject)

DEMO_SUBJECT = 8
WINDOW_MS = 250


def _out(*parts):
    p = WEB_PUBLIC.joinpath(*parts)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def export_lda(ep, demo_subject=DEMO_SUBJECT):
    """LDA is linear: (x - mean)/scale @ coef.T + intercept. Ship the numbers."""
    F = per_subject_znorm(extract(ep.X), ep.subject)
    tr = ep.subject != demo_subject
    clf = make_lda()
    clf.fit(F[tr], ep.y[tr])
    scaler, lda = clf.named_steps["standardscaler"], clf.named_steps["lineardiscriminantanalysis"]

    raw_tr = extract(ep.X[tr])
    payload = {
        "kind": "td_lda", "window_samples": ep.window_len, "fs": FS,
        "n_features": int(F.shape[1]), "n_channels": len(ep.channels),
        "feature_order": ["log_mav", "log_rms", "log_wl", "zc", "ssc"],
        "zc_ssc_threshold": 1e-4,
        "scaler_mean": scaler.mean_.round(8).tolist(),
        "scaler_scale": scaler.scale_.round(8).tolist(),
        "coef": np.asarray(lda.coef_).round(8).tolist(),
        "intercept": np.asarray(lda.intercept_).round(8).tolist(),
        "train_mu": raw_tr.mean(0).round(8).tolist(),
        "train_sd": (raw_tr.std(0) + 1e-8).round(8).tolist(),
        "trained_on": sorted(int(s) for s in set(ep.subject[tr].tolist())),
        "held_out": demo_subject,
    }
    _out("model", "td_lda.json").write_text(json.dumps(payload))

    # verify the exported linear form reproduces sklearn exactly
    te = ~tr
    z = (F[te] - scaler.mean_) / scaler.scale_
    mine = (z @ np.asarray(lda.coef_).T + np.asarray(lda.intercept_)).argmax(1)
    agree = float((mine == clf.predict(F[te])).mean())
    print(f"  td_lda exported; JS-form agreement with sklearn: {agree:.6f}")
    assert agree == 1.0, "exported LDA does not reproduce sklearn"
    return payload


def export_cnn(ep, demo_subject=DEMO_SUBJECT, epochs=60):
    device = get_device()
    X = normalize_by_subject(ep)
    y = ep.y.astype(np.int64)
    val_s = _val_subject(demo_subject)
    te, va = ep.subject == demo_subject, ep.subject == val_s
    tr = ~te & ~va

    model, val_acc = train_one(X[tr], y[tr], X[va], y[va], X.shape[1], device,
                               epochs=epochs, seed=SEED)
    model = model.to("cpu").eval()

    with torch.no_grad():
        acc = float((model(torch.from_numpy(X[te])).argmax(1).numpy() == y[te]).mean())
    print(f"  cnn trained (val {val_acc:.3f}); held-out subject {demo_subject}: {acc:.4f}")

    path = _out("model", "cnn.onnx")
    dummy = torch.randn(1, X.shape[1], ep.window_len)
    torch.onnx.export(
        model, (dummy,), str(path), input_names=["window"], output_names=["logits"],
        dynamic_axes={"window": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17, dynamo=False)

    import onnxruntime as ort
    sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    probe = X[te][:64]
    with torch.no_grad():
        ref = model(torch.from_numpy(probe)).numpy()
    got = sess.run(["logits"], {"window": probe})[0]
    err = float(np.abs(ref - got).max())
    print(f"  onnx max |pytorch - onnx| = {err:.2e}")
    assert err < 1e-4, "ONNX export does not match PyTorch"

    gains = subject_gains(ep)
    meta = {
        "kind": "cnn", "window_samples": ep.window_len, "fs": FS,
        "n_channels": int(X.shape[1]), "latent_dim": LATENT_DIM,
        "held_out": demo_subject, "held_out_accuracy": acc,
        "subject_gain": {str(k): v for k, v in gains.items()},
        "onnx_bytes": path.stat().st_size,
        "note": ("Input is a (1, 4, W) window divided by a scalar gain. Offline that "
                 "gain is the subject's whole-recording RMS; the live demo estimates "
                 "it causally with a running RMS."),
    }
    _out("model", "cnn_meta.json").write_text(json.dumps(meta, indent=2))
    print(f"  onnx size: {path.stat().st_size / 1024:.0f} KB")
    return meta


def export_signal_explorer(decim: int = 4, env_decim: int = 20,
                           seconds: float = 4.0):
    """A few seconds of every (subject, gesture) recording, for the data explorer.

    Raw is decimated for drawing only; the envelope is a rectified moving average,
    which is what makes the between-gesture differences legible at a glance. Values
    are stored as integers in units of 1e-4 to keep the payload small.
    """
    recs = load_filtered()
    n = int(seconds * FS)
    out = {}
    for (s, c), a in recs.items():
        seg = a[:n:decim]
        env = np.abs(a[:n]).reshape(-1, env_decim, a.shape[1]).mean(1)
        out[f"{s}_{c}"] = {
            "raw": np.round(seg * 1e4).astype(int).T.tolist(),
            "envelope": np.round(env * 1e4).astype(int).T.tolist(),
        }
    payload = {
        "fs": FS, "decimated_fs": FS / decim, "envelope_fs": FS / env_decim,
        "scale": 1e-4, "seconds": seconds,
        "subjects": list(SUBJECTS), "classes": list(range(5)),
        "class_labels": CLASS_LABELS,
        "class_signatures": {str(k): v for k, v in CLASS_SIGNATURES.items()},
        "signals": out,
    }
    p = _out("data", "signals.json")
    p.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"  signals.json: {p.stat().st_size / 1e6:.1f} MB")


def main():
    ep = make_epochs(WINDOW_MS, 0.5)
    print(f"export: {len(ep)} windows @ {WINDOW_MS} ms")
    export_lda(ep)
    export_cnn(ep)
    export_signal_explorer()
    print("export complete")


if __name__ == "__main__":
    main()
