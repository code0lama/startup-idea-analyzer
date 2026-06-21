import Anthropic from "@anthropic-ai/sdk";
import type { CompleteParams, LLMProvider } from "../types";
import { LLMConfigError, toLLMError } from "../errors";

const DEFAULT_MODEL = "claude-opus-4-8";
const MAX_TOKENS = 4096;

/**
 * Anthropic adapter. Model is overridable via ANTHROPIC_MODEL. We intentionally
 * use a plain prompt + Zod validation + repair (see analyze.ts) rather than the
 * SDK's structured-output mode, because robust parsing of untrusted model output
 * is an explicit requirement of this project.
 */
export function createAnthropicProvider(): LLMProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new LLMConfigError("ANTHROPIC_API_KEY is not set");
  }
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  return {
    name: `anthropic:${model}`,
    async complete({ system, user, signal }: CompleteParams): Promise<string> {
      try {
        const message = await client.messages.create(
          {
            model,
            max_tokens: MAX_TOKENS,
            system,
            messages: [{ role: "user", content: user }],
          },
          { signal },
        );
        return message.content
          .map((block) => (block.type === "text" ? block.text : ""))
          .join("")
          .trim();
      } catch (err) {
        throw toLLMError(err);
      }
    },
  };
}
