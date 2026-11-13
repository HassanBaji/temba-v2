"use client";

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
import { useMessages } from "~/components/locale-provider";
import { GuestTag, NotOnTembaTag } from "~/components/temba/seat";
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
  onRename: (player: { userId: string; name: string; guest: boolean }) => void;
}) {
  const m = useMessages();
  const meta = player
    ? [player.meta, m.level.prose(player.level), player.trailing]
        .filter(Boolean)
        .join(m.tournament.listSeparator)
    : "";
  return (
    <ResponsiveDialog open={player != null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        {player ? (
          <>
            <ResponsiveDialogHeader className="flex-row items-center gap-3 text-start">
              <UserAvatar
                name={player.fullName}
                image={player.image}
                size="lg"
                guest={player.guest}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <ResponsiveDialogTitle className="truncate">
                    {player.fullName}
                  </ResponsiveDialogTitle>
                  {player.unclaimed ? <NotOnTembaTag /> : null}
                  {player.guest ? <GuestTag /> : null}
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
              {canOpenProfile && !player.guest ? (
                <Button variant="outline" asChild>
                  <Link href={playerProfilePath(player.userId, sport)}>
                    {m.webGame.played.viewProfile}
                  </Link>
                </Button>
              ) : null}
              {canRename && (player.unclaimed || player.guest) ? (
                <Button
                  variant="outline"
                  aria-label={m.webGame.lineup.renameFor(
                    m.group.addPlayer.renameAction,
                    player.fullName,
                  )}
                  onClick={() =>
                    onRename({
                      userId: player.userId,
                      name: player.fullName,
                      guest: player.guest,
                    })
                  }
                >
                  {m.group.addPlayer.renameAction}
                </Button>
              ) : null}
              {canKick ? (
                <Button
                  variant="outline"
                  aria-label={m.webGame.lineup.kickName(player.fullName)}
                  onClick={() => onKick(player.userId)}
                >
                  {m.game.action.kick}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
