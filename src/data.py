"""Loading, filtering and epoching of the EMG recordings, plus the three split schemes.

The split schemes are the scientific heart of this project:

  A1 random_within -- shuffle windows *within each subject* and split. Maximum leak:
                     train and test windows are milliseconds apart in the same
                     recording from the same person.
  A2 random        -- shuffle all windows from all subjects and split. Still leaky in
                     time; this is what the naive recipe does.
  B  blocked       -- split each recording in time, with a discarded gap between train
                     and test to break autocorrelation. Honest within-subject estimate.
  C  loso          -- leave one subject out. Honest cross-subject estimate; the headline.

Read as a ladder, the four numbers separate *temporal* leakage from *subject* leakage.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.signal import butter, iirnotch, sosfiltfilt, tf2sos

from .config import (BANDPASS, CACHE_DIR, CLASSES, DATA_DIR, FS, NOTCH_HZ,
                     NOTCH_Q, SUBJECTS)


# --------------------------------------------------------------------------- IO
def load_raw() -> dict[tuple[int, int], np.ndarray]:
    """Return {(subject, class): array of shape (n_samples, 4)}, cached as .npz."""
    cache = CACHE_DIR / "raw.npz"
    if cache.exists():
        z = np.load(cache)
        return {tuple(int(v) for v in k.split("_")): z[k] for k in z.files}
    out = {}
    for s in SUBJECTS:
        for c in CLASSES:
            path = DATA_DIR / f"subject_{s}" / f"{c}.txt"
            arr = np.loadtxt(path, dtype=np.float64)
            if arr.ndim != 2 or arr.shape[1] != 4:
                raise ValueError(f"{path}: expected (n,4), got {arr.shape}")
            out[(s, c)] = arr
    np.savez_compressed(cache, **{f"{s}_{c}": v for (s, c), v in out.items()})
    return out


# --------------------------------------------------------------------- filtering
def _filter_sos() -> np.ndarray:
    """Bandpass 20-450 Hz plus 60 Hz mains and its harmonics, as one SOS cascade."""
    lo, hi = BANDPASS
    nyq = FS / 2
    hi = min(hi, nyq * 0.99)
    sos = butter(4, [lo / nyq, hi / nyq], btype="bandpass", output="sos")
    for k in (1, 2, 3, 4):
        f0 = NOTCH_HZ * k
        if f0 < nyq * 0.95:
            b, a = iirnotch(f0 / nyq, NOTCH_Q)
            sos = np.vstack([sos, tf2sos(b, a)])
    return sos


_SOS = None


def preprocess(x: np.ndarray) -> np.ndarray:
    """Zero-phase filter a (n_samples, n_channels) recording."""
    global _SOS
    if _SOS is None:
        _SOS = _filter_sos()
    return sosfiltfilt(_SOS, x, axis=0).astype(np.float32)


def load_filtered() -> dict[tuple[int, int], np.ndarray]:
    cache = CACHE_DIR / "filtered.npz"
    if cache.exists():
        z = np.load(cache)
        return {tuple(int(v) for v in k.split("_")): z[k] for k in z.files}
    out = {k: preprocess(v) for k, v in load_raw().items()}
    np.savez_compressed(cache, **{f"{s}_{c}": v for (s, c), v in out.items()})
    return out


# --------------------------------------------------------------------- epoching
@dataclass(frozen=True)
class Epochs:
    """Windowed EMG. X is (n_windows, n_channels, window_len)."""
    X: np.ndarray
    y: np.ndarray          # class id
    subject: np.ndarray    # subject id
    start: np.ndarray      # start sample within its recording
    frac: np.ndarray       # start position as a fraction of its recording, in [0,1)
    window_len: int
    channels: tuple[int, ...]

    def __len__(self) -> int:
        return len(self.y)

    def select(self, mask: np.ndarray) -> "Epochs":
        return Epochs(self.X[mask], self.y[mask], self.subject[mask],
                      self.start[mask], self.frac[mask], self.window_len,
                      self.channels)


def make_epochs(window_ms: int = 250, stride_frac: float = 0.5,
                channels: tuple[int, ...] = (0, 1, 2, 3),
                filtered: bool = True,
                recordings: dict | None = None,
                stride_samples: int | None = None) -> Epochs:
    """Slide a window over every recording. Windows never span two recordings.

    `stride_samples` pins the hop in absolute samples. The window-length sweep needs
    this: with a proportional stride, a 25 ms window yields ~20x more training
    windows than a 1000 ms one, and the resulting curve confounds window length with
    training-set size.
    """
    if recordings is None:
        recordings = load_filtered() if filtered else load_raw()
    W = int(round(window_ms * FS / 1000))
    if W < 2:
        raise ValueError(f"window_ms={window_ms} is under 2 samples at fs={FS}")
    stride = int(stride_samples) if stride_samples else max(1, int(round(W * stride_frac)))
    stride = max(1, stride)

    Xs, ys, ss, st, fr = [], [], [], [], []
    for (subj, cls), arr in sorted(recordings.items()):
        a = np.asarray(arr, dtype=np.float32)[:, list(channels)]
        n = len(a)
        starts = np.arange(0, n - W + 1, stride)
        if len(starts) == 0:
            continue
        # (n_windows, W, n_ch) -> (n_windows, n_ch, W)
        idx = starts[:, None] + np.arange(W)[None, :]
        Xs.append(a[idx].transpose(0, 2, 1))
        ys.append(np.full(len(starts), cls, dtype=np.int64))
        ss.append(np.full(len(starts), subj, dtype=np.int64))
        st.append(starts.astype(np.int64))
        fr.append((starts / max(1, n - W)).astype(np.float32))

    return Epochs(np.concatenate(Xs), np.concatenate(ys), np.concatenate(ss),
                  np.concatenate(st), np.concatenate(fr), W, tuple(channels))


# ----------------------------------------------------------------- split schemes
def split_random(ep: Epochs, rng: np.random.Generator, test_frac: float = 0.2):
    """Scheme A -- the leaky one. Yields a single (train_mask, test_mask)."""
    idx = rng.permutation(len(ep))
    cut = int(len(idx) * (1 - test_frac))
    tr = np.zeros(len(ep), bool); tr[idx[:cut]] = True
    te = np.zeros(len(ep), bool); te[idx[cut:]] = True
    yield tr, te


def split_random_within(ep: Epochs, rng: np.random.Generator, test_frac: float = 0.2):
    """Scheme A1 -- the maximally leaky one. One fold per subject, shuffled within
    that subject, so the model is both trained and tested on the same person and the
    same recordings."""
    for s in SUBJECTS:
        m = np.flatnonzero(ep.subject == s)
        if len(m) == 0:
            continue
        idx = rng.permutation(m)
        cut = int(len(idx) * (1 - test_frac))
        tr = np.zeros(len(ep), bool); tr[idx[:cut]] = True
        te = np.zeros(len(ep), bool); te[idx[cut:]] = True
        yield tr, te


def split_blocked(ep: Epochs, train_frac: float = 0.6, gap_frac: float = 0.2):
    """Scheme B -- contiguous in time, with a discarded gap. One fold."""
    tr = ep.frac < train_frac
    te = ep.frac >= train_frac + gap_frac
    yield tr, te


def split_loso(ep: Epochs):
    """Scheme C -- leave one subject out. Yields 8 folds."""
    for s in SUBJECTS:
        te = ep.subject == s
        if te.sum() == 0:
            continue
        yield ~te, te


SPLIT_SCHEMES = {"random_within": split_random_within, "random": split_random,
                 "blocked": split_blocked, "loso": split_loso}
SPLIT_DESCRIPTIONS = {
    "random_within": "Random split within each subject (maximum leak) -- the model is "
                     "trained and tested on the same person's same recording, with "
                     "train and test windows milliseconds apart.",
    "random": "Random window split across all subjects (leaky) -- train and test "
              "windows still come from the same recordings, milliseconds apart.",
    "blocked": "Blocked temporal split -- train on the first 60% of each recording, "
               "test on the last 20%, with a discarded gap between.",
    "loso": "Leave-one-subject-out -- the model never sees the test subject.",
}


def iter_splits(ep: Epochs, scheme: str, rng: np.random.Generator | None = None):
    if scheme == "random_within":
        yield from split_random_within(ep, rng or np.random.default_rng(0))
    elif scheme == "random":
        yield from split_random(ep, rng or np.random.default_rng(0))
    elif scheme == "blocked":
        yield from split_blocked(ep)
    elif scheme == "loso":
        yield from split_loso(ep)
    else:
        raise ValueError(f"unknown split scheme: {scheme}")
