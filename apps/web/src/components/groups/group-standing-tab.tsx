import Link from "next/link";
import { Plus, UserRoundPlus, Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { LevelCell } from "~/components/temba/level-cell";
import { NotOnTembaTag } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { groupStandingRecordLabel } from "@repo/domain/group-home-chrome";
import { groupStandingState } from "@repo/domain/group-join";
import {
  groupStandingEmptyFooter,
  groupStandingOpenSeats,
} from "@repo/domain/group-empty-states";
import type { LevelBand } from "@repo/domain/level-bands";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { cardFrame } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

type StandingEntry = {
  userId: string;
  name: string | null;
  image?: string | null;
  totalSetsWon: number;
  totalPointsWon: number;
  totalGamesPlayed: number;
  position: number;
  isViewer: boolean;
  wins: number;
  losses: number;
  levelBand: LevelBand | null;
  levelProvisional: boolean;
  unclaimed: boolean;
};

/**
 * Column geometry from design 06a: 26px position, flexible Player, 54px W-L,
 * 56px Level. The outer columns carry the card's 20px gutter inside their
 * width, so `table-fixed` lands the rule-to-rule widths the design draws.
 * Without Level (football), W-L is the outer column and carries the gutter.
 */
const COL_POSITION = "w-[46px] pl-5 pr-0 text-left";
const COL_PLAYER = "px-0 text-left";
const COL_RECORD = "w-[54px] px-0 text-right";
const COL_RECORD_LAST = "w-[74px] pl-0 pr-5 text-right";
const COL_LEVEL = "w-[76px] pl-0 pr-5 text-right";
const HEAD_CELL = "py-3.5 font-normal";
const BODY_CELL = "py-4";

function StandingTable({
  leaderboard,
  linkToPlayers,
  showLevel,
}: {
  leaderboard: StandingEntry[];
  linkToPlayers: boolean;
  showLevel: boolean;
}) {
  const colRecord = showLevel ? COL_RECORD : COL_RECORD_LAST;
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
            <th scope="col" className={cn(colRecord, HEAD_CELL)}>
              W-L
            </th>
            {showLevel ? (
              <th scope="col" className={cn(COL_LEVEL, HEAD_CELL)}>
                Level
              </th>
            ) : null}
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
                <span className="flex min-w-0 items-center gap-2">
                  {linkToPlayers ? (
                    <Link
                      href={playerProfilePath(entry.userId)}
                      className={cn(
                        "text-body block min-w-0 truncate after:absolute after:inset-0",
                        entry.isViewer && "font-semibold",
                      )}
                    >
                      {entry.isViewer ? "You" : (entry.name ?? "Member")}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        "text-body block min-w-0 truncate",
                        entry.isViewer && "font-semibold",
                      )}
                    >
                      {entry.isViewer ? "You" : (entry.name ?? "Member")}
                    </span>
                  )}
                  {entry.unclaimed ? <NotOnTembaTag /> : null}
                </span>
              </td>
              <td
                className={cn(
                  colRecord,
                  BODY_CELL,
                  "font-expanded text-body tabular-nums",
                )}
              >
                {groupStandingRecordLabel(entry.wins, entry.losses)}
              </td>
              {showLevel ? (
                <td className={cn(COL_LEVEL, BODY_CELL)}>
                  <LevelCell
                    band={entry.levelBand}
                    provisional={entry.levelProvisional}
                    onInk={entry.isViewer}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {showLevel ? (
        <p className="border-rule text-eyebrow text-muted-foreground border-t px-5 py-3.5">
          Hatched level means the Rating is still Provisional
        </p>
      ) : null}
    </div>
  );
}

const PREVIEW_ROW =
  "grid min-h-14 grid-cols-[28px_1fr_auto] items-center gap-3";

/**
 * Design "Group empty states" 01: before the first result the Standing draws
 * every member at 0-0 and pads to four rows with open seats to invite into.
 */
