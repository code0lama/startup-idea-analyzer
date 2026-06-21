export type CompleteParams = {
  system: string;
  user: string;
  /** Abort signal used to enforce a request timeout. */
  signal?: AbortSignal;
};

/**
 * Minimal provider abstraction: given a system + user prompt, return the raw text
 * completion. Keeping this surface tiny lets us swap Anthropic/OpenAI (or add a
 * fake in tests) without touching the analysis orchestration.
 */
export interface LLMProvider {
  readonly name: string;
  complete(params: CompleteParams): Promise<string>;
}
