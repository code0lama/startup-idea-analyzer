import type { IdeaInput } from "@/lib/analyses/schema";

export const SYSTEM_PROMPT =
  "You are a pragmatic startup market analyst. You evaluate startup ideas and " +
  "respond with a concise, structured market analysis. Always respond with a " +
  "single JSON object and nothing else — no prose, no markdown code fences.";

/** The primary analysis request. */
export function buildUserPrompt(input: IdeaInput): string {
  return `Analyze this startup idea and return ONLY a JSON object with exactly these keys:

- "targetCustomer" (string): who the ideal customer is.
- "marketSizeEstimate" (string): a rough TAM estimate with brief reasoning.
- "competitors" (array of strings): the top 3 likely competitors.
- "keyRisks" (array of strings): 2 to 4 main risks.
- "viabilityScore" (integer from 1 to 10): overall viability.
- "scoreRationale" (string): why you assigned that score.

Startup name: ${input.name}
Description: ${input.description}
Target market: ${input.targetMarket}

Respond with the JSON object only.`;
}

/**
 * The single repair re-prompt used when the first response fails validation. It
 * echoes the bad output and the precise validation error so the model can fix it.
 */
export function buildRepairPrompt(
  input: IdeaInput,
  badOutput: string,
  validationError: string,
): string {
  return `${buildUserPrompt(input)}

Your previous response could not be parsed into the required structure.
Validation error: ${validationError}

Your previous response was:
${badOutput}

Return a corrected response: a single valid JSON object containing all required
keys with the correct types and value ranges. No markdown, no commentary.`;
}
