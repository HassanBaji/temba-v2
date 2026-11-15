import { describe, expect, it } from "vitest";

import {
  notificationRows,
  type NotificationRowInput,
} from "./notifications-model";

const NOW = new Date("2026-10-10T06:00:00.000Z");

function item(patch: Partial<NotificationRowInput>): NotificationRowInput {
  return {
    id: "n1",
    type: "group_member_joined",
    audience: "admin",
    createdAt: new Date("2026-10-10T05:58:00.000Z"),
    readAt: null,
    actor: { name: "Sara", image: "https://img.example/sara.png" },
    group: { id: "g1", name: "Night Crew" },
    game: null,
    challenge: null,
    ...patch,
  };
}

describe("notificationRows", () => {
  it("builds an unread row that opens the Group", () => {
    const [row] = notificationRows([item({})], "en", NOW);
    expect(row).toMatchObject({
      id: "n1",
      unread: true,
      path: "/groups/g1",
      meta: "2 min ago",
      leading: {
        kind: "actor",
        name: "Sara",
        image: "https://img.example/sara.png",
      },
    });
    expect(row?.title.map((part) => part.text).join("")).toBe(
      "Sara joined Night Crew",
    );
  });

  it("marks a read row as read", () => {
    const [row] = notificationRows(
      [item({ readAt: new Date("2026-10-10T05:59:00.000Z") })],
      "en",
      NOW,
    );
    expect(row?.unread).toBe(false);
  });

  it("leaves out a Notification with no copy or no target", () => {
    expect(
      notificationRows(
        [item({ type: "something_new" }), item({ id: "n2", group: null })],
        "en",
        NOW,
      ),
    ).toEqual([]);
  });

  it("uses an icon for a linked history", () => {
    const [row] = notificationRows(
      [
        item({
          type: "history_linked",
          audience: "player",
          actor: null,
          group: null,
          gameCount: 3,
        }),
      ],
      "en",
      NOW,
    );
    expect(row?.leading).toEqual({ kind: "history" });
    expect(row?.path).toBe("/games?tab=history");
  });
});
