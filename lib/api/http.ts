import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  requireUser,
  UnauthorizedError,
  AdminConfigError,
} from "@/lib/auth/verify-request";
import { getProvider } from "@/lib/llm";
import type { LLMProvider } from "@/lib/llm/types";
import {
  AnalysisParseError,
  LLMConfigError,
  LLMRequestError,
  LLMTimeoutError,
} from "@/lib/llm/errors";

/** Flatten a ZodError into a compact field/message list for the client. */
export function zodFieldIssues(
  error: ZodError,
): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/** Map a typed analysis failure to a friendly, non-leaky message. */
export function analysisErrorMessage(err: unknown): string {
  if (err instanceof LLMTimeoutError) {
    return "The AI request timed out. Please try again.";
  }
  if (err instanceof AnalysisParseError) {
    return "The AI returned an unreadable analysis. Please try again.";
  }
  if (err instanceof LLMRequestError) {
    return "The AI service failed to respond. Please try again.";
  }
  return "Something went wrong while generating the analysis.";
}

/**
 * Verify the request's ID token. Returns the uid, or a 401 NextResponse the
 * route should return directly.
 */
export async function authenticate(
  request: Request,
): Promise<{ uid: string } | NextResponse> {
  try {
    return await requireUser(request);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof AdminConfigError) {
      return NextResponse.json(
        { error: "Server authentication is not configured." },
        { status: 503 },
      );
    }
    throw err;
  }
}

/** Resolve the LLM provider, or a 503 NextResponse if it is misconfigured. */
export function resolveProvider(): LLMProvider | NextResponse {
  try {
    return getProvider();
  } catch (err) {
    if (err instanceof LLMConfigError) {
      return NextResponse.json(
        { error: "The AI provider is not configured on the server." },
        { status: 503 },
      );
    }
    throw err;
  }
}
