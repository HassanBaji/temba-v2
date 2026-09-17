import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { profileSettingsAriaLabel } from "./profile-chrome";

describe("profileSettingsAriaLabel", () => {
  it("names the gear Settings when there are no pending invites", () => {
    assert.equal(profileSettingsAriaLabel(0), "Settings");
  });

  it("includes the pending invite count in the accessible name", () => {
    assert.equal(profileSettingsAriaLabel(1), "Settings, 1 pending invites");
    assert.equal(profileSettingsAriaLabel(3), "Settings, 3 pending invites");
  });
});
