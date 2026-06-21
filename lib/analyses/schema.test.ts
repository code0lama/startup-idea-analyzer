import { describe, it, expect } from "vitest";
import { MarketAnalysisSchema, IdeaInputSchema } from "./schema";

const validAnalysis = {
  targetCustomer: "Indie developers",
  marketSizeEstimate: "~$2B TAM based on dev-tool spend",
  competitors: ["GitHub", "GitLab", "Bitbucket"],
  keyRisks: ["Strong incumbents", "High switching costs"],
  viabilityScore: 7,
  scoreRationale: "Crowded market but a clear differentiator.",
};

describe("MarketAnalysisSchema", () => {
  it("accepts a valid analysis", () => {
    expect(MarketAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("strips unknown keys", () => {
    const parsed = MarketAnalysisSchema.parse({ ...validAnalysis, hallucinated: "x" });
    expect(parsed).not.toHaveProperty("hallucinated");
  });

  it("rejects a missing required field", () => {
    const incomplete = {
      targetCustomer: "x",
      marketSizeEstimate: "y",
      competitors: ["a"],
      keyRisks: ["r1", "r2"],
      viabilityScore: 5,
      // scoreRationale missing
    };
    expect(MarketAnalysisSchema.safeParse(incomplete).success).toBe(false);
  });

  it("rejects an out-of-range score", () => {
    expect(
      MarketAnalysisSchema.safeParse({ ...validAnalysis, viabilityScore: 11 })
        .success,
    ).toBe(false);
    expect(
      MarketAnalysisSchema.safeParse({ ...validAnalysis, viabilityScore: 0 })
        .success,
    ).toBe(false);
  });

  it("rejects a non-integer score", () => {
    expect(
      MarketAnalysisSchema.safeParse({ ...validAnalysis, viabilityScore: 7.5 })
        .success,
    ).toBe(false);
  });

  it("rejects an empty competitors array", () => {
    expect(
      MarketAnalysisSchema.safeParse({ ...validAnalysis, competitors: [] })
        .success,
    ).toBe(false);
  });

  it("rejects wrong types", () => {
    expect(
      MarketAnalysisSchema.safeParse({ ...validAnalysis, viabilityScore: "7" })
        .success,
    ).toBe(false);
    expect(
      MarketAnalysisSchema.safeParse({ ...validAnalysis, competitors: "GitHub" })
        .success,
    ).toBe(false);
  });
});

describe("IdeaInputSchema", () => {
  it("accepts and trims valid input", () => {
    const result = IdeaInputSchema.safeParse({
      name: "  Acme  ",
      description: "Does useful things.",
      targetMarket: "SMBs",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Acme");
  });

  it("reports an error per empty field", () => {
    const result = IdeaInputSchema.safeParse({
      name: "",
      description: "",
      targetMarket: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain("name");
      expect(fields).toContain("description");
      expect(fields).toContain("targetMarket");
    }
  });

  it("rejects a whitespace-only name", () => {
    expect(
      IdeaInputSchema.safeParse({
        name: "   ",
        description: "ok",
        targetMarket: "ok",
      }).success,
    ).toBe(false);
  });

  it("rejects an over-long name", () => {
    expect(
      IdeaInputSchema.safeParse({
        name: "a".repeat(121),
        description: "ok",
        targetMarket: "ok",
      }).success,
    ).toBe(false);
  });
});
