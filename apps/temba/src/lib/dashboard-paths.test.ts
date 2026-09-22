import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { detailBackHref, titleFromPath } from "./dashboard-paths";

describe("titleFromPath", () => {
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

  it("keeps the tournament page title while that route still exists", () => {
    assert.equal(
      titleFromPath("/dashboard/games/new-tournament"),
      "Create tournament",
    );
  });
});

describe("detailBackHref", () => {
  it("returns Profile for the Settings page", () => {
    assert.equal(detailBackHref("/dashboard/you/settings"), "/dashboard/you");
    assert.equal(detailBackHref("/dashboard/you/settings/"), "/dashboard/you");
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
