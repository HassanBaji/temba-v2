import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  detailBackHref,
  pageHidesMobileTopBar,
  playerMatchesPath,
  playerProfilePath,
  titleFromPath,
} from "./dashboard-paths";

describe("titleFromPath", () => {
  it("titles the Notifications page", () => {
    assert.equal(titleFromPath("/dashboard/notifications"), "Notifications");
  });

  it("titles Settings for the Profile settings route", () => {
    assert.equal(titleFromPath("/dashboard/you/settings"), "Settings");
  });

  it("titles Profile for the rest of /dashboard/you", () => {
    assert.equal(titleFromPath("/dashboard/you"), "Profile");
    assert.equal(titleFromPath("/dashboard/you/extra"), "Profile");
  });

  it("keeps Create Game for the single create route", () => {
    assert.equal(titleFromPath("/dashboard/games/new"), "Create Game");
  });

  it("uses Create Game for the retired tournament path", () => {
    assert.equal(
      titleFromPath("/dashboard/games/new-tournament"),
      "Create Game",
    );
  });
});

describe("detailBackHref", () => {
  it("returns Profile for the Settings page", () => {
    assert.equal(detailBackHref("/dashboard/you/settings"), "/dashboard/you");
    assert.equal(detailBackHref("/dashboard/you/settings/"), "/dashboard/you");
  });

  it("returns Home for the Notifications page", () => {
    assert.equal(detailBackHref("/dashboard/notifications"), "/dashboard");
  });

  it("leaves the Invites page without a back target", () => {
    assert.equal(detailBackHref("/dashboard/invites"), undefined);
  });

  it("does not treat Profile itself as a detail page", () => {
    assert.equal(detailBackHref("/dashboard/you"), undefined);
  });

  it("keeps existing detail back targets", () => {
    assert.equal(detailBackHref("/dashboard/groups/abc"), "/dashboard/groups");
    assert.equal(detailBackHref("/dashboard/teams/abc"), "/dashboard/teams");
    assert.equal(detailBackHref("/dashboard/venues/abc"), "/dashboard/venues");
    assert.equal(detailBackHref("/dashboard/games/abc"), "/dashboard/games");
    assert.equal(
      detailBackHref("/dashboard/communities/abc", true),
      "/dashboard/communities",
    );
    assert.equal(
      detailBackHref("/dashboard/communities/abc", false),
      "/dashboard",
    );
  });
});

describe("pageHidesMobileTopBar", () => {
  it.each([
    "/dashboard",
    "/dashboard/you",
    "/dashboard/you/settings",
    "/dashboard/games/new",
    "/dashboard/groups/abc",
  ])("hides the top bar on %s", (pathname) => {
    assert.equal(pageHidesMobileTopBar(pathname), true);
  });

  it.each([
    "/dashboard/games",
    "/dashboard/games/abc",
    "/dashboard/groups",
    "/dashboard/groups/new",
    "/dashboard/communities/abc",
    "/dashboard/invites",
    "/dashboard/youth",
  ])("keeps the top bar on %s", (pathname) => {
    assert.equal(pageHidesMobileTopBar(pathname), false);
  });
});

describe("Player profile paths", () => {
  const userId = "8c0f1f4e-2d0c-4f49-9a55-6a1f3b1f0a01";

  it("builds the Player profile path from the user id", () => {
    assert.equal(playerProfilePath(userId), `/dashboard/players/${userId}`);
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
    assert.equal(titleFromPath(`/dashboard/players/${userId}`), "Player");
    assert.equal(
      titleFromPath(`/dashboard/players/${userId}/matches`),
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
