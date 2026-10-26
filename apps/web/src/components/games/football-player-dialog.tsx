"use client";

import { levelLabel, type BoardPlayer } from "@repo/domain/football-board";
import { FOOTBALL_POSITION_CHOICES } from "@repo/domain/football-lineup";
import { KICK_ACTION } from "@repo/domain/game-copy";
import Link from "next/link";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";

function roleLine(player: BoardPlayer) {
  if (player.role === "keeper") {
    return "Keeper";
  }
  const position = FOOTBALL_POSITION_CHOICES.find(
    (choice) => choice.value === player.position,
  );
  return position
    ? `Prefers ${position.label.toLowerCase()}`
    : "No position yet";
}

/** What an Organizer can do with one player in the pool. */
export function FootballPlayerDialog({
  player,
  canOpenProfile,
  onOpenChange,
  onRemove,
}: {
  player: BoardPlayer | null;
  canOpenProfile: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (userId: string) => void;
}) {
  return (
    <ResponsiveDialog open={player != null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        {player ? (
          <>
            <ResponsiveDialogHeader className="flex-row items-center gap-3 text-left">
              <UserAvatar name={player.name} image={player.image} size="lg" />
              <div className="min-w-0">
                <ResponsiveDialogTitle className="truncate">
                  {player.name}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {roleLine(player)}, Level {levelLabel(player.levelBand)}
                </ResponsiveDialogDescription>
              </div>
            </ResponsiveDialogHeader>
            <div className="flex gap-2 px-4 pb-4 sm:px-0 sm:pb-0">
              {canOpenProfile ? (
                <Button variant="outline" asChild>
                  <Link href={playerProfilePath(player.userId)}>
                    View profile
                  </Link>
                </Button>
              ) : null}
              <Button
                variant="outline"
                aria-label={`${KICK_ACTION} ${player.name}`}
                onClick={() => onRemove(player.userId)}
              >
                {KICK_ACTION}
              </Button>
            </div>
          </>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
