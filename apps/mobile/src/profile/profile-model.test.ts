import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createProfileFixtures } from "@repo/domain/profile-fixtures";

import {
  allTimeFromApi,
  positionFromApi,
  profileModelFromFixture,
} from "./profile-model";

describe("positionFromApi", () => {
  it("reads an unanswered position as null and locks editing while provisioning", () => {
    const state = {
      provisioning: true,
      preferredPosition: null,
      onboardingCompletedAt: null,
      hasRating: false,
      canSelfDeclare: false,
    } as const;
    assert.deepEqual(positionFromApi(state), {
      position: null,
      editable: false,
    });
  });

  it("keeps a stored position and allows editing once provisioned", () => {
    const state = {
      provisioning: false,
      preferredPosition: "right",
      onboardingCompletedAt: new Date(),
      hasRating: true,
      canSelfDeclare: false,
    } as const;
    assert.deepEqual(positionFromApi(state), {
      position: "right",
      editable: true,
    });
  });
});

describe("allTimeFromApi", () => {
  it("flattens the most played partner to a name", () => {
    const input = allTimeFromApi({
      matchesPlayed: 4,
      matchesWon: 2,
      matchesLost: 1,
      setsWon: 5,
      setsLost: 3,
      longestWinStreak: 2,
      mostPlayedPartner: { userId: "u1", name: "Sam Carter" },
      firstMatchAt: null,
    });
    assert.equal(input.mostPlayedPartnerName, "Sam Carter");
    assert.equal(input.matchesWon, 2);
  });
});

describe("profileModelFromFixture", () => {
  it("renders every slot ready from a fixture", () => {
    const model = profileModelFromFixture(createProfileFixtures().confirmed);
    assert.equal(model.level.status, "ready");
    assert.equal(model.allTime.status, "ready");
    assert.equal(model.recentForm.status, "ready");
    assert.equal(model.position.status, "ready");
  });
});
