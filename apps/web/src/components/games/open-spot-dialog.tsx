"use client";

import { ArrowLeftRight, LogInIcon, UserPlusIcon } from "lucide-react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useMessages } from "~/components/locale-provider";

/**
 * An Organizer clicked an open spot they could also take themselves: add a
 * player there, or sit there.
 */
export function OpenSpotDialog({
  spotLabel,
  own,
  onOpenChange,
  onAddPlayer,
  onOwn,
}: {
  /** Null keeps the dialog closed. */
  spotLabel: string | null;
  own: "move" | "join";
  onOpenChange: (open: boolean) => void;
  onAddPlayer: () => void;
  onOwn: () => void;
}) {
  const m = useMessages();
  const copy = m.editTeams.openSpot;
  const rows = [
    {
      key: "add_player",
      label: copy.addPlayer,
      hint: copy.addPlayerHint,
      Icon: UserPlusIcon,
      onSelect: onAddPlayer,
    },
    {
      key: own,
      label: own === "join" ? copy.join : copy.move,
      hint: null,
      Icon: own === "join" ? LogInIcon : ArrowLeftRight,
      onSelect: onOwn,
    },
  ];
  return (
    <ResponsiveDialog open={spotLabel != null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex flex-col gap-4 p-[22px] sm:max-w-[420px]">
        <ResponsiveDialogHeader className="p-0 text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
          <ResponsiveDialogTitle className="text-lead font-semibold">
            {spotLabel ? copy.title(spotLabel) : ""}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ul className="border-rule divide-rule divide-y rounded-lg border">
          {rows.map(({ key, label, hint, Icon, onSelect }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onSelect();
                }}
                className="hover:bg-accent focus-visible:ring-ring/50 flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start outline-none focus-visible:ring-[3px]"
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-body block font-medium">{label}</span>
                  {hint ? (
                    <span className="text-meta text-muted-foreground block">
                      {hint}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
