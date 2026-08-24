"""Static publication-quality figures, generated from results/*.json.

Same colour system as the website: gesture identity uses the validated
blue/yellow/magenta/green categorical set, channels use an ordinal blue ramp.
Every figure is written as both SVG and PNG.
"""
from __future__ import annotations

import json

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np

from .config import FIGURES_DIR, RESULTS_DIR

GESTURE = ["#8a8a85", "#2a78d6", "#eda100", "#e87ba4", "#008300"]
CHANNEL = ["#86b6ef", "#3987e5", "#256abf", "#104281"]
ACCENT, WARN, INK, MUTED, GRID = "#2a78d6", "#b45309", "#0b0b0b", "#85837c", "#e7e5df"

mpl.rcParams.update({
    "figure.dpi": 140, "savefig.dpi": 220, "savefig.bbox": "tight",
    "font.size": 9, "axes.titlesize": 11, "axes.labelsize": 9,
    "axes.edgecolor": MUTED, "axes.linewidth": 0.8, "axes.grid": True,
    "grid.color": GRID, "grid.linewidth": 0.7,
    "axes.spines.top": False, "axes.spines.right": False,
    "xtick.color": MUTED, "ytick.color": MUTED,
    "text.color": INK, "axes.labelcolor": INK, "figure.facecolor": "white",
})


def load(name):
    return json.loads((RESULTS_DIR / f"{name}.json").read_text())


def save(fig, name):
    for ext in ("svg", "png"):
        fig.savefig(FIGURES_DIR / f"{name}.{ext}")
    plt.close(fig)
    print(f"  figures/{name}.svg + .png")


def fig_leakage():
    d = load("leakage")
    order = [("random_within", "Random split,\none person", WARN),
             ("random", "Random split,\npooled", WARN),
             ("blocked", "Blocked\nin time", ACCENT),
             ("loso", "Leave one\nsubject out", ACCENT)]
    vals, labels, colors, errs = [], [], [], []
    for scheme, label, c in order:
        e = next(x for x in d["ladder"] if x["scheme"] == scheme and x["model"] == "td_lda")
        vals.append(e["accuracy"]); labels.append(label); colors.append(c)
        errs.append([e["accuracy"] - e["accuracy_ci"][0], e["accuracy_ci"][1] - e["accuracy"]])

    fig, ax = plt.subplots(figsize=(6.4, 3.6))
    x = np.arange(len(vals))
    ax.bar(x, vals, width=0.62, color=colors, zorder=3)
    ax.errorbar(x, vals, yerr=np.array(errs).T, fmt="none", ecolor=INK, elinewidth=1, capsize=3, zorder=4)
    for i, (v, e) in enumerate(zip(vals, errs)):
        ax.text(i, v + e[1] + 0.022, f"{v:.1%}", ha="center", fontsize=9, fontweight="bold")
    perm = d["permutation"]
    ax.axhline(perm["mean"], color=MUTED, ls="--", lw=1, zorder=2)
    ax.text(-0.45, perm["mean"] + 0.03, f"chance ({perm['mean']:.1%})",
            ha="left", fontsize=8, color=MUTED)
    ax.set_xticks(x, labels)
    ax.set_ylim(0, 1.12)
    ax.set_ylabel("Accuracy")
    ax.set_title("Same model, same data - only the split changes", loc="left", fontweight="bold")
    ax.set_axisbelow(True)
    save(fig, "01_leakage_ladder")


