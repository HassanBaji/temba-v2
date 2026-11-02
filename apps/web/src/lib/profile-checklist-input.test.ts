import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  profileChecklistInputFrom,
  type ChecklistUserLike,
} from "./profile-checklist-input";

function user(overrides: Partial<ChecklistUserLike> = {}): ChecklistUserLike {
  return {
    firstName: "Mikael",
    lastName: "Karlsson",
    hasImage: false,
    primaryEmailAddress: null,
    ...overrides,
  };
}

describe("profileChecklistInputFrom", () => {
  it("reads a complete profile", () => {
    assert.deepEqual(
      profileChecklistInputFrom(
        user({
          hasImage: true,
          primaryEmailAddress: { verification: { status: "verified" } },
        }),
        new Date("2026-01-01T00:00:00Z"),
      ),
      {
        hasName: true,
        hasPhoto: true,
        hasVerifiedEmail: true,
        sportsDone: true,
      },
    );
  });

  it("needs both names, a verified primary email and a finished questionnaire", () => {
    assert.deepEqual(
      profileChecklistInputFrom(
        user({
          lastName: "  ",
          primaryEmailAddress: { verification: { status: "unverified" } },
        }),
        null,
      ),
      {
        hasName: false,
        hasPhoto: false,
        hasVerifiedEmail: false,
        sportsDone: false,
      },
    );
  });

  it("treats a missing primary email as unverified", () => {
    assert.equal(
      profileChecklistInputFrom(user(), null).hasVerifiedEmail,
      false,
    );
  });
});
