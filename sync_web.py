"""Copy experiment results into the web app.

Small result files are imported statically so Next can prerender the numbers into
the HTML; the large ones (latent point clouds, signal traces) stay in public/ and
are fetched at runtime.
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"
STATIC = ROOT / "web" / "src" / "results"
PUBLIC = ROOT / "web" / "public" / "data"
STATIC.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

# these carry big arrays -> public/, fetched on demand
BIG = {"latent"}
# strip these keys from the statically-imported copies
STRIP = {"leakage": ["permutation.null_distribution"],
         "calibration": []}


def prune(d, dotted):
    cur = d
    parts = dotted.split(".")
    for p in parts[:-1]:
        cur = cur.get(p, {})
    cur.pop(parts[-1], None)


def main():
    seen = []
    for src in sorted(RESULTS.glob("*.json")):
        name = src.stem
        data = json.loads(src.read_text())
        if name in BIG:
            (PUBLIC / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")))
            seen.append(f"{name} -> public/data ({src.stat().st_size/1e6:.1f} MB)")
            continue
        for k in STRIP.get(name, []):
            prune(data, k)
        (STATIC / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")))
        seen.append(f"{name} -> src/results ({(STATIC / f'{name}.json').stat().st_size/1024:.0f} KB)")
    for line in seen:
        print("  " + line)
    if not seen:
        print("  no results yet", file=sys.stderr)


if __name__ == "__main__":
    main()
