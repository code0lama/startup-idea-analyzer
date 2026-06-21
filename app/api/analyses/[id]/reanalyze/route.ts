import { NextResponse } from "next/server";
import { IdeaInputSchema } from "@/lib/analyses/schema";
import {
  getAnalysisForUser,
  updateIdeaForReanalysis,
} from "@/lib/analyses/server-store";
import { runAndPersistAnalysis } from "@/lib/analyses/run";
import { authenticate, resolveProvider, zodFieldIssues } from "@/lib/api/http";

export const runtime = "nodejs";

/**
 * POST /api/analyses/[id]/reanalyze — edit an existing idea's fields and re-run
 * the analysis. Ownership is enforced server-side before any write.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = IdeaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", issues: zodFieldIssues(parsed.error) },
      { status: 400 },
    );
  }

  // Ownership gate: 404 (not 403) so we don't reveal that the id exists.
  const existing = await getAnalysisForUser(id, auth.uid);
  if (!existing) {
    return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  }

  const provider = resolveProvider();
  if (provider instanceof NextResponse) return provider;

  await updateIdeaForReanalysis(id, parsed.data);
  const result = await runAndPersistAnalysis(id, auth.uid, parsed.data, provider);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, record: result.record },
      { status: 502 },
    );
  }
  return NextResponse.json({ record: result.record });
}
