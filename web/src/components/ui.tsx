"use client";

import { useEffect, useRef, useState } from "react";

export function Section({
  id, eyebrow, title, lede, children,
}: {
  id: string; eyebrow: string; title: string; lede?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <p className="mb-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em]"
           style={{ color: "var(--text-muted)" }}>
          {eyebrow}
        </p>
        <h2 className="max-w-3xl text-balance text-3xl leading-[1.15] tracking-tight sm:text-4xl font-[family-name:var(--font-serif)]">
          {title}
        </h2>
        {lede && (
          <div className="mt-4 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {lede}
          </div>
        )}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-5 ${className}`} style={{ background: "var(--surface-1)" }}>
      {children}
    </div>
  );
}

export function Stat({ value, label, sub, tone = "default" }: {
  value: string; label: string; sub?: string; tone?: "default" | "accent" | "warn";
}) {
  const color = tone === "accent" ? "var(--accent)" : tone === "warn" ? "var(--warn)" : "var(--text-primary)";
  return (
    <div className="rounded-xl border p-4" style={{ background: "var(--surface-1)" }}>
      <div className="tnum font-[family-name:var(--font-mono)] text-2xl sm:text-[28px] leading-none" style={{ color }}>
        {value}
      </div>
      <div className="mt-2 text-[13px] font-medium">{label}</div>
      {sub && <div className="mt-1 text-[12px] leading-snug" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

export function Inferred({ children = "Inferred, not given" }: { children?: React.ReactNode }) {
  return (
    <span
      className="ml-1.5 inline-flex items-center rounded-full border px-1.5 py-px align-middle font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide"
      style={{ background: "var(--warn-soft)", color: "var(--warn)", borderColor: "transparent" }}
      title="This quantity was derived from the signal itself, not supplied with the dataset."
    >
      {children}
    </span>
  );
}

export function Toggle<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="mr-1 text-[12px]" style={{ color: "var(--text-muted)" }}>{label}</span>}
      <div className="inline-flex rounded-lg border p-0.5" style={{ background: "var(--surface-2)" }} role="tablist">
        {options.map((o) => (
          <button
            key={o.value}
            role="tab"
            aria-selected={value === o.value}
            onClick={() => onChange(o.value)}
            className="focusable rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={
              value === o.value
                ? { background: "var(--surface-0)", color: "var(--text-primary)", boxShadow: "0 1px 2px rgba(0,0,0,.08)" }
                : { color: "var(--text-secondary)" }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TableView({ headers, rows, caption }: {
  headers: string[]; rows: (string | number)[][]; caption?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button onClick={() => setOpen(!open)}
        className="focusable font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider underline underline-offset-4"
        style={{ color: "var(--text-muted)" }}>
        {open ? "Hide" : "Show"} data table
      </button>
      {open && (
        <div className="scroll-x mt-3 rounded-lg border">
          <table className="w-full text-left text-[13px]">
            {caption && <caption className="px-3 pt-3 text-left text-[12px]" style={{ color: "var(--text-muted)" }}>{caption}</caption>}
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                {headers.map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  {r.map((c, j) => (
                    <td key={j} className="tnum whitespace-nowrap px-3 py-1.5 font-[family-name:var(--font-mono)] text-[12px]">{c}</td>
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

/** Tooltip anchored to a chart, positioned in client coords. */
export function Tip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-lg border px-2.5 py-1.5 text-[12px] shadow-lg"
      style={{ left: x, top: y, transform: "translate(-50%,-115%)", background: "var(--surface-0)", whiteSpace: "nowrap" }}
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
