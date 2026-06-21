import type { AnalysisRecord } from "@/lib/analyses/schema";
import { formatDate } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { ScoreBadge } from "./score-badge";

export function HistoryItem({
  record,
  onSelect,
}: {
  record: AnalysisRecord;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/60 dark:focus-visible:bg-slate-800/60"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {record.name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {record.targetMarket} · {formatDate(record.createdAt)}
          </p>
        </div>
        {record.status === "complete" && record.analysis ? (
          <ScoreBadge score={record.analysis.viabilityScore} />
        ) : record.status === "error" ? (
          <Badge tone="red">Failed</Badge>
        ) : (
          <Badge tone="slate">Analyzing</Badge>
        )}
      </button>
    </li>
  );
}
