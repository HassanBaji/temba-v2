"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Button } from "~/components/ui/button";
import { vacantJoinSeats } from "~/lib/friendly-game-cta";

function seatLabel(sideIndex: number, position: "left" | "right") {
  return `Team ${sideIndex} ${position === "left" ? "Left" : "Right"}`;
}

export function FriendlyGameJoinSheet({
  open,
  onOpenChange,
  title,
  sides,
  pending,
  onPickSeat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sides: readonly {
    sideIndex: number;
    left: unknown;
    right: unknown;
  }[];
  pending: boolean;
  onPickSeat: (sideIndex: number, position: "left" | "right") => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Pick your spot</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Open Positions on {title}.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-2 p-4 pt-0">
          {vacantJoinSeats(sides).map((seat) => (
            <Button
              key={`${seat.sideIndex}-${seat.position}`}
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                onOpenChange(false);
                onPickSeat(seat.sideIndex, seat.position);
              }}
            >
              {seatLabel(seat.sideIndex, seat.position)}
            </Button>
          ))}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
