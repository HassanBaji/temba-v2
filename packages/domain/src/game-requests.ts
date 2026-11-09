import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { displayLabelFromStoredBand } from "./level-bands";
import { tenthsToLevelBand } from "./level-range";
import { levelRangeRequestRowMeta } from "./level-range-request";
import {
  heldSeatLabel,
  seatHoldRemainingLabel,
  seatHoldRequestDetail,
  seatHoldRequestRowMeta,
  type HeldSeat,
  type SeatHoldRequestRow,
} from "./seat-hold-request";

export type OrganizerRequestKind = "level_range" | "seat_hold";

/** One row of the Organizer's Requests queue on a Game (design "Join via link" 2a). */
export type OrganizerRequest = {
  id: string;
  kind: OrganizerRequestKind;
  name: string;
  image: string | null;
  meta: string;
  /** The requester's band beside their name, `C−`. */
  level: string | null;
  /** What they asked for, in a sentence or two. */
  detail: string;
  /** `held 21h` while a Seat hold runs. */
  held: string | null;
};

export type GameRequestsInput = {
  pendingLevelRangeRequests: {
    id: string;
    levelTenths: number | null;
    provisional: boolean;
    createdAt: Date | string;
    user: { id: string; name: string | null; image: string | null };
    heldSeat?: HeldSeat | null;
  }[];
  pendingSeatHolds?: SeatHoldRequestRow[];
};

function levelBandOf(tenths: number | null) {
  return tenths == null
    ? null
    : displayLabelFromStoredBand(tenthsToLevelBand(tenths));
}

/**
 * The queue on an Organizer's Game: requests from the Game's Invite link
 * (with or without a Seat hold) first, then Level range requests. Every
 * Game shape shares it, whatever else its details screen shows.
 */
export function gameOrganizerRequests(
  game: GameRequestsInput,
  locale: Locale,
  now?: Date,
): OrganizerRequest[] {
  const m = messagesFor(locale);
  const fallback = m.game.organizer.userFallback;
  return [
    ...(game.pendingSeatHolds ?? []).map(
      (request): OrganizerRequest => ({
        id: request.id,
        kind: "seat_hold",
        name: request.user.name ?? fallback,
        image: request.user.image,
        meta: seatHoldRequestRowMeta(request, locale, now),
        level: levelBandOf(request.levelTenths),
        detail: seatHoldRequestDetail(request, locale),
        held: seatHoldRemainingLabel(request.seatHeldUntil, locale, now),
      }),
    ),
    ...game.pendingLevelRangeRequests.map(
      (request): OrganizerRequest => ({
        id: request.id,
        kind: "level_range",
        name: request.user.name ?? fallback,
        image: request.user.image,
        meta: levelRangeRequestRowMeta(request, locale, now),
        level: levelBandOf(request.levelTenths),
        detail: m.game.requests.sentence(
          heldSeatLabel(request.heldSeat, locale)
            ? `${m.game.requests.outsideRange} (${heldSeatLabel(request.heldSeat, locale)})`
            : m.game.requests.outsideRange,
        ),
        held: null,
      }),
    ),
  ];
}

/** What the queue heading counts: rows, and how many of them hold a seat. */
export function requestsQueueCounts(requests: readonly OrganizerRequest[]) {
  const seatHolds = requests.filter((request) => request.held != null).length;
  return { levelRange: requests.length - seatHolds, seatHolds };
}

/** Whether a Game shows its Requests queue to this Organizer at all. */
export function gameRequestsVisible(game: {
  isOrganizer: boolean;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  pendingSeatHolds?: readonly unknown[];
}) {
  return (
    game.isOrganizer &&
    (game.levelMinTenths != null ||
      game.levelMaxTenths != null ||
      (game.pendingSeatHolds ?? []).length > 0)
  );
}
