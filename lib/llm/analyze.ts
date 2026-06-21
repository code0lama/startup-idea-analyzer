import type { IdeaInput, MarketAnalysis } from "@/lib/analyses/schema";
import type { LLMProvider } from "./types";
import { parseAnalysis } from "./parse";
import { SYSTEM_PROMPT, buildUserPrompt, buildRepairPrompt } from "./prompt";
import { AnalysisParseError } from "./errors";

export type AnalyzeOptions = { signal?: AbortSignal };

/**
 * Generate a validated `MarketAnalysis` for an idea.
 *
 * Flow: prompt → parse/validate. On failure, re-prompt ONCE with the bad output
 * and the validation error, then parse/validate again. If it still fails, throw
 * `AnalysisParseError`. Provider/timeout errors propagate as their typed errors.
 */
export async function analyzeIdea(
  input: IdeaInput,
  provider: LLMProvider,
  options: AnalyzeOptions = {},
): Promise<MarketAnalysis> {
  const { signal } = options;

  const firstRaw = await provider.complete({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
    signal,
  });
  const firstParse = parseAnalysis(firstRaw);
  if (firstParse.success) {
    return firstParse.data;
  }

  // Single repair attempt.
  const repairRaw = await provider.complete({
    system: SYSTEM_PROMPT,
    user: buildRepairPrompt(input, firstRaw, firstParse.error),
    signal,
  });
  const repairParse = parseAnalysis(repairRaw);
  if (repairParse.success) {
    return repairParse.data;
  }

  throw new AnalysisParseError(
    `Invalid analysis after repair attempt — ${repairParse.error}`,
    repairRaw,
  );
}
