"use client";

import { gameFormatLabel } from "@repo/domain/game-format-label";
import type { Messages } from "@repo/i18n/messages";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

const GAME_REGISTRATION_STATUSES = [
  "open",
  "full",
  "closed",
  "frozen",
  "cancelled",
] as const;

type GameRegistrationStatusValue = (typeof GAME_REGISTRATION_STATUSES)[number];

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

function isGameRegistrationStatus(
  status: string,
): status is GameRegistrationStatusValue {
  return (GAME_REGISTRATION_STATUSES as readonly string[]).includes(status);
}

export function gameRegistrationStatusClasses(status: string) {
  return isGameRegistrationStatus(status)
    ? GAME_REGISTRATION_STATUS_CLASSES[status]
    : { text: "text-muted-foreground", dot: "bg-current" };
}

function fallbackLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function inviteKindLabel(kind: string, m: Messages): string {
  switch (kind) {
    case "community":
    case "group":
    case "team":
    case "game":
      return m.webUi.inviteKind[kind];
    default:
      return fallbackLabel(kind);
  }
}

export function gameRegistrationModeLabel(mode: string, m: Messages): string {
  switch (mode) {
    case "individual":
      return m.webUi.registrationMode.individual;
    case "team_only":
      return m.webUi.registrationMode.teamOnly;
    default:
      return fallbackLabel(mode);
  }
}

export function gameRegistrationStatusLabel(
  status: string,
  m: Messages,
): string {
  return isGameRegistrationStatus(status)
    ? m.webUi.registrationStatus[status]
    : fallbackLabel(status);
}

export function GameFormatBadge({ format }: { format: string }) {
  const locale = useLocale();
  return <Badge variant="outline">{gameFormatLabel(format, locale)}</Badge>;
}

export function InviteKindBadge({ kind }: { kind: string }) {
  const m = useMessages();
  return <Badge variant="outline">{inviteKindLabel(kind, m)}</Badge>;
}

export function GameRegistrationModeBadge({ mode }: { mode: string }) {
  const m = useMessages();
  return <Badge variant="outline">{gameRegistrationModeLabel(mode, m)}</Badge>;
}

export function GameRegistrationStatusBadge({ status }: { status: string }) {
  const m = useMessages();
  const classes = gameRegistrationStatusClasses(status);

  return (
    <div className={cn("flex items-center gap-1 font-semibold", classes.text)}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", classes.dot)}
      />
      {gameRegistrationStatusLabel(status, m)}
    </div>
  );
}
