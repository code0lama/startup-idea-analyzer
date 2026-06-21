"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  createAnalysisRequest,
  reanalyzeRequest,
} from "@/lib/analyses/client-api";
import type { AnalysisRecord, IdeaInput } from "@/lib/analyses/schema";
import { AppHeader } from "@/components/app-header";
import { AnalysisForm } from "@/components/analysis-form";
import { AnalysisResult } from "@/components/analysis-result";
import { InsightsDashboard } from "@/components/insights-dashboard";
import { HistoryList } from "@/components/history-list";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function HomePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const [currentRecord, setCurrentRecord] = useState<AnalysisRecord | null>(
    null,
  );
  const [editing, setEditing] = useState<AnalysisRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Bumped after a successful create/re-analyze to refresh history + insights.
  const [refreshToken, setRefreshToken] = useState(0);

  // Signed out → go to login.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function handleCreate(input: IdeaInput) {
    setPending(true);
    setFormError(null);
    try {
      const record = await createAnalysisRequest(input);
      setCurrentRecord(record);
      setRefreshToken((token) => token + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function handleReanalyze(input: IdeaInput) {
    if (!editing) return;
    setPending(true);
    setFormError(null);
    try {
      const record = await reanalyzeRequest(editing.id, input);
      setCurrentRecord(record);
      setEditing(null);
      setRefreshToken((token) => token + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-slate-400" />
      </div>
    );
  }

  const isEditing = editing !== null;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} onSignOut={signOut} />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {isEditing ? "Edit & re-analyze" : "Analyze a startup idea"}
              </h2>
              {isEditing && editing ? (
                <AnalysisForm
                  key={editing.id}
                  initialValues={{
                    name: editing.name,
                    description: editing.description,
                    targetMarket: editing.targetMarket,
                  }}
                  submitLabel="Re-analyze"
                  pending={pending}
                  error={formError}
                  onSubmit={handleReanalyze}
                  onCancel={() => {
                    setEditing(null);
                    setFormError(null);
                  }}
                />
              ) : (
                <AnalysisForm
                  key="create"
                  pending={pending}
                  error={formError}
                  onSubmit={handleCreate}
                />
              )}
            </Card>

            {currentRecord && (
              <AnalysisResult
                record={currentRecord}
                onEditReanalyze={() => {
                  setEditing(currentRecord);
                  setFormError(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </div>

          <div className="lg:col-span-1">
            <InsightsDashboard uid={user.uid} refreshToken={refreshToken} />
          </div>
        </div>

        <div className="mt-6">
          <HistoryList
            uid={user.uid}
            refreshToken={refreshToken}
            onSelect={(record) => {
              setCurrentRecord(record);
              setEditing(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      </main>
    </div>
  );
}