function StandingPreview({
  leaderboard,
  linkToPlayers,
  canInvite,
  onInvite,
}: {
  leaderboard: StandingEntry[];
  linkToPlayers: boolean;
  canInvite: boolean;
  onInvite: () => void;
}) {
  return (
    <div className={cardFrame}>
      <div
        className={cn(
          PREVIEW_ROW,
          "border-rule text-muted-foreground text-eyebrow min-h-0 border-b px-[18px] py-3",
        )}
      >
        <span>#</span>
        <span>Player</span>
        <span>W-L</span>
      </div>
      <ol>
        {leaderboard.map((entry) => {
          const name = entry.isViewer ? "You" : (entry.name ?? "Member");
          return (
            <li
              key={entry.userId}
              className={cn(
                PREVIEW_ROW,
                "border-rule border-t px-[18px] first:border-t-0",
                entry.isViewer && "bg-ink text-paper",
                linkToPlayers && "relative",
              )}
            >
              <span className="font-expanded text-lead">{entry.position}</span>
              <span className="flex min-w-0 items-center gap-2.5">
                <UserAvatar
                  name={entry.name ?? "Member"}
                  image={entry.image}
                  className={cn(
                    "size-7 rounded-lg [&_[data-slot=avatar-fallback]]:rounded-none [&_[data-slot=avatar-fallback]]:text-[11px] [&_[data-slot=avatar-fallback]]:font-semibold",
                    entry.isViewer &&
                      "[&_[data-slot=avatar-fallback]]:bg-paper [&_[data-slot=avatar-fallback]]:text-ink",
                  )}
                />
                {linkToPlayers ? (
                  <Link
                    href={playerProfilePath(entry.userId)}
                    className={cn(
                      "text-body block min-w-0 truncate after:absolute after:inset-0",
                      entry.isViewer && "font-semibold",
                    )}
                  >
                    {name}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "text-body block min-w-0 truncate",
                      entry.isViewer && "font-semibold",
                    )}
                  >
                    {name}
                  </span>
                )}
                {entry.unclaimed ? <NotOnTembaTag /> : null}
              </span>
              <span className="font-expanded text-body tabular-nums">
                {groupStandingRecordLabel(entry.wins, entry.losses)}
              </span>
            </li>
          );
        })}
        {groupStandingOpenSeats(leaderboard.length).map((position) => (
          <li
            key={position}
            className={cn(
              PREVIEW_ROW,
              "border-rule border-t pl-[18px]",
              canInvite ? "pr-2.5" : "pr-[18px]",
            )}
          >
            <span className="font-expanded text-lead text-muted-foreground/40">
              {position}
            </span>
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="hatch size-7 shrink-0 rounded-lg"
              />
              <span className="text-body text-muted-foreground">Open seat</span>
            </span>
            {canInvite ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onInvite}
                aria-label="Invite players"
                className="font-semibold"
              >
                <Plus aria-hidden="true" />
                Invite
              </Button>
            ) : (
              <span />
            )}
          </li>
        ))}
      </ol>
      <p className="border-rule text-meta text-muted-foreground border-t px-[18px] py-3.5">
        {groupStandingEmptyFooter(leaderboard.length)}
      </p>
    </div>
  );
}

function StatPair({
  totalGamesPlayed,
  awaitingScoreCount,
  muted = false,
}: {
  totalGamesPlayed: number;
  awaitingScoreCount: number;
  muted?: boolean;
}) {
  const value = cn(
    "font-expanded text-[26px] tabular-nums leading-8",
    muted && "text-muted-foreground/40",
  );
  return (
    <div className={cn(cardFrame, "flex")}>
      <div className="border-rule min-w-0 flex-1 border-r px-5 py-[18px]">
        <p className={value}>{totalGamesPlayed}</p>
        <p className="text-eyebrow text-muted-foreground mt-0.5">
          games played
        </p>
      </div>
      <div className="min-w-0 flex-1 px-5 py-[18px]">
        <p className={value}>{awaitingScoreCount}</p>
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
  hasGames,
  totalGamesPlayed,
  awaitingScoreCount,
  showLevel = true,
  canInvite = false,
  onInvite,
}: {
  showLevel?: boolean;
  canInvite?: boolean;
  onInvite?: () => void;
  isMember: boolean;
  linkToPlayers: boolean;
  leaderboard: StandingEntry[];
  groupId: string;
  canShowCreateGame: boolean;
  hasGames: boolean;
  totalGamesPlayed: number;
  awaitingScoreCount: number;
}) {
  const state = groupStandingState({
    isMember,
    hasGames,
    leaderboard,
  });
  if (state.kind === "not-member") {
    return (
      <EmptyState
        icon={Users}
        title="Join to see your Standing"
        description="Join this Group to get a Standing among its members."
      />
    );
  }

  const showCreateFirstGame = canShowCreateGame && state.showCreateFirstGame;
  const createFirstGame = showCreateFirstGame ? (
    <Button asChild variant="outline">
      <Link href={`/dashboard/games/new?groupId=${groupId}`}>
        Create the first Game
      </Link>
    </Button>
  ) : null;

  if (state.showNoResultsNotice && state.showTable) {
    const invite = canInvite && onInvite ? onInvite : null;
    return (
      <div className="flex flex-col gap-[22px]">
        <StandingPreview
          leaderboard={leaderboard}
          linkToPlayers={linkToPlayers}
          canInvite={invite != null}
          onInvite={() => invite?.()}
        />
        {invite || showCreateFirstGame ? (
          <div className="flex flex-col gap-2">
            {invite ? (
              <Button
                type="button"
                size="lg"
                className="text-body w-full font-semibold"
                onClick={invite}
              >
                <UserRoundPlus aria-hidden="true" />
                Invite players
              </Button>
            ) : null}
            {showCreateFirstGame ? (
              <Button
                asChild
                size="lg"
                variant={invite ? "outline" : "default"}
                className="text-body w-full font-semibold"
              >
                <Link href={`/dashboard/games/new?groupId=${groupId}`}>
                  Create the first Game
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        <StatPair
          totalGamesPlayed={totalGamesPlayed}
          awaitingScoreCount={awaitingScoreCount}
          muted
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[26px]">
      {state.showNoResultsNotice ? (
        <EmptyState
          icon={Users}
          title="Standings appear after the first result"
          action={createFirstGame}
        />
      ) : null}

      {state.showTable ? (
        <>
          <StandingTable
            leaderboard={leaderboard}
            linkToPlayers={linkToPlayers}
            showLevel={showLevel}
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
