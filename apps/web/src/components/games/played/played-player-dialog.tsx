"use client";

import { RENAME_UNCLAIMED_PLAYER_ACTION } from "@repo/domain/add-player-by-phone";
import { KICK_ACTION } from "@repo/domain/game-copy";
import type { PlayedRow } from "@repo/domain/played-game";
import type { Sport } from "@repo/domain/sport";
import Link from "next/link";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { NotOnTembaTag } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";

/**
 * One player on a played Game: their profile for anyone who may open it,
 * and for the Organizer the doors that still change the record.
 */
export function PlayedPlayerDialog({
  player,
  sport,
  canOpenProfile,
  canKick,
  canRename,
  onOpenChange,
  onKick,
  onRename,
}: {
  player: PlayedRow | null;
  sport?: Sport;
  canOpenProfile: boolean;
  canKick: boolean;
  canRename: boolean;
  onOpenChange: (open: boolean) => void;
  onKick: (userId: string) => void;
  onRename: (player: { userId: string; name: string }) => void;
}) {
  const meta = player
    ? [player.meta, `Level ${player.level}`, player.trailing]
        .filter(Boolean)
        .join(", ")
    : "";
  return (
    <ResponsiveDialog open={player != null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        {player ? (
          <>
            <ResponsiveDialogHeader className="flex-row items-center gap-3 text-left">
              <UserAvatar
                name={player.fullName}
                image={player.image}
                size="lg"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <ResponsiveDialogTitle className="truncate">
                    {player.fullName}
                  </ResponsiveDialogTitle>
                  {player.unclaimed ? <NotOnTembaTag /> : null}
                </div>
                <ResponsiveDialogDescription>
                  {meta}
                </ResponsiveDialogDescription>
                {player.phoneMasked ? (
                  <p className="text-muted-foreground text-meta tabular-nums">
                    {player.phoneMasked}
                  </p>
                ) : null}
              </div>
            </ResponsiveDialogHeader>
            <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-0 sm:pb-0">
              {canOpenProfile ? (
                <Button variant="outline" asChild>
                  <Link href={playerProfilePath(player.userId, sport)}>
                    View profile
                  </Link>
                </Button>
              ) : null}
              {canRename && player.unclaimed ? (
                <Button
                  variant="outline"
                  aria-label={`${RENAME_UNCLAIMED_PLAYER_ACTION}: ${player.fullName}`}
                  onClick={() =>
                    onRename({ userId: player.userId, name: player.fullName })
                  }
                >
                  {RENAME_UNCLAIMED_PLAYER_ACTION}
                </Button>
              ) : null}
              {canKick ? (
                <Button
                  variant="outline"
                  aria-label={`${KICK_ACTION} ${player.fullName}`}
                  onClick={() => onKick(player.userId)}
                >
                  {KICK_ACTION}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
