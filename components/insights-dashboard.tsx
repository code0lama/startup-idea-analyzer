"use client";

import { useEffect, useState } from "react";
import { fetchInsights } from "@/lib/analyses/queries";
import type { Insights } from "@/lib/insights";
import { SCORE_BANDS, SCORE_BAND_LABELS, type ScoreBand } from "@/lib/utils";
import { Card } from "./ui/card";
import { Spinner } from "./ui/spinner";

const BAND_BAR: Record<ScoreBand, string> = {
  low: "h-full rounded-full bg-red-500",
  medium: "h-full rounded-full bg-amber-500",
  high: "h-full rounded-full bg-green-500",
};

export function InsightsDashboard({
  uid,
  refreshToken,
}: {
  uid: string;
  refreshToken: number;
}) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    // State is set only in the async callbacks (the sanctioned effect pattern):
    // initial `loading` covers the first render; refreshes update in place.
    fetchInsights(uid)
      .then((data) => {
        if (!active) return;
        setInsights(data);
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid, refreshToken]);

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Your insights
      </h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-5 w-5 text-slate-400" />
        </div>
      ) : error ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Insights are unavailable right now.
        </p>
      ) : !insights || insights.count === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No completed analyses yet. Your average score and score breakdown will
          appear here.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-baseline gap-8">
            <div>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {insights.averageScore ?? "—"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Avg. viability
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {insights.count}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ideas analyzed
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {SCORE_BANDS.map((band) => {
              const count = insights.bands[band];
              const pct = insights.count
                ? Math.round((count / insights.count) * 100)
                : 0;
              return (
                <div key={band}>
                  <div className="mb-0.5 flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{SCORE_BAND_LABELS[band]}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={BAND_BAR[band]} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
