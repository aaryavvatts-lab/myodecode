"""LOSO training of the CNN encoder, and the reel's encoder -> latent -> classifier.

Two guardrails matter more than anything else here, because there are only ~13
minutes of EMG in the entire dataset:

  * Early stopping uses a *held-out training subject*, never the test subject.
  * Input gain normalisation is calibration-free: each subject's recordings are
    divided by a single scalar estimated from that subject's own unlabelled signal.
    A real device does the same thing with an automatic gain stage. No labels are
    used, so this does not leak.
"""
from __future__ import annotations

import time

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from .config import LATENT_DIM, N_CLASSES, SEED, SUBJECTS
from .data import Epochs
from .evaluate import EvalResult, aggregate, score_fold
from .models import Augment, EMGClassifier, make_logreg


def get_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def subject_gains(ep: Epochs) -> dict[int, float]:
    """One scalar per subject: the RMS of all of that subject's windows.

    Removes per-wearer gain (skin impedance, electrode contact) while preserving
    the between-channel ratios and between-gesture amplitude differences that
    actually carry the class information.
    """
    return {int(s): float(np.sqrt((ep.X[ep.subject == s] ** 2).mean()) + 1e-8)
            for s in np.unique(ep.subject)}


def normalize_by_subject(ep: Epochs) -> np.ndarray:
    g = subject_gains(ep)
    scale = np.array([g[int(s)] for s in ep.subject], dtype=np.float32)[:, None, None]
    return (ep.X / scale).astype(np.float32)


def _val_subject(test_subject: int) -> int:
    """Deterministic choice of the validation subject: the next one in the ring."""
    others = [s for s in SUBJECTS if s != test_subject]
    return others[(test_subject - 1) % len(others)]


def train_one(Xtr, ytr, Xva, yva, n_channels, device, *, epochs=60, batch=256,
              lr=3e-3, weight_decay=1e-2, dropout=0.25, patience=12, seed=SEED,
              augment=True, verbose=False):
    torch.manual_seed(seed)
    model = EMGClassifier(n_channels=n_channels, latent_dim=LATENT_DIM,
                          dropout=dropout).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    sched = torch.optim.lr_scheduler.OneCycleLR(
        opt, max_lr=lr, total_steps=epochs * max(1, len(Xtr) // batch + 1))
    lossf = nn.CrossEntropyLoss(label_smoothing=0.05)
    aug = Augment(seed=seed) if augment else None

    dl = DataLoader(TensorDataset(torch.from_numpy(Xtr), torch.from_numpy(ytr)),
                    batch_size=batch, shuffle=True, drop_last=len(Xtr) > batch)
    Xva_t = torch.from_numpy(Xva).to(device)
    yva_t = torch.from_numpy(yva).to(device)

    best, best_state, since = -1.0, None, 0
    for ep_i in range(epochs):
        model.train()
        for xb, yb in dl:
            if aug is not None:
                xb = aug(xb)
            xb, yb = xb.to(device), yb.to(device)
            opt.zero_grad(set_to_none=True)
            loss = lossf(model(xb), yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            if sched.last_epoch < sched.total_steps - 1:
                sched.step()
        model.eval()
        with torch.no_grad():
            acc = (model(Xva_t).argmax(1) == yva_t).float().mean().item()
        if acc > best:
            best, since = acc, 0
            best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
        else:
            since += 1
            if since >= patience:
                break
        if verbose and ep_i % 10 == 0:
            print(f"    epoch {ep_i:3d} val={acc:.3f} best={best:.3f}")
    if best_state is not None:
        model.load_state_dict(best_state)
    model.eval()
    return model, best


@torch.no_grad()
def embed_all(model, X, device, batch=1024) -> np.ndarray:
    out = []
    for i in range(0, len(X), batch):
        xb = torch.from_numpy(X[i:i + batch]).to(device)
        out.append(model.encoder(xb).cpu().numpy())
    return np.concatenate(out)


@torch.no_grad()
def predict_all(model, X, device, batch=1024) -> np.ndarray:
    out = []
    for i in range(0, len(X), batch):
        xb = torch.from_numpy(X[i:i + batch]).to(device)
        out.append(model(xb).argmax(1).cpu().numpy())
    return np.concatenate(out)


def run_cnn_loso(ep: Epochs, *, normalize=True, epochs=60, seed=SEED,
                 augment=True, keep_models=False, verbose=False):
    """Train one CNN per LOSO fold; score both the end-to-end head and the reel's
    latent -> logistic-regression variant. Returns (result_e2e, result_latent, bundle)."""
    device = get_device()
    X = normalize_by_subject(ep) if normalize else ep.X.astype(np.float32)
    y = ep.y.astype(np.int64)
    n_ch = X.shape[1]

    folds_e2e, folds_lat, bundle = [], [], {}
    for test_s in SUBJECTS:
        val_s = _val_subject(test_s)
        te = ep.subject == test_s
        va = ep.subject == val_s
        tr = ~te & ~va
        if te.sum() == 0 or tr.sum() == 0:
            continue
        t0 = time.time()
        model, val_acc = train_one(X[tr], y[tr], X[va], y[va], n_ch, device,
                                   epochs=epochs, seed=seed + test_s, augment=augment,
                                   verbose=verbose)
        pred = predict_all(model, X[te], device)
        folds_e2e.append(score_fold(f"subject_{test_s}", y[te], pred))

        # The reel's recipe: throw the head away, fit a simple classifier on the latent.
        Ztr, Zte = embed_all(model, X[tr], device), embed_all(model, X[te], device)
        clf = make_logreg()
        clf.fit(Ztr, y[tr])
        folds_lat.append(score_fold(f"subject_{test_s}", y[te], clf.predict(Zte)))

        if keep_models:
            bundle[test_s] = {"model": model, "clf": clf, "val_acc": val_acc}
        if verbose:
            print(f"  subject {test_s}: e2e={folds_e2e[-1].accuracy:.3f} "
                  f"latent={folds_lat[-1].accuracy:.3f} val={val_acc:.3f} "
                  f"({time.time() - t0:.0f}s)")

    extra = {"window_len": ep.window_len, "channels": list(ep.channels),
             "normalized": normalize, "augment": augment, "device": str(device)}
    return (aggregate("loso", "cnn_e2e", folds_e2e, extra),
            aggregate("loso", "cnn_latent_logreg", folds_lat, extra),
            bundle)