def fig_latency():
    d = load("latency")
    fig, ax = plt.subplots(figsize=(6.4, 3.9))
    styles = [("td_lda_znorm", "Features + LDA (normalised)", ACCENT, "-"),
              ("td_lda", "Features + LDA", "#e87ba4", "-"),
              ("cnn_latent_logreg", "CNN latent + logistic", "#008300", "--"),
              ("cnn_e2e", "CNN end-to-end", "#eda100", "--")]
    for key, label, c, ls in styles:
        if key not in d["sweep"][0]["models"]:
            continue
        xs = [r["window_ms"] for r in d["sweep"]]
        ys = [r["models"][key]["accuracy"] for r in d["sweep"]]
        lo = [r["models"][key]["accuracy_ci"][0] for r in d["sweep"]]
        hi = [r["models"][key]["accuracy_ci"][1] for r in d["sweep"]]
        ax.fill_between(xs, lo, hi, color=c, alpha=0.12, lw=0)
        ax.plot(xs, ys, color=c, ls=ls, lw=2, marker="o", ms=4, label=label)
    knee = d["knees"]["td_lda_znorm"]["knee_window_ms"]
    ax.axvline(knee, color=MUTED, ls=":", lw=1)
    ax.text(knee * 1.06, 0.79, f"knee\n{knee:.0f} ms", fontsize=8, color=MUTED)
    ax.set_xscale("log")
    ax.set_xticks([25, 50, 100, 200, 400, 1000], ["25", "50", "100", "200", "400", "1000"])
    ax.set_xlabel("Window length (ms, inferred from fs = 1 kHz)")
    ax.set_ylabel("Leave-one-subject-out accuracy")
    ax.set_title("How much muscle do you need to see?", loc="left", fontweight="bold")
    ax.legend(frameon=False, fontsize=8, loc="lower right")
    save(fig, "02_latency_curve")


def fig_channels():
    d = load("channels")
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(8.4, 3.4))
    fr = d["frontier"]["td_lda_znorm"]
    ns = sorted(int(k) for k in fr)
    a1.plot(ns, [fr[str(n)]["accuracy"] for n in ns], color=ACCENT, lw=2, marker="o", ms=6)
    for n in ns:
        a1.annotate(f"ch {'+'.join(map(str, fr[str(n)]['channels']))}",
                    (n, fr[str(n)]["accuracy"]), textcoords="offset points",
                    xytext=(0, -15), ha="center", fontsize=7.5, color=MUTED)
    a1.set_xticks(ns)
    a1.set_xlabel("Number of electrodes")
    a1.set_ylabel("LOSO accuracy")
    a1.set_title("Best subset of each size", loc="left", fontweight="bold")

    singles = sorted([s for s in d["subsets"] if s["n_channels"] == 1],
                     key=lambda s: s["models"]["td_lda_znorm"]["accuracy"])
    a2.barh([f"ch {s['channels'][0]}" for s in singles],
            [s["models"]["td_lda_znorm"]["accuracy"] for s in singles],
            color=[CHANNEL[s["channels"][0] - 1] for s in singles], height=0.6, zorder=3)
    for i, s in enumerate(singles):
        a2.text(s["models"]["td_lda_znorm"]["accuracy"] + 0.008, i,
                f"{s['models']['td_lda_znorm']['accuracy']:.1%}", va="center", fontsize=8)
    a2.axvline(0.2, color=MUTED, ls="--", lw=1)
    a2.text(0.21, -0.45, "chance", fontsize=7.5, color=MUTED)
    a2.set_xlim(0, 1)
    a2.set_xlabel("LOSO accuracy")
    a2.set_title("Each electrode alone", loc="left", fontweight="bold")
    a2.set_axisbelow(True)
    save(fig, "03_electrode_cost")


