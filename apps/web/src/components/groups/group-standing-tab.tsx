import Link from "next/link";
import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { LevelCell } from "~/components/temba/level-cell";
import { Button } from "~/components/ui/button";
import { groupStandingRecordLabel } from "@repo/domain/group-home-chrome";
import { groupStandingState } from "@repo/domain/group-join";
import type { LevelBand } from "@repo/domain/level-bands";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { cardFrame } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

type StandingEntry = {
  userId: string;
  name: string | null;
  totalSetsWon: number;
  totalPointsWon: number;
  totalGamesPlayed: number;
  position: number;
  isViewer: boolean;
  wins: number;
  losses: number;
  levelBand: LevelBand | null;
  levelProvisional: boolean;
};

/**
 * Column geometry from design 06a: 26px position, flexible Player, 54px W-L,
 * 56px Level. The outer columns carry the card's 20px gutter inside their
 * width, so `table-fixed` lands the rule-to-rule widths the design draws.
 */
const COL_POSITION = "w-[46px] pl-5 pr-0 text-left";
const COL_PLAYER = "px-0 text-left";
const COL_RECORD = "w-[54px] px-0 text-right";
const COL_LEVEL = "w-[76px] pl-0 pr-5 text-right";
const HEAD_CELL = "py-3.5 font-normal";
const BODY_CELL = "py-4";

function StandingTable({
  leaderboard,
  linkToPlayers,
}: {
  leaderboard: StandingEntry[];
  linkToPlayers: boolean;
}) {
  return (
    <div className={cardFrame}>
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-rule text-muted-foreground text-eyebrow border-b">
            <th scope="col" className={cn(COL_POSITION, HEAD_CELL)}>
              #
            </th>
            <th scope="col" className={cn(COL_PLAYER, HEAD_CELL)}>
              Player
            </th>
            <th scope="col" className={cn(COL_RECORD, HEAD_CELL)}>
              W-L
            </th>
            <th scope="col" className={cn(COL_LEVEL, HEAD_CELL)}>
              Level
            </th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry) => (
            <tr
              key={entry.userId}
              className={cn(
                "border-rule border-t",
                entry.isViewer && "bg-ink text-paper",
                linkToPlayers && "relative",
              )}
            >
              <td
                className={cn(
                  COL_POSITION,
                  BODY_CELL,
                  "font-expanded text-[18px]",
                )}
              >
                {entry.position}
              </td>
              <td className={cn(COL_PLAYER, BODY_CELL)}>
                {linkToPlayers ? (
                  <Link
                    href={playerProfilePath(entry.userId)}
                    className={cn(
                      "text-body block truncate after:absolute after:inset-0",
                      entry.isViewer && "font-semibold",
                    )}
                  >
                    {entry.isViewer ? "You" : (entry.name ?? "Member")}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "text-body block truncate",
                      entry.isViewer && "font-semibold",
                    )}
                  >
                    {entry.isViewer ? "You" : (entry.name ?? "Member")}
                  </span>
                )}
              </td>
              <td
                className={cn(
                  COL_RECORD,
                  BODY_CELL,
                  "font-expanded text-body tabular-nums",
                )}
              >
                {groupStandingRecordLabel(entry.wins, entry.losses)}
              </td>
              <td className={cn(COL_LEVEL, BODY_CELL)}>
                <LevelCell
                  band={entry.levelBand}
                  provisional={entry.levelProvisional}
                  onInk={entry.isViewer}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-rule text-eyebrow text-muted-foreground border-t px-5 py-3.5">
        Hatched level means the Rating is still Provisional
      </p>
    </div>
  );
}

function StatPair({
  totalGamesPlayed,
  awaitingScoreCount,
}: {
  totalGamesPlayed: number;
  awaitingScoreCount: number;
}) {
  return (
    <div className={cn(cardFrame, "flex")}>
      <div className="border-rule min-w-0 flex-1 border-r px-5 py-[18px]">
        <p className="font-expanded text-[26px] tabular-nums leading-8">
          {totalGamesPlayed}
        </p>
        <p className="text-eyebrow text-muted-foreground mt-0.5">
          games played
        </p>
      </div>
      <div className="min-w-0 flex-1 px-5 py-[18px]">
        <p className="font-expanded text-[26px] tabular-nums leading-8">
          {awaitingScoreCount}
        </p>
        <p className="text-eyebrow text-muted-foreground mt-0.5">
          awaiting score
        </p>
      </div>
    </div>
  );
}

export function GroupStandingTab({
  isMember,
  linkToPlayers,
  leaderboard,
  groupId,
  canShowCreateGame,
  totalGamesPlayed,
  awaitingScoreCount,
}: {
  isMember: boolean;
  linkToPlayers: boolean;
  leaderboard: StandingEntry[];
  groupId: string;
  canShowCreateGame: boolean;
  totalGamesPlayed: number;
  awaitingScoreCount: number;
}) {
  const state = groupStandingState({ isMember, leaderboard });
  if (state.kind === "not-member") {
    return (
      <EmptyState
        icon={Users}
        title="Join to see your Standing"
        description="Join this Group to get a Standing among its members."
      />
    );
  }

  const createFirstGame = canShowCreateGame ? (
    <Button asChild variant="outline">
      <Link href={`/dashboard/games/new?groupId=${groupId}`}>
        Create the first Game
      </Link>
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-[26px]">
      {state.showNoResultsNotice ? (
        <EmptyState
          icon={Users}
          title="Standings appear after the first result"
          action={createFirstGame}
          className={state.showTable ? "py-6" : undefined}
        />
      ) : null}

      {state.showTable ? (
        <>
          <StandingTable
            leaderboard={leaderboard}
            linkToPlayers={linkToPlayers}
          />
          <StatPair
            totalGamesPlayed={totalGamesPlayed}
            awaitingScoreCount={awaitingScoreCount}
          />
        </>
      ) : null}
    </div>
  );
}
