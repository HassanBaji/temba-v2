import { Badge, type BadgeVariant } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export const GAME_FORMAT_LABELS = {
  friendly_game: "Friendly game",
  americano: "Americano",
  friendly_tournament: "Friendly tournament",
} as const;

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
const GAME_REGISTRATION_STATUS_VARIANTS: Record<
  GameRegistrationStatusValue,
  BadgeVariant
> = {
  open: "success",
  full: "warning",
  closed: "secondary",
  frozen: "warning",
  cancelled: "destructive",
};

const GAME_REGISTRATION_STATUS_DOTS: Record<
  GameRegistrationStatusValue,
  string
> = {
  open: "bg-success",
  full: "bg-warning",
  closed: "bg-muted-foreground",
  frozen: "bg-warning",
  cancelled: "bg-current",
};

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
  const value =
    status in GAME_REGISTRATION_STATUS_LABELS
      ? (status as GameRegistrationStatusValue)
      : null;

  return (
    <Badge
      variant={value ? GAME_REGISTRATION_STATUS_VARIANTS[value] : "outline"}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          value ? GAME_REGISTRATION_STATUS_DOTS[value] : "bg-current",
        )}
      />
      {labelFromMap(status, GAME_REGISTRATION_STATUS_LABELS)}
    </Badge>
  );
}
