import { MarketAnalysisSchema, type MarketAnalysis } from "@/lib/analyses/schema";

export type ParseResult =
  | { success: true; data: MarketAnalysis }
  | { success: false; error: string };

/**
 * Best-effort extraction of a JSON object from raw model text. Handles fenced
 * code blocks (```json ... ```) and leading/trailing prose by slicing from the
 * first `{` to the last `}`. Returns null if no object-like span is found.
 */
export function extractJson(raw: string): string | null {
  if (!raw) return null;
  let text = raw.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    text = fenced[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  return text.slice(start, end + 1);
}

/**
 * Parse + validate a model response into a `MarketAnalysis`. Pure and total — it
 * never throws, returning a discriminated result so callers can decide whether to
 * repair or surface an error. This is the heart of the "never trust raw AI" rule.
 */
export function parseAnalysis(raw: string): ParseResult {
  const json = extractJson(raw);
  if (!json) {
    return { success: false, error: "No JSON object found in the model response." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { success: false, error: "Model response was not valid JSON." };
  }

  const result = MarketAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { success: false, error: `Schema validation failed — ${detail}` };
  }

  return { success: true, data: result.data };
}
