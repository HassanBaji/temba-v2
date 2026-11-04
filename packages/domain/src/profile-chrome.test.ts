import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { profileSettingsAriaLabel } from "./profile-chrome";

describe("profileSettingsAriaLabel", () => {
  it("names the gear Settings when there are no pending invites", () => {
    assert.equal(profileSettingsAriaLabel(0, "en"), "Settings");
  });

  it("includes the pending invite count in the accessible name", () => {
    assert.equal(
      profileSettingsAriaLabel(1, "en"),
      "Settings, 1 pending invites",
    );
    assert.equal(
      profileSettingsAriaLabel(3, "en"),
      "Settings, 3 pending invites",
    );
  });

  it("names the gear in Arabic", () => {
    assert.equal(profileSettingsAriaLabel(0, "ar"), "الإعدادات");
    assert.equal(
      profileSettingsAriaLabel(3, "ar"),
      "الإعدادات، 3 دعوات معلّقة",
    );
  });
});
