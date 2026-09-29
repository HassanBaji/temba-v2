"use client";

import * as React from "react";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
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
  leading?: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  approvePending?: boolean;
  rejectPending?: boolean;
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [confirmRejectOpen, setConfirmRejectOpen] = React.useState(false);
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
        <Button
          type="button"
          aria-label={`Approve ${title}'s request`}
          onClick={onApprove}
          disabled={busy}
          pending={approvePending}
          pendingLabel="Approving…"
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label={`Reject ${title}'s request`}
          onClick={() => setConfirmRejectOpen(true)}
          disabled={busy}
          pending={rejectPending}
          pendingLabel="Rejecting…"
        >
          Reject
        </Button>
      </div>
      <ConfirmDialog
        open={confirmRejectOpen}
        onOpenChange={setConfirmRejectOpen}
        title={`Reject ${title}'s request?`}
        description="They can ask again later."
        confirmLabel="Reject"
        pending={rejectPending}
        onConfirm={onReject}
      />
    </li>
  );
}
