import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { partnerRequiredUnseatPartnerConfirmCopy } from "./tournament-join";

type KickRosterSeat = { userId: string; name: string } | null;

export type GameKickRoster = {
  registeredPlayers: readonly { id: string; name: string }[];
  sides: readonly {
    left: KickRosterSeat;
    right: KickRosterSeat;
  }[];
  waitlist: readonly { id: string; name: string }[];
};

export type GameKickRequest = { userId: string } | { waitlistId: string };

export type GameKickTarget =
  | { kind: "player"; userId: string; name: string }
  | { kind: "waitlist"; waitlistId: string; name: string };

function playerName(roster: GameKickRoster, userId: string, locale: Locale) {
  const registered = roster.registeredPlayers.find(
    (player) => player.id === userId,
  );
  if (registered) {
    return registered.name;
  }
  for (const side of roster.sides) {
    for (const seat of [side.left, side.right]) {
      if (seat?.userId === userId) {
        return seat.name;
      }
    }
  }
  return messagesFor(locale).game.kick.fallbackName;
}

export function gameKickTarget(
  roster: GameKickRoster,
  request: GameKickRequest,
  locale: Locale,
): GameKickTarget {
  if ("waitlistId" in request) {
    const entry = roster.waitlist.find(
      (candidate) => candidate.id === request.waitlistId,
    );
    return {
      kind: "waitlist",
      waitlistId: request.waitlistId,
      name: entry?.name ?? messagesFor(locale).game.kick.fallbackName,
    };
  }
  return {
    kind: "player",
    userId: request.userId,
    name: playerName(roster, request.userId, locale),
  };
}

export function gameKickConfirmCopy(
  target: GameKickTarget,
  game: { partnerRequired: boolean; drawPosted: boolean },
  locale: Locale,
) {
  const m = messagesFor(locale).game.kick;
  if (target.kind === "waitlist") {
    return {
      title: m.waitlistTitle(target.name),
      description: m.waitlistConfirm,
    };
  }
  const title = m.title(target.name);
  if (game.drawPosted) {
    return { title, description: m.afterDrawConfirm };
  }
  if (game.partnerRequired) {
    return {
      title,
      description: partnerRequiredUnseatPartnerConfirmCopy(locale),
    };
  }
  return { title, description: m.spotConfirm };
}
