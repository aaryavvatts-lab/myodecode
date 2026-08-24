"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NOTICE_KEY = "myodecode-notice";

export function SkipLink() {
  return (
    <a href="#main"
       className="focusable sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:px-4 focus:py-2 focus:text-[14px]"
       style={{ background: "var(--surface-0)" }}>
      Skip to content
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="text-[14px] font-medium">MyoDecode</p>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Reading hand gestures from four channels of forearm muscle signal, with the
              evaluation done honestly. A personal research project, not a product.
            </p>
          </div>
          <nav aria-label="Site" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <Link href="/privacy" className="focusable underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>Privacy</Link>
            <Link href="/terms" className="focusable underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>Terms</Link>
            <Link href="/cookies" className="focusable underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>Cookies</Link>
            <Link href="/accessibility" className="focusable underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>Accessibility</Link>
            <a href="https://github.com/aaryavvatts-lab/myodecode" target="_blank" rel="noopener noreferrer"
               className="focusable underline underline-offset-4" style={{ color: "var(--text-secondary)" }}>Code</a>
          </nav>
        </div>
        <p className="mt-8 border-t pt-6 text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Every accuracy on this site is leave-one-subject-out unless it says otherwise.
          Code under MIT, writing and figures under CC BY 4.0. Not medical advice.
        </p>
      </div>
    </footer>
  );
}

export function Notice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(NOTICE_KEY) !== "dismissed") setShow(true);
    } catch {
      // storage blocked, so just show it and do not try to remember
      setShow(true);
    }
  }, []);

  if (!show) return null;
  return (
    <div role="region" aria-label="Site notice"
         className="fixed inset-x-0 bottom-0 z-40 border-t px-5 py-3"
         style={{ background: "var(--surface-1)" }}>
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          This site sets no cookies and has no analytics. Closing this saves one entry in
          your browser so it does not come back.{" "}
          <Link href="/cookies" className="focusable underline underline-offset-4"
                style={{ color: "var(--accent)" }}>
            What that means
          </Link>
        </p>
        <button
          onClick={() => {
            try { localStorage.setItem(NOTICE_KEY, "dismissed"); } catch { /* ignore */ }
            setShow(false);
          }}
          className="focusable shrink-0 self-start rounded-lg px-4 py-1.5 text-[13px] font-medium sm:self-auto"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
          Got it
        </button>
      </div>
    </div>
  );
}
