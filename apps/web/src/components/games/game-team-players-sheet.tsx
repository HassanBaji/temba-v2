"use client";

import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useMessages } from "~/components/locale-provider";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { type GameTeamPlayer } from "~/lib/game-player-links";

import { useTournamentPlayerActions } from "./tournament-player-dialog";

const ROW =
  "flex min-h-11 w-full items-center gap-2.5 px-5 py-2 text-start outline-none";
const INTERACTIVE_ROW =
  "hover:bg-wash focus-visible:ring-ring/50 transition-colors focus-visible:ring-[3px]";

export type GameTeamPlayersSheetTeam = {
  name: string;
  players: GameTeamPlayer[];
};

export function GameTeamPlayersSheet({
  team,
  onClose,
}: {
  team: GameTeamPlayersSheetTeam | null;
  onClose: () => void;
}) {
  const m = useMessages();
  const playerActions = useTournamentPlayerActions();
  const canOpenProfile = playerActions?.canOpenProfile ?? true;
  return (
    <ResponsiveDialog
      open={team != null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[420px]">
        {team ? (
          <>
            <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
              <ResponsiveDialogTitle className="text-h2 pe-8 tracking-[-0.02em] sm:pe-6">
                {team.name}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="text-meta">
                {m.createGame.side.gameTeam}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ul className="border-rule rounded-card divide-rule mx-[22px] mb-[max(22px,env(safe-area-inset-bottom))] mt-[18px] divide-y overflow-hidden border">
              {team.players.map((player) => {
                const face = (
                  <>
                    <UserAvatar
                      name={player.name}
                      image={player.image}
                      guest={player.guest}
                    />
                    <span className="text-body min-w-0 truncate">
                      {player.name}
                    </span>
                  </>
                );
                return (
                  <li key={player.id}>
                    {playerActions?.canKick(player.id) ? (
                      <button
                        type="button"
                        aria-label={m.webTournament.player.openActions(
                          player.name,
                        )}
                        onClick={() => {
                          onClose();
                          playerActions.open({
                            userId: player.id,
                            name: player.name,
                            image: player.image,
                            guest: player.guest,
                            phoneNumber: player.phoneNumber,
                          });
                        }}
                        className={cn(ROW, INTERACTIVE_ROW)}
                      >
                        {face}
                      </button>
                    ) : canOpenProfile && !player.guest ? (
                      <Link
                        href={playerProfilePath(player.id)}
                        className={cn(ROW, INTERACTIVE_ROW)}
                      >
                        {face}
                      </Link>
                    ) : (
                      <div className={ROW}>{face}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
