import { describe, it, expect } from "vitest";
import { extractJson, parseAnalysis } from "./parse";

const validJson = JSON.stringify({
  targetCustomer: "Developers",
  marketSizeEstimate: "$1B",
  competitors: ["A", "B", "C"],
  keyRisks: ["r1", "r2"],
  viabilityScore: 8,
  scoreRationale: "Strong fit.",
});

describe("extractJson", () => {
  it("returns plain JSON", () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}');
  });

  it("extracts from a fenced code block", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("extracts JSON embedded in prose", () => {
    expect(extractJson('Sure! {"a":1} hope that helps')).toBe('{"a":1}');
  });

  it("returns null when there is no object", () => {
    expect(extractJson("no json here")).toBeNull();
    expect(extractJson("")).toBeNull();
  });
});

describe("parseAnalysis", () => {
  it("parses a valid analysis", () => {
    expect(parseAnalysis(validJson).success).toBe(true);
  });

  it("parses a fenced valid analysis", () => {
    expect(parseAnalysis("```json\n" + validJson + "\n```").success).toBe(true);
  });

  it("fails on text with no JSON", () => {
    expect(parseAnalysis("the model said hi").success).toBe(false);
  });

  it("fails on malformed JSON", () => {
    expect(parseAnalysis("{ not: valid json, }").success).toBe(false);
  });

  it("fails schema validation and explains why", () => {
    const badShape = JSON.stringify({
      targetCustomer: "x",
      marketSizeEstimate: "y",
      competitors: [],
      keyRisks: [],
      viabilityScore: 50,
      scoreRationale: "",
    });
    const result = parseAnalysis(badShape);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.length).toBeGreaterThan(0);
  });
});
