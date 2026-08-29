import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export const GAME_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

export type GameStatusValue = keyof typeof GAME_STATUS_LABELS;

const DOT_CLASS: Record<GameStatusValue, string> = {
  pending: "rounded-full border-2 border-current bg-transparent",
  confirmed: "rounded-full bg-current",
  completed: "rounded-full bg-current ring-2 ring-current ring-offset-1",
  cancelled: "rounded-sm border-2 border-current bg-transparent",
};

export function GameStatusBadge({ status }: { status: string }) {
  const known = status in GAME_STATUS_LABELS;
  const value = known ? (status as GameStatusValue) : null;
  const label = value ? GAME_STATUS_LABELS[value] : status;

  return (
    <Badge variant="outline">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0",
          value ? DOT_CLASS[value] : "rounded-full bg-current",
        )}
      />
      {label}
    </Badge>
  );
}
