import { describe, it, expect } from "vitest";
import { planQuery } from "./query-plan";

describe("planQuery", () => {
  it("returns the default plan when no filters are active", () => {
    expect(planQuery({})).toEqual({ kind: "default" });
    expect(planQuery({ search: "   ", minScore: null })).toEqual({
      kind: "default",
    });
  });

  it("treats a min score of 1 or less as no filter", () => {
    expect(planQuery({ minScore: 1 })).toEqual({ kind: "default" });
  });

  it("returns a score plan for a real minimum", () => {
    expect(planQuery({ minScore: 6 })).toEqual({ kind: "score", minScore: 6 });
  });

  it("floors a fractional min score", () => {
    expect(planQuery({ minScore: 6.9 })).toEqual({ kind: "score", minScore: 6 });
  });

  it("returns a search plan and normalizes the term", () => {
    expect(planQuery({ search: "  Acme  " })).toEqual({
      kind: "search",
      term: "acme",
    });
  });

  it("returns a search-score plan when both are active", () => {
    expect(planQuery({ search: "Acme", minScore: 8 })).toEqual({
      kind: "search-score",
      term: "acme",
      minScore: 8,
    });
  });
});
