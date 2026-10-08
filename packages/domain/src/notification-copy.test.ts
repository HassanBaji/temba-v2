import { describe, expect, it } from "vitest";

import {
  formatNotificationAge,
  notificationCopy,
  UNKNOWN_ACTOR_NAME,
} from "./notification-copy";

const NOW = new Date("2026-10-08T10:00:00.000Z");

function minutesBefore(minutes: number) {
  return new Date(NOW.getTime() - minutes * 60_000);
}

describe("formatNotificationAge", () => {
  it("reads in minutes, hours, then days", () => {
    expect(formatNotificationAge(minutesBefore(0.5), NOW)).toBe("Just now");
    expect(formatNotificationAge(minutesBefore(2), NOW)).toBe("2 min ago");
    expect(formatNotificationAge(minutesBefore(59), NOW)).toBe("59 min ago");
    expect(formatNotificationAge(minutesBefore(180), NOW)).toBe("3 h ago");
    expect(formatNotificationAge(minutesBefore(24 * 60), NOW)).toBe(
      "Yesterday",
    );
    expect(formatNotificationAge(minutesBefore(3 * 24 * 60), NOW)).toBe(
      "3 days ago",
    );
  });

  it("falls back to the day and month after a week", () => {
    expect(formatNotificationAge(minutesBefore(10 * 24 * 60), NOW)).toBe(
      "28 Sep",
    );
  });

  it("treats a future timestamp as just now", () => {
    expect(formatNotificationAge(new Date(NOW.getTime() + 5000), NOW)).toBe(
      "Just now",
    );
  });
});

describe("notificationCopy", () => {
  const base = {
    type: "group_member_joined",
    audience: "admin",
    createdAt: minutesBefore(2),
    actor: { name: "Sara" },
    group: { name: "Sunday Crew" },
  };

  it("says who joined which Group", () => {
    const copy = notificationCopy(base, NOW);
    expect(copy?.title).toEqual([
      { text: "Sara", strong: true },
      { text: " joined ", strong: false },
      { text: "Sunday Crew", strong: true },
    ]);
    expect(copy?.subline).toBeNull();
    expect(copy?.meta).toBe("2 min ago");
  });

  it("falls back for a deleted actor", () => {
    const copy = notificationCopy({ ...base, actor: null }, NOW);
    expect(copy?.title[0]?.text).toBe(UNKNOWN_ACTOR_NAME);
  });

  it("returns null for a type or audience it does not know", () => {
    expect(notificationCopy({ ...base, type: "game_other" }, NOW)).toBeNull();
    expect(notificationCopy({ ...base, audience: "coach" }, NOW)).toBeNull();
  });
});
