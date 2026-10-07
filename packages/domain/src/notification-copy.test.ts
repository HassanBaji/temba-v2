import { bahrainDate } from "./bahrain-date.test-support";
import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatNotificationTime, notificationCopy } from "./notification-copy";

const NOW = bahrainDate(2026, 9, 10, 9, 0, 0);

describe("notificationCopy", () => {
  it("renders a Group join for an admin with the actor and Group in bold", () => {
    assert.deepEqual(
      notificationCopy({
        type: "group_member_joined",
        audience: "admin",
        actor: { name: "Sara" },
        group: { name: "Night Crew" },
      }),
      {
        title: [
          { text: "Sara", strong: true },
          { text: " joined ", strong: false },
          { text: "Night Crew", strong: true },
        ],
        subline: null,
      },
    );
  });

  it("falls back to Someone for a deleted actor and Untitled Group for a nameless Group", () => {
    const copy = notificationCopy({
      type: "group_member_joined",
      audience: "admin",
      actor: null,
      group: { name: null },
    });
    assert.equal(
      copy?.title.map((part) => part.text).join(""),
      "Someone joined Untitled Group",
    );
  });

  it("returns null for a type or audience it does not know", () => {
    assert.equal(
      notificationCopy({
        type: "something_new",
        audience: "admin",
        actor: null,
        group: null,
      }),
      null,
    );
    assert.equal(
      notificationCopy({
        type: "group_member_joined",
        audience: "spectator",
        actor: null,
        group: null,
      }),
      null,
    );
  });
});

describe("formatNotificationTime", () => {
  it("says Just now under a minute", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 8, 59, 30), NOW),
      "Just now",
    );
  });

  it("counts minutes within the hour", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 8, 58, 0), NOW),
      "2 min ago",
    );
  });

  it("counts hours earlier the same product day", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 5, 30, 0), NOW),
      "3 h ago",
    );
  });

  it("says Yesterday for the previous product day, even under 24 hours ago", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 9, 23, 30, 0), NOW),
      "Yesterday",
    );
  });

  it("counts days within the week, then switches to a date", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 4, 18, 0, 0), NOW),
      "6 days ago",
    );
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 3, 18, 0, 0), NOW),
      "3 Oct",
    );
  });

  it("adds the year for another year", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2025, 11, 20, 18, 0, 0), NOW),
      "20 Dec 2025",
    );
  });
});
