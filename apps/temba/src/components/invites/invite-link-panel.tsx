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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Button
        type="button"
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
        className="flex-1"
        onFocus={(event) => {
          event.currentTarget.select();
        }}
      />
    </div>
  );
}
