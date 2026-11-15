"use client";

import { initials } from "@repo/domain/initials";
import { shortPlayerName } from "@repo/domain/player-name";

import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

export type TournamentRoundsData = RouterOutputs["games"]["tournamentRounds"];
export type RoundsTeam = TournamentRoundsData["teams"][number];
export type RoundsRound = TournamentRoundsData["rounds"][number];
export type RoundsMatch = RoundsRound["matches"][number];

export const ROUND_CARD = "border-rule overflow-hidden rounded-card border";

export function teamShortName(team: RoundsTeam | undefined) {
  if (!team || team.members.length === 0) {
    return "";
  }
  return team.members.map((member) => shortPlayerName(member.name)).join(" & ");
}

export function teamFullName(team: RoundsTeam | undefined) {
  return team?.members.map((member) => member.name).join(" / ") ?? "";
}

/** A team's initials tile: solid for the viewer's team, outlined otherwise. */
export function InitialsMark({
  name,
  isViewer,
  muted = false,
  className,
}: {
  name: string;
  isViewer: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-eyebrow inline-flex size-9 shrink-0 items-center justify-center rounded-md border font-semibold",
        isViewer
          ? "bg-ink text-paper border-ink"
          : "border-rule bg-paper text-ink",
        muted && "text-muted-foreground",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function TeamMark({
  team,
  ...props
}: {
  team: RoundsTeam | undefined;
  isViewer: boolean;
  muted?: boolean;
  className?: string;
}) {
  return <InitialsMark name={team?.members[0]?.name ?? ""} {...props} />;
}

/** Both names on their own lines, never one name cut short with ellipses. */
export function TeamNames({
  team,
  viewerUserId,
  muted = false,
  className,
}: {
  team: RoundsTeam | undefined;
  viewerUserId: string | null;
  muted?: boolean;
  className?: string;
}) {
  const m = useMessages();
  return (
    <span
      className={cn(
        "text-meta flex min-w-0 flex-col font-semibold leading-tight",
        muted && "text-muted-foreground font-normal",
        className,
      )}
    >
      {(team?.members ?? []).map((member) => (
        <span key={member.id} dir="auto" className="truncate">
          {member.name}
          {member.id === viewerUserId ? (
            <span className="text-muted-foreground font-normal">
              {" "}
              {m.tournamentRounds.score.you}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

export function RoundCode({
  roundNumber,
  muted = false,
}: {
  roundNumber: number;
  muted?: boolean;
}) {
  const m = useMessages();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-expanded w-10 shrink-0 text-[22px] leading-none",
        muted && "text-muted-foreground",
      )}
    >
      {m.tournamentRounds.round.code(roundNumber)}
    </span>
  );
}

/** One cell per Round: solid once played, a line under the Round on court. */
export function RoundProgressStrip({
  rounds,
  currentRoundNumber,
}: {
  rounds: readonly Pick<RoundsRound, "roundNumber" | "state">[];
  currentRoundNumber: number | null;
}) {
  const m = useMessages();
  const played = rounds.filter((round) => round.state === "played").length;
  return (
    <div>
      <div className="text-meta flex items-baseline justify-between gap-3">
        <p>
          {currentRoundNumber != null ? (
            <>
              <span className="font-semibold">
                {m.tournamentRounds.progress.roundOf(
                  currentRoundNumber,
                  rounds.length,
                )}
              </span>{" "}
              <span className="text-muted-foreground">
                {m.tournamentRounds.progress.onCourt}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {m.tournamentRounds.progress.notStarted}
            </span>
          )}
        </p>
        <p className="text-muted-foreground">
          {m.tournamentRounds.progress.played(played)}
        </p>
      </div>
      <div
        role="img"
        aria-label={m.tournamentRounds.progress.stripLabel(
          played,
          rounds.length,
        )}
        className="mt-2 flex gap-1"
      >
        {rounds.map((round) => (
          <span
            key={round.roundNumber}
            className={cn(
              "h-1.5 flex-1 rounded-full border",
              round.state === "played"
                ? "bg-ink border-ink"
                : round.roundNumber === currentRoundNumber
                  ? "border-ink bg-paper border-2"
                  : "border-rule bg-paper",
            )}
          />
        ))}
      </div>
    </div>
  );
}
