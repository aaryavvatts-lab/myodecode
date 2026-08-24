"use client";

import { useState } from "react";
import channels from "@/results/channels.json";
import tradeoff from "@/results/tradeoff.json";
import { CHANNEL_COLORS, onColor, sequentialColor } from "@/lib/palette";
import { Card, Section, Stat, TableView, useTheme } from "./ui";
import { pct } from "@/lib/format";

const ALL = [1, 2, 3, 4];

export default function Electrodes() {
  const mode = useTheme();
  const [on, setOn] = useState<number[]>(ALL);
  const ccol = CHANNEL_COLORS[mode];

  const lookup = (sel: number[]) =>
    channels.subsets.find((s) => s.channels.length === sel.length && s.channels.every((c) => sel.includes(c)));

  const current = lookup(on.length ? on : ALL);
  const full = lookup(ALL)!;
  const frontier = channels.frontier.td_lda_znorm as Record<string, { accuracy: number; channels: number[] }>;
  const singles = channels.subsets.filter((s) => s.n_channels === 1)
    .sort((a, b) => b.models.td_lda_znorm.accuracy - a.models.td_lda_znorm.accuracy);
  const bestPair = frontier["2"];

  const toggle = (c: number) => setOn((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c].sort()));

  return (
    <Section
      id="electrodes"
      eyebrow="05 · Sensor count"
      title="How few sensors can you get away with?"
      lede={
        <>
          Every sensor costs money and weight, takes time to stick on, and is one more
          thing that can peel off halfway through. So I tried all fifteen combinations of
          the four sensors, each tested on a person the model had not seen, using{" "}
          {channels.window_ms} ms of signal.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat value={pct(full.models.td_lda_znorm.accuracy)} label="All four sensors" sub="The best you can do here" />
        <Stat value={pct(bestPair.accuracy)} label={`Best two, sensors ${bestPair.channels.join(" and ")}`}
              sub={`Half the hardware for ${((full.models.td_lda_znorm.accuracy - bestPair.accuracy) * 100).toFixed(1)} points less accuracy`} tone="accent" />
        <Stat value={pct(singles[0].models.td_lda_znorm.accuracy)} label={`Best single, sensor ${singles[0].channels[0]}`}
              sub="One sensor, still telling five gestures apart" />
      </div>

      <Card className="mt-6">
        <h3 className="mb-1 text-[14px] font-medium">Turn sensors on and off</h3>
        <p className="mb-5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          I trained and tested a separate model for every combination, so these are real
          measured scores, not guesses from a formula.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL.map((c) => (
            <button key={c} onClick={() => toggle(c)}
              aria-pressed={on.includes(c)}
              className="focusable flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors"
              style={on.includes(c)
                ? { background: ccol[c - 1], color: onColor(ccol[c - 1]), borderColor: ccol[c - 1] }
                : { color: "var(--text-muted)" }}>
              <span className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: on.includes(c) ? "currentColor" : "var(--border-strong)" }} />
              Sensor {c}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <div className="tnum font-[family-name:var(--font-mono)] text-5xl" style={{ color: "var(--accent)" }}>
            {current ? pct(current.models.td_lda_znorm.accuracy) : "n/a"}
          </div>
          <div className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
            {on.length === 0
              ? "Turn at least one sensor on."
              : <>using {on.length} sensor{on.length > 1 ? "s" : ""} ({on.map((c) => `#${c}`).join(", ")}),
                 tested on a person the model has never seen</>}
          </div>
        </div>
        {current && on.length > 0 && on.length < 4 && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
            That is {((full.models.td_lda_znorm.accuracy - current.models.td_lda_znorm.accuracy) * 100).toFixed(1)} points
            below using all four.
          </p>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-[14px] font-medium">Best you can do with each number of sensors</h3>
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((n) => {
              const f = frontier[String(n)];
              return (
                <div key={n} className="grid grid-cols-[5.4rem_1fr_4.2rem_3.4rem] items-center gap-2">
                  <span className="text-[13px]">{n} sensor{n > 1 ? "s" : ""}</span>
                  <div className="h-6 rounded-[4px]" style={{ background: "var(--surface-2)" }}>
                    <div className="h-full rounded-[4px]"
                         style={{ width: `${f.accuracy * 100}%`, background: sequentialColor(0.3 + n * 0.17) }} />
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-[11px]"
                        style={{ color: "var(--text-muted)" }}>ch {f.channels.join("+")}</span>
                  <span className="tnum text-right font-[family-name:var(--font-mono)] text-[13px]">
                    {pct(f.accuracy)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Going from two sensors to four gains you{" "}
            {((frontier["4"].accuracy - frontier["2"].accuracy) * 100).toFixed(1)} points.
            Whether that is worth doubling the hardware is a decision about the product,
            not about the model.
          </p>
        </Card>

        <Card>
          <h3 className="mb-4 text-[14px] font-medium">What each sensor can do by itself</h3>
          <div className="space-y-2.5">
            {singles.map((s) => (
              <div key={s.channels[0]} className="grid grid-cols-[5.4rem_1fr_3.4rem] items-center gap-2">
                <span className="text-[13px]">Channel {s.channels[0]}</span>
                <div className="h-6 rounded-[4px]" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full rounded-[4px]"
                       style={{ width: `${s.models.td_lda_znorm.accuracy * 100}%`, background: ccol[s.channels[0] - 1] }} />
                </div>
                <span className="tnum text-right font-[family-name:var(--font-mono)] text-[13px]">
                  {pct(s.models.td_lda_znorm.accuracy)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            The best pair is not just the two best singles put together. Sensors are worth
            more when they disagree with each other than when they say the same thing.
            Guessing at random would score 20%.
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="mb-1 text-[14px] font-medium">Speed and sensor count together</h3>
        <p className="mb-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          The best combination of each size, at each amount of signal. Darker means more
          accurate. Use it to find the cheapest setup that hits the score you need.
        </p>
        <Heatmap />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {Object.entries(tradeoff.targets as Record<string, { fewest_electrodes: { n_channels: number; window_ms: number; channels: number[] }; lowest_latency: { n_channels: number; window_ms: number; channels: number[] } } | null>)
            .map(([t, v]) => (
              <div key={t} className="rounded-lg border p-3 text-[13px]" style={{ background: "var(--surface-2)" }}>
                <span className="font-medium">To hit {pct(Number(t), 0)}</span>
                {v ? (
                  <ul className="mt-1 space-y-0.5" style={{ color: "var(--text-secondary)" }}>
                    <li>Fewest sensors: {v.fewest_electrodes.n_channels} (numbers {v.fewest_electrodes.channels.join(" and ")}), using {v.fewest_electrodes.window_ms} ms</li>
                    <li>Fastest: {v.lowest_latency.window_ms} ms, needing {v.lowest_latency.n_channels} sensor{v.lowest_latency.n_channels > 1 ? "s" : ""} (numbers {v.lowest_latency.channels.join(" and ")})</li>
                  </ul>
                ) : <p className="mt-1" style={{ color: "var(--text-muted)" }}>Not reachable with this data.</p>}
              </div>
            ))}
        </div>
      </Card>
    </Section>
  );
}

function Heatmap() {
  const [hover, setHover] = useState<string | null>(null);
  const cells = tradeoff.heatmap as { window_ms: number; n_channels: number; accuracy: number; channels: number[] }[];
  const windows = [...new Set(cells.map((c) => c.window_ms))].sort((a, b) => a - b);
  const counts = [1, 2, 3, 4];
  const lo = Math.min(...cells.map((c) => c.accuracy));
  const hi = Math.max(...cells.map((c) => c.accuracy));

  return (
    <div className="scroll-x">
      <div className="min-w-[560px]" role="img"
           aria-label="Grid of accuracy by how much signal is used and how many sensors are on. The same numbers are in the data table below.">
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: `2.6rem repeat(${windows.length}, minmax(0,1fr))` }}>
          <div />
          {windows.map((w) => (
            <div key={w} className="pb-1 text-center font-[family-name:var(--font-mono)] text-[10px]"
                 style={{ color: "var(--text-muted)" }}>{w}</div>
          ))}
          {counts.slice().reverse().map((n) => (
            <div key={n} className="contents">
              <div className="flex items-center justify-end pr-2 font-[family-name:var(--font-mono)] text-[11px]"
                   style={{ color: "var(--text-muted)" }}>{n} ch</div>
              {windows.map((w) => {
                const c = cells.find((x) => x.window_ms === w && x.n_channels === n);
                if (!c) return <div key={w} />;
                const t = (c.accuracy - lo) / (hi - lo || 1);
                const key = `${w}-${n}`;
                return (
                  <div key={w} className="relative">
                    <div
                      onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}
                      className="flex h-9 items-center justify-center rounded-[3px] text-[10px] font-medium transition-transform"
                      style={{
                        background: sequentialColor(t),
                        color: t > 0.55 ? "#fff" : "var(--text-primary)",
                        outline: hover === key ? "2px solid var(--text-primary)" : undefined,
                        outlineOffset: 1,
                      }}>
                      {Math.round(c.accuracy * 100)}
                    </div>
                    {hover === key && (
                      <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[12px] shadow-lg"
                           style={{ background: "var(--surface-0)" }}>
                        <div className="font-medium">{pct(c.accuracy, 1)}</div>
                        <div style={{ color: "var(--text-secondary)" }}>{w} ms · ch {c.channels.join("+")}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-2 pl-[2.6rem] text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
          length of signal used (ms)
        </div>
      </div>
      <TableView
        headers={["Signal used (ms)", "Sensors", "Which ones", "Accuracy on a new person"]}
        rows={cells.map((c) => [c.window_ms, c.n_channels, c.channels.join(", "), pct(c.accuracy, 2)])}
      />
    </div>
  );
}
