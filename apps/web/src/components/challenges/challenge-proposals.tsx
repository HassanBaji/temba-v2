"use client";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";
import type { ChallengeProposalView } from "@repo/domain/challenge-card";
import {
  challengeProposalCard,
  challengeProposalFootnote,
  type ChallengeProposalCardView,
} from "@repo/domain/challenge-detail";
import { initials } from "@repo/domain/initials";
import type { RouterOutputs } from "~/trpc/react";

import { ChallengeFootnote, CrestTile } from "./challenge-detail-parts";

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

function SplitButton({
  label,
  accessibilityLabel,
  primary,
  pending,
  onClick,
}: {
  label: string;
  accessibilityLabel?: string;
  primary: boolean;
  pending?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={accessibilityLabel}
      aria-busy={pending ? true : undefined}
      disabled={pending}
      onClick={onClick}
      className={cn(
        "text-meta focus-visible:ring-ring/50 hover:bg-wash flex h-11 items-center justify-center px-2 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset disabled:opacity-50",
        primary ? "font-semibold" : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

/**
 * One pending Proposal as the detail draws it: a marker, who and the clock,
 * Time and Venue side by side, then two actions split by a hairline.
 */
function ProposalCard({
  view,
  marker,
  focus,
  actions,
}: {
  view: ChallengeProposalCardView;
  marker: React.ReactNode;
  focus: boolean;
  actions: React.ReactNode;
}) {
  return (
    <article
      aria-label={view.accessibilityLabel}
      className={cn(
        "rounded-card bg-paper overflow-hidden border",
        focus ? "border-ink" : "border-rule",
      )}
    >
      <div className="flex items-center gap-3 px-[18px] py-3.5">
        {marker}
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{view.title}</p>
          <p className="text-eyebrow text-muted-foreground">{view.subline}</p>
        </div>
      </div>
      <dl className="border-rule grid grid-cols-2 gap-2 border-t px-[18px] py-3">
        <div>
          <dt className="text-muted-foreground text-[11px] leading-4">
            {view.timeLabel}
          </dt>
          <dd className="text-body mt-0.5 font-semibold">{view.timeValue}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-[11px] leading-4">
            {view.venueLabel}
          </dt>
          <dd className="text-body mt-0.5 font-semibold">{view.venueValue}</dd>
        </div>
        {view.priceValue ? (
          <div className="col-span-2">
            <dt className="text-muted-foreground text-[11px] leading-4">
              {view.priceLabel}
            </dt>
            <dd className="text-body mt-0.5 font-semibold">
              {view.priceValue}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="border-rule divide-rule grid grid-cols-2 divide-x border-t rtl:divide-x-reverse">
        {actions}
      </div>
    </article>
  );
}

/** 2c: the viewer's Team's pending Proposal, to change or withdraw. */
export function ViewerProposals({
  proposals,
  posterTeamName,
  sport,
  withdrawingId,
  onChange,
  onWithdraw,
}: {
  proposals: readonly Proposal[];
  posterTeamName: string;
  sport: string;
  withdrawingId: string | null;
  onChange: (proposal: Proposal) => void;
  onWithdraw: (proposal: Proposal) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (proposals.length === 0) {
    return null;
  }
  const copy = m.challenge.detailScreen.proposal;
  const now = new Date();
  return (
    <section aria-label={m.challenge.proposal.pendingTitle}>
      <ul className="space-y-3">
        {proposals.map((proposal) => (
          <li key={proposal.id}>
            <ProposalCard
              focus
              view={challengeProposalCard(
                proposal,
                { side: "proposer", posterName: posterTeamName },
                now,
                locale,
              )}
              marker={<Hatch className="size-9 shrink-0 rounded-full" />}
              actions={
                <>
                  <SplitButton
                    primary
                    label={copy.change}
                    onClick={() => onChange(proposal)}
                  />
                  <SplitButton
                    primary={false}
                    label={copy.withdraw}
                    pending={withdrawingId === proposal.id}
                    onClick={() => onWithdraw(proposal)}
                  />
                </>
              }
            />
          </li>
        ))}
      </ul>
      <ChallengeFootnote>
        {challengeProposalFootnote(sport, locale)}
      </ChallengeFootnote>
    </section>
  );
}

/**
 * The posting Team's queue: each pending Proposal, oldest first, with
 * Confirm and Another time. The oldest carries the ink edge.
 */
export function ProposalQueue({
  proposals,
  posterTeamName,
  onConfirm,
  onDecline,
}: {
  proposals: readonly Proposal[];
  posterTeamName: string;
  onConfirm: (proposal: Proposal) => void;
  onDecline: (proposal: Proposal) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.challenge.detailScreen.queue;
  const now = new Date();
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-meta text-muted-foreground">{copy.title}</h2>
        {proposals.length > 0 ? (
          <p className="text-eyebrow text-muted-foreground text-end">
            {copy.hint}
          </p>
        ) : null}
      </div>
      {proposals.length === 0 ? (
        <p className="border-rule rounded-card text-meta text-muted-foreground border px-[18px] py-4">
          {copy.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {proposals.map((proposal, index) => (
            <li key={proposal.id}>
              <ProposalCard
                focus={index === 0}
                view={challengeProposalCard(
                  proposal,
                  { side: "poster", posterName: posterTeamName },
                  now,
                  locale,
                )}
                marker={
                  <CrestTile
                    size="sm"
                    initials={initials(proposal.team.displayName)}
                  />
                }
                actions={
                  <>
                    <SplitButton
                      primary
                      label={copy.confirm}
                      accessibilityLabel={m.challenge.proposal.confirmA11y(
                        proposal.team.displayName,
                      )}
                      onClick={() => onConfirm(proposal)}
                    />
                    <SplitButton
                      primary={false}
                      label={copy.another}
                      accessibilityLabel={m.challenge.proposal.anotherTimeA11y(
                        proposal.team.displayName,
                      )}
                      onClick={() => onDecline(proposal)}
                    />
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
