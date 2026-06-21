/** The configured provider is missing required configuration (e.g. an API key). */
export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigError";
  }
}

/** The LLM API call failed (network error, non-2xx, etc.). */
export class LLMRequestError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LLMRequestError";
  }
}

/** The LLM call exceeded the configured timeout / was aborted. */
export class LLMTimeoutError extends Error {
  constructor(message = "The analysis request timed out") {
    super(message);
    this.name = "LLMTimeoutError";
  }
}

/** The model's output could not be parsed/validated, even after one repair attempt. */
export class AnalysisParseError extends Error {
  readonly raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.name = "AnalysisParseError";
    this.raw = raw;
  }
}

/**
 * Normalize an unknown thrown value into a typed LLM error. Aborts (timeouts)
 * are distinguished from other request failures.
 */
export function toLLMError(err: unknown): Error {
  if (
    err instanceof LLMConfigError ||
    err instanceof LLMRequestError ||
    err instanceof LLMTimeoutError ||
    err instanceof AnalysisParseError
  ) {
    return err;
  }
  // Native fetch abort surfaces as "AbortError"; the Anthropic/OpenAI SDKs wrap
  // signal aborts as "APIUserAbortError". Both mean we hit our timeout.
  if (
    err instanceof Error &&
    (err.name === "AbortError" || err.name === "APIUserAbortError")
  ) {
    return new LLMTimeoutError();
  }
  if (err instanceof Error) {
    return new LLMRequestError(err.message, { cause: err });
  }
  return new LLMRequestError("LLM request failed");
}
