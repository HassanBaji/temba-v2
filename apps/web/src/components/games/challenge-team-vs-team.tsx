"use client";

import {
  challengeTeamVsTeamView,
  type ChallengeTeamSide,
} from "@repo/domain/challenge-game-details";
import type { SurfaceTone } from "@repo/domain/surface-tone";

import { useLocale } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

type TeamView = ReturnType<typeof challengeTeamVsTeamView>["home"];

function TeamSide({
  team,
  end,
  tone,
}: {
  team: TeamView;
  end: boolean;
  tone: SurfaceTone;
}) {
  const ink = tone === "ink";
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        end && "flex-row-reverse text-end",
      )}
    >
      <span
        className={cn(
          "font-expanded flex size-9 shrink-0 items-center justify-center rounded-md text-[12px] tracking-[-0.02em]",
          ink
            ? "bg-focus-control text-on-focus-control"
            : "bg-control text-on-control",
        )}
      >
        {team.initials}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[14px] font-semibold leading-tight">
          {team.name}
        </p>
        <p
          className={cn(
            "text-[11px] tabular-nums leading-snug",
            ink ? "text-dim" : "text-muted-foreground",
          )}
        >
          {team.recordLine}
        </p>
      </div>
    </div>
  );
}

/**
 * Both Teams of a Challenge Game on one row: crest, name and record (with
 * "you captain" on the viewer's own Team), head-to-head or "first meeting"
 * between them, the second Team mirrored.
 */
export function ChallengeTeamVsTeam({
  sides,
  sport,
  tone = "paper",
}: {
  sides: readonly ChallengeTeamSide[];
  sport: string | null;
  tone?: SurfaceTone;
}) {
  const locale = useLocale();
  const view = challengeTeamVsTeamView(sides, sport, locale);
  return (
    <section
      aria-label={view.accessibilityLabel}
      className="flex items-center justify-between gap-3"
    >
      <div aria-hidden="true" className="contents">
        <TeamSide team={view.home} end={false} tone={tone} />
        <p
          className={cn(
            "shrink-0 text-[12px]",
            tone === "ink" ? "text-dim" : "text-muted-foreground",
          )}
        >
          {view.middleLine}
        </p>
        <TeamSide team={view.away} end tone={tone} />
      </div>
    </section>
  );
}
