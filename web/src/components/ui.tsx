"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

/* Shared page furniture. `eyebrow` is still accepted so the section components compile, but
   it is not rendered: no kicker labels above headings. */
export function Section({
  id, title, lede, children,
}: {
  id: string; eyebrow?: string; title: string; lede?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section id={id} className="sect">
      <div className="mx-auto max-w-6xl wrap">
        <Reveal as="div">
          <h2>{title}</h2>
          {lede && <div className="lede">{lede}</div>}
        </Reveal>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Stat({ value, label, sub, tone = "default" }: {
  value: string; label: string; sub?: string; tone?: "default" | "accent" | "warn";
}) {
  const color = tone === "accent" ? "var(--accent)" : tone === "warn" ? "var(--warn)" : "var(--ink)";
  return (
    <div className="stat">
      <div className="n" style={{ color }}>{value}</div>
      <div className="k">{label}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

export function Inferred({ children = "inferred, not given" }: { children?: React.ReactNode }) {
  return (
    <span className="ml-1" style={{ color: "var(--muted)" }}
      title="This quantity was derived from the signal itself, not supplied with the dataset.">
      ({children})
    </span>
  );
}

export function Toggle<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      {label && <span className="mr-1 text-small" style={{ color: "var(--muted)" }}>{label}</span>}
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className="focusable chip text-small font-medium">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TableView({ headers, rows, caption }: {
  headers: string[]; rows: (string | number)[][]; caption?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen(!open)} className="focusable textbtn text-small">
        {open ? "Hide" : "Show"} the data table
      </button>
      {open && (
        <div className="scroll-x mt-3">
          <table className="w-full text-left text-small">
            {caption && <caption className="pb-2 text-left text-small" style={{ color: "var(--muted)" }}>{caption}</caption>}
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} className="whitespace-nowrap border-b py-2 pr-4 font-semibold">{/* table line, taste-skill-ignore */}{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">{/* table line, taste-skill-ignore */}
                  {r.map((c, j) => (
                    <td key={j} className="tnum whitespace-nowrap py-1.5 pr-4">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Tooltip anchored to a chart, positioned in client coords. A real overlay, on a surface. */
export function Tip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-20 px-2.5 py-1.5 text-small"
      style={{ left: x, top: y, transform: "translate(-50%,-115%)", background: "var(--surface-2)", whiteSpace: "nowrap" }}
    >
      {children}
    </div>
  );
}

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(720);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** True while the element is on screen. Used to park animation loops that would
 *  otherwise burn a core continuously on a page this long. */
export function useInView<T extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

export function useTheme(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") return setMode(attr);
      setMode(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    };
    read();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { mq.removeEventListener("change", read); mo.disconnect(); };
  }, []);
  return mode;
}
