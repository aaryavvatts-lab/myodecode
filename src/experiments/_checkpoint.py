"""Incremental checkpointing for the long sweeps.

The CNN sweeps take hours. Writing results only at the end means any interruption
throws away everything, so each sweep appends its rows to a checkpoint file as it
goes and skips rows already present when restarted.
"""
from __future__ import annotations

import json
from pathlib import Path

from ..config import CACHE_DIR


def _path(name: str) -> Path:
    return CACHE_DIR / f"ckpt_{name}.json"


def load(name: str) -> dict[str, dict]:
    p = _path(name)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text())
    except json.JSONDecodeError:
        return {}


def put(name: str, key: str, row: dict) -> None:
    d = load(name)
    d[key] = row
    tmp = _path(name).with_suffix(".tmp")
    tmp.write_text(json.dumps(d, default=_default))
    tmp.replace(_path(name))


def clear(name: str) -> None:
    _path(name).unlink(missing_ok=True)


def _default(o):
    import numpy as np
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        return float(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    raise TypeError(type(o))
