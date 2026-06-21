import { GoogleGenAI } from "@google/genai";
import type { CompleteParams, LLMProvider } from "../types";
import { LLMConfigError, LLMTimeoutError, toLLMError } from "../errors";

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Google Gemini adapter (via the @google/genai SDK). Model is overridable via
 * GEMINI_MODEL. `responseMimeType: "application/json"` asks Gemini for JSON; the
 * shared analyze.ts still validates with Zod and repairs once if needed.
 */
export function createGeminiProvider(): LLMProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new LLMConfigError("GEMINI_API_KEY is not set");
  }
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const ai = new GoogleGenAI({ apiKey });

  return {
    name: `gemini:${model}`,
    async complete({ system, user, signal }: CompleteParams): Promise<string> {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: user,
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            abortSignal: signal,
          },
        });
        return (response.text ?? "").trim();
      } catch (err) {
        // Map an aborted request to a timeout regardless of how the SDK surfaces it.
        if (signal?.aborted) throw new LLMTimeoutError();
        throw toLLMError(err);
      }
    },
  };
}
