"""Shared plumbing for the experiment scripts."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from ..config import FS, RESULTS_DIR
from ..data import Epochs, load_filtered, make_epochs

_REC = None
_EPOCH_CACHE: dict[tuple, Epochs] = {}
_FEAT_CACHE: dict[tuple, np.ndarray] = {}


def recordings():
    global _REC
    if _REC is None:
        _REC = load_filtered()
    return _REC


def epochs(window_ms: int, channels: tuple[int, ...] = (0, 1, 2, 3),
           stride_frac: float = 0.5, stride_samples: int | None = None) -> Epochs:
    key = (window_ms, channels, stride_frac, stride_samples)
    if key not in _EPOCH_CACHE:
        _EPOCH_CACHE[key] = make_epochs(window_ms, stride_frac, channels,
                                        recordings=recordings(),
                                        stride_samples=stride_samples)
    return _EPOCH_CACHE[key]


def features(ep: Epochs) -> np.ndarray:
    from ..features import extract
    key = (ep.window_len, ep.channels, len(ep))
    if key not in _FEAT_CACHE:
        _FEAT_CACHE[key] = extract(ep.X)
    return _FEAT_CACHE[key]


def save(name: str, payload: dict) -> Path:
    payload.setdefault("_meta", {})
    payload["_meta"].update({"fs_hz": FS, "fs_is_inferred": True})
    path = RESULTS_DIR / f"{name}.json"
    path.write_text(json.dumps(payload, indent=2, default=_default))
    print(f"  -> {path.relative_to(RESULTS_DIR.parent)}")
    return path


def _default(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    raise TypeError(f"not JSON serialisable: {type(o)}")


def ms(window_len: int) -> float:
    return round(window_len * 1000 / FS, 2)
