import {
  notificationCopy,
  notificationMeta,
  type NotificationCopyInput,
  type NotificationTitlePart,
} from "@repo/domain/notification-copy";
import type { Locale } from "@repo/i18n/locale";

import { notificationPath } from "./notification-path";

export type NotificationRowInput = NotificationCopyInput & {
  id: string;
  createdAt: Date | string;
  readAt: Date | string | null;
  actor: { name: string; image: string | null } | null;
  group: { id: string; name: string | null } | null;
  game?: (NonNullable<NotificationCopyInput["game"]> & { id: string }) | null;
  challenge?: { id: string } | null;
};

export type NotificationRowView = {
  id: string;
  unread: boolean;
  title: NotificationTitlePart[];
  subline: string | null;
  meta: string;
  path: string;
  leading:
    | { kind: "finished" }
    | { kind: "history" }
    | { kind: "actor"; name: string | null; image: string | null };
};

function leadingFor(
  item: NotificationRowInput,
): NotificationRowView["leading"] {
  if (item.type === "game_finished") {
    return { kind: "finished" };
  }
  if (item.type === "history_linked") {
    return { kind: "history" };
  }
  return {
    kind: "actor",
    name: item.actor?.name ?? null,
    image: item.actor?.image ?? null,
  };
}

/** The rows the inbox shows: a Notification with no copy or no target is left out, as on web. */
export function notificationRows(
  items: readonly NotificationRowInput[],
  locale: Locale,
  now: Date = new Date(),
): NotificationRowView[] {
  return items.flatMap((item) => {
    const copy = notificationCopy(item, locale);
    const path = notificationPath(item);
    if (!copy || !path) {
      return [];
    }
    return [
      {
        id: item.id,
        unread: item.readAt === null,
        title: copy.title,
        subline: copy.subline,
        meta: notificationMeta(item, locale, now),
        path,
        leading: leadingFor(item),
      },
    ];
  });
}
