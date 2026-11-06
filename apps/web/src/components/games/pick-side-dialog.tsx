"use client";

import { useState } from "react";

import {
  joinSideHelp,
  viewerSideChoice,
  viewerTeam,
  type SideChoice,
  type SidesOccupant,
  type SidesTeam,
} from "@repo/domain/padel-sides";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { SideOptionCards } from "~/components/games/padel-side-picker";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

/** The viewer's Game team with their own seat emptied, so only the partner's pick constrains. */
function partnerOnlyTeam(
  teams: readonly SidesTeam[],
  viewerUserId: string,
): SidesTeam | null {
  const seat = viewerTeam(teams, viewerUserId);
  if (!seat) {
    return null;
  }
  return { ...seat.team, [seat.position]: null as SidesOccupant | null };
}

/**
 * Pick a side (Padel Sides "change your mind"): a seated player answers Left,
 * Right or Either any time before the Game. A side the partner picked is
 * hatched with their name.
 */
export function PickSideDialog({
  open,
  onOpenChange,
  teams,
  viewerUserId,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: readonly SidesTeam[];
  viewerUserId: string;
  pending: boolean;
  onSave: (side: SideChoice) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const [touched, setTouched] = useState<SideChoice | null>(null);
  const team = partnerOnlyTeam(teams, viewerUserId);
  const side = touched ?? viewerSideChoice(teams, viewerUserId) ?? "either";

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setTouched(null);
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent className="flex flex-col gap-5 p-[22px] sm:max-w-[420px]">
        <ResponsiveDialogHeader className="p-0 text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
          <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
            {m.game.sides.pickASide}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-meta">
            {m.game.sides.pickSideDescription}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <SideOptionCards
          team={team}
          value={side}
          disabled={pending}
          onChange={setTouched}
        />
        <p
          aria-live="polite"
          className="text-muted-foreground text-meta leading-relaxed"
        >
          {joinSideHelp(team, side, locale)}
        </p>
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => onSave(side)}
        >
          {m.game.sides.saveSide}
        </Button>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
