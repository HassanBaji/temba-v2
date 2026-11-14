import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatOvrFromTenths } from "./football-ovr";
import { formatLevelRangeGateCopy, formatLevelTenths } from "./level-range";
import { requestRowMeta } from "./request-meta";

export type LevelRangeRequestInput = {
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  viewerLevelTenths: number | null;
  canRequestLevelRange: boolean;
  levelRangeRequest: { status: string } | null;
  /** A football Game reads its range in OVR. */
  sport?: string | null;
};

export type LevelRangeRequestCard = {
  title: string;
  copy: string;
  badge: "Pending" | "Rejected" | null;
  actionLabel: string | null;
  actionEnabled: boolean;
};

export function levelRangeRequestCard(
  game: LevelRangeRequestInput,
  locale: Locale,
): LevelRangeRequestCard | null {
  const m = messagesFor(locale).level.request;
  const request = game.levelRangeRequest;
  const visible =
    game.canRequestLevelRange ||
    (request != null && request.status !== "approved");
  if (!visible) {
    return null;
  }
  const pending = request?.status === "pending";
  const rejected = request?.status === "rejected";
  return {
    title: m.title,
    copy: formatLevelRangeGateCopy({
      levelMinTenths: game.levelMinTenths,
      levelMaxTenths: game.levelMaxTenths,
      viewerLevelTenths: game.viewerLevelTenths,
      locale,
      sport: game.sport,
    }),
    badge: pending ? "Pending" : rejected ? "Rejected" : null,
    actionLabel: pending ? null : rejected ? m.again : m.title,
    actionEnabled: game.canRequestLevelRange,
  };
}

export function levelRangeQueueVisible(game: {
  isOrganizer: boolean;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
}) {
  return (
    game.isOrganizer &&
    (game.levelMinTenths != null || game.levelMaxTenths != null)
  );
}

/** The requester's Level on the Game's face: OVR on football, the decimal on padel. */
function requesterLevel(
  levelTenths: number | null,
  locale: Locale,
  sport?: string | null,
) {
  if (levelTenths == null) {
    return null;
  }
  return sport === "football"
    ? messagesFor(locale).level.ovr(formatOvrFromTenths(levelTenths))
    : formatLevelTenths(levelTenths);
}

export function levelRangeRequestRowMeta(
  request: {
    levelTenths: number | null;
    provisional: boolean;
    createdAt: Date | string;
  },
  locale: Locale,
  now?: Date,
  sport?: string | null,
) {
  const m = messagesFor(locale).level.request;
  return requestRowMeta(
    request.createdAt,
    locale,
    [
      requesterLevel(request.levelTenths, locale, sport) ?? m.noLevel,
      request.provisional ? m.provisional : null,
    ],
    now,
  );
}
