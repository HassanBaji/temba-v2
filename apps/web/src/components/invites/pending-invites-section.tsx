"use client";

import type { ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";

export type PendingInviteRow = {
  id: string;
  leading: ReactNode;
  title: string;
  invitedBy: string;
};

export function PendingInvitesSection({
  invites,
  pendingId,
  error,
  variant,
  onAccept,
  onRetry,
}: {
  invites: PendingInviteRow[] | undefined;
  pendingId: string | null;
  error?: { message: string } | null;
  variant?: "default" | "card";
  onAccept: (inviteId: string) => void;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <Section title="Invitations">
        <ErrorState
          headingLevel={3}
          className="py-6"
          title="Invitations could not be loaded"
          message={error.message}
          onRetry={onRetry}
        />
      </Section>
    );
  }

  if (!invites || invites.length === 0) {
    return null;
  }

  return (
    <Section title="Invitations">
      <RowList variant={variant}>
        {invites.map((invite) => (
          <ListRow
            key={invite.id}
            stackTrailing
            leading={invite.leading}
            title={invite.title}
            meta={`Invited by ${invite.invitedBy}`}
            trailing={
              <Button
                type="button"
                aria-label={`Accept the invite to ${invite.title}`}
                pending={pendingId === invite.id}
                pendingLabel="Accepting…"
                onClick={() => onAccept(invite.id)}
              >
                Accept
              </Button>
            }
          />
        ))}
      </RowList>
    </Section>
  );
}
