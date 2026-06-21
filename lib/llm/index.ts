import type { LLMProvider } from "./types";
import { LLMConfigError } from "./errors";
import { createAnthropicProvider } from "./providers/anthropic";
import { createOpenAIProvider } from "./providers/openai";
import { createGeminiProvider } from "./providers/gemini";

/**
 * Resolve the configured LLM provider. Switching providers is a one-line env
 * change: set LLM_PROVIDER=gemini (default), anthropic, or openai.
 */
export function getProvider(): LLMProvider {
  const choice = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
  switch (choice) {
    case "gemini":
      return createGeminiProvider();
    case "anthropic":
      return createAnthropicProvider();
    case "openai":
      return createOpenAIProvider();
    default:
      throw new LLMConfigError(
        `Unknown LLM_PROVIDER "${choice}". Use "gemini", "anthropic", or "openai".`,
      );
  }
}

/** Timeout for a single LLM call, overridable via LLM_TIMEOUT_MS. */
export function getLLMTimeoutMs(): number {
  const raw = Number(process.env.LLM_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 45_000;
}
