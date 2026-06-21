import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  Timestamp,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { AnalysisRecord, AnalysisStatus, MarketAnalysis } from "./schema";
import { planQuery, type QueryInput } from "./query-plan";
import { computeInsights, type Insights } from "@/lib/insights";

/**
 * Read-only history queries against Firestore (client SDK). Security rules scope
 * every read to the owner; each query also constrains `userId` so list reads are
 * permitted and only ever touch the caller's own documents.
 */
const COLLECTION = "analyses";
export const PAGE_SIZE = 6;

// High code point used as the upper bound for a "starts-with" prefix range.
const PREFIX_END = "\uf8ff";

export type AnalysesPage = {
  records: AnalysisRecord[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

function tsToMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

function toRecord(doc: QueryDocumentSnapshot<DocumentData>): AnalysisRecord {
  const data = doc.data();
  return {
    id: doc.id,
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

/**
 * Fetch one page of history. Fetches PAGE_SIZE + 1 rows to detect `hasMore`
 * without a second query, and returns the last document as a cursor for
 * "load more".
 */
export async function fetchAnalysesPage(
  uid: string,
  input: QueryInput,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
): Promise<AnalysesPage> {
  const plan = planQuery(input);
  const constraints: QueryConstraint[] = [where("userId", "==", uid)];

  if (plan.kind === "score") {
    constraints.push(
      where("viabilityScore", ">=", plan.minScore),
      orderBy("viabilityScore", "desc"),
      orderBy("createdAt", "desc"),
    );
  } else if (plan.kind === "search" || plan.kind === "search-score") {
    // Case-insensitive prefix match on the stored lowercase name.
    constraints.push(
      where("nameLower", ">=", plan.term),
      where("nameLower", "<=", plan.term + PREFIX_END),
      orderBy("nameLower", "asc"),
      orderBy("createdAt", "desc"),
    );
  } else {
    constraints.push(orderBy("createdAt", "desc"));
  }

  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(PAGE_SIZE + 1));

  const snap = await getDocs(query(collection(getFirebaseDb(), COLLECTION), ...constraints));
  const docs = snap.docs;
  const hasMore = docs.length > PAGE_SIZE;
  const pageDocs = docs.slice(0, PAGE_SIZE);

  let records = pageDocs.map(toRecord);
  // Search + score cannot both be range filters in Firestore, so when both are
  // active the score filter is applied client-side over the fetched page.
  if (plan.kind === "search-score") {
    records = records.filter(
      (r) => (r.analysis?.viabilityScore ?? -1) >= plan.minScore,
    );
  }

  const cursorOut = pageDocs.length ? pageDocs[pageDocs.length - 1] : null;
  return { records, cursor: cursorOut, hasMore };
}

/**
 * Fetch the signed-in user's completed-analysis scores and summarize them.
 * Uses a single equality filter (auto-indexed); aggregating all analyses is
 * inherent to a dashboard. For very large datasets a maintained summary doc or
 * Firestore aggregation queries would be the next step.
 */
export async function fetchInsights(uid: string): Promise<Insights> {
  const snap = await getDocs(
    query(collection(getFirebaseDb(), COLLECTION), where("userId", "==", uid)),
  );
  const scores = snap.docs
    .map((doc) => doc.data().viabilityScore)
    .filter((value): value is number => typeof value === "number");
  return computeInsights(scores);
}
