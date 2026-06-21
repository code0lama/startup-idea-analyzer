"use client";

import { Input } from "./ui/input";

const SCORE_OPTIONS = [
  { label: "Any score", value: 1 },
  { label: "4+", value: 4 },
  { label: "6+", value: 6 },
  { label: "8+", value: 8 },
];

export function HistoryFilters({
  search,
  minScore,
  onSearchChange,
  onMinScoreChange,
}: {
  search: string;
  minScore: number;
  onSearchChange: (value: string) => void;
  onMinScoreChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by startup name…"
        aria-label="Search by startup name"
        className="sm:max-w-xs"
      />
      <select
        value={minScore}
        onChange={(e) => onMinScoreChange(Number(e.target.value))}
        aria-label="Minimum viability score"
        className="rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
      >
        {SCORE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
