"use client";

import { useEffect } from "react";

import { ErrorState } from "~/components/common/error-state";
import { InviteShell } from "~/components/invites/invite-shell";

export default function RootError({
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
    <InviteShell>
      <ErrorState
        headingLevel={1}
        title="This page could not be loaded"
        message="Try again, or go back to the previous page."
        onRetry={reset}
      />
    </InviteShell>
  );
}
