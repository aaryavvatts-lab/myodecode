"use client";

import { useState } from "react";
import confusion from "@/results/confusion.json";
import { GESTURE_COLORS, sequentialColor } from "@/lib/palette";
import { Card, Section, Stat, TableView, useTheme } from "./ui";
import { pct } from "@/lib/format";

const LABELS = Object.values(confusion.class_labels);

export default function Confusion() {
  const mode = useTheme();
  const [hover, setHover] = useState<string | null>(null);
  const gcol = GESTURE_COLORS[mode];
  const row = confusion.row_normalised;
  const raw = confusion.confusion;
  const worst = confusion.most_confused;
  const corr = confusion.correlation;
  const maxOff = Math.max(
    ...row.flatMap((r, i) => r.filter((_, j) => i !== j)),
  );

  return (
    <Section
      id="confusion"
      eyebrow="04c — Failure structure"
      title="The errors are not spread out. They are all in one place."
      lede={
        <>
          An aggregate accuracy tells you how often a decoder is wrong, not where. That
          distinction decides whether a product is fixable: a decoder that fails evenly
          across every gesture needs a better model, whereas one that reliably confuses
          exactly two gestures can be fixed by choosing a different pair.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value={pct(confusion.share_of_errors_in_worst_pair, 0)}
              label={`Errors inside ${worst.a_label} ↔ ${worst.b_label}`}
              sub="Out of all mistakes at every gesture" tone="warn" />
        <Stat value={pct(confusion.per_class_recall[0])} label="Rest, correctly identified"
              sub="Silence is unambiguous — it never gets mistaken for a gesture" tone="accent" />
        <Stat value={pct(Math.min(...confusion.per_class_recall))}
              label={`Worst class — ${LABELS[confusion.per_class_recall.indexOf(Math.min(...confusion.per_class_recall))]}`}
              sub="And almost all of its losses go to one neighbour" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card>
          <h3 className="mb-1 text-[14px] font-medium">Confusion matrix</h3>
          <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Leave-one-subject-out, pooled over all eight subjects. Rows are the true
            gesture, columns what the decoder said.
          </p>
          <div className="scroll-x">
            <div className="inline-block min-w-[360px]">
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: "5.6rem repeat(5, 3.4rem)" }}>
                <div />
                {LABELS.map((n, j) => (
                  <div key={j} className="pb-1 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {n.replace("Gesture ", "G")}
                  </div>
                ))}
                {LABELS.map((n, i) => (
                  <div key={i} className="contents">
                    <div className="flex items-center justify-end gap-1.5 pr-2 text-[12px]">
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: gcol[i] }} />
                      {n}
                    </div>
                    {LABELS.map((_, j) => {
                      const v = row[i][j];
                      const key = `${i}-${j}`;
                      const diag = i === j;
                      return (
                        <div key={j} className="relative">
                          <div
                            onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}
                            className="flex h-10 items-center justify-center rounded-[3px] text-[11px] font-medium"
                            style={{
                              // Off-diagonal cells share one ramp scaled to the
                              // largest error, so a 0.9% cell cannot look like a 14% one.
                              background: v < 0.002
                                ? "var(--surface-2)"
                                : sequentialColor(diag ? 0.45 + v * 0.55 : 0.8 * Math.min(1, v / maxOff)),
                              color: (diag && v > 0.3) || (!diag && v / maxOff > 0.7)
                                ? "#fff" : "var(--text-muted)",
                              outline: hover === key ? "2px solid var(--text-primary)" : undefined,
                              outlineOffset: 1,
                            }}>
                            {v < 0.001 ? "·" : (v * 100).toFixed(v >= 0.1 ? 0 : 1)}
                          </div>
                          {hover === key && (
                            <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[12px] shadow-lg"
                                 style={{ background: "var(--surface-0)" }}>
                              <div className="font-medium">{pct(v, 1)}</div>
                              <div style={{ color: "var(--text-secondary)" }}>
                                {LABELS[i]} read as {LABELS[j]} · {raw[i][j]} windows
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="mt-2 pl-[5.6rem] text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
                predicted
              </p>
            </div>
          </div>
          <TableView
            headers={["True", ...LABELS.map((l) => `→ ${l}`), "Recall"]}
            rows={LABELS.map((n, i) => [
              n, ...raw[i].map(String), pct(confusion.per_class_recall[i], 1),
            ])}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-1 text-[14px] font-medium">One pair, most of the damage</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>
                {pct(confusion.share_of_errors_in_worst_pair, 0)}
              </strong>{" "}
              of every mistake the decoder makes is {worst.a_label} and {worst.b_label}
              being swapped for each other. It is also asymmetric —{" "}
              {worst.b_label} is read as {worst.a_label}{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {(row[worst.b][worst.a] / Math.max(row[worst.a][worst.b], 1e-9)).toFixed(1)}×
              </strong>{" "}
              more often than the reverse. Rest, meanwhile, is never confused with
              anything: near-silence on four channels is not something an active gesture
              can imitate.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              For a product this is good news. Five gestures at{" "}
              {pct(confusion.accuracy)} is really four gestures at near-ceiling plus one
              ambiguous pair. Drop or replace one of them and the remaining set is
              essentially solved.
            </p>
          </Card>

          <Card>
            <h3 className="mb-1 text-[14px] font-medium">Is it predictable from the muscles?</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {worst.a_label} and {worst.b_label} are also the{" "}
              <strong style={{ color: "var(--text-primary)" }}>closest pair</strong> of the{" "}
              {confusion.n_pairs} in the decoder&apos;s own log-amplitude feature space —
              distance rank {confusion.most_confused_distance_rank} of {confusion.n_pairs}.
              So the failure is not arbitrary: the two gestures recruit the four muscles in
              nearly the same proportions and at nearly the same strength.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Tempting as it is to state that as a rule, it does not hold up across all{" "}
              {confusion.n_pairs} pairs: ρ = {corr.spearman_rho.toFixed(2)},
              p = {corr.spearman_p.toFixed(2)}. Ten pairs is far too few to resolve a
              correlation. The nearest pair being the most-confused pair is a consistent
              observation here, not a demonstrated law.
            </p>
          </Card>
        </div>
      </div>
    </Section>
  );
}
