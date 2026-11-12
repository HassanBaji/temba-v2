"use client";

import {
  displayLabelFromStoredBand,
  type LevelBand,
} from "@repo/domain/level-bands";
import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";

export type TournamentPlayer = {
  userId: string;
  name: string;
  image: string | null;
  levelBand?: LevelBand | null;
};

type TournamentPlayerActions = {
  canOpenProfile: boolean;
  canKick: (userId: string) => boolean;
  open: (player: TournamentPlayer) => void;
};

const TournamentPlayerActionsContext =
  createContext<TournamentPlayerActions | null>(null);

/**
 * The Organizer's per-player actions, or null for everyone else. Seats and
 * Game team sheets open the player dialog only for a player the Organizer
 * can kick; other names keep their plain link or label.
 */
export function useTournamentPlayerActions() {
  return useContext(TournamentPlayerActionsContext);
}

export function TournamentPlayerActionsProvider({
  enabled,
  canOpenProfile,
  kickableUserIds,
  kickPending,
  onKick,
  children,
}: {
  enabled: boolean;
  canOpenProfile: boolean;
  kickableUserIds: readonly string[];
  kickPending: boolean;
  onKick?: (userId: string) => void;
  children: ReactNode;
}) {
  const [player, setPlayer] = useState<TournamentPlayer | null>(null);

  if (!enabled || !onKick) {
    return <>{children}</>;
  }

  const kickable = new Set(kickableUserIds);
  const actions: TournamentPlayerActions = {
    canOpenProfile,
    canKick: (userId) => kickable.has(userId),
    open: setPlayer,
  };

  return (
    <TournamentPlayerActionsContext.Provider value={actions}>
      {children}
      <TournamentPlayerDialog
        player={player}
        canOpenProfile={canOpenProfile}
        kickPending={kickPending}
        onClose={() => setPlayer(null)}
        onKick={(userId) => {
          setPlayer(null);
          onKick(userId);
        }}
      />
    </TournamentPlayerActionsContext.Provider>
  );
}

function TournamentPlayerDialog({
  player,
  canOpenProfile,
  kickPending,
  onClose,
  onKick,
}: {
  player: TournamentPlayer | null;
  canOpenProfile: boolean;
  kickPending: boolean;
  onClose: () => void;
  onKick: (userId: string) => void;
}) {
  const m = useMessages();
  const level = player?.levelBand
    ? displayLabelFromStoredBand(player.levelBand)
    : null;

  return (
    <ResponsiveDialog
      open={player != null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        {player ? (
          <>
            <ResponsiveDialogHeader className="flex-row items-center gap-3 text-start">
              <UserAvatar name={player.name} image={player.image} size="lg" />
              <div className="min-w-0">
                <ResponsiveDialogTitle className="truncate">
                  {player.name}
                </ResponsiveDialogTitle>
                {level ? (
                  <ResponsiveDialogDescription>
                    {m.webTournament.player.level(level)}
                  </ResponsiveDialogDescription>
                ) : null}
              </div>
            </ResponsiveDialogHeader>
            <div className="flex gap-2 px-4 pb-4 sm:px-0 sm:pb-0">
              {canOpenProfile ? (
                <Button variant="outline" asChild>
                  <Link href={playerProfilePath(player.userId)}>
                    {m.webTournament.player.viewProfile}
                  </Link>
                </Button>
              ) : null}
              <Button
                variant="outline"
                aria-label={m.webTournament.kickName(player.name)}
                disabled={kickPending}
                onClick={() => onKick(player.userId)}
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
