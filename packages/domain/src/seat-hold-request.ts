import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { groupDisplayName } from "./group-join";
import { formatLevelTenths } from "./level-range";
import { requestRowMeta } from "./request-meta";

/** A pending Group join request that holds a seat on this Game (ADR-0057). */
export type SeatHoldRequestRow = {
  id: string;
  createdAt: Date | string;
  seatHeldUntil: Date | string | null;
  user: { id: string; name: string | null; image: string | null };
  invitedBy: { id: string; name: string | null } | null;
  groupName: string | null;
  levelTenths: number | null;
  provisional: boolean;
};

const MS_PER_MINUTE = 60 * 1000;

/** `held 21h`, `held 40 min`; null once the hold has run out. */
export function seatHoldRemainingLabel(
  seatHeldUntil: Date | string | null,
  locale: Locale,
  now: Date = new Date(),
) {
  if (!seatHeldUntil) {
    return null;
  }
  const minutes = Math.ceil(
    (new Date(seatHeldUntil).getTime() - now.getTime()) / MS_PER_MINUTE,
  );
  if (minutes <= 0) {
    return null;
  }
  const m = messagesFor(locale).game.requests;
  return minutes < 60
    ? m.heldMinutes(minutes)
    : m.heldHours(Math.floor(minutes / 60));
}

/** `C− · Wants the seat and to join Gooz of Arad · Came through Yousif's link · held 21h · Requested today`. */
export function seatHoldRequestRowMeta(
  request: SeatHoldRequestRow,
  locale: Locale,
  now?: Date,
) {
  const m = messagesFor(locale);
  return requestRowMeta(
    request.createdAt,
    locale,
    [
      formatLevelTenths(request.levelTenths) ?? m.level.request.noLevel,
      request.provisional ? m.level.request.provisional : null,
      m.game.requests.seatAndGroup(groupDisplayName(request.groupName, locale)),
      request.invitedBy?.name
        ? m.game.requests.viaLinkFrom(request.invitedBy.name)
        : m.game.requests.viaLink,
      seatHoldRemainingLabel(request.seatHeldUntil, locale, now),
    ],
    now,
  );
}

/** `Wants the seat and to join Gooz of Arad. Came through Yousif's link.` */
export function seatHoldRequestDetail(
  request: Pick<SeatHoldRequestRow, "groupName" | "invitedBy">,
  locale: Locale,
) {
  const m = messagesFor(locale).game.requests;
  return [
    m.seatAndGroup(groupDisplayName(request.groupName, locale)),
    request.invitedBy?.name ? m.viaLinkFrom(request.invitedBy.name) : m.viaLink,
  ]
    .map((sentence) => m.sentence(sentence))
    .join(" ");
}

/** `2 waiting, seats held`, `1 waiting`, or the empty line. */
export function requestsQueueHeading(
  counts: { levelRange: number; seatHolds: number },
  locale: Locale,
) {
  const m = messagesFor(locale).game.requests;
  const total = counts.levelRange + counts.seatHolds;
  if (total === 0) {
    return m.none;
  }
  return counts.seatHolds > 0 ? m.waitingSeatsHeld(total) : m.waiting(total);
}
