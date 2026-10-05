"use client";

import { useEffect } from "react";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <DashboardShell title="Error">
      <ErrorState
        title="This page could not be loaded"
        message="Try again, or use the navigation to open another page."
        onRetry={reset}
      />
    </DashboardShell>
  );
}
