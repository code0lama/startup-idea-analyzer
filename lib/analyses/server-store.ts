import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type {
  AnalysisRecord,
  AnalysisStatus,
  IdeaInput,
  MarketAnalysis,
} from "./schema";

/**
 * Server-only writes/reads via the Admin SDK. All mutations to the `analyses`
 * collection go through here, after the caller's identity has been verified.
 */
const COLLECTION = "analyses";

function tsToMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : Date.now();
}

/** Convert a raw Firestore document into the JSON-safe client/API record. */
function toRecord(id: string, data: DocumentData): AnalysisRecord {
  return {
    id,
    userId: data.userId,
    name: data.name,
    description: data.description,
    targetMarket: data.targetMarket,
    status: data.status as AnalysisStatus,
    analysis: (data.analysis ?? null) as MarketAnalysis | null,
    errorMessage: (data.errorMessage ?? null) as string | null,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
  };
}

/** Create the idea document in the "analyzing" state. Returns the new id. */
export async function createAnalysis(
  uid: string,
  input: IdeaInput,
): Promise<string> {
  const ref = adminDb().collection(COLLECTION).doc();
  await ref.set({
    userId: uid,
    name: input.name,
    // Stored lowercase to support case-insensitive prefix search.
    nameLower: input.name.toLowerCase(),
    description: input.description,
    targetMarket: input.targetMarket,
    status: "analyzing",
    analysis: null,
    // Denormalized top-level copy so history can filter by min score.
    viabilityScore: null,
    errorMessage: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function markAnalysisComplete(
  id: string,
  analysis: MarketAnalysis,
): Promise<void> {
  await adminDb().collection(COLLECTION).doc(id).update({
    status: "complete",
    analysis,
    viabilityScore: analysis.viabilityScore,
    errorMessage: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function markAnalysisError(
  id: string,
  message: string,
): Promise<void> {
  await adminDb().collection(COLLECTION).doc(id).update({
    status: "error",
    errorMessage: message,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** Apply edited fields and reset the doc to "analyzing" for a re-run. */
export async function updateIdeaForReanalysis(
  id: string,
  input: IdeaInput,
): Promise<void> {
  await adminDb().collection(COLLECTION).doc(id).update({
    name: input.name,
    nameLower: input.name.toLowerCase(),
    description: input.description,
    targetMarket: input.targetMarket,
    status: "analyzing",
    analysis: null,
    viabilityScore: null,
    errorMessage: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Fetch an analysis, returning null if it does not exist OR is not owned by the
 * caller. The ownership check here is the server-side authorization gate for
 * single-document reads and for re-analyze.
 */
export async function getAnalysisForUser(
  id: string,
  uid: string,
): Promise<AnalysisRecord | null> {
  const snap = await adminDb().collection(COLLECTION).doc(id).get();
  const data = snap.data();
  if (!data || data.userId !== uid) return null;
  return toRecord(snap.id, data);
}
