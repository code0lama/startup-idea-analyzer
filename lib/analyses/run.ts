import { analyzeIdea } from "@/lib/llm/analyze";
import { getLLMTimeoutMs } from "@/lib/llm";
import type { LLMProvider } from "@/lib/llm/types";
import { analysisErrorMessage } from "@/lib/api/http";
import type { AnalysisRecord, IdeaInput } from "./schema";
import {
  getAnalysisForUser,
  markAnalysisComplete,
  markAnalysisError,
} from "./server-store";

export type RunResult =
  | { ok: true; record: AnalysisRecord | null }
  | { ok: false; message: string; record: AnalysisRecord | null };

/**
 * Run the analysis for an already-created doc with a hard timeout, persist the
 * outcome (complete or error), and return the refreshed record. Never throws for
 * expected AI failures — the doc is marked `error` and the message surfaced.
 */
export async function runAndPersistAnalysis(
  id: string,
  uid: string,
  input: IdeaInput,
  provider: LLMProvider,
): Promise<RunResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), getLLMTimeoutMs());
  try {
    const analysis = await analyzeIdea(input, provider, {
      signal: controller.signal,
    });
    await markAnalysisComplete(id, analysis);
    return { ok: true, record: await getAnalysisForUser(id, uid) };
  } catch (err) {
    const message = analysisErrorMessage(err);
    await markAnalysisError(id, message);
    return { ok: false, message, record: await getAnalysisForUser(id, uid) };
  } finally {
    clearTimeout(timer);
  }
}
