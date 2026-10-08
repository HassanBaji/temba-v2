import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { notificationHref } from "./notification-hrefs";

describe("notificationHref", () => {
  it("opens the Group a join happened on", () => {
    assert.equal(
      notificationHref({ type: "group_member_joined", group: { id: "g1" } }),
      "/dashboard/groups/g1",
    );
  });

  it("has no link when the Group is gone or the type is unknown", () => {
    assert.equal(
      notificationHref({ type: "group_member_joined", group: null }),
      null,
    );
    assert.equal(
      notificationHref({ type: "something_new", group: { id: "g1" } }),
      null,
    );
  });
});
