import { describe, expect, it } from "vitest";

import {
  initialOnboardingAnswers,
  onboardingSubmission,
  onboardingSummary,
  type OnboardingAnswers,
} from "./onboarding-answers";

const answers: OnboardingAnswers = {
  picked: { padel: true, football: true },
  padelSide: "left",
  padelLevel: "C+",
  footballRole: "outfield",
  footballPosition: "mid",
  footballPlacement: "competitive",
};

describe("onboardingSubmission", () => {
  it("sends both sports with their answers", () => {
    expect(onboardingSubmission(answers)).toEqual({
      sports: ["padel", "football"],
      padel: { preferredPosition: "left", choice: "C1" },
      football: { role: "outfield", position: "mid", choice: "C3" },
    });
  });

  it("leaves out the sport that was not picked", () => {
    expect(
      onboardingSubmission({
        ...answers,
        picked: { padel: false, football: true },
        footballRole: "keeper",
      }),
    ).toEqual({
      sports: ["football"],
      football: { role: "keeper", position: null, choice: "C3" },
    });
  });

  it("declares an unknown padel Level when none was picked", () => {
    expect(
      onboardingSubmission({
        ...answers,
        picked: { padel: true, football: false },
        padelLevel: "unknown",
      }).padel?.choice,
    ).toBe("unknown");
  });
});

describe("onboardingSummary", () => {
  it("reads each sport the way organizers will see it", () => {
    expect(onboardingSummary(answers)).toEqual([
      { sport: "Padel", line: "C+, left side" },
      { sport: "Football", line: "Midfield, competitive" },
    ]);
    expect(
      onboardingSummary({
        ...answers,
        padelLevel: "unknown",
        padelSide: "either",
        footballRole: "keeper",
        footballPlacement: "pro",
      }),
    ).toEqual([
      { sport: "Padel", line: "Level from results, either side" },
      { sport: "Football", line: "Keeper, pro" },
    ]);
  });
});

describe("initialOnboardingAnswers", () => {
  it("starts from what the User saved before", () => {
    expect(
      initialOnboardingAnswers({
        sports: ["football"],
        preferredPosition: "right",
        preferredFootballRole: "keeper",
        preferredFootballPosition: "def",
      }),
    ).toMatchObject({
      picked: { padel: false, football: true },
      padelSide: "right",
      footballRole: "keeper",
      footballPosition: "def",
    });
  });

  it("picks nothing for a User who has not answered", () => {
    expect(
      initialOnboardingAnswers({
        sports: null,
        preferredPosition: null,
        preferredFootballRole: null,
        preferredFootballPosition: null,
      }),
    ).toMatchObject({
      picked: { padel: false, football: false },
      padelSide: "either",
      footballRole: "outfield",
      footballPosition: "mid",
      footballPlacement: "competitive",
    });
  });
});
