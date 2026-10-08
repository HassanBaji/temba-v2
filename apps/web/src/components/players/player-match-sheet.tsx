"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Hatch } from "~/components/ui/hatch";
import {
  OPEN_GAME_ACTION,
  type PlayerMatchSheetView,
} from "@repo/domain/player-profile-matches";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";

function ResultBadge({ sheet }: { sheet: PlayerMatchSheetView }) {
  return (
    <span
      className={cn(
        "border-ink text-meta shrink-0 rounded-md border px-2.5 py-1 font-semibold",
        sheet.outcome === "won" ? "bg-ink text-paper" : "bg-paper text-ink",
      )}
    >
      {sheet.badge}
    </span>
  );
}

function TeamRow({ team }: { team: PlayerMatchSheetView["teams"][number] }) {
  return (
    <div className="flex items-center gap-3 px-5 py-1.5">
      <ul className="min-w-0 flex-1">
        {team.players.map((player) => (
          <li key={player.userId}>
            <Link
              href={playerProfilePath(player.userId)}
              aria-label={player.accessibilityLabel}
              className="hover:bg-wash -mx-2 flex min-h-11 items-center gap-2.5 rounded-md px-2 transition-colors"
            >
              <UserAvatar name={player.name} image={player.image} />
              <span className="text-body min-w-0 truncate">{player.name}</span>
              {player.level ? (
                <span className="text-meta text-muted-foreground shrink-0 tabular-nums">
                  {player.level}
                </span>
              ) : (
                <Hatch className="h-5 w-11 shrink-0 rounded-sm" />
              )}
            </Link>
          </li>
        ))}
      </ul>
      <div
        aria-label={`Sets: ${team.sets.map((set) => set.games).join(", ")}`}
        className="flex shrink-0 gap-1.5"
        role="group"
      >
        {team.sets.map((set, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              "flex size-7 items-center justify-center rounded-md font-semibold tabular-nums",
              set.won ? "bg-ink text-paper" : "bg-wash text-ink",
            )}
          >
            {set.games}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PlayerMatchSheet({
  sheet,
  onClose,
}: {
  sheet: PlayerMatchSheetView | null;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog
      open={sheet != null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        {sheet ? (
          <>
            <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <div className="flex items-start justify-between gap-3 pr-8 sm:pr-6">
                <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
                  {sheet.title}
                </ResponsiveDialogTitle>
                <ResultBadge sheet={sheet} />
              </div>
              <ResponsiveDialogDescription className="text-meta">
                {sheet.subtitle}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-[18px]">
              <div className="border-rule rounded-card divide-rule divide-y overflow-hidden border">
                {sheet.teams.map((team, index) => (
                  <TeamRow key={index} team={team} />
                ))}
              </div>
              {sheet.rating ? (
                <div
                  aria-label={sheet.rating.accessibilityLabel}
                  role="group"
                  className="border-rule rounded-card flex items-center justify-between gap-3 border p-5"
                >
                  <div aria-hidden="true">
                    <p className="text-meta text-muted-foreground">
                      {sheet.rating.label}
                    </p>
                    <p className="font-semibold tabular-nums">
                      {`${sheet.rating.before} → ${sheet.rating.after}`}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="font-semibold tabular-nums"
                  >
                    {sheet.rating.delta}
                  </span>
                </div>
              ) : null}
              {sheet.canOpenGame ? (
                <Link
                  href={`/dashboard/games/${sheet.gameId}`}
                  className="border-rule hover:bg-wash rounded-card flex h-11 items-center justify-center gap-1 border font-semibold transition-colors"
                >
                  {OPEN_GAME_ACTION}
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              ) : null}
            </div>
          </>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
