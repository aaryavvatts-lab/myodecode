"""Metrics, confidence intervals, and the permutation test.

Every headline number in this project goes through here, so that the leaky split
and the honest split are scored by identical code and the comparison is fair.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np
from sklearn.metrics import balanced_accuracy_score, confusion_matrix, f1_score

from .config import N_BOOTSTRAP, N_CLASSES, SEED


@dataclass
class FoldResult:
    fold: str                 # e.g. "subject_3" or "all"
    accuracy: float
    balanced_accuracy: float
    macro_f1: float
    n_test: int
    confusion: list[list[int]]
    per_class_recall: list[float]


@dataclass
class EvalResult:
    scheme: str
    model: str
    accuracy: float                       # mean over folds
    accuracy_ci: tuple[float, float]      # bootstrap 95% CI over folds
    balanced_accuracy: float
    macro_f1: float
    folds: list[FoldResult] = field(default_factory=list)
    confusion: list[list[int]] = field(default_factory=list)   # pooled
    extra: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["accuracy_ci"] = list(self.accuracy_ci)
        return d


def score_fold(name: str, y_true: np.ndarray, y_pred: np.ndarray) -> FoldResult:
    labels = list(range(N_CLASSES))
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    with np.errstate(divide="ignore", invalid="ignore"):
        recall = np.divide(np.diag(cm), cm.sum(axis=1),
                           out=np.full(N_CLASSES, np.nan), where=cm.sum(axis=1) > 0)
    return FoldResult(
        fold=name,
        accuracy=float((y_true == y_pred).mean()),
        balanced_accuracy=float(balanced_accuracy_score(y_true, y_pred)),
        macro_f1=float(f1_score(y_true, y_pred, average="macro", labels=labels,
                                zero_division=0)),
        n_test=int(len(y_true)),
        confusion=cm.astype(int).tolist(),
        per_class_recall=[None if np.isnan(v) else float(v) for v in recall],
    )


def bootstrap_ci(values: list[float], n: int = N_BOOTSTRAP,
                 seed: int = SEED) -> tuple[float, float]:
    """Percentile bootstrap over folds. With 8 LOSO folds this is wide, on purpose:
    it reflects how little we can actually claim from 8 people."""
    v = np.asarray(values, dtype=float)
    if len(v) < 2:
        return (float(v.mean()), float(v.mean()))
    rng = np.random.default_rng(seed)
    means = rng.choice(v, size=(n, len(v)), replace=True).mean(axis=1)
    return (float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5)))


def aggregate(scheme: str, model: str, folds: list[FoldResult],
              extra: dict | None = None) -> EvalResult:
    accs = [f.accuracy for f in folds]
    pooled = np.sum([np.array(f.confusion) for f in folds], axis=0)
    return EvalResult(
        scheme=scheme,
        model=model,
        accuracy=float(np.mean(accs)),
        accuracy_ci=bootstrap_ci(accs),
        balanced_accuracy=float(np.mean([f.balanced_accuracy for f in folds])),
        macro_f1=float(np.mean([f.macro_f1 for f in folds])),
        folds=folds,
        confusion=pooled.astype(int).tolist(),
        extra=extra or {},
    )
