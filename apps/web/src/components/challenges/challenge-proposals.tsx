"use client";

import { Section } from "~/components/layout/section";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Surface } from "~/components/ui/surface";
import { cn } from "~/lib/utils";
import {
  challengeProposalView,
  type ChallengeProposalView,
} from "@repo/domain/challenge-card";
import type { RouterOutputs } from "~/trpc/react";

type Proposal = RouterOutputs["challenges"]["byId"]["proposalQueue"][number];

/** A Proposal's time, place, price and clock. */
export function ProposalLines({
  view,
  lead,
  focus = false,
}: {
  view: ChallengeProposalView;
  lead?: string | null;
  focus?: boolean;
}) {
  const muted = focus ? "text-dim" : "text-muted-foreground";
  return (
    <div className="space-y-1">
      <p className="text-lead font-semibold">{view.title}</p>
      {lead ? <p className="text-meta">{lead}</p> : null}
      <p className="text-body">{view.whenLine}</p>
      <p className={cn("text-meta", muted)}>{view.whereLine}</p>
      {view.priceLine ? (
        <p className={cn("text-meta", muted)}>{view.priceLine}</p>
      ) : null}
      <p className={cn("text-meta", muted)}>{view.expiresLine}</p>
    </div>
  );
}

/** 2c: the viewer's Team's pending Proposal, to change or withdraw. */
export function ViewerProposals({
  proposals,
  posterTeamName,
  focus,
  onChange,
  onWithdraw,
}: {
  proposals: readonly Proposal[];
  posterTeamName: string;
  focus: boolean;
  onChange: (proposal: Proposal) => void;
  onWithdraw: (proposal: Proposal) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (proposals.length === 0) {
    return null;
  }
  const now = new Date();
  return (
    <Section title={m.challenge.proposal.pendingTitle}>
      <ul className="space-y-3">
        {proposals.map((proposal, index) => {
          const ink = focus && index === 0;
          return (
            <li key={proposal.id}>
              <Surface
                tone={ink ? "ink" : "paper"}
                radius="surface"
                className={cn("space-y-4 p-5", !ink && "border-border border")}
              >
                <ProposalLines
                  view={challengeProposalView(proposal, now, locale)}
                  lead={m.challenge.proposal.waitingOn(posterTeamName)}
                  focus={ink}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={ink ? "inverse" : "default"}
                    onClick={() => onChange(proposal)}
                  >
                    {m.challenge.proposal.change}
                  </Button>
                  <Button
                    type="button"
                    variant={ink ? "outline-inverse" : "outline"}
                    onClick={() => onWithdraw(proposal)}
                  >
                    {m.challenge.proposal.withdraw}
                  </Button>
                </div>
              </Surface>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/** The posting Team's queue: each pending Proposal, oldest first, with Another time. */
export function ProposalQueue({
  proposals,
  onDecline,
}: {
  proposals: readonly Proposal[];
  onDecline: (proposal: Proposal) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (proposals.length === 0) {
    return null;
  }
  const now = new Date();
  return (
    <Section title={m.challenge.proposal.queueTitle}>
      <ul className="space-y-3">
        {proposals.map((proposal, index) => {
          const view = challengeProposalView(proposal, now, locale);
          const ink = index === 0;
          return (
            <li key={proposal.id}>
              <Surface
                tone={ink ? "ink" : "paper"}
                radius="surface"
                className={cn("space-y-4 p-5", !ink && "border-border border")}
              >
                <ProposalLines view={view} lead={view.sentLine} focus={ink} />
                <Button
                  type="button"
                  variant={ink ? "outline-inverse" : "outline"}
                  aria-label={m.challenge.proposal.anotherTimeA11y(view.title)}
                  onClick={() => onDecline(proposal)}
                >
                  {m.challenge.proposal.anotherTime}
                </Button>
              </Surface>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
