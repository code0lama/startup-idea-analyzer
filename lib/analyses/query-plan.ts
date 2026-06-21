/**
 * Pure query-strategy selector. Firestore allows a range filter on only ONE
 * field per query, so we pick a strategy from the active filters. This is split
 * out from the Firestore code so it can be unit-tested without a database.
 */
export type QueryPlan =
  | { kind: "default" }
  | { kind: "score"; minScore: number }
  | { kind: "search"; term: string }
  | { kind: "search-score"; term: string; minScore: number };

export type QueryInput = {
  search?: string | null;
  minScore?: number | null;
};

export function planQuery({ search, minScore }: QueryInput): QueryPlan {
  const term = (search ?? "").trim().toLowerCase();
  // A min score of 1 (or less) matches everything, so treat it as "no filter".
  const score =
    typeof minScore === "number" && minScore > 1 ? Math.floor(minScore) : null;

  if (term && score !== null) return { kind: "search-score", term, minScore: score };
  if (term) return { kind: "search", term };
  if (score !== null) return { kind: "score", minScore: score };
  return { kind: "default" };
}
