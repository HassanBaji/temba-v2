"use client";

import {
  challengeTeamVsTeamView,
  type ChallengeTeamSide,
} from "@repo/domain/challenge-game-details";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

type TeamView = ReturnType<typeof challengeTeamVsTeamView>["home"];

function TeamColumn({
  team,
  end,
  muted,
}: {
  team: TeamView;
  end: boolean;
  muted: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1.5",
        end ? "items-end text-end" : "items-start",
      )}
    >
      <EntityMonogram name={team.name} size="lg" />
      <p className="line-clamp-2 font-semibold">{team.name}</p>
      <p className={cn("text-meta font-mono tabular-nums", muted)}>
        {`${team.recordLabel} ${team.recordValue}`}
      </p>
    </div>
  );
}

/** Both Teams of a Challenge Game: crest, name and record, then head-to-head or "First meeting". */
export function ChallengeTeamVsTeam({
  sides,
  sport,
  muted = "text-muted-foreground",
}: {
  sides: readonly ChallengeTeamSide[];
  sport: string | null;
  muted?: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = challengeTeamVsTeamView(sides, sport, locale);
  return (
    <section aria-label={view.accessibilityLabel} className="space-y-2.5">
      <div aria-hidden="true" className="flex items-center gap-3">
        <TeamColumn team={view.home} end={false} muted={muted} />
        <span className={cn("text-title", muted)}>
          {m.challenge.gameDetails.versus}
        </span>
        <TeamColumn team={view.away} end muted={muted} />
      </div>
      <p aria-hidden="true" className={cn("text-meta text-center", muted)}>
        {view.headToHeadLine}
      </p>
    </section>
  );
}
