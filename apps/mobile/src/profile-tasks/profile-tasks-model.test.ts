import { describe, expect, it } from "vitest";

import {
  checklistChipLabel,
  checklistChipTasks,
  checklistFrom,
  checklistInputFrom,
  profileTaskPath,
  sportsTaskMeta,
} from "./profile-tasks-model";

const verified = { verification: { status: "verified" } };

describe("checklistInputFrom", () => {
  it("reads a full Clerk user as every task done", () => {
    expect(
      checklistInputFrom(
        {
          firstName: "Mikael",
          lastName: "Karlsson",
          hasImage: true,
          primaryEmailAddress: verified,
        },
        { onboardingCompletedAt: new Date() },
      ),
    ).toEqual({
      hasName: true,
      hasPhoto: true,
      hasVerifiedEmail: true,
      sportsDone: true,
    });
  });

  it("treats a blank last name, no image, an unverified email and open questions as not done", () => {
    expect(
      checklistInputFrom(
        {
          firstName: "Mikael",
          lastName: " ",
          hasImage: false,
          primaryEmailAddress: { verification: { status: "unverified" } },
        },
        { onboardingCompletedAt: null },
      ),
    ).toEqual({
      hasName: false,
      hasPhoto: false,
      hasVerifiedEmail: false,
      sportsDone: false,
    });
  });

  it("treats no email address as not verified", () => {
    expect(
      checklistInputFrom(
        {
          firstName: "A",
          lastName: "B",
          hasImage: false,
          primaryEmailAddress: null,
        },
        { onboardingCompletedAt: null },
      ).hasVerifiedEmail,
    ).toBe(false);
  });
});

describe("checklistFrom", () => {
  it("is null until both the user and the state are loaded", () => {
    expect(
      checklistFrom(null, { onboardingCompletedAt: null }, "en"),
    ).toBeNull();
    expect(
      checklistFrom(
        {
          firstName: "A",
          lastName: "B",
          hasImage: false,
          primaryEmailAddress: null,
        },
        undefined,
        "en",
      ),
    ).toBeNull();
  });

  it("builds the checklist once loaded", () => {
    const list = checklistFrom(
      {
        firstName: "A",
        lastName: "B",
        hasImage: true,
        primaryEmailAddress: null,
      },
      { onboardingCompletedAt: null },
      "en",
    );
    expect(list?.done).toBe(3);
    expect(list?.open.map((task) => task.id)).toEqual(["email", "sports"]);
  });
});

describe("chip and paths", () => {
  const list = checklistFrom(
    { firstName: "", lastName: "", hasImage: false, primaryEmailAddress: null },
    { onboardingCompletedAt: null },
    "en",
  )!;

  it("routes each task under the checklist", () => {
    expect(profileTaskPath("photo")).toBe("/complete-profile/photo");
  });

  it("labels the collapsed chip and lists the optional open tasks only", () => {
    expect(checklistChipLabel(list, "en")).toBe("Profile 1 OF 5 · Show");
    expect(checklistChipTasks(list, "en")).toBe("Photo, Email, Sports");
  });

  it("labels the chip in Arabic", () => {
    expect(checklistChipLabel(list, "ar")).toBe("الملف الشخصي 1 من 5 · عرض");
    expect(checklistChipTasks(list, "ar")).toBe("الصورة، البريد، الرياضات");
  });

  it("drops the old summary step from the sports progress", () => {
    expect(sportsTaskMeta({ step: 2, total: 4 }, "en")).toEqual({
      step: 2,
      total: 3,
      label: "Profile / Sports 2 of 3",
    });
  });
});
