import { NextResponse } from "next/server";
import { IdeaInputSchema } from "@/lib/analyses/schema";
import { createAnalysis } from "@/lib/analyses/server-store";
import { runAndPersistAnalysis } from "@/lib/analyses/run";
import { authenticate, resolveProvider, zodFieldIssues } from "@/lib/api/http";

// firebase-admin requires the Node.js runtime (not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * POST /api/analyses — create an idea and generate its market analysis.
 * Auth: Firebase ID token (Bearer). All writes are server-side (Admin SDK).
 */
export async function POST(request: Request) {
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

  // Resolve the provider before creating a doc so a misconfig doesn't persist junk.
  const provider = resolveProvider();
  if (provider instanceof NextResponse) return provider;

  const id = await createAnalysis(auth.uid, parsed.data);
  const result = await runAndPersistAnalysis(id, auth.uid, parsed.data, provider);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, record: result.record },
      { status: 502 },
    );
  }
  return NextResponse.json({ record: result.record }, { status: 201 });
}
