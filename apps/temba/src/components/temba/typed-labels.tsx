import { Badge } from "~/components/ui/badge";

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
} as const;

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
  return (
    <Badge variant="outline">
      {labelFromMap(status, GAME_REGISTRATION_STATUS_LABELS)}
    </Badge>
  );
}
