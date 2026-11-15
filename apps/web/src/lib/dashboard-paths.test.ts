import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  detailBackHref,
  groupMembersTabHref,
  pageHidesMobileTopBar,
  playerMarkPath,
  playerMarksPath,
  playerMatchesPath,
  playerProfilePath,
  titleFromPath,
} from "./dashboard-paths";

const en = messagesFor("en");

describe("titleFromPath", () => {
  it("titles the Notifications page", () => {
    assert.equal(
      titleFromPath("/dashboard/notifications", en),
      "Notifications",
    );
  });

  it("titles the All requests page", () => {
    assert.equal(titleFromPath("/dashboard/requests", en), "Requests");
  });

  it("titles Settings for the Profile settings route", () => {
    assert.equal(titleFromPath("/dashboard/you/settings", en), "Settings");
  });

  it("titles Ratings for the Ratings page", () => {
    assert.equal(titleFromPath("/dashboard/you/ratings", en), "Ratings");
  });

  it("titles Rating history for its page", () => {
    assert.equal(
      titleFromPath("/dashboard/you/ratings/history", en),
      "Rating history",
    );
  });

  it("titles Profile for the rest of /dashboard/you", () => {
    assert.equal(titleFromPath("/dashboard/you", en), "Profile");
    assert.equal(titleFromPath("/dashboard/you/extra", en), "Profile");
  });

  it("keeps Create Game for the single create route", () => {
    assert.equal(titleFromPath("/dashboard/games/new", en), "Create Game");
  });

  it("uses Create Game for the retired tournament path", () => {
    assert.equal(
      titleFromPath("/dashboard/games/new-tournament", en),
      "Create Game",
    );
  });
});

describe("detailBackHref", () => {
  it("returns Profile for the Settings page", () => {
    assert.equal(detailBackHref("/dashboard/you/settings"), "/dashboard/you");
    assert.equal(detailBackHref("/dashboard/you/settings/"), "/dashboard/you");
  });

  it("returns Profile for the Ratings page", () => {
    assert.equal(detailBackHref("/dashboard/you/ratings"), "/dashboard/you");
  });

  it("returns Ratings for the Rating history page", () => {
    assert.equal(
      detailBackHref("/dashboard/you/ratings/history"),
      "/dashboard/you/ratings",
    );
  });

  it("returns Home for the Notifications page", () => {
    assert.equal(detailBackHref("/dashboard/notifications"), "/dashboard");
  });

  it("returns Home for the All requests page", () => {
    assert.equal(detailBackHref("/dashboard/requests"), "/dashboard");
  });

  it("leaves the Invites page without a back target", () => {
    assert.equal(detailBackHref("/dashboard/invites"), undefined);
  });

  it("does not treat Profile itself as a detail page", () => {
    assert.equal(detailBackHref("/dashboard/you"), undefined);
  });

  it("titles the Operator Groups page", () => {
    assert.equal(
      titleFromPath("/dashboard/operator/groups", en),
      "Verify Groups",
    );
  });

  it("titles the Operator Disputes page", () => {
    assert.equal(titleFromPath("/dashboard/operator/disputes", en), "Disputes");
  });

  it("keeps existing detail back targets", () => {
    assert.equal(detailBackHref("/dashboard/groups/abc"), "/dashboard/groups");
    assert.equal(detailBackHref("/dashboard/venues/abc"), "/dashboard/venues");
    assert.equal(detailBackHref("/dashboard/games/abc"), "/dashboard/games");
  });

  it("sends a Team back to Challenges, Teams", () => {
    assert.equal(
      detailBackHref("/dashboard/teams/abc"),
      "/dashboard/challenges?tab=teams",
    );
    assert.equal(titleFromPath("/dashboard/challenges", en), "Challenges");
  });
});

describe("pageHidesMobileTopBar", () => {
  it.each([
    "/dashboard",
    "/dashboard/you",
    "/dashboard/you/settings",
    "/dashboard/games/new",
    "/dashboard/groups/abc",
    "/dashboard/groups/abc/members/user_1",
  ])("hides the top bar on %s", (pathname) => {
    assert.equal(pageHidesMobileTopBar(pathname), true);
  });

  it.each([
    "/dashboard/games",
    "/dashboard/games/abc",
    "/dashboard/groups",
    "/dashboard/groups/new",
    "/dashboard/invites",
    "/dashboard/youth",
  ])("keeps the top bar on %s", (pathname) => {
    assert.equal(pageHidesMobileTopBar(pathname), false);
  });
});

