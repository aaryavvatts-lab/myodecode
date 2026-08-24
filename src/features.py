"""Classic time-domain EMG features (Hudgins et al., 1993) plus log-RMS.

This is the 30-year-old baseline the deep model has to beat. It is deliberately
cheap: five statistics per channel, no learning, microseconds per window.
"""
from __future__ import annotations

import numpy as np

FEATURE_NAMES = ("log_mav", "log_rms", "log_wl", "zc", "ssc")


def extract(X: np.ndarray, threshold: float = 1e-4) -> np.ndarray:
    """X: (n_windows, n_channels, window_len) -> (n_windows, n_channels * 5).

    Zero-crossing and slope-sign-change counts use a small amplitude threshold so
    that baseline noise in the rest class does not inflate them.
    """
    X = np.asarray(X, dtype=np.float64)
    n, c, w = X.shape
    eps = 1e-10

    mav = np.abs(X).mean(axis=2)
    rms = np.sqrt((X ** 2).mean(axis=2))
    d = np.diff(X, axis=2)
    wl = np.abs(d).sum(axis=2)

    sign_flip = (X[:, :, :-1] * X[:, :, 1:]) < 0
    big_enough = np.abs(X[:, :, :-1] - X[:, :, 1:]) >= threshold
    zc = (sign_flip & big_enough).sum(axis=2) / w

    dd = (d[:, :, :-1] * d[:, :, 1:]) < 0
    d_big = (np.abs(d[:, :, :-1]) >= threshold) | (np.abs(d[:, :, 1:]) >= threshold)
    ssc = (dd & d_big).sum(axis=2) / w

    feats = np.stack([np.log(mav + eps), np.log(rms + eps), np.log(wl + eps), zc, ssc],
                     axis=2)                      # (n, c, 5)
    return feats.reshape(n, c * 5).astype(np.float32)


def feature_labels(channels: tuple[int, ...]) -> list[str]:
    return [f"ch{ch + 1}_{name}" for ch in channels for name in FEATURE_NAMES]
