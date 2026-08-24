export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
export const pp = (x: number, d = 1) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)} pp`;
export const ms = (x: number) => `${x < 10 ? x.toFixed(1) : Math.round(x)} ms`;
