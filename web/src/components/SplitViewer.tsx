"use client";

import { useMemo, useState } from "react";
import { Toggle } from "./ui";

/**
 * Shows which windows a split scheme lets the model train on.
 *
 * The point of the leakage section is hard to feel from a bar chart, because all
 * four bars look similar. Drawn as a timeline it is obvious: under a shuffled
 * split, test windows sit directly against training windows in the same recording,
 * so the model has effectively already seen the answer.
 */

type Scheme = "random_within" | "random" | "blocked" | "loso";

const PEOPLE = 8;
const BLOCKS = 56;

// Small deterministic generator so the picture is identical on the server and in
// the browser, and identical between visits.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Role = "train" | "test" | "unused" | "gap";

function layout(scheme: Scheme): Role[][] {
  const grid: Role[][] = [];
  for (let p = 0; p < PEOPLE; p++) {
    const r = rng(1337 + p * 101);
    const row: Role[] = [];
    for (let b = 0; b < BLOCKS; b++) {
      if (scheme === "random_within") {
        row.push(p === 0 ? (r() < 0.2 ? "test" : "train") : "unused");
      } else if (scheme === "random") {
        row.push(r() < 0.2 ? "test" : "train");
      } else if (scheme === "blocked") {
        const f = b / BLOCKS;
        row.push(f < 0.6 ? "train" : f < 0.8 ? "gap" : "test");
      } else {
        row.push(p === PEOPLE - 1 ? "test" : "train");
      }
    }
    grid.push(row);
  }
  return grid;
}

const COPY: Record<Scheme, { label: string; caption: React.ReactNode }> = {
  random_within: {
    label: "Shuffle one person",
    caption: (
      <>
        Orange test windows sit right up against blue training windows, inside the
        same recording, a few milliseconds apart. Muscle signal does not change much
        in a few milliseconds, so the model has essentially seen most test windows
        already. This is the split that reports the highest number.
      </>
    ),
  },
  random: {
    label: "Shuffle everyone",
    caption: (
      <>
        The same thing, done to all eight people at once. Pooling adds variety, so
        the score drops a bit, but every test window still has a near twin in
        training. The problem has been diluted, not fixed.
      </>
    ),
  },
  blocked: {
    label: "Split by time",
    caption: (
      <>
        Train on the first stretch of each recording and test on the last, throwing
        away the grey middle so nothing straddles the boundary. The model still
        knows all eight people, but no test window is adjacent to a training one.
        This is where most of the inflated accuracy disappears.
      </>
    ),
  },
  loso: {
    label: "Hold out a person",
    caption: (
      <>
        Train on seven people and test on the eighth, whose arm the model has never
        seen. This is the honest way to ask whether it would work on you. Notice it
        scores about the same as splitting by time, which says the hard part was
        never really about bodies being different.
      </>
    ),
  },
};

const ROLE_STYLE: Record<Role, { bg: string; label: string }> = {
  train: { bg: "var(--accent)", label: "trained on" },
  test: { bg: "var(--warn)", label: "tested on" },
  gap: { bg: "var(--border-strong)", label: "thrown away" },
  unused: { bg: "var(--surface-2)", label: "not used" },
};

export default function SplitViewer({ onScheme }: { onScheme?: (s: Scheme) => void }) {
  const [scheme, setScheme] = useState<Scheme>("random_within");
  const grid = useMemo(() => layout(scheme), [scheme]);
  const roles: Role[] =
    scheme === "random_within" ? ["train", "test", "unused"]
    : scheme === "blocked" ? ["train", "gap", "test"]
    : ["train", "test"];

  return (
    <div>
      <Toggle
        label="Split"
        value={scheme}
        onChange={(v) => { setScheme(v as Scheme); onScheme?.(v as Scheme); }}
        options={(Object.keys(COPY) as Scheme[]).map((k) => ({ value: k, label: COPY[k].label }))}
      />

      <div className="mt-5 space-y-[3px]" role="img"
           aria-label={`Timeline showing which windows are used for training and testing under the ${COPY[scheme].label} split`}>
        {grid.map((row, p) => (
          <div key={p} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-small"
                  style={{ color: "var(--text-muted)" }}>
              person {p + 1}
            </span>
            <div className="flex h-4 flex-1 gap-[1px]">
              {row.map((role, b) => (
                <div key={b} className="h-full flex-1"
                     style={{ background: ROLE_STYLE[role].bg }} />
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <span className="w-16 shrink-0" />
          <div className="flex flex-1 justify-between text-small" style={{ color: "var(--text-muted)" }}>
            <span>start of recording</span>
            <span>20 seconds later</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {roles.map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5 text-body"
                style={{ color: "var(--text-secondary)" }}>
            <span className="inline-block h-2.5 w-2.5" style={{ background: ROLE_STYLE[r].bg }} />
            {ROLE_STYLE[r].label}
          </span>
        ))}
      </div>

      <p className="mt-4 text-body leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {COPY[scheme].caption}
      </p>
    </div>
  );
}
