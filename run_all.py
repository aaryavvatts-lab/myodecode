"""Regenerate every number, figure and web asset from the raw .txt recordings.

Deterministic: fixed seeds throughout, so a rerun reproduces the published values.
Expect roughly two to three hours on an Apple-silicon laptop, almost all of it in
the leave-one-subject-out CNN training inside the latency and channel sweeps.
"""
import argparse
import sys
import time

sys.path.insert(0, ".")

from src.experiments import (calibration, channels, confusion, latency, latent,  # noqa: E402
                             leakage, realtime, tradeoff)

STAGES = {
    "leakage": lambda fast: leakage.main(cnn=True, permutations=20 if fast else 200),
    "latency": lambda fast: latency.main(cnn=not fast, cnn_epochs=40),
    "channels": lambda fast: channels.main(cnn=not fast, cnn_epochs=40),
    "tradeoff": lambda fast: tradeoff.main(),
    "calibration": lambda fast: calibration.main(),
    "confusion": lambda fast: confusion.main(),
    "latent": lambda fast: latent.main(cnn_epochs=20 if fast else 40),
    "realtime": lambda fast: realtime.main(),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", choices=list(STAGES), help="run just these stages")
    ap.add_argument("--fast", action="store_true",
                    help="skip the CNN sweeps and shorten the permutation test")
    args = ap.parse_args()

    t0 = time.time()
    for name in (args.only or STAGES):
        print(f"\n===== {name}  (t+{time.time() - t0:.0f}s) =====", flush=True)
        STAGES[name](args.fast)
    print(f"\nall stages complete in {time.time() - t0:.0f}s")
    print("next: python sync_web.py && python -m src.export")


if __name__ == "__main__":
    main()
