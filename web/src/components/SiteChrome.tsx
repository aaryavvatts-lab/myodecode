"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export const SECTIONS: [string, string][] = [
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
const LEGAL: [string, string][] = [
  ["/privacy", "Privacy"], ["/terms", "Terms"], ["/cookies", "Cookies"], ["/accessibility", "Accessibility"],
];
const BAR: [string, string][] = [
  ["/#leakage", "The catch"], ["/#latency", "Speed"], ["/#live", "Try it"], ["/#methods", "Methods"],
];

export function SkipLink() {
  return <a href="#main" className="skip">Skip to content</a>;
}

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) { document.body.style.overflow = ""; return; }
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); toggleRef.current?.focus(); }
      if (e.key === "Tab" && sheetRef.current) {
        const f = sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    const mq = window.matchMedia("(min-width: 48em)");
    const onWide = (m: MediaQueryListEvent) => { if (m.matches) setOpen(false); };
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
      document.body.style.overflow = "";
    };
  }, [open]);

  let i = 0;
  return (
    <>
      <header className="wrap bar">
        <Link href="/" className="bar__mark">MyoDecode</Link>
        <nav className="bar__links" aria-label="Site">
          {BAR.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          <ThemeToggle />
        </nav>
        <div className="bar__phone">
          <ThemeToggle />
          <button ref={toggleRef} type="button" className="textbtn" onClick={() => setOpen((v) => !v)}
            aria-expanded={open} aria-controls="menu">Menu</button>
        </div>
      </header>
      <nav id="menu" ref={sheetRef} className="sheet" hidden={!open} aria-label="Menu">
        <div className="sheet__top">
          <span className="bar__mark">MyoDecode</span>
          <button type="button" className="textbtn" onClick={() => { setOpen(false); toggleRef.current?.focus(); }}>Close</button>
        </div>
        <div className="sheet__cols">
          <div>
            <p>On this page</p>
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`/#${id}`} onClick={() => setOpen(false)} style={{ ["--i" as string]: i++ }}>{label}</a>
            ))}
          </div>
          <div>
            <p>Policies</p>
            {LEGAL.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={path === href ? "page" : undefined} style={{ ["--i" as string]: i++ }}>{label}</Link>
            ))}
            <a href="https://github.com/aaryavvatts-lab/myodecode" onClick={() => setOpen(false)} style={{ ["--i" as string]: i++ }}>Code</a>
          </div>
        </div>
        <p className="text-small" style={{ color: "var(--muted)" }}>A personal research project, not a product. Not medical advice.</p>
      </nav>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="wrap close">
      <p className="close__mark">MyoDecode</p>
      <p>
        Reading hand gestures from four channels of forearm muscle signal, with the
        evaluation done honestly. A personal research project, not a product.
      </p>
      <p>
        Every accuracy on this site is leave-one-subject-out unless it says otherwise.
        Code under MIT, writing and figures under CC BY 4.0. Not medical advice.
      </p>
      <nav className="close__meta" aria-label="On this page">
        {SECTIONS.map(([id, label]) => <a key={id} href={`/#${id}`}>{label}</a>)}
      </nav>
      <nav className="close__meta" aria-label="Policies and code">
        {LEGAL.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        <a href="https://github.com/aaryavvatts-lab/myodecode" target="_blank" rel="noopener noreferrer">Code</a>
      </nav>
      <p className="text-small" style={{ color: "var(--muted)" }}>
        Pictures: the signal and embedding figures are drawn from this project&apos;s own data.
        The armband photograph is{" "}
        <a className="link" href="https://commons.wikimedia.org/w/index.php?curid=106613128">Trying the Myo armband</a> by
        Antonio Zugaldia, <a className="link" href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>, via Wikimedia
        Commons; the forearm plate is{" "}
        <a className="link" href="https://commons.wikimedia.org/w/index.php?curid=30131695">Muscles that move the forearm</a> by
        OpenStax, <a className="link" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Type is Erode by Indian
        Type Foundry, under the ITF Free Font License, served from this site.
      </p>
    </footer>
  );
}