def fig_tradeoff():
    d = load("tradeoff")
    cells = d["heatmap"]
    ws = sorted({c["window_ms"] for c in cells})
    ns = sorted({c["n_channels"] for c in cells})
    M = np.full((len(ns), len(ws)), np.nan)
    for c in cells:
        M[ns.index(c["n_channels"]), ws.index(c["window_ms"])] = c["accuracy"]

    fig, ax = plt.subplots(figsize=(7.6, 3.2))
    im = ax.imshow(M, aspect="auto", origin="lower", cmap="Blues", vmin=np.nanmin(M), vmax=1.0)
    ax.set_xticks(range(len(ws)), [f"{w:g}" for w in ws])
    ax.set_yticks(range(len(ns)), [f"{n} ch" for n in ns])
    for i in range(len(ns)):
        for j in range(len(ws)):
            if np.isnan(M[i, j]):
                continue
            ax.text(j, i, f"{M[i, j] * 100:.0f}", ha="center", va="center", fontsize=7.5,
                    color="white" if M[i, j] > 0.88 else INK)
    cs = ax.contour(M, levels=[0.90], colors=[WARN], linewidths=1.6)
    ax.clabel(cs, fmt={0.90: "90%"}, fontsize=8, manual=[(0.6, 2.75)], inline_spacing=6)
    ax.grid(False)
    ax.set_xlabel("Window length (ms)")
    ax.set_title("Accuracy against both budgets at once", loc="left", fontweight="bold")
    fig.colorbar(im, ax=ax, label="LOSO accuracy", pad=0.015)
    save(fig, "04_tradeoff_surface")


def fig_calibration():
    d = load("calibration")
    fig, ax = plt.subplots(figsize=(6.0, 3.4))
    for key, label, c, ls in [("with_free_normalisation", "With free unlabelled normalisation", ACCENT, "-"),
                              ("without_normalisation", "Without normalisation", "#e87ba4", "--")]:
        rows = d["curves"][key]
        xs = [r["seconds"] for r in rows]
        ys = [r["accuracy"] for r in rows]
        lo = [r["accuracy_ci"][0] for r in rows]
        hi = [r["accuracy_ci"][1] for r in rows]
        ax.fill_between(xs, lo, hi, color=c, alpha=0.12, lw=0)
        ax.plot(xs, ys, color=c, ls=ls, lw=2, marker="o", ms=4, label=label)
    ax.set_xlabel("Seconds of labelled calibration from the new wearer")
    ax.set_ylabel("LOSO accuracy")
    ax.set_title("Calibration buys almost nothing you cannot get for free",
                 loc="left", fontweight="bold")
    ax.legend(frameon=False, fontsize=8, loc="lower right")
    save(fig, "05_calibration")


def fig_realtime():
    d = load("realtime")
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(8.4, 3.3))
    keys = ["none", "causal_ema", "oracle_global"]
    labels = ["No adaptation", "Causal running\n(deployable)", "Offline global\n(upper bound)"]
    steady = [d["normalisation"][k]["accuracy_steady"] for k in keys]
    trans = [d["normalisation"][k]["accuracy_transition"] for k in keys]
    x = np.arange(3)
    a1.bar(x - 0.19, steady, 0.36, label="Steady state", color=ACCENT, zorder=3)
    a1.bar(x + 0.19, trans, 0.36, label="Mid gesture-change", color=WARN, zorder=3)
    a1.set_xticks(x, labels, fontsize=8)
    a1.set_ylim(0, 1.28)
    a1.set_ylabel("Streaming accuracy")
    a1.legend(frameon=False, fontsize=8, loc="upper center", ncol=2,
              bbox_to_anchor=(0.5, 1.02), handlelength=1.2, columnspacing=1.2)
    a1.set_title("Online normalisation costs little", loc="left", fontweight="bold")
    a1.set_axisbelow(True)

    sm = d["smoothing"]
    a2.plot([s["total_latency_ms"] for s in sm], [s["accuracy_steady"] for s in sm],
            color=ACCENT, lw=2, marker="o", ms=4)
    best = max(sm, key=lambda s: s["accuracy_steady"])
    a2.scatter([best["total_latency_ms"]], [best["accuracy_steady"]], s=90,
               facecolor="none", edgecolor=WARN, lw=1.8, zorder=5)
    a2.annotate(f"k={best['k']}", (best["total_latency_ms"], best["accuracy_steady"]),
                textcoords="offset points", xytext=(8, -4), fontsize=8, color=WARN)
    a2.set_xlabel("Total latency (window + smoothing, ms)")
    a2.set_ylabel("Steady-state accuracy")
    a2.set_title("Vote smoothing has an optimum", loc="left", fontweight="bold")
    save(fig, "06_streaming")


