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
      eyebrow="07 · Mistakes"
      title="The mistakes all sit in one place"
      lede={
        <>
          An accuracy score tells you how often something is wrong. It does not tell you
          where. That difference decides whether a problem is fixable. If a decoder fails
          a bit on everything, you need a better model. If it reliably muddles the same
          two gestures, you can just pick different gestures.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value={pct(confusion.share_of_errors_in_worst_pair, 0)}
              label={`Mistakes that are ${worst.a_label} and ${worst.b_label} mixed up`}
              sub="Out of every mistake the decoder makes" tone="warn" />
        <Stat value={pct(confusion.per_class_recall[0])} label="Rest, spotted correctly"
              sub="A relaxed arm never gets mistaken for a gesture" tone="accent" />
        <Stat value={pct(Math.min(...confusion.per_class_recall))}
              label={`Hardest gesture: ${LABELS[confusion.per_class_recall.indexOf(Math.min(...confusion.per_class_recall))]}`}
              sub="And nearly everything it loses goes to one other gesture" />
      </div>

      <Card className="mt-6">
          <h3 className="mb-1 text-[14px] font-medium">Confusion matrix</h3>
          <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Every person tested while held out of training, then added up. Each row is
            what the gesture really was. Each column is what the decoder guessed.
          </p>
          <div className="scroll-x flex justify-center">
            <div className="inline-block min-w-[360px]" role="img"
                 aria-label="Confusion matrix. Rows are the true gesture, columns are what the decoder guessed. The same numbers are in the data table below.">
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
                                {LABELS[i]} read as {LABELS[j]}, {raw[i][j]} windows
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
            headers={["Really was", ...LABELS.map((l) => `Guessed ${l}`), "Got right"]}
            rows={LABELS.map((n, i) => [
              n, ...raw[i].map(String), pct(confusion.per_class_recall[i], 1),
            ])}
          />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card>
            <h3 className="mb-1 text-[14px] font-medium">One pair does most of the damage</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>
                {pct(confusion.share_of_errors_in_worst_pair, 0)}
              </strong>{" "}
              of every mistake the decoder makes is {worst.a_label} and {worst.b_label}{" "}
              getting swapped. It does not even go both ways equally.{" "}
              {worst.b_label} gets read as {worst.a_label}{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {(row[worst.b][worst.a] / Math.max(row[worst.a][worst.b], 1e-9)).toFixed(1)}×
              </strong>{" "}
              more often than the other way round. Rest, on the other hand, never gets
              confused with anything. Four quiet sensors is not a thing an active gesture
              can fake.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              If you were building something with this, that is good news. Five gestures
              at {pct(confusion.accuracy)} is really four gestures that work almost
              perfectly plus one pair that does not. Swap one of those two out for a
              different gesture and the rest of the set is basically solved.
            </p>
          </Card>

          <Card>
            <h3 className="mb-1 text-[14px] font-medium">Could you have guessed which pair?</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Out of all {confusion.n_pairs} possible pairs, {worst.a_label} and{" "}
              {worst.b_label} sit{" "}
              <strong style={{ color: "var(--text-primary)" }}>closest together</strong>{" "}
              in the numbers the decoder actually looks at. They come first out of{" "}
              {confusion.n_pairs}. So this is not random bad luck. Those two gestures use
              the four muscles in nearly the same proportions and at nearly the same
              strength, so there is very little left to tell them apart by.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              I would like to turn that into a rule, but it does not hold up across all{" "}
              {confusion.n_pairs} pairs. The correlation comes out at ρ ={" "}
              {corr.spearman_rho.toFixed(2)} with p = {corr.spearman_p.toFixed(2)}, which
              is nothing. Ten pairs is far too few to test something like that. So this is
              a thing I noticed, not a thing I proved.
            </p>
          </Card>
      </div>
    </Section>
  );
}
