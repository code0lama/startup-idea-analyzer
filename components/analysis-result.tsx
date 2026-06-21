import type { ReactNode } from "react";
import type { AnalysisRecord } from "@/lib/analyses/schema";
import { formatDate } from "@/lib/utils";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { ScoreBadge } from "./score-badge";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
        {children}
      </div>
    </div>
  );
}

export function AnalysisResult({
  record,
  onEditReanalyze,
}: {
  record: AnalysisRecord;
  onEditReanalyze?: () => void;
}) {
  const { analysis } = record;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {record.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {record.targetMarket}
          </p>
        </div>
        {record.status === "complete" && analysis && (
          <ScoreBadge score={analysis.viabilityScore} />
        )}
      </div>

      {record.status === "analyzing" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Spinner className="h-4 w-4" /> Analysis in progress…
        </p>
      )}

      {record.status === "error" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {record.errorMessage ?? "The analysis failed. Try re-analyzing."}
        </p>
      )}

      {record.status === "complete" && analysis && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Section title="Target customer">{analysis.targetCustomer}</Section>
          <Section title="Market size estimate">
            {analysis.marketSizeEstimate}
          </Section>
          <Section title="Top competitors">
            <ul className="list-disc space-y-0.5 pl-4">
              {analysis.competitors.map((competitor, index) => (
                <li key={index}>{competitor}</li>
              ))}
            </ul>
          </Section>
          <Section title="Key risks">
            <ul className="list-disc space-y-0.5 pl-4">
              {analysis.keyRisks.map((risk, index) => (
                <li key={index}>{risk}</li>
              ))}
            </ul>
          </Section>
          <div className="sm:col-span-2">
            <Section title="Score rationale">{analysis.scoreRationale}</Section>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <span className="text-xs text-slate-400">
          {formatDate(record.createdAt)}
        </span>
        {onEditReanalyze && (
          <Button variant="secondary" size="sm" onClick={onEditReanalyze}>
            Edit & re-analyze
          </Button>
        )}
      </div>
    </Card>
  );
}
