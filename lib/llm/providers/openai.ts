import OpenAI from "openai";
import type { CompleteParams, LLMProvider } from "../types";
import { LLMConfigError, toLLMError } from "../errors";

const DEFAULT_MODEL = "gpt-4o";
const MAX_TOKENS = 4096;

/**
 * OpenAI adapter. Model is overridable via OPENAI_MODEL. JSON mode nudges the
 * model toward valid JSON; the shared analyze.ts still validates and repairs.
 */
export function createOpenAIProvider(): LLMProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LLMConfigError("OPENAI_API_KEY is not set");
  }
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const client = new OpenAI({ apiKey });

  return {
    name: `openai:${model}`,
    async complete({ system, user, signal }: CompleteParams): Promise<string> {
      try {
        const completion = await client.chat.completions.create(
          {
            model,
            max_tokens: MAX_TOKENS,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          },
          { signal },
        );
        return (completion.choices[0]?.message?.content ?? "").trim();
      } catch (err) {
        throw toLLMError(err);
      }
    },
  };
}
