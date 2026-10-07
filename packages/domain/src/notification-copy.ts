import { formatDayMonth } from "./format-game-start";
import { gameFormatLabel } from "./game-format-label";
import { groupDisplayName } from "./group-join";
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

function plain(text: string): NotificationTitlePart {
  return { text, strong: false };
}

function actorName(actor: NotificationCopyInput["actor"]) {
  return actor?.name ?? "Someone";
}

/** A nameless Game reads as its format and day, `Friendly game · Thu 9 Oct`. */
function notificationGameName(game: NotificationGame) {
  if (game.name?.trim()) {
    return game.name;
  }
  const format = gameFormatLabel(game.format);
  return game.windowStart
    ? `${format} · ${formatDayMonth(game.windowStart, { weekday: "short" })}`
    : format;
}

/** A named Team, else both Users of a pair or unnamed Team, else the actor. */
function joinSubject(item: NotificationCopyInput): NotificationTitlePart[] {
  if (item.team?.name) {
    return [strong(item.team.name)];
  }
  if (item.partner) {
    return [
      strong(actorName(item.actor)),
      plain(" and "),
      strong(item.partner.name),
    ];
  }
  return [strong(actorName(item.actor))];
}

/** Null for a `type` or `audience` this client does not know, so the row is skipped. */
export function notificationCopy(
  item: NotificationCopyInput,
): NotificationCopy | null {
  if (item.type === "group_member_joined" && item.audience === "admin") {
    return {
      title: [
        strong(actorName(item.actor)),
        plain(" joined "),
        strong(groupDisplayName(item.group?.name)),
      ],
      subline: null,
    };
  }
  if (
    item.type === "game_player_joined" &&
    item.audience === "admin" &&
    item.game
  ) {
    return {
      title: [
        ...joinSubject(item),
        plain(item.viaWaitlist ? " came off the Waitlist into " : " joined "),
        strong(notificationGameName(item.game)),
      ],
      subline: null,
    };
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
  now: Date = new Date(),
) {
  const time = formatNotificationTime(item.createdAt, now);
  return item.game && item.group
    ? `${time} · ${groupDisplayName(item.group.name)}`
    : time;
}

/** `Just now`, `2 min ago`, `3 h ago`, `Yesterday`, `4 days ago`, then `3 Oct`. */
export function formatNotificationTime(
  createdAt: Date | string,
  now: Date = new Date(),
) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const minutesAgo = Math.floor(
    (now.getTime() - date.getTime()) / MS_PER_MINUTE,
  );
  const daysAgo = productDaysBetween(date, now);
  if (daysAgo <= 0) {
    if (minutesAgo < 1) {
      return "Just now";
    }
    if (minutesAgo < 60) {
      return `${minutesAgo} min ago`;
    }
    return `${Math.floor(minutesAgo / 60)} h ago`;
  }
  if (daysAgo === 1) {
    return "Yesterday";
  }
  if (daysAgo < RELATIVE_DAYS) {
    return `${daysAgo} days ago`;
  }
  return formatDayMonth(date, {
    year: zonedParts(date).year !== zonedParts(now).year,
  });
}

/** The Notifications page's top row, shown only when `count > 0`. */
export function invitesWaitingLabel(count: number) {
  return `${count} ${count === 1 ? "invite" : "invites"} waiting`;
}
