"""Runs a scikit-learn model through a split scheme. Used for the feature baselines
and for the logistic head fitted on CNN latents."""
from __future__ import annotations

import numpy as np

from .config import SEED, SUBJECTS
from .data import Epochs, iter_splits
from .evaluate import EvalResult, aggregate, score_fold


def per_subject_znorm(F: np.ndarray, subject: np.ndarray) -> np.ndarray:
    """Standardise features within each subject.

    This is calibration-free: it uses only the test subject's own *unlabelled*
    feature distribution, no labels, so it does not leak. It is what a real device
    would do after a few seconds of arbitrary wearer movement.
    """
    out = F.copy()
    for s in np.unique(subject):
        m = subject == s
        out[m] = (out[m] - out[m].mean(0)) / (out[m].std(0) + 1e-8)
    return out


def run_sklearn(make_model, F: np.ndarray, ep: Epochs, scheme: str,
                model_name: str, znorm: bool = False,
                permute: bool = False, seed: int = SEED) -> EvalResult:
    rng = np.random.default_rng(seed)
    X = per_subject_znorm(F, ep.subject) if znorm else F
    y = ep.y
    if permute:
        y = y.copy()
        for s in np.unique(ep.subject):     # shuffle within subject
            m = ep.subject == s
            y[m] = rng.permutation(y[m])

    folds = []
    for i, (tr, te) in enumerate(iter_splits(ep, scheme, rng)):
        if tr.sum() == 0 or te.sum() == 0:
            continue
        model = make_model()
        model.fit(X[tr], y[tr])
        pred = model.predict(X[te])
        name = f"subject_{SUBJECTS[i]}" if scheme == "loso" else f"fold_{i}"
        folds.append(score_fold(name, y[te], pred))
    return aggregate(scheme, model_name, folds,
                     extra={"znorm": znorm, "permuted": permute,
                            "window_len": ep.window_len, "channels": list(ep.channels)})
