"""Single source of truth for dataset facts, inferred parameters, and paths.

Anything marked INFERRED was derived from the signal itself, not supplied with
the data. See data/PROVENANCE.md for the derivations.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CACHE_DIR = ROOT / ".cache"
RESULTS_DIR = ROOT / "results"
FIGURES_DIR = ROOT / "figures"
WEB_PUBLIC = ROOT / "web" / "public"

for _d in (CACHE_DIR, RESULTS_DIR, FIGURES_DIR):
    _d.mkdir(exist_ok=True)

# --- Dataset facts (read directly off the files) -------------------------------
SUBJECTS = tuple(range(1, 9))          # 8 subjects
CLASSES = tuple(range(5))              # 5 recordings per subject, one per class
N_CHANNELS = 4
N_CLASSES = len(CLASSES)

# --- INFERRED: sampling rate ---------------------------------------------------
# Welch spectrum of the active recordings peaks at 0.092 cycles/sample and decays
# to the noise floor by ~0.45 cycles/sample. Surface EMG has its power peak at
# 50-100 Hz and negligible content above ~450 Hz, which puts fs at ~1000 Hz.
# Every millisecond figure in this project scales linearly with this constant.
FS = 1000
FS_IS_INFERRED = True

# --- INFERRED: class identities ------------------------------------------------
# The dataset ships no gesture names. Each class is described by its measured
# per-channel activation signature, which is highly consistent across subjects:
# the dominant channel is identical in all 8 subjects for classes 1, 2 and 4.
# `total` is total RMS relative to that subject's grand mean RMS across classes.
CLASS_LABELS = {
    0: "Rest",
    1: "Gesture 1",
    2: "Gesture 2",
    3: "Gesture 3",
    4: "Gesture 4",
}
CLASS_SIGNATURES = {
    0: {"dominant": None, "share": (0.247, 0.341, 0.210, 0.202), "total": 0.75,
        "note": "near-baseline on all four channels"},
    1: {"dominant": 3, "share": (0.162, 0.177, 0.398, 0.262), "total": 6.76,
        "note": "ch3-led, strongest overall recruitment"},
    2: {"dominant": 2, "share": (0.175, 0.423, 0.216, 0.185), "total": 2.99,
        "note": "ch2-isolated, weakest of the active classes"},
    3: {"dominant": 3, "share": (0.155, 0.196, 0.352, 0.297), "total": 4.39,
        "note": "ch3+ch4 pair"},
    4: {"dominant": 4, "share": (0.139, 0.209, 0.275, 0.378), "total": 3.72,
        "note": "ch4-led"},
}
CLASSES_ARE_INFERRED = True

# --- Preprocessing -------------------------------------------------------------
BANDPASS = (20.0, 450.0)   # Hz, 4th-order Butterworth
NOTCH_HZ = 60.0            # mains; harmonics at 120, 180, 240 also notched
NOTCH_Q = 30.0

# --- Windowing -----------------------------------------------------------------
DEFAULT_WINDOW_MS = 250
DEFAULT_STRIDE_FRAC = 0.5
WINDOW_SWEEP_MS = (25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000)

# --- Reproducibility -----------------------------------------------------------
SEED = 1337
N_BOOTSTRAP = 2000
N_PERMUTATIONS = 200

# --- Model ---------------------------------------------------------------------
LATENT_DIM = 64
