import Link from "next/link";

export const LAST_UPDATED = "24 August 2026";
export const REPO = "https://github.com/aaryavvatts-lab/myodecode";
export const CONTACT = `${REPO}/issues`;

export function LegalPage({
  title, updated = LAST_UPDATED, summary, children,
}: {
  title: string; updated?: string; summary: string; children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <Link href="/" className="focusable text-[13px] underline underline-offset-4"
            style={{ color: "var(--text-secondary)" }}>
        Back to the project
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-serif)] text-4xl leading-tight tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 font-[family-name:var(--font-mono)] text-[12px]" style={{ color: "var(--text-muted)" }}>
        Last updated {updated}
      </p>
      <p className="mt-6 rounded-xl border p-4 text-[15px] leading-relaxed"
         style={{ background: "var(--surface-1)", color: "var(--text-secondary)" }}>
        {summary}
      </p>
      <div className="legal mt-10">{children}</div>
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 scroll-mt-16 text-[19px] font-semibold leading-snug first:mt-0">
      {children}
    </h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      {children}
    </p>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 space-y-2 pl-5 text-[15px] leading-relaxed"
        style={{ color: "var(--text-secondary)", listStyle: "disc" }}>
      {children}
    </ul>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border-l-2 p-3 text-[14px] leading-relaxed"
         style={{ background: "var(--surface-2)", borderColor: "var(--accent)", color: "var(--text-secondary)" }}>
      {children}
    </div>
  );
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a href={href} className="focusable underline underline-offset-4"
       style={{ color: "var(--accent)" }}
       {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}
