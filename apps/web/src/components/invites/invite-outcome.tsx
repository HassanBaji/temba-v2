"use client";

import Link from "next/link";
import { DoorClosed, Hourglass, Link2Off, type LucideIcon } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  inviteOutcomeAction,
  inviteOutcomeCopy,
  type InviteHostLabel,
  type InviteOutcomeKind,
} from "@repo/domain/invite-outcome-copy";

const OUTCOME_HREFS = { home: "/dashboard", "sign-in": "/login" } as const;

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
  const locale = useLocale();
  const { title, description } = inviteOutcomeCopy(outcome, hostLabel, locale);
  const action = inviteOutcomeAction(isSignedIn, locale);
  return (
    <EmptyState
      icon={OUTCOME_ICONS[outcome]}
      title={title}
      description={description}
      headingLevel={1}
      action={
        <Button asChild>
          <Link href={OUTCOME_HREFS[action.target]}>{action.label}</Link>
        </Button>
      }
    />
  );
}

export function InvitePreviewError({ onRetry }: { onRetry: () => void }) {
  const m = useMessages();
  return (
    <ErrorState
      title={m.webAuth.invites.previewFailed}
      message={m.webAuth.invites.checkConnection}
      onRetry={onRetry}
      headingLevel={1}
    />
  );
}
