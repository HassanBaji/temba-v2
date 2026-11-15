"use client";

import type { ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { useMessages } from "~/components/locale-provider";
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
  const m = useMessages();
  const copy = m.webAuth.invites;
  if (error) {
    return (
      <Section title={copy.invitations}>
        <ErrorState
          headingLevel={3}
          className="py-6"
          title={copy.invitationsFailed}
          error={error}
          onRetry={onRetry}
        />
      </Section>
    );
  }

  if (!invites || invites.length === 0) {
    return null;
  }

  return (
    <Section title={copy.invitations}>
      <RowList variant={variant}>
        {invites.map((invite) => (
          <ListRow
            key={invite.id}
            stackTrailing
            leading={invite.leading}
            title={invite.title}
            meta={copy.invitedBy(invite.invitedBy)}
            trailing={
              <Button
                type="button"
                aria-label={copy.acceptInviteTo(invite.title)}
                pending={pendingId === invite.id}
                pendingLabel={copy.accepting}
                onClick={() => onAccept(invite.id)}
              >
                {m.invite.inbox.acceptLabel}
              </Button>
            }
          />
        ))}
      </RowList>
    </Section>
  );
}
