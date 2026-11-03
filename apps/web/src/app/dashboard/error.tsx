"use client";

import { useEffect } from "react";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const m = useMessages();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <DashboardShell title={m.webDashboard.error.title}>
      <ErrorState
        title={m.webDashboard.error.pageTitle}
        message={m.webDashboard.error.message}
        onRetry={reset}
      />
    </DashboardShell>
  );
}
