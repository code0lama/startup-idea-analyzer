import { describe, it, expect } from "vitest";
import { computeInsights } from "./insights";

describe("computeInsights", () => {
  it("handles an empty list", () => {
    expect(computeInsights([])).toEqual({
      count: 0,
      averageScore: null,
      bands: { low: 0, medium: 0, high: 0 },
    });
  });

  it("counts score bands and averages", () => {
    const result = computeInsights([2, 5, 9, 10]);
    expect(result.count).toBe(4);
    expect(result.bands).toEqual({ low: 1, medium: 1, high: 2 });
    expect(result.averageScore).toBe(6.5);
  });

  it("rounds the average to one decimal place", () => {
    // (1 + 2 + 2) / 3 = 1.666...
    expect(computeInsights([1, 2, 2]).averageScore).toBe(1.7);
  });

  it("ignores non-finite values", () => {
    const result = computeInsights([5, Number.NaN, Number.POSITIVE_INFINITY]);
    expect(result.count).toBe(1);
    expect(result.averageScore).toBe(5);
  });
});
