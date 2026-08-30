"use client";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function InviteLinkPanel({
  inviteUrl,
  copyPending,
  onCopy,
}: {
  inviteUrl: string | null | undefined;
  copyPending: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        className="shrink-0"
        onClick={() => {
          if (copyPending) {
            return;
          }
          onCopy();
        }}
        disabled={copyPending}
      >
        {copyPending ? "Copying…" : "Copy link"}
      </Button>
      <Input
        readOnly
        value={inviteUrl ?? ""}
        aria-label="Invite link"
        className="min-w-0 flex-1"
      />
    </div>
  );
}