describe("groupMembersTabHref", () => {
  it("opens the Members tab", () => {
    assert.equal(
      groupMembersTabHref("abc"),
      "/dashboard/groups/abc?tab=members",
    );
  });

  it("names the member whose Level was just set", () => {
    assert.equal(
      groupMembersTabHref("abc", "user_1"),
      "/dashboard/groups/abc?tab=members&saved=user_1",
    );
  });
});

describe("Player profile paths", () => {
  const userId = "8c0f1f4e-2d0c-4f49-9a55-6a1f3b1f0a01";

  it("builds the Player profile path from the user id", () => {
    assert.equal(playerProfilePath(userId), `/dashboard/players/${userId}`);
  });

  it("opens the Player profile on a sport when given", () => {
    assert.equal(
      playerProfilePath(userId, "football"),
      `/dashboard/players/${userId}?sport=football`,
    );
  });

  it("builds the Last 10 path, with the Match to open", () => {
    assert.equal(
      playerMatchesPath(userId),
      `/dashboard/players/${userId}/matches`,
    );
    assert.equal(
      playerMatchesPath(userId, "match-1"),
      `/dashboard/players/${userId}/matches?match=match-1`,
    );
  });

  it("titles the Player profile and its Last 10 page", () => {
    assert.equal(titleFromPath(`/dashboard/players/${userId}`, en), "Player");
    assert.equal(
      titleFromPath(`/dashboard/players/${userId}/matches`, en),
      "Last 10 games",
    );
  });

  it("leaves the profile's Back to the previous page and sends Last 10 to the profile", () => {
    assert.equal(detailBackHref(`/dashboard/players/${userId}`), undefined);
    assert.equal(
      detailBackHref(`/dashboard/players/${userId}/matches`),
      `/dashboard/players/${userId}`,
    );
  });

  it("hides the mobile top bar under the ink header", () => {
    assert.equal(pageHidesMobileTopBar(`/dashboard/players/${userId}`), true);
  });
});

describe("Player marks paths", () => {
  const userId = "8c0f1f4e-2d0c-4f49-9a55-6a1f3b1f0a01";
  const ar = messagesFor("ar");

  it("builds all marks, opened on a sport's tab when given", () => {
    assert.equal(playerMarksPath(userId), `/dashboard/players/${userId}/marks`);
    assert.equal(
      playerMarksPath(userId, "football"),
      `/dashboard/players/${userId}/marks?sport=football`,
    );
  });

  it("builds one kind's detail on one sport's tab", () => {
    assert.equal(
      playerMarkPath(userId, "clutch", "padel"),
      `/dashboard/players/${userId}/marks/clutch?sport=padel`,
    );
  });

  it("titles all marks Marks and a kind's detail with the mark's name", () => {
    assert.equal(
      titleFromPath(`/dashboard/players/${userId}/marks`, en),
      "Marks",
    );
    assert.equal(
      titleFromPath(`/dashboard/players/${userId}/marks/clutch`, en),
      "Clutch",
    );
    assert.equal(
      titleFromPath(`/dashboard/players/${userId}/marks/mvp`, en),
      "MVP",
    );
    assert.equal(
      titleFromPath(`/dashboard/players/${userId}/marks/clutch`, ar),
      "رجل الحسم",
    );
    assert.equal(
      titleFromPath(`/dashboard/players/${userId}/marks/chess`, en),
      "Marks",
    );
  });

  it("sends a kind's detail back to all marks and all marks to the profile", () => {
    assert.equal(
      detailBackHref(`/dashboard/players/${userId}/marks/clutch`),
      `/dashboard/players/${userId}/marks`,
    );
    assert.equal(
      detailBackHref(`/dashboard/players/${userId}/marks`),
      `/dashboard/players/${userId}`,
    );
  });

  it("keeps the mobile top bar with its Back on the marks pages", () => {
    assert.equal(
      pageHidesMobileTopBar(`/dashboard/players/${userId}/marks`),
      false,
    );
    assert.equal(
      pageHidesMobileTopBar(`/dashboard/players/${userId}/marks/clutch`),
      false,
    );
  });
});
