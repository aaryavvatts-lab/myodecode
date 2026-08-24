"use client";

import { useState } from "react";
import leakage from "@/results/leakage.json";
import { BarRow } from "./charts";
import SplitViewer from "./SplitViewer";
import { Card, Inferred, Section, Stat, TableView } from "./ui";
import { pct, pp } from "@/lib/format";

type Entry = (typeof leakage.ladder)[number];

const ORDER: { scheme: string; model: string; title: string; blurb: string; honest: boolean }[] = [
  {
    scheme: "random_within", model: "td_lda", title: "Shuffle one person's data",
    blurb: "Take one person's recording, chop it into windows, shuffle them, and keep 20% back for testing. The windows you test on sit a few milliseconds away from ones you trained on.",
    honest: false,
  },
  {
    scheme: "random", model: "td_lda", title: "Shuffle everyone together",
    blurb: "Same idea, but pool all eight people first. It still cuts inside each recording, so the same problem is there, just watered down.",
    honest: false,
  },
  {
    scheme: "blocked", model: "td_lda", title: "Split by time",
    blurb: "Train on the first 60% of each recording and test on the last 20%, throwing away the middle. Now no test window is next to a training window.",
    honest: true,
  },
  {
    scheme: "loso", model: "td_lda", title: "Hold out a whole person",
    blurb: "Train on seven people and test on the eighth. The model has never seen that arm before. This is the number that matters.",
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
    { key: "td_lda_znorm", label: "1993 measurements, rescaled per person", year: "best" },
    { key: "cnn_latent_logreg", label: "Neural net, then a simple classifier", year: "the popular recipe" },
    { key: "td_lda", label: "1993 measurements, as published", year: "Hudgins, 1993" },
    { key: "cnn_e2e", label: "Neural net, trained end to end", year: "modern default" },
  ].map((m) => ({ ...m, r: find("loso", m.key) })).sort((a, b) => b.r.accuracy - a.r.accuracy);

  return (
    <Section
      id="leakage"
      eyebrow="01 · The catch"
      title="Most of the accuracy was never real"
      lede={
        <>
          All four numbers below come from the same model, the same features, and the
          same quarter second of signal. The only thing I changed is which windows the
          model was allowed to train on. The version of this project that goes around
          online uses the top row.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value={pct(top)} label="Shuffled split" sub="What the popular method reports" tone="warn" />
        <Stat value={pct(honest)} label="New person" sub="What it gets on someone it has not seen" tone="accent" />
        <Stat value={pp(honest - top)} label="Difference" sub="None of this gap is the model getting better" />
      </div>

      <Card className="mt-6">
        <h3 className="mb-1 text-[14px] font-medium">See what each split actually does</h3>
        <p className="mb-5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Each row is one person&apos;s recording, cut into windows left to right. Blue
          windows go into training, orange ones are held back for the test. Switch
          between the four options and watch where the orange lands.
        </p>
        <SplitViewer />
      </Card>

      <Card className="mt-4">
        <h3 className="mb-1 text-[14px] font-medium">What that does to the score</h3>
        <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          The model is the same every time. Five simple measurements per sensor, fed into
          a linear classifier.
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
            refLine={honest}
          />
        ))}
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-px" style={{ background: "var(--text-primary)", opacity: 0.75 }} />
            honest score ({pct(honest)})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 rounded-[2px]"
                  style={{ backgroundImage: "repeating-linear-gradient(135deg, var(--text-muted) 0 2px, transparent 2px 5px)" }} />
            striped part is accuracy that only exists because of the shortcut
          </span>
        </p>
        <button onClick={() => setShowAll(!showAll)}
                className="focusable mt-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider underline underline-offset-4"
                style={{ color: "var(--text-muted)" }}>
          {showAll ? "Hide" : "What each one means"}
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
          headers={["How the data was split", "Accuracy", "95% range", "Balanced", "Macro F1", "Runs"]}
          rows={rows.map((r) => [
            r.title, pct(r.r.accuracy, 2),
            `${pct(r.r.accuracy_ci[0], 1)} – ${pct(r.r.accuracy_ci[1], 1)}`,
            pct(r.r.balanced_accuracy, 2), r.r.macro_f1.toFixed(3), r.r.folds.length,
          ])}
        />
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 text-[14px] font-medium">Where the problem actually comes from</h3>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Splitting each recording by time, while still training on the very same
            people, drops accuracy from{" "}
            <strong style={{ color: "var(--text-primary)" }}>{pct(top)}</strong> to{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {pct(find("blocked", "td_lda").accuracy)}
            </strong>. Taking the test person out of training entirely gives{" "}
            <strong style={{ color: "var(--text-primary)" }}>{pct(honest)}</strong>,
            which is the same number once you account for noise.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            So whether the model has met you before barely matters here. What mattered
            was that the first split let it train on windows sitting right next to the
            ones it was graded on. People usually blame the differences between bodies
            for this kind of gap. On this data it was the clock.
          </p>
        </Card>
        <Card>
          <h3 className="mb-1 text-[14px] font-medium">Is {pct(honest)} real, though?</h3>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            To check, I scrambled the gesture labels {perm.n} times and ran the whole
            thing again each time. With the labels meaningless, the model scored{" "}
            <span className="tnum font-[family-name:var(--font-mono)]">{pct(perm.mean, 1)}</span>{" "}
            on average, and never got above {pct(perm.max, 1)}. That is exactly the{" "}
            {pct(perm.theoretical_chance, 0)} you would expect from guessing between five
            options. The real score is nowhere near that range, at{" "}
            <span className="tnum font-[family-name:var(--font-mono)]">p = {perm.p_value.toFixed(3)}</span>.
            So the signal is there. It is just five points smaller than advertised.
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="mb-1 text-[14px] font-medium">
          The neural network does not win
        </h3>
        <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          All four models tested on a held out person, using a quarter second of
          signal<Inferred />. The best score here comes from a set of measurements
          published in 1993, plus one rescaling step that is free and needs no labels.
        </p>
        {models.map((m, i) => (
          <BarRow key={m.key} label={<span className="font-medium">{m.label}</span>}
                  value={m.r.accuracy} max={1}
                  color={i === 0 ? "var(--accent)" : "var(--border-strong)"}
                  note={m.year} highlight={i === 0} />
        ))}
        <TableView
          headers={["Model", "Accuracy on a new person", "95% range", "Macro F1"]}
          rows={models.map((m) => [
            m.label, pct(m.r.accuracy, 2),
            `${pct(m.r.accuracy_ci[0], 1)} – ${pct(m.r.accuracy_ci[1], 1)}`, m.r.macro_f1.toFixed(3),
          ])}
        />
      </Card>
    </Section>
  );
}
