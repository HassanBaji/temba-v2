import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type InviteOutcomeKind =
  | "invalid"
  | "unavailable"
  | "waiting_for_partner";

export type InviteHostLabel = "Community" | "Group" | "Team" | "Game";

const HOST_KINDS = {
  Community: "community",
  Group: "group",
  Team: "team",
  Game: "game",
} as const;

export function inviteOutcomeCopy(
  outcome: InviteOutcomeKind,
  hostLabel: InviteHostLabel,
  locale: Locale,
): { title: string; description: string } {
  const m = messagesFor(locale).invite.outcome;
  if (outcome === "invalid") {
    return { title: m.invalid.title, description: m.invalid.description };
  }
  if (outcome === "unavailable") {
    return {
      title:
        hostLabel === "Game"
          ? m.unavailable.playersTitle
          : m.unavailable.membersTitle,
      description: m.unavailable.description[HOST_KINDS[hostLabel]],
    };
  }
  return {
    title: m.waitingForPartner.title,
    description: m.waitingForPartner.description,
  };
}

export type InviteOutcomeTarget = "home" | "sign-in";

export function inviteOutcomeAction(
  isSignedIn: boolean,
  locale: Locale,
): {
  label: string;
  target: InviteOutcomeTarget;
} {
  const m = messagesFor(locale).common;
  return isSignedIn
    ? { label: m.goHome, target: "home" }
    : { label: m.signIn, target: "sign-in" };
}
