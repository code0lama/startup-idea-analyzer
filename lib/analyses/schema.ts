import { z } from "zod";

/**
 * The structured market analysis the LLM must return. This schema is the single
 * source of truth: the API validates every model response against it before the
 * data is trusted or persisted, and the TypeScript type is derived from it.
 */
export const MarketAnalysisSchema = z
  .object({
    targetCustomer: z.string().min(1, "targetCustomer is required"),
    marketSizeEstimate: z.string().min(1, "marketSizeEstimate is required"),
    competitors: z
      .array(z.string().min(1))
      .min(1, "at least one competitor is required")
      .max(12),
    keyRisks: z
      .array(z.string().min(1))
      .min(1, "at least one key risk is required")
      .max(12),
    viabilityScore: z
      .number()
      .int("viabilityScore must be a whole number")
      .min(1, "viabilityScore must be between 1 and 10")
      .max(10, "viabilityScore must be between 1 and 10"),
    scoreRationale: z.string().min(1, "scoreRationale is required"),
  });
// Unknown keys are stripped by default, so extra fields from the model never
// cause a validation failure.

export type MarketAnalysis = z.infer<typeof MarketAnalysisSchema>;

/**
 * User-supplied idea fields. Used for client-side form validation AND re-validated
 * on the server, so a malicious client cannot bypass it.
 */
export const IdeaInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Startup name is required")
    .max(120, "Keep the name under 120 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(2000, "Keep the description under 2000 characters"),
  targetMarket: z
    .string()
    .trim()
    .min(1, "Target market is required")
    .max(300, "Keep the target market under 300 characters"),
});

export type IdeaInput = z.infer<typeof IdeaInputSchema>;

export const ANALYSIS_STATUSES = ["analyzing", "complete", "error"] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

/**
 * Client- and API-facing shape of a stored analysis. Firestore `Timestamp`s are
 * serialized to epoch milliseconds so the record is plain JSON.
 */
export type AnalysisRecord = {
  id: string;
  userId: string;
  name: string;
  description: string;
  targetMarket: string;
  status: AnalysisStatus;
  analysis: MarketAnalysis | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
};
