export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
export const pp = (x: number, d = 1) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)} pp`;
export const ms = (x: number) => `${x < 10 ? x.toFixed(1) : Math.round(x)} ms`;

/** "1", "1 and 2", "1, 2 and 3" */
export function listJoin(items: (string | number)[]): string {
  const a = items.map(String);
  if (a.length <= 1) return a[0] ?? "";
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
}

/** "1 sensor" / "3 sensors" */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
