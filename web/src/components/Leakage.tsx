"use client";

import { useState } from "react";
import leakage from "@/results/leakage.json";
import { BarRow } from "./charts";
import { Card, Inferred, Section, Stat, TableView } from "./ui";
import { pct, pp } from "@/lib/format";

type Entry = (typeof leakage.ladder)[number];

const ORDER: { scheme: string; model: string; title: string; blurb: string; honest: boolean }[] = [
  {
    scheme: "random_within", model: "td_lda", title: "Random split, one person",
    blurb: "Shuffle one subject's windows, hold out 20%. Train and test windows sit milliseconds apart in the same recording.",
    honest: false,
  },
  {
    scheme: "random", model: "td_lda", title: "Random split, pooled",
    blurb: "Shuffle every window from every subject. Still splits inside recordings, so the same leak is present, just diluted.",
    honest: false,
  },
  {
    scheme: "blocked", model: "td_lda", title: "Blocked in time",
    blurb: "Train on the first 60% of each recording, test on the last 20%, discard the middle. Breaks the temporal leak.",
    honest: true,
  },
  {
    scheme: "loso", model: "td_lda", title: "Leave one subject out",
    blurb: "The model never sees the test subject at all. This is what a decoder does on a stranger.",
    honest: true,
  },
];

export default function Leakage() {
  const [showAll, setShowAll] = useState(false);
  const find = (s: string, m: string) => leakage.ladder.find((e: Entry) => e.scheme === s && e.model === m)!;
  const rows = ORDER.map((o) => ({ ...o, r: find(o.scheme, o.model) }));
  const top = rows[0].r.accuracy;
  const honest = find("loso", "td_lda").accuracy;
  const perm = leakage.permutation;

  const models = [
    { key: "td_lda_znorm", label: "Time-domain features + LDA, with free normalisation", year: "1993 + a z-score" },
    { key: "cnn_latent_logreg", label: "CNN encoder → 64-d latent → logistic regression", year: "the reel's recipe" },
    { key: "td_lda", label: "Time-domain features + LDA", year: "Hudgins, 1993" },
    { key: "cnn_e2e", label: "CNN end-to-end (softmax head)", year: "modern default" },
  ].map((m) => ({ ...m, r: find("loso", m.key) })).sort((a, b) => b.r.accuracy - a.r.accuracy);

  return (
    <Section
      id="leakage"
      eyebrow="01 — The trap"
      title="Most of the accuracy was never real"
      lede={
        <>
          Every number below comes from the same model, the same features and the same
          250&nbsp;ms windows. The only thing that changes is which windows are allowed
          into the training set. The recipe that circulates online takes the top row.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value={pct(top)} label="Random split, one person" sub="What the naive recipe reports" tone="warn" />
        <Stat value={pct(honest)} label="Leave one subject out" sub="What it does on a stranger" tone="accent" />
        <Stat value={pp(honest - top)} label="The difference" sub="Pure evaluation artefact" />
      </div>

      <Card className="mt-6">
        <h3 className="mb-1 text-[14px] font-medium">Accuracy by split scheme</h3>
        <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Same model throughout: five time-domain features per channel into a linear discriminant.
        </p>
        {rows.map((row) => (
          <BarRow
            key={row.scheme}
            label={
              <span>
                <span className="font-medium">{row.title}</span>
                <span className="ml-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide"
                      style={{ color: row.honest ? "var(--accent)" : "var(--warn)" }}>
                  {row.honest ? "honest" : "leaky"}
                </span>
              </span>
            }
            value={row.r.accuracy}
            max={1}
            color={row.honest ? "var(--accent)" : "var(--warn)"}
            highlight={row.scheme === "loso"}
          />
        ))}
        <button onClick={() => setShowAll(!showAll)}
                className="focusable mt-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider underline underline-offset-4"
                style={{ color: "var(--text-muted)" }}>
          {showAll ? "Hide" : "What each split means"}
        </button>
        {showAll && (
          <dl className="mt-3 space-y-2 text-[13px]">
            {rows.map((r) => (
              <div key={r.scheme}>
                <dt className="font-medium">{r.title}</dt>
                <dd style={{ color: "var(--text-secondary)" }}>{r.blurb}</dd>
              </div>
            ))}
          </dl>
        )}
        <TableView
          headers={["Split scheme", "Accuracy", "95% CI", "Balanced acc.", "Macro F1", "Folds"]}
          rows={rows.map((r) => [
            r.title, pct(r.r.accuracy, 2),
            `${pct(r.r.accuracy_ci[0], 1)} – ${pct(r.r.accuracy_ci[1], 1)}`,
            pct(r.r.balanced_accuracy, 2), r.r.macro_f1.toFixed(3), r.r.folds.length,
          ])}
        />
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 text-[14px] font-medium">Where the leak actually is</h3>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Blocking in time recovers{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {pct(Math.abs(find("blocked", "td_lda").accuracy - top), 1)}
            </strong>{" "}
            of the {pct(Math.abs(honest - top), 1)} gap on its own, and the blocked score
            lands within{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {(Math.abs(find("blocked", "td_lda").accuracy - honest) * 100).toFixed(1)} pp
            </strong>{" "}
            of never showing the model the test subject at all. So the inflation is not
            mainly about person-to-person differences, which is where the field usually
            points. It is about training and testing on windows that overlap in time.
          </p>
        </Card>
        <Card>
          <h3 className="mb-1 text-[14px] font-medium">Is {pct(honest)} even real?</h3>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Shuffling the gesture labels {perm.n} times and rerunning the whole
            leave-one-subject-out pipeline puts the null at{" "}
            <span className="tnum font-[family-name:var(--font-mono)]">{pct(perm.mean, 1)}</span>{" "}
            (95th percentile {pct(perm.p95, 1)}, best of {perm.n} runs {pct(perm.max, 1)}) —
            indistinguishable from the {pct(perm.theoretical_chance, 0)} you would expect
            from five classes. The observed score sits far outside that null,{" "}
            <span className="tnum font-[family-name:var(--font-mono)]">p = {perm.p_value.toFixed(3)}</span>.
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="mb-1 text-[14px] font-medium">
          And the deep model does not win
        </h3>
        <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          All four scored leave-one-subject-out at 250&nbsp;ms<Inferred />. The best result on
          this dataset is a feature set from 1993 plus a per-subject z-score that costs nothing
          and needs no labels.
        </p>
        {models.map((m, i) => (
          <BarRow key={m.key} label={<span className="font-medium">{m.label}</span>}
                  value={m.r.accuracy} max={1}
                  color={i === 0 ? "var(--accent)" : "var(--border-strong)"}
                  note={m.year} highlight={i === 0} />
        ))}
        <TableView
          headers={["Model", "LOSO accuracy", "95% CI", "Macro F1"]}
          rows={models.map((m) => [
            m.label, pct(m.r.accuracy, 2),
            `${pct(m.r.accuracy_ci[0], 1)} – ${pct(m.r.accuracy_ci[1], 1)}`, m.r.macro_f1.toFixed(3),
          ])}
        />
      </Card>
    </Section>
  );
}
