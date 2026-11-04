"use client";

import { useEffect } from "react";

import { ErrorState } from "~/components/common/error-state";
import { InviteShell } from "~/components/invites/invite-shell";
import { useMessages } from "~/components/locale-provider";

export default function RootError({
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
    <InviteShell>
      <ErrorState
        headingLevel={1}
        title={m.webAuth.errors.pageFailedTitle}
        message={m.webAuth.errors.pageFailedMessage}
        onRetry={reset}
      />
    </InviteShell>
  );
}
