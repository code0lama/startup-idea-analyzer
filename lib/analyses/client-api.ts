import { getFirebaseAuth } from "@/lib/firebase/client";
import type { AnalysisRecord, IdeaInput } from "./schema";

type AnalysisResponse = { record?: AnalysisRecord; error?: string };

/**
 * POST helper that attaches the current user's Firebase ID token. The server
 * verifies the token before doing any work, so the token is the auth boundary.
 */
async function postAnalysis(
  path: string,
  input: IdeaInput,
): Promise<AnalysisRecord> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("You must be signed in to do that.");
  }
  const send = async (forceRefresh = false) => {
    const token = await user.getIdToken(forceRefresh);
    return fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
  };

  let res = await send();
  if (res.status === 401) {
    res = await send(true);
  }

  let body: AnalysisResponse = {};
  try {
    body = (await res.json()) as AnalysisResponse;
  } catch {
    // Non-JSON response (e.g. an unexpected server error page).
  }

  if (!res.ok) {
    throw new Error(body.error ?? "Request failed. Please try again.");
  }
  if (!body.record) {
    throw new Error("The server returned an unexpected response.");
  }
  return body.record;
}

/** Create + analyze a new idea. */
export function createAnalysisRequest(input: IdeaInput): Promise<AnalysisRecord> {
  return postAnalysis("/api/analyses", input);
}

/** Edit an existing idea's fields and re-run its analysis. */
export function reanalyzeRequest(
  id: string,
  input: IdeaInput,
): Promise<AnalysisRecord> {
  return postAnalysis(`/api/analyses/${id}/reanalyze`, input);
}