def fig_latent():
    d = load("latent")
    pts = d["points"]
    fig, axes = plt.subplots(1, 2, figsize=(8.4, 3.9))
    emb = np.array(pts["projections"]["cnn_latent"])
    g = np.array(pts["gesture"]); s = np.array(pts["subject"])
    for k in range(5):
        m = g == k
        axes[0].scatter(emb[m, 0], emb[m, 1], s=3, c=GESTURE[k], alpha=0.55, lw=0,
                        label=["Rest", "Gesture 1", "Gesture 2", "Gesture 3", "Gesture 4"][k])
    axes[0].legend(frameon=False, fontsize=7.5, markerscale=3, loc="best")
    axes[0].set_title(f"Coloured by gesture  (silhouette {d['silhouette']['cnn_latent']['by_gesture']:+.3f})",
                      loc="left", fontweight="bold", fontsize=9.5)
    greys = plt.cm.Greys(np.linspace(0.35, 0.95, 8))
    for k in range(1, 9):
        m = s == k
        axes[1].scatter(emb[m, 0], emb[m, 1], s=3, color=greys[k - 1], alpha=0.55, lw=0)
    axes[1].set_title(f"Coloured by subject  (silhouette {d['silhouette']['cnn_latent']['by_subject']:+.3f})",
                      loc="left", fontweight="bold", fontsize=9.5)
    for a in axes:
        a.set_xticks([]); a.set_yticks([]); a.grid(False)
    fig.suptitle("CNN latent space: organised by gesture, indifferent to the wearer",
                 x=0.02, ha="left", fontweight="bold")
    save(fig, "07_latent_space")


def fig_confusion():
    d = load("confusion")
    M = np.array(d["row_normalised"])
    labels = [v.replace("Gesture ", "G") for v in d["class_labels"].values()]

    fig, ax = plt.subplots(figsize=(5.2, 4.4))
    off = M.copy()
    np.fill_diagonal(off, 0)
    # One ramp for the off-diagonal, scaled to the largest error, so a 0.9% cell
    # cannot read as strongly as a 14% one.
    # Cap the error ramp below the diagonal's range so a mistake can never read as
    # darker than a correct classification.
    disp = np.where(np.eye(len(M), dtype=bool), 0.45 + M * 0.55, 0.80 * off / off.max())
    ax.imshow(disp, cmap="Blues", vmin=0, vmax=1)
    for i in range(len(M)):
        for j in range(len(M)):
            v = M[i, j]
            if v < 0.002:
                txt = "·"
            else:
                txt = f"{v * 100:.0f}" if v >= 0.1 else f"{v * 100:.1f}"
            ax.text(j, i, txt, ha="center", va="center", fontsize=9,
                    color="white" if disp[i, j] > 0.55 else INK)
    ax.set_xticks(range(len(M)), labels)
    ax.set_yticks(range(len(M)), labels)
    ax.set_xlabel("predicted")
    ax.set_ylabel("true")
    ax.grid(False)
    w = d["most_confused"]
    ax.set_title(f"{d['share_of_errors_in_worst_pair']:.0%} of all errors are "
                 f"{w['a_label']} vs {w['b_label']}", loc="left", fontweight="bold",
                 fontsize=10)
    save(fig, "08_confusion")


FIGURES = {"leakage": fig_leakage, "latency": fig_latency, "channels": fig_channels,
           "tradeoff": fig_tradeoff, "calibration": fig_calibration,
           "realtime": fig_realtime, "latent": fig_latent,
           "confusion": fig_confusion}


def main():
    for name, fn in FIGURES.items():
        if not (RESULTS_DIR / f"{name}.json").exists():
            print(f"  skipping {name} (no results yet)")
            continue
        try:
            fn()
        except Exception as exc:                       # keep going; report loudly
            print(f"  FAILED {name}: {exc}")


if __name__ == "__main__":
    main()
