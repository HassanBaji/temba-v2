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
import { playerProfilePath } from "~/lib/dashboard-paths";
import { type GameTeamPlayer } from "~/lib/game-player-links";

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
            <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <ResponsiveDialogTitle className="text-h2 pr-8 tracking-[-0.02em] sm:pr-6">
                {team.name}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="text-meta">
                Game team
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ul className="border-rule rounded-card divide-rule mx-[22px] mb-[max(22px,env(safe-area-inset-bottom))] mt-[18px] divide-y overflow-hidden border">
              {team.players.map((player) => (
                <li key={player.id}>
                  <Link
                    href={playerProfilePath(player.id)}
                    className="hover:bg-wash focus-visible:ring-ring/50 flex min-h-11 items-center gap-2.5 px-5 py-2 outline-none transition-colors focus-visible:ring-[3px]"
                  >
                    <UserAvatar name={player.name} image={player.image} />
                    <span className="text-body min-w-0 truncate">
                      {player.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
