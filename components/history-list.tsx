"use client";

import { useEffect, useState } from "react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import type { AnalysisRecord } from "@/lib/analyses/schema";
import { fetchAnalysesPage } from "@/lib/analyses/queries";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { EmptyState } from "./empty-state";
import { HistoryFilters } from "./history-filters";
import { HistoryItem } from "./history-item";

const LOAD_ERROR =
  "Could not load your history. If this persists, deploy the Firestore rules and indexes.";

export function HistoryList({
  uid,
  refreshToken,
  onSelect,
}: {
  uid: string;
  refreshToken: number;
  onSelect: (record: AnalysisRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [minScore, setMinScore] = useState(1);
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(
    null,
  );
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load the first page whenever the filters or refresh token change. State is
  // set only inside the promise callbacks; existing results stay visible until
  // the new page resolves.
  useEffect(() => {
    let active = true;
    fetchAnalysesPage(uid, { search: debouncedSearch, minScore })
      .then((page) => {
        if (!active) return;
        setRecords(page.records);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError(LOAD_ERROR);
        setRecords([]);
        setCursor(null);
        setHasMore(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid, debouncedSearch, minScore, refreshToken]);

  // Event handler (not an effect): synchronous setState is fine here.
  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchAnalysesPage(
        uid,
        { search: debouncedSearch, minScore },
        cursor,
      );
      setRecords((prev) => [...prev, ...page.records]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch {
      setError("Could not load more results.");
    } finally {
      setLoadingMore(false);
    }
  }

  const hasFilters = debouncedSearch.trim() !== "" || minScore > 1;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
          History
        </h2>
        <HistoryFilters
          search={search}
          minScore={minScore}
          onSearchChange={setSearch}
          onMinScoreChange={setMinScore}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-slate-400" />
        </div>
      ) : error ? (
        <p className="px-4 py-8 text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : records.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No matching analyses" : "No analyses yet"}
          description={
            hasFilters
              ? "Try a different search term or score filter."
              : "Submit an idea above to see your first market analysis here."
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((record) => (
              <HistoryItem
                key={record.id}
                record={record}
                onSelect={() => onSelect(record)}
              />
            ))}
          </ul>
          {hasMore && (
            <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore && <Spinner className="h-4 w-4" />}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
