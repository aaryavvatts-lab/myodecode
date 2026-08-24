"use client";

import { useEffect, useState } from "react";

const SECTIONS: [string, string][] = [
  ["leakage", "The catch"],
  ["data", "The data"],
  ["primer", "How it works"],
  ["latency", "Speed"],
  ["electrodes", "Sensor count"],
  ["calibration", "Setup"],
  ["confusion", "Mistakes"],
  ["latent", "Inside the model"],
  ["live", "Try it"],
  ["methods", "Methods"],
  ["references", "Sources"],
];

/** Sticky marker down the side showing where you are in a long page. */
export default function SectionNav() {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    SECTIONS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label="Sections"
         className="pointer-events-none fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 xl:block">
      <ul className="pointer-events-auto space-y-1">
        {SECTIONS.map(([id, label]) => {
          const on = active === id;
          return (
            <li key={id}>
              <a href={`#${id}`}
                 aria-current={on ? "true" : undefined}
                 className="focusable group flex items-center gap-2 rounded py-1 pr-2 text-[11px] transition-colors"
                 style={{ color: on ? "var(--text-primary)" : "var(--text-muted)" }}>
                <span className="block h-px transition-all"
                      style={{ width: on ? 20 : 10, background: on ? "var(--accent)" : "var(--border-strong)" }} />
                <span className={on ? "opacity-100" : "opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"}>
                  {label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
