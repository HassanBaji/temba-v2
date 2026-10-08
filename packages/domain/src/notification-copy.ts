import { formatDayMonth } from "./format-game-start";
import { productDaysBetween, zonedParts } from "./product-timezone";

const RELATIVE_DAYS = 7;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const UNKNOWN_ACTOR_NAME = "Someone";

export type NotificationCopyInput = {
  type: string;
  audience: string;
  createdAt: Date;
  actor: { name: string } | null;
  group: { name: string | null } | null;
};

export type NotificationTitlePart = { text: string; strong: boolean };

export type NotificationCopy = {
  title: NotificationTitlePart[];
  subline: string | null;
  meta: string;
};

/** `Just now`, `2 min ago`, `3 h ago`, `Yesterday`, `3 days ago`, then `4 Oct`. */
export function formatNotificationAge(createdAt: Date, now: Date = new Date()) {
  const elapsed = Math.max(0, now.getTime() - createdAt.getTime());
  if (elapsed < MINUTE_MS) {
    return "Just now";
  }
  if (elapsed < HOUR_MS) {
    return `${Math.floor(elapsed / MINUTE_MS)} min ago`;
  }
  const daysAgo = productDaysBetween(createdAt, now);
  if (daysAgo <= 0) {
    return `${Math.floor(elapsed / HOUR_MS)} h ago`;
  }
  if (daysAgo === 1) {
    return "Yesterday";
  }
  if (daysAgo < RELATIVE_DAYS) {
    return `${daysAgo} days ago`;
  }
  return formatDayMonth(createdAt, {
    year: zonedParts(createdAt).year !== zonedParts(now).year,
  });
}

/**
 * Renders a stored Notification as title, subline and meta. Returns `null` for
 * a type or audience this build does not know, so clients skip the row.
 */
export function notificationCopy(
  item: NotificationCopyInput,
  now: Date = new Date(),
): NotificationCopy | null {
  const meta = formatNotificationAge(item.createdAt, now);
  const actor = item.actor?.name ?? UNKNOWN_ACTOR_NAME;

  if (item.type === "group_member_joined" && item.audience === "admin") {
    return {
      title: [
        { text: actor, strong: true },
        { text: " joined ", strong: false },
        { text: item.group?.name ?? "your Group", strong: true },
      ],
      subline: null,
      meta,
    };
  }

  return null;
}
