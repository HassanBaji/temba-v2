import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth } from "./format-game-start";
import { gameFormatLabel } from "./game-format-label";
import { groupDisplayName } from "./group-join";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import {
  levelOverrideReasonLabel,
  type LevelOverrideReason,
} from "./level-slider";
import { productDaysBetween, zonedParts } from "./product-timezone";

export type NotificationTitlePart = { text: string; strong: boolean };

export type NotificationCopy = {
  title: NotificationTitlePart[];
  subline: string | null;
};

export type NotificationCopyInput = {
  type: string;
  audience: string;
  viaWaitlist?: boolean;
  actor: { name: string } | null;
  partner?: { name: string } | null;
  team?: { name: string | null } | null;
  group: { name: string | null } | null;
  game?: NotificationGame | null;
  gameCount?: number | null;
  levelSet?: NotificationLevelSet | null;
};

type NotificationLevelSet = {
  level: string;
  levelBand: LevelBand;
  reason: LevelOverrideReason | null;
};

type NotificationGame = {
  name: string | null;
  format: string;
  windowStart: Date | string | null;
};

const MS_PER_MINUTE = 60 * 1000;
const RELATIVE_DAYS = 7;

function strong(text: string): NotificationTitlePart {
  return { text, strong: true };
}

function actorName(actor: NotificationCopyInput["actor"], locale: Locale) {
  return actor?.name ?? messagesFor(locale).common.someone;
}

/** A nameless Game reads as its format and day, `Friendly game · Thu 9 Oct`. */
function notificationGameName(game: NotificationGame, locale: Locale) {
  if (game.name?.trim()) {
    return game.name;
  }
  const format = gameFormatLabel(game.format, locale);
  return game.windowStart
    ? messagesFor(locale).notification.gameNameWithDay(
        format,
        formatDayMonth(game.windowStart, locale, { weekday: "short" }),
      )
    : format;
}

/** A named Team, else both Users of a pair or unnamed Team, else the actor. */
function joinSubject(
  item: NotificationCopyInput,
  locale: Locale,
): NotificationTitlePart[] {
  if (item.team?.name) {
    return [strong(item.team.name)];
  }
  if (item.partner) {
    return messagesFor(locale).notification.title.pair(
      actorName(item.actor, locale),
      item.partner.name,
    );
  }
  return [strong(actorName(item.actor, locale))];
}

function gameFinishedSubline(audience: string, locale: Locale) {
  const m = messagesFor(locale).notification.subline;
  if (audience === "admin") {
    return m.everyMatchIn;
  }
  if (audience === "player") {
    return m.seeYourResults;
  }
  return null;
}

/** Null for a `type` or `audience` this client does not know, so the row is skipped. */
export function notificationCopy(
  item: NotificationCopyInput,
  locale: Locale,
): NotificationCopy | null {
  const m = messagesFor(locale).notification.title;
  if (item.type === "group_member_joined" && item.audience === "admin") {
    return {
      title: m.groupMemberJoined(
        actorName(item.actor, locale),
        groupDisplayName(item.group?.name, locale),
      ),
      subline: null,
    };
  }
  if (
    item.type === "game_player_joined" &&
    item.audience === "admin" &&
    item.game
  ) {
    const subject = joinSubject(item, locale);
    const game = notificationGameName(item.game, locale);
    return {
      title: item.viaWaitlist
        ? m.gamePlayerJoinedViaWaitlist(subject, game)
        : m.gamePlayerJoined(subject, game),
      subline: null,
    };
  }
  if (
    item.type === "game_player_left" &&
    item.audience === "admin" &&
    item.game
  ) {
    const actor = actorName(item.actor, locale);
    const game = notificationGameName(item.game, locale);
    return {
      title: item.partner
        ? m.gamePlayerLeftWithPartner(actor, game, item.partner.name)
        : m.gamePlayerLeft(actor, game),
      subline: null,
    };
  }
  if (
    item.type === "game_seated_by_organizer" &&
    item.audience === "player" &&
    item.game
  ) {
    return {
      title: m.gameSeatedByOrganizer(
        actorName(item.actor, locale),
        notificationGameName(item.game, locale),
      ),
      subline: null,
    };
  }
  if (
    item.type === "history_linked" &&
    item.audience === "player" &&
    item.gameCount
  ) {
    return {
      title: m.historyLinked(item.gameCount),
      subline: null,
    };
  }
  if (
    item.type === "level_set" &&
    item.audience === "player" &&
    item.levelSet
  ) {
    const { level, levelBand, reason } = item.levelSet;
    return {
      title: m.levelSet(
        actorName(item.actor, locale),
        `${displayLabelFromStoredBand(levelBand)} ${level}`,
      ),
      subline: reason ? levelOverrideReasonLabel(reason, locale) : null,
    };
  }
  if (item.type === "game_finished" && item.game) {
    const subline = gameFinishedSubline(item.audience, locale);
    if (subline) {
      return {
        title: m.gameFinished(notificationGameName(item.game, locale)),
        subline,
      };
    }
  }
  return null;
}

/** Relative time, plus the Group name on a Notification about a Group Game. */
export function notificationMeta(
  item: {
    createdAt: Date | string;
    group: { name: string | null } | null;
    game?: NotificationGame | null;
  },
  locale: Locale,
  now: Date = new Date(),
) {
  const time = formatNotificationTime(item.createdAt, locale, now);
  return item.game && item.group
    ? messagesFor(locale).notification.metaWithGroup(
        time,
        groupDisplayName(item.group.name, locale),
      )
    : time;
}

/** `Just now`, `2 min ago`, `3 h ago`, `Yesterday`, `4 days ago`, then `3 Oct`. */
export function formatNotificationTime(
  createdAt: Date | string,
  locale: Locale,
  now: Date = new Date(),
) {
  const m = messagesFor(locale);
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const minutesAgo = Math.floor(
    (now.getTime() - date.getTime()) / MS_PER_MINUTE,
  );
  const daysAgo = productDaysBetween(date, now);
  if (daysAgo <= 0) {
    if (minutesAgo < 1) {
      return m.notification.time.justNow;
    }
    if (minutesAgo < 60) {
      return m.notification.time.minutesAgo(minutesAgo);
    }
    return m.notification.time.hoursAgo(Math.floor(minutesAgo / 60));
  }
  if (daysAgo === 1) {
    return m.common.yesterday;
  }
  if (daysAgo < RELATIVE_DAYS) {
    return m.notification.time.daysAgo(daysAgo);
  }
  return formatDayMonth(date, locale, {
    year: zonedParts(date).year !== zonedParts(now).year,
  });
}

/** The Notifications page's top row, shown only when `count > 0`. */
export function invitesWaitingLabel(count: number, locale: Locale) {
  return messagesFor(locale).notification.invitesWaiting(count);
}
