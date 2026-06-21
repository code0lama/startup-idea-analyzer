import { describe, it, expect } from "vitest";
import { analyzeIdea } from "./analyze";
import { AnalysisParseError } from "./errors";
import type { LLMProvider } from "./types";
import type { IdeaInput } from "@/lib/analyses/schema";

const input: IdeaInput = {
  name: "Acme",
  description: "Does useful things.",
  targetMarket: "SMBs",
};

const validJson = JSON.stringify({
  targetCustomer: "Developers",
  marketSizeEstimate: "$1B",
  competitors: ["A", "B", "C"],
  keyRisks: ["r1", "r2"],
  viabilityScore: 8,
  scoreRationale: "Strong fit.",
});

/** A provider that returns canned responses in order and counts its calls. */
function fakeProvider(responses: string[]) {
  let calls = 0;
  const provider: LLMProvider = {
    name: "fake",
    async complete() {
      const response = responses[Math.min(calls, responses.length - 1)];
      calls += 1;
      return response;
    },
  };
  return { provider, getCalls: () => calls };
}

describe("analyzeIdea", () => {
  it("returns the analysis on a valid first response", async () => {
    const { provider, getCalls } = fakeProvider([validJson]);
    const result = await analyzeIdea(input, provider);
    expect(result.viabilityScore).toBe(8);
    expect(getCalls()).toBe(1);
  });

  it("repairs once when the first response is unparseable", async () => {
    const { provider, getCalls } = fakeProvider(["not json at all", validJson]);
    const result = await analyzeIdea(input, provider);
    expect(result.competitors).toHaveLength(3);
    expect(getCalls()).toBe(2);
  });

  it("repairs once when the first response fails schema validation", async () => {
    const invalidShape = JSON.stringify({
      targetCustomer: "x",
      marketSizeEstimate: "y",
      competitors: ["A"],
      keyRisks: ["r"],
      viabilityScore: 99,
      scoreRationale: "z",
    });
    const { provider, getCalls } = fakeProvider([invalidShape, validJson]);
    const result = await analyzeIdea(input, provider);
    expect(result.viabilityScore).toBe(8);
    expect(getCalls()).toBe(2);
  });

  it("throws AnalysisParseError when the repair also fails", async () => {
    const { provider, getCalls } = fakeProvider(["nope", "still nope"]);
    await expect(analyzeIdea(input, provider)).rejects.toBeInstanceOf(
      AnalysisParseError,
    );
    expect(getCalls()).toBe(2);
  });
});
