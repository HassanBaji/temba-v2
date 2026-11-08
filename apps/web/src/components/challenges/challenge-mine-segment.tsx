"use client";

import Link from "next/link";

import { Section } from "~/components/layout/section";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Surface } from "~/components/ui/surface";
import { cn } from "~/lib/utils";
import {
  challengeCardView,
  challengeProposalView,
} from "@repo/domain/challenge-card";
import {
  challengeMineScoreLine,
  challengeMineSections,
} from "@repo/domain/challenge-mine";
import { formatGameStart } from "@repo/domain/format-game-start";
import type { RouterOutputs } from "~/trpc/react";

import { ChallengeCard } from "./challenge-card";
import { ProposalLines } from "./challenge-proposals";
import { ChallengeSegmentEmpty } from "./challenge-segment-empty";

type MineItem = RouterOutputs["challenges"]["listMine"]["items"][number];

function challengeHref(challengeId: string) {
  return `/dashboard/challenges/${challengeId}`;
}

type ProposalAction = (proposal: { id: string; teamName: string }) => void;

function MineRow({
  item,
  focus,
  now,
  onConfirm,
  onDecline,
}: {
  item: MineItem;
  focus: boolean;
  now: Date;
  onConfirm: ProposalAction;
  onDecline: ProposalAction;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (item.kind === "posted") {
    return (
      <ChallengeCard
        card={challengeCardView(
          {
            ...item.challenge,
            viewer: {
              ineligibleReason: item.challenge.viewer.ineligibleReason,
            },
          },
          locale,
          now,
        )}
      />
    );
  }
  if (item.kind === "waiting" || item.kind === "pending") {
    const view = challengeProposalView(item.proposal, now, locale);
    const lead =
      item.kind === "pending"
        ? m.challenge.proposal.waitingOn(item.posterTeam.displayName)
        : m.challenge.mine.proposedFor(item.posterTeam.displayName);
    return (
      <Surface
        tone={focus ? "ink" : "paper"}
        radius="surface"
        className={cn("space-y-4 p-5", !focus && "border-border border")}
      >
        <Link
          href={challengeHref(item.challengeId)}
          aria-label={m.challenge.mine.open(view.accessibilityLabel)}
          className="block rounded-md"
        >
          <ProposalLines view={view} lead={lead} focus={focus} />
        </Link>
        {item.kind === "waiting" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={focus ? "inverse" : "default"}
              aria-label={m.challenge.proposal.confirmA11y(view.title)}
              onClick={() =>
                onConfirm({ id: item.proposal.id, teamName: view.title })
              }
            >
              {m.challenge.proposal.confirm}
            </Button>
            <Button
              type="button"
              variant={focus ? "outline-inverse" : "outline"}
              aria-label={m.challenge.proposal.anotherTimeA11y(view.title)}
              onClick={() =>
                onDecline({ id: item.proposal.id, teamName: view.title })
              }
            >
              {m.challenge.proposal.anotherTime}
            </Button>
          </div>
        ) : null}
      </Surface>
    );
  }
  const title = m.challenge.mine.acceptedLine(
    item.team.displayName,
    item.opponent.displayName,
  );
  const scoreLine =
    item.kind === "played" ? challengeMineScoreLine(item.sets, locale) : null;
  return (
    <Link
      href={challengeHref(item.challengeId)}
      aria-label={m.challenge.mine.open(title)}
      className="border-border hover:bg-muted/40 block space-y-1 rounded-lg border p-5 transition-colors"
    >
      <p className="text-body font-semibold">{title}</p>
      <p className="text-meta text-muted-foreground">
        {formatGameStart(item.startsAt, locale)}
      </p>
      {scoreLine ? <p className="text-body font-medium">{scoreLine}</p> : null}
      {item.cancelled ? (
        <p className="text-meta font-semibold">{m.challenge.mine.cancelled}</p>
      ) : item.nameYourSquad ? (
        <p className="text-meta font-semibold">
          {m.challenge.mine.nameYourSquad}
        </p>
      ) : null}
    </Link>
  );
}

/**
 * 1b: Proposals waiting on you first (the first on black), then your
 * Challenges, your pending Proposals, accepted and played.
 */
export function ChallengeMineSegment({
  items,
  onConfirm,
  onDecline,
  onGoToTeams,
}: {
  items: MineItem[] | undefined;
  onConfirm: ProposalAction;
  onDecline: ProposalAction;
  onGoToTeams: () => void;
}) {
  const locale = useLocale();
  if (!items || items.length === 0) {
    return <ChallengeSegmentEmpty segment="mine" onGoToTeams={onGoToTeams} />;
  }
  const now = new Date();
  return (
    <div className="space-y-6">
      {challengeMineSections(items, locale).map((section) => (
        <Section key={section.kind} title={section.title}>
          <ul className="space-y-3">
            {section.items.map(({ item, focus }) => (
              <li key={item.key}>
                <MineRow
                  item={item}
                  focus={focus}
                  now={now}
                  onConfirm={onConfirm}
                  onDecline={onDecline}
                />
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </div>
  );
}
