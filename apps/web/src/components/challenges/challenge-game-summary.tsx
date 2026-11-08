"use client";

import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Surface } from "~/components/ui/surface";
import { cn } from "~/lib/utils";
import { challengeGameView } from "@repo/domain/challenge-card";
import type { RouterOutputs } from "~/trpc/react";

type ChallengeGame = NonNullable<RouterOutputs["challenges"]["byId"]["game"]>;

function Row({
  label,
  lines,
  muted,
}: {
  label: string;
  lines: string[];
  muted: string;
}) {
  return (
    <div className="space-y-0.5 py-3">
      <dt className={cn("text-eyebrow font-mono uppercase", muted)}>{label}</dt>
      {lines.map((line) => (
        <dd key={line} className="text-body">
          {line}
        </dd>
      ))}
    </div>
  );
}

/** 2d: the confirmed state: the Challenge Game, its place and cost, who decided, and each squad. */
export function ChallengeGameSummary({ game }: { game: ChallengeGame }) {
  const m = useMessages();
  const locale = useLocale();
  const view = challengeGameView(game, locale);
  const copy = m.challenge.detail.game;
  const [home, away] = game.sides;
  const ink = !game.cancelled && new Date(game.startsAt).getTime() > Date.now();
  const muted = ink ? "text-dim" : "text-muted-foreground";
  return (
    <Surface
      tone={ink ? "ink" : "paper"}
      radius="surface"
      className={cn("space-y-2 p-5", !ink && "border-border border")}
    >
      <p className="text-eyebrow font-mono uppercase">{copy.title}</p>
      <p className="text-title font-semibold">
        {m.challenge.mine.acceptedLine(
          home?.displayName ?? m.team.memberFallback,
          away?.displayName ?? m.team.memberFallback,
        )}
      </p>
      {view.cancelledLine ? (
        <p role="status" className="text-body font-semibold">
          {view.cancelledLine}
        </p>
      ) : null}
      <dl className={cn("divide-y", ink ? "divide-dimrule" : "divide-border")}>
        <Row label={copy.when} lines={[view.whenLine]} muted={muted} />
        <Row
          label={view.placeLabel}
          lines={[view.placeLine, view.bookLine]}
          muted={muted}
        />
        <Row label={copy.cost} lines={[view.costLine]} muted={muted} />
        {view.squads.length > 0 ? (
          <Row
            label={copy.squads}
            lines={view.squads.map(
              (squad) =>
                `${squad.title}${m.group.metaSeparator}${squad.counter}`,
            )}
            muted={muted}
          />
        ) : null}
      </dl>
      <p className={cn("text-meta", muted)}>{view.decidedLine}</p>
      <Button asChild variant={ink ? "inverse" : "default"}>
        <Link href={`/dashboard/games/${game.id}`}>{copy.open}</Link>
      </Button>
    </Surface>
  );
}
