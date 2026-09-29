import Link from "next/link";
import { DoorClosed, Hourglass, Link2Off, type LucideIcon } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { Button } from "~/components/ui/button";
import {
  inviteOutcomeAction,
  inviteOutcomeCopy,
  type InviteHostLabel,
  type InviteOutcomeKind,
} from "~/lib/invite-outcome-copy";

const OUTCOME_ICONS: Record<InviteOutcomeKind, LucideIcon> = {
  invalid: Link2Off,
  unavailable: DoorClosed,
  waiting_for_partner: Hourglass,
};

export function InviteOutcome({
  outcome,
  hostLabel,
  isSignedIn,
}: {
  outcome: InviteOutcomeKind;
  hostLabel: InviteHostLabel;
  isSignedIn: boolean;
}) {
  const { title, description } = inviteOutcomeCopy(outcome, hostLabel);
  const action = inviteOutcomeAction(isSignedIn);
  return (
    <EmptyState
      icon={OUTCOME_ICONS[outcome]}
      title={title}
      description={description}
      headingLevel={1}
      action={
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      }
    />
  );
}

export function InvitePreviewError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      title="Couldn't load this invite"
      message="Check your connection and try again."
      onRetry={onRetry}
      headingLevel={1}
    />
  );
}
