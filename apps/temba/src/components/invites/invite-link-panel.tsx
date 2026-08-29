"use client";

import { Button } from "~/components/ui/button";

export function InviteLinkPanel({
  description = "Each copy mints a new 6-hour token. Older copied URLs stay live until each expires. There is no rotate or revoke.",
  inviteUrl,
  copyPending,
  onCopy,
}: {
  description?: string;
  inviteUrl: string | null | undefined;
  copyPending: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-title font-semibold">Invite link</h3>
        <p className="text-body text-muted-foreground mt-1">{description}</p>
      </div>
      {inviteUrl ? (
        <p className="text-meta text-muted-foreground break-all">
          Newest: {inviteUrl}
        </p>
      ) : (
        <p className="text-body text-muted-foreground">
          No live Invite link. Copy to mint one.
        </p>
      )}
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
        {copyPending ? "Copying…" : "Copy Invite link"}
      </Button>
    </section>
  );
}
