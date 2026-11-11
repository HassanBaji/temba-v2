"use client";

import { levelLabel, type BoardPlayer } from "@repo/domain/football-board";
import { footballPositionChoices } from "@repo/domain/football-lineup";
import type { Messages } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";
import Link from "next/link";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NotOnTembaTag } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";

function roleLine(player: BoardPlayer, m: Messages, locale: Locale) {
  if (player.role === "keeper") {
    return m.football.board.seatKeeper;
  }
  const position = footballPositionChoices(locale).find(
    (choice) => choice.value === player.position,
  );
  return position
    ? m.webTournament.footballPlayer.prefers(position.label)
    : m.webTournament.footballPlayer.noPositionYet;
}

/** What an Organizer can do with one player in the pool. */
export function FootballPlayerDialog({
  player,
  canOpenProfile,
  onOpenChange,
  onRemove,
  canRename,
  onRename,
}: {
  player: BoardPlayer | null;
  canOpenProfile: boolean;
  canRename: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (userId: string) => void;
  onRename?: (player: { userId: string; name: string }) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <ResponsiveDialog open={player != null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        {player ? (
          <>
            <ResponsiveDialogHeader className="flex-row items-center gap-3 text-start">
              <UserAvatar name={player.name} image={player.image} size="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <ResponsiveDialogTitle className="truncate">
                    {player.name}
                  </ResponsiveDialogTitle>
                  {player.unclaimed ? <NotOnTembaTag /> : null}
                </div>
                <ResponsiveDialogDescription>
                  {m.webTournament.footballPlayer.subtitle(
                    roleLine(player, m, locale),
                    levelLabel(player.levelBand),
                  )}
                </ResponsiveDialogDescription>
                {player.phoneMasked ? (
                  <p className="text-muted-foreground text-meta tabular-nums">
                    {player.phoneMasked}
                  </p>
                ) : null}
              </div>
            </ResponsiveDialogHeader>
            <div className="flex gap-2 px-4 pb-4 sm:px-0 sm:pb-0">
              {canOpenProfile ? (
                <Button variant="outline" asChild>
                  <Link href={playerProfilePath(player.userId, "football")}>
                    {m.webTournament.footballPlayer.viewProfile}
                  </Link>
                </Button>
              ) : null}
              {onRename && canRename ? (
                <Button
                  variant="outline"
                  aria-label={m.webTournament.footballPlayer.renameLabel(
                    player.name,
                  )}
                  onClick={() =>
                    onRename({ userId: player.userId, name: player.name })
                  }
                >
                  {m.group.addPlayer.renameAction}
                </Button>
              ) : null}
              <Button
                variant="outline"
                aria-label={m.webTournament.kickName(player.name)}
                onClick={() => onRemove(player.userId)}
              >
                {m.game.action.kick}
              </Button>
            </div>
          </>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
