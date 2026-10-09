import { GAME_FORMAT_LABELS } from "@repo/domain/game-format-label";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export { GAME_FORMAT_LABELS };

export const GAME_REGISTRATION_MODE_LABELS = {
  individual: "Individual",
  team_only: "Team only",
} as const;

export const GAME_REGISTRATION_STATUS_LABELS = {
  open: "Open",
  full: "Full",
  closed: "Closed",
  frozen: "Frozen",
  cancelled: "Cancelled",
} as const;

type GameRegistrationStatusValue = keyof typeof GAME_REGISTRATION_STATUS_LABELS;

/** Registration state is the page's headline fact, so it carries the colour. */
const GAME_REGISTRATION_STATUS_CLASSES: Record<
  GameRegistrationStatusValue,
  { text: string; dot: string }
> = {
  open: { text: "text-success", dot: "bg-success" },
  full: { text: "text-warning", dot: "bg-warning" },
  closed: { text: "text-muted-foreground", dot: "bg-muted-foreground" },
  frozen: { text: "text-warning", dot: "bg-warning" },
  cancelled: { text: "text-destructive", dot: "bg-destructive" },
};

export function gameRegistrationStatusClasses(status: string) {
  return Object.hasOwn(GAME_REGISTRATION_STATUS_CLASSES, status)
    ? GAME_REGISTRATION_STATUS_CLASSES[status as GameRegistrationStatusValue]
    : { text: "text-muted-foreground", dot: "bg-current" };
}

export const INVITE_KIND_LABELS = {
  community: "Community",
  group: "Group",
  team: "Team",
  game: "Game",
} as const;

function labelFromMap(value: string, map: Record<string, string>): string {
  return map[value] ?? value.replaceAll("_", " ");
}

export function GameFormatBadge({ format }: { format: string }) {
  return (
    <Badge variant="outline">{labelFromMap(format, GAME_FORMAT_LABELS)}</Badge>
  );
}

export function InviteKindBadge({ kind }: { kind: string }) {
  return (
    <Badge variant="outline">{labelFromMap(kind, INVITE_KIND_LABELS)}</Badge>
  );
}

export function GameRegistrationModeBadge({ mode }: { mode: string }) {
  return (
    <Badge variant="outline">
      {labelFromMap(mode, GAME_REGISTRATION_MODE_LABELS)}
    </Badge>
  );
}

export function GameRegistrationStatusBadge({ status }: { status: string }) {
  const classes = gameRegistrationStatusClasses(status);

  return (
    <div className={cn("flex items-center gap-1 font-semibold", classes.text)}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", classes.dot)}
      />
      {labelFromMap(status, GAME_REGISTRATION_STATUS_LABELS)}
    </div>
  );
}
