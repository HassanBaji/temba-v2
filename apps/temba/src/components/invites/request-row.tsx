"use client";

import type { ReactNode } from "react";

import { Button } from "~/components/ui/button";

export function RequestRow({
  leading,
  title,
  meta,
  approvePending = false,
  rejectPending = false,
  disabled = false,
  onApprove,
  onReject,
}: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  approvePending?: boolean;
  rejectPending?: boolean;
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const busy = disabled || approvePending || rejectPending;

  return (
    <li className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <p className="text-lead truncate font-semibold">{title}</p>
          {meta ? (
            <p className="text-meta text-muted-foreground truncate">{meta}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onApprove} disabled={busy}>
          {approvePending ? "Approving…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onReject}
          disabled={busy}
        >
          {rejectPending ? "Rejecting…" : "Reject"}
        </Button>
      </div>
    </li>
  );
}
