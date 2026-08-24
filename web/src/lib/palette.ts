/**
 * Colour system for the whole site.
 *
 * Gesture identity is categorical: blue / yellow / magenta / green, the one
 * four-slot subset of the reference palette that clears every all-pairs check in
 * BOTH light and dark mode (validated with the dataviz validator, not by eye).
 * Rest gets a neutral grey because "no gesture" is not a peer category.
 *
 * Channels use an ordinal blue ramp instead: electrode number is an ordered
 * position along the forearm, not an identity, and keeping the two encodings
 * visually distinct stops "channel 2" from ever reading as "gesture 2".
 */

export type Mode = "light" | "dark";

/** Gesture classes 0-4. Class 0 is Rest. */
export const GESTURE_COLORS: Record<Mode, string[]> = {
  light: ["#8a8a85", "#2a78d6", "#eda100", "#e87ba4", "#008300"],
  dark: ["#9a9a92", "#3987e5", "#c98500", "#d55181", "#008300"],
};

/** Ordinal ramp for the four EMG channels, nearest-surface step clears 2:1. */
export const CHANNEL_COLORS: Record<Mode, string[]> = {
  light: ["#86b6ef", "#3987e5", "#256abf", "#104281"],
  dark: ["#cde2fb", "#9ec5f4", "#5598e7", "#256abf"],
};

/** Sequential blue ramp, light -> dark, for the tradeoff heatmap. */
export const SEQUENTIAL = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
  "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
];

/** Diverging pair for "leaky minus honest" style deltas. */
export const DIVERGING = { low: "#2a78d6", mid: "#f0efec", midDark: "#383835", high: "#e34948" };

export function sequentialColor(t: number): string {
  const i = Math.max(0, Math.min(SEQUENTIAL.length - 1, Math.round(t * (SEQUENTIAL.length - 1))));
  return SEQUENTIAL[i];
}

export const GESTURE_NAMES = ["Rest", "Gesture 1", "Gesture 2", "Gesture 3", "Gesture 4"];

/** Marker shapes give gesture identity a second, colour-independent channel. */
export const GESTURE_SHAPES = ["circle", "square", "triangle", "diamond", "cross"] as const;

/** Relative luminance (WCAG). Used to pick readable text on a coloured chip. */
export function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const v = [0, 2, 4].map((i) => {
    const x = parseInt(c.slice(i, i + 2), 16) / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

/** Black or white, whichever has more contrast against `hex`. */
export function onColor(hex: string): string {
  return luminance(hex) > 0.42 ? "#121211" : "#ffffff";
}
