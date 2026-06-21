import { scoreBand, type ScoreBand } from "@/lib/utils";

export type Insights = {
  count: number;
  averageScore: number | null;
  bands: Record<ScoreBand, number>;
};

/**
 * Pure aggregate over a list of viability scores. Kept free of any Firestore
 * imports so it can be unit-tested directly. The data fetch that feeds it lives
 * in `lib/analyses/queries.ts` (`fetchInsights`).
 */
export function computeInsights(scores: number[]): Insights {
  const valid = scores.filter((s) => Number.isFinite(s));
  const bands: Record<ScoreBand, number> = { low: 0, medium: 0, high: 0 };
  for (const score of valid) {
    bands[scoreBand(score)] += 1;
  }
  const averageScore =
    valid.length === 0
      ? null
      : Math.round((valid.reduce((sum, s) => sum + s, 0) / valid.length) * 10) /
        10;
  return { count: valid.length, averageScore, bands };
}
