import Link from "next/link";

export const LAST_UPDATED = "18 October 2026";
export const REPO = "https://github.com/aaryavvatts-lab/myodecode";
export const CONTACT = `${REPO}/issues`;

export function LegalPage({
  title, updated = LAST_UPDATED, summary, children,
}: {
  title: string; updated?: string; summary: string; children: React.ReactNode;
}) {
  return (
    <main id="main" className="mx-auto max-w-3xl wrap py-16 sm:py-24">
      <Link href="/" className="focusable link text-body">Back to the project</Link>
      <h1 className="mt-6 text-display">{title}</h1>
      <p className="mt-3 text-small" style={{ color: "var(--muted)" }}>Last updated {updated}</p>
      <p className="mt-6 text-lead">{summary}</p>
      <div className="legal mt-10">{children}</div>
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 scroll-mt-16 text-lead font-semibold first:mt-0">{children}</h2>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-body max-w-[62ch]">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 space-y-2 pl-5 text-body max-w-[62ch]" style={{ listStyle: "disc" }}>{children}</ul>;
}

export function Note({ children }: { children: React.ReactNode }) {
  return <div className="card mt-4 text-body max-w-[62ch]">{children}</div>;
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a href={href} className="focusable link" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}
