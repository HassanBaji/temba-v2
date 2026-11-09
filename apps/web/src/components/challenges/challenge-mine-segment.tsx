"use client";

import Link from "next/link";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { useLocale, useMessages } from "~/components/locale-provider";
import { ResultMark } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import { Surface } from "~/components/ui/surface";
import { cn } from "~/lib/utils";
import {
  challengeCardView,
  challengeProposalView,
} from "@repo/domain/challenge-card";
import {
  challengeMineGameView,
  challengeMinePostedView,
  challengeMineSections,
  challengeMineWaitingView,
} from "@repo/domain/challenge-mine";
import type { RouterOutputs } from "~/trpc/react";

import { challengeHref, ChallengeSeats } from "./challenge-card";
import { ChallengeSegmentEmpty } from "./challenge-segment-empty";

type MineItem = RouterOutputs["challenges"]["listMine"]["items"][number];

type ProposalAction = (proposal: { id: string; teamName: string }) => void;

const LIST_FRAME =
  "border-rule divide-rule bg-paper divide-y overflow-hidden rounded-card border";

const ROW =
  "hover:bg-muted/40 focus-visible:ring-ring/50 flex items-center gap-3 px-4 py-3.5 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset";

function SectionHead({ title, hint }: { title: string; hint: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-2.5">
      <h2 className="font-expanded text-title">{title}</h2>
      {hint ? <p className="text-meta text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** 1b's focus: a Proposal on your Challenge, confirmed or sent back from here. */
function WaitingCard({
  item,
  focus,
  now,
  onConfirm,
  onDecline,
}: {
  item: Extract<MineItem, { kind: "waiting" }>;
  focus: boolean;
  now: Date;
  onConfirm: ProposalAction;
  onDecline: ProposalAction;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = challengeMineWaitingView(item, now, locale);
  const muted = focus ? "text-dim" : "text-muted-foreground";
  const rule = focus ? "border-dimrule" : "border-rule";
  const tile = focus ? "inverse" : "control";
  const proposal = { id: item.proposal.id, teamName: view.proposingTeam };
  return (
    <Surface
      tone={focus ? "ink" : "paper"}
      radius="surface"
      className={cn(
        "p-4.5 flex flex-col gap-3.5",
        !focus && "border-rule border",
      )}
    >
      <div className="flex items-center justify-between gap-2.5">
        <p className={cn("text-meta", muted)}>{view.waitingLabel}</p>
        <p className={cn("text-eyebrow", muted)}>{view.expiresLine}</p>
      </div>
      <Link
        href={challengeHref(item.challengeId)}
        aria-label={m.challenge.mine.open(view.accessibilityLabel)}
        className="focus-visible:ring-ring/50 flex items-center gap-3 rounded-md outline-none focus-visible:ring-[3px]"
      >
        <EntityMonogram name={view.posterTeam} size="lg" tone={tile} />
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{view.title}</p>
          <p className={cn("text-meta mt-0.5", muted)}>{view.subtitle}</p>
        </div>
        <EntityMonogram name={view.proposingTeam} size="lg" tone={tile} />
      </Link>
      <dl
        className={cn(
          "grid grid-cols-2 gap-2 rounded-lg border px-3.5 py-3",
          rule,
        )}
      >
        <div>
          <dt className={cn("text-eyebrow", muted)}>{view.proposedLabel}</dt>
          <dd className="text-body mt-0.5 font-semibold">
            {view.proposedLine}
          </dd>
        </div>
        <div>
          <dt className={cn("text-eyebrow", muted)}>{view.venueLabel}</dt>
          <dd className="text-body mt-0.5 font-semibold">{view.venueLine}</dd>
        </div>
      </dl>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={focus ? "inverse" : "default"}
          className="h-12 flex-1 rounded-lg font-semibold"
          aria-label={m.challenge.proposal.confirmA11y(view.proposingTeam)}
          onClick={() => onConfirm(proposal)}
        >
          {m.challenge.proposal.confirm}
        </Button>
        <Button
          type="button"
          variant={focus ? "outline-inverse" : "outline"}
          className="h-12 rounded-lg font-normal"
          aria-label={m.challenge.proposal.anotherTimeA11y(view.proposingTeam)}
          onClick={() => onDecline(proposal)}
        >
          {m.challenge.proposal.anotherTime}
        </Button>
      </div>
    </Surface>
  );
}

/** Your Team's open Challenge: the line, the proposals so far, then the seats still to fill. */
function PostedCard({
  item,
  now,
}: {
  item: Extract<MineItem, { kind: "posted" }>;
  now: Date;
}) {
  const locale = useLocale();
  const input = {
    ...item.challenge,
    viewer: { ineligibleReason: item.challenge.viewer.ineligibleReason },
  };
  const view = challengeMinePostedView(input, now, locale);
  const card = challengeCardView(input, locale, now);
  return (
    <div className={LIST_FRAME}>
      <Link
        href={challengeHref(item.challengeId)}
        aria-label={view.accessibilityLabel}
        className={ROW}
      >
        <EntityMonogram
          name={item.challenge.team.displayName}
          size="lg"
          tone="control"
        />
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{view.title}</p>
          <p className="text-eyebrow text-muted-foreground mt-0.5">
            {view.line}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-meta font-semibold">{view.proposalsLine}</p>
          <p className="text-eyebrow text-muted-foreground">
            {view.daysLeftLine}
          </p>
        </div>
      </Link>
      <div className="px-4 py-3">
        <ChallengeSeats card={card} compact />
      </div>
    </div>
  );
}

/** A Proposal your Team sent, waiting on the poster. */
function PendingRow({
  item,
  now,
}: {
  item: Extract<MineItem, { kind: "pending" }>;
  now: Date;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = challengeProposalView(item.proposal, now, locale);
  return (
    <Link
      href={challengeHref(item.challengeId)}
      aria-label={m.challenge.mine.open(view.accessibilityLabel)}
      className={ROW}
    >
      <EntityMonogram
        name={item.posterTeam.displayName}
        size="lg"
        tone="control"
      />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">
          {m.challenge.proposal.waitingOn(item.posterTeam.displayName)}
        </p>
        <p className="text-eyebrow text-muted-foreground mt-0.5">
          {m.challenge.tab.mine.gameLine(view.whenLine, view.whereLine)}
        </p>
      </div>
      <p className="text-eyebrow text-muted-foreground shrink-0">
        {view.expiresLine}
      </p>
    </Link>
  );
}

/** A confirmed Challenge, now a Game: View game until it is played, then the result. */
function GameRow({
  item,
}: {
  item: Extract<MineItem, { kind: "accepted" | "played" }>;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = challengeMineGameView(item, locale);
  return (
    <Link
      href={`/dashboard/games/${item.gameId}`}
      aria-label={m.challenge.tab.mine.viewGameA11y(view.accessibilityLabel)}
      className={ROW}
    >
      <span aria-hidden="true" className="flex shrink-0 items-center">
        <EntityMonogram name={item.team.displayName} size="md" tone="control" />
        <span className="text-eyebrow text-muted-foreground mx-1.5">
          {m.challenge.tab.vs}
        </span>
        <EntityMonogram
          name={item.opponent.displayName}
          size="md"
          tone="control"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{view.title}</p>
        <p className="text-eyebrow text-muted-foreground mt-0.5">{view.line}</p>
        {view.statusLine ? (
          <p className="text-eyebrow mt-0.5 font-semibold">{view.statusLine}</p>
        ) : null}
      </div>
      {view.mark ? (
        <ResultMark variant={view.mark} decorative className="size-4.5" />
      ) : (
        <span
          aria-hidden="true"
          className="border-rule text-meta h-8.5 flex shrink-0 items-center rounded-md border px-3 font-semibold"
        >
          {m.challenge.tab.mine.viewGame}
        </span>
      )}
    </Link>
  );
}

/**
 * 1b: Proposals waiting on you first (the first on black), then your posted
 * Challenge, the Proposals you sent, and the Challenges that are now Games.
 */
export function ChallengeMineSegment({
  items,
  loading = false,
  onConfirm,
  onDecline,
  onGoToTeams,
}: {
  items: MineItem[] | undefined;
  loading?: boolean;
  onConfirm: ProposalAction;
  onDecline: ProposalAction;
  onGoToTeams: () => void;
}) {
  const locale = useLocale();
  if (loading) {
    return <ListPageSkeleton />;
  }
  if (!items || items.length === 0) {
    return <ChallengeSegmentEmpty segment="mine" onGoToTeams={onGoToTeams} />;
  }
  const now = new Date();
  return (
    <div className="space-y-6.5">
      {challengeMineSections(items, locale).map((section) => (
        <section key={section.kind}>
          {section.kind === "waiting" ? (
            <ul className="space-y-3">
              {section.items.map(({ item, focus }) =>
                item.kind === "waiting" ? (
                  <li key={item.key}>
                    <WaitingCard
                      item={item}
                      focus={focus}
                      now={now}
                      onConfirm={onConfirm}
                      onDecline={onDecline}
                    />
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <>
              <SectionHead title={section.title} hint={section.hint} />
              {section.kind === "posted" ? (
                <ul className="space-y-3">
                  {section.items.map(({ item }) =>
                    item.kind === "posted" ? (
                      <li key={item.key}>
                        <PostedCard item={item} now={now} />
                      </li>
                    ) : null,
                  )}
                </ul>
              ) : (
                <ul className={LIST_FRAME}>
                  {section.items.map(({ item }) => (
                    <li key={item.key}>
                      {item.kind === "pending" ? (
                        <PendingRow item={item} now={now} />
                      ) : item.kind === "accepted" || item.kind === "played" ? (
                        <GameRow item={item} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
