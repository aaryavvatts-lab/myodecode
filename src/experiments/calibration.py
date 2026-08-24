"""Experiment 5 -- how many seconds of a new wearer's data closes the gap?

LOSO says what a decoder does on a stranger with zero setup. A real product gets to
ask the wearer for a few seconds per gesture. This measures the exchange rate:
seconds of calibration data in, accuracy out.

It is run twice, with and without the calibration-free per-subject feature
standardisation, because the interesting question is not "does labelled calibration
help" but "does it buy anything that free unlabelled normalisation has not already
bought".

Calibration windows are taken from the *start* of each recording and the test set is
taken from the *end*, with a gap between, so calibration never overlaps evaluation.
"""
from __future__ import annotations

import numpy as np

from ..config import FS, SEED, SUBJECTS
from ..evaluate import aggregate, score_fold
from ..models import make_lda
from ..sk_runner import per_subject_znorm
from ._common import epochs, features, ms, save

SECONDS = (0.0, 0.5, 1.0, 2.0, 3.0, 5.0, 8.0, 12.0)


def _curve(F, ep, seconds, gap_frac, tag):
    y = ep.y
    rows = []
    for sec in seconds:
        folds = []
        for s in SUBJECTS:
            te_subj = ep.subject == s
            # fraction of each recording consumed by `sec` of calibration
            rec_len_s = np.array([(ep.start[te_subj & (ep.y == c)].max() + ep.window_len)
                                  / FS for c in range(5)])
            cal_frac = float(np.clip(sec / rec_len_s.mean(), 0, 0.6))
            cal = te_subj & (ep.frac < cal_frac)
            test = te_subj & (ep.frac >= cal_frac + gap_frac)
            if test.sum() == 0:
                continue
            train = ~te_subj
            if sec > 0 and cal.sum() > 0:
                train = train | cal
            m = make_lda()
            m.fit(F[train], y[train])
            folds.append(score_fold(f"subject_{s}", y[test], m.predict(F[test])))
        r = aggregate("loso_calibrated", "td_lda_znorm", folds,
                      extra={"calibration_seconds": sec})
        rows.append({"seconds": sec, "seconds_per_gesture": round(sec / 5, 2),
                     **r.to_dict()})
        print(f"  [{tag}] {sec:5.1f}s total ({sec/5:.1f}s/gesture): {r.accuracy:.4f} "
              f"[{r.accuracy_ci[0]:.3f},{r.accuracy_ci[1]:.3f}]", flush=True)
    return rows


def _summarise(rows):
    base = rows[0]["accuracy"]
    top = max(r["accuracy"] for r in rows)
    gain = top - base
    closes = [r for r in rows if r["accuracy"] >= base + 0.9 * gain] if gain > 1e-6 else []
    return {"zero_shot": base, "best": top, "gain": round(gain, 4),
            "seconds_to_90pct_of_gain": closes[0]["seconds"] if closes else None}


def main(window_ms: int = 250, seconds=SECONDS, gap_frac: float = 0.1):
    ep = epochs(window_ms)
    Fraw = features(ep)
    variants = {
        "with_free_normalisation": per_subject_znorm(Fraw, ep.subject),
        "without_normalisation": Fraw,
    }
    out, summary = {}, {}
    for tag, F in variants.items():
        out[tag] = _curve(F, ep, seconds, gap_frac, tag)
        summary[tag] = _summarise(out[tag])
        print(f"  [{tag}] zero-shot {summary[tag]['zero_shot']:.4f} -> "
              f"best {summary[tag]['best']:.4f} (gain {summary[tag]['gain']:+.4f})")

    a = summary["with_free_normalisation"]
    b = summary["without_normalisation"]
    summary["verdict"] = (
        "Unlabelled per-subject normalisation is worth %+.1f points at zero calibration "
        "(%.3f vs %.3f). Labelled calibration on top of it is worth a further %+.1f "
        "points." % ((a["zero_shot"] - b["zero_shot"]) * 100, a["zero_shot"],
                     b["zero_shot"], a["gain"] * 100))
    print("  " + summary["verdict"])
    return save("calibration", {"window_ms": ms(ep.window_len), "curves": out,
                                "summary": summary, "gap_frac": gap_frac})


if __name__ == "__main__":
    main()
