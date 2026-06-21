"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

export function AppHeader({
  email,
  onSignOut,
}: {
  email: string | null;
  onSignOut: () => Promise<void>;
}) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Startup Idea Analyzer
          </h1>
          {email && (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {email}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut && <Spinner className="h-3.5 w-3.5" />}
          Sign out
        </Button>
      </div>
    </header>
  );
}
