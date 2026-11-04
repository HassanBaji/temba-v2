"use client";

import { useMessages } from "~/components/locale-provider";
import { Badge, type BadgeVariant } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

const GAME_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type GameStatusValue = (typeof GAME_STATUSES)[number];

const DOT_CLASS: Record<GameStatusValue, string> = {
  pending: "rounded-full border-2 border-current bg-transparent",
  confirmed: "rounded-full bg-current",
  completed: "rounded-full bg-current ring-2 ring-current ring-offset-1",
  cancelled: "rounded-sm border-2 border-current bg-transparent",
};

/** The dot shapes above stay, so colour is never the only status signal. */
const VARIANT: Record<GameStatusValue, BadgeVariant> = {
  pending: "outline",
  confirmed: "secondary",
  completed: "success",
  cancelled: "destructive",
};

/** The dot classes paint with `current`, so tone rides on the text colour. */
const DOT_TONE: Record<GameStatusValue, string> = {
  pending: "text-muted-foreground",
  confirmed: "text-foreground",
  completed: "text-success",
  cancelled: "text-current",
};

export function GameStatusBadge({ status }: { status: string }) {
  const m = useMessages();
  const known = (GAME_STATUSES as readonly string[]).includes(status);
  const value = known ? (status as GameStatusValue) : null;
  const label = value ? m.webUi.gameStatus[value] : status;

  return (
    <Badge variant={value ? VARIANT[value] : "outline"}>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0",
          value
            ? cn(DOT_CLASS[value], DOT_TONE[value])
            : "rounded-full bg-current",
        )}
      />
      {label}
    </Badge>
  );
}
