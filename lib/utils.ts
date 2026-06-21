/**
 * Tiny class-name combiner — joins truthy class fragments with a space. Keeps the
 * UI free of an extra dependency for simple conditional styling.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/** Format an epoch-millisecond timestamp for display. */
export function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

export type ScoreBand = "low" | "medium" | "high";

/** Map a 1–10 viability score to a band. */
export function scoreBand(score: number): ScoreBand {
  if (score <= 3) return "low";
  if (score <= 6) return "medium";
  return "high";
}

export const SCORE_BANDS: ScoreBand[] = ["low", "medium", "high"];

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  low: "Low (1–3)",
  medium: "Medium (4–6)",
  high: "High (7–10)",
};
