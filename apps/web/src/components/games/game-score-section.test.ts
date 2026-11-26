import { createElement, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { scoreReviewView } from "@repo/domain/score-review";
import { LocaleProvider } from "~/components/locale-provider";

import { ScoreReviewBar } from "./friendly-game-cta-bar";
import { GameScoreSection } from "./game-score-section";
import type { ScoreReview } from "./use-score-review";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));
vi.mock("~/lib/set-locale-action", () => ({
  setLocaleAction: async () => undefined,
}));

type SectionProps = ComponentProps<typeof GameScoreSection>;

const seat = (userId: string, name: string) => ({ userId, name });
const sides = [
  {
    sideIndex: 1,
    gameTeamId: "team-a",
    left: seat("layla", "Layla Haddad"),
    right: seat("rashed", "Rashed Kanoo"),
  },
  {
    sideIndex: 2,
    gameTeamId: "team-b",
    left: seat("hassan", "Hassan Haji"),
    right: seat("khalid", "Khalid Janahi"),
  },
] as unknown as SectionProps["sides"];

const match = {
  id: "match",
  status: "pending",
  canScoreSets: true,
  slot1GameTeamId: "team-a",
  slot2GameTeamId: "team-b",
  outcome: { slot1SetWins: 2, slot2SetWins: 1, result: "slot1" },
  sets: [
    { id: "s1", slot1GamesWon: 7, slot2GamesWon: 6 },
    { id: "s2", slot1GamesWon: 0, slot2GamesWon: 6 },
    { id: "s3", slot1GamesWon: 7, slot2GamesWon: 5 },
  ],
} as unknown as SectionProps["match"];

const confirmation = {
  confirmedUserIds: ["layla"],
  requiredUserIds: ["layla", "rashed", "hassan", "khalid"],
  viewerHasConfirmed: false,
  sideConfirmedUserIds: ["layla", "rashed"],
  scoreEntry: {
    enteredByUserId: "layla",
    enteredByName: "Layla Haddad",
    enteredAt: new Date("2026-11-26T18:42:00.000Z"),
    change: null,
  },
  confirmedAt: null,
  organizerSides: [],
  confirmedByOrganizer: false,
  viewerConfirmsAsOrganizer: false,
} as unknown as NonNullable<SectionProps["matchResultConfirmation"]>;

function reviewFor(
  editing: boolean,
  drafts: ScoreReview["drafts"] = {},
): ScoreReview {
  const view = scoreReviewView(
    {
      phase: "needs_results",
      match,
      confirmation,
      viewerUserId: "hassan",
      viewerGameTeamId: "team-b",
      draftSets: editing
        ? match.sets.map((set) => ({
            slot1GamesWon: drafts[set.id]?.slot1 ?? set.slot1GamesWon,
            slot2GamesWon: drafts[set.id]?.slot2 ?? set.slot2GamesWon,
          }))
        : null,
      draftValid: true,
    },
    "en",
  );
  return {
    active: view.active,
    editing,
    drafts,
    reason: editing ? "set_score_wrong" : null,
    bar: view.bar,
    pending: false,
    onChangeDraft: () => undefined,
    onToggleReason: () => undefined,
    onAction: () => undefined,
  };
}

function render(element: ReactElement) {
  return renderToStaticMarkup(
    createElement(LocaleProvider, { locale: "en", children: element }),
  );
}

function section(review: ScoreReview) {
  return render(
    createElement(GameScoreSection, {
      phase: "needs_results",
      match,
      sides,
      viewerUserId: "hassan",
      winningGameTeamId: null,
      matchResultConfirmation: confirmation,
      isOrganizer: false,
      courtFull: true,
      scorePending: false,
      confirmPending: false,
      review,
      onSaveSets: () => undefined,
      onConfirm: () => undefined,
    }),
  );
}

describe("GameScoreSection once a score is in", () => {
  it("shows the other side a read-only score, who entered it and whose turn it is", () => {
    const html = section(reviewFor(false));

    expect(html).not.toContain("<input");
    expect(html).not.toContain("Save score");
    expect(html).toContain("Layla &amp; Rashed won 2–1.");
    expect(html).toContain("Entered by Layla Haddad at 9:42 PM.");
    expect(html).toContain("Entered it");
    expect(html).toContain("Your turn");
    expect(html).toContain("Team A, Set 1: 7 games, won this Set");
    expect(html).not.toContain("What is wrong, optional");
    expect(html).not.toMatch(/<button[^>]*>Confirm/);
  });

  it("opens the boxes with the entered score to dispute it, rings what changed and offers the reasons", () => {
    const html = section(
      reviewFor(true, {
        s1: { slot1: 7, slot2: 6 },
        s2: { slot1: 3, slot2: 6 },
        s3: { slot1: 7, slot2: 5 },
      }),
    );

    expect(html.match(/<input/g)).toHaveLength(6);
    expect(html.match(/ring-ink/g)).toHaveLength(1);
    expect(html).toContain("Team A, Set 2, changed");
    expect(html).toContain("You are changing the score Layla entered.");
    expect(html).toContain("What is wrong, optional");
    expect(html).toMatch(/aria-pressed="true"[^>]*>A set score is wrong/);
    expect(html).toContain("We did not finish");
  });
});

describe("ScoreReviewBar", () => {
  const bar = (review: ScoreReview) =>
    render(
      createElement(ScoreReviewBar, {
        bar: review.bar!,
        pending: false,
        onAction: () => undefined,
      }),
    );

  it("offers exactly two actions on an entered score: dispute and edit, or confirm", () => {
    const html = bar(reviewFor(false));

    expect(html).toContain("Layla entered the score");
    expect(html).toContain(
      "Your team lost 1–2. Confirm it, or change it if it is wrong.",
    );
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html.indexOf("Dispute and edit")).toBeLessThan(
      html.indexOf("Confirm score"),
    );
  });

  it("sends a change only once a box differs", () => {
    const untouched = bar(reviewFor(true));
    expect(untouched).toContain("Nothing changed yet.");
    expect(untouched).toMatch(/<button[^>]*disabled=""[^>]*>Send new score/);

    const changed = bar(reviewFor(true, { s2: { slot1: 3, slot2: 6 } }));
    expect(changed).toContain("Set 2 changed.");
    expect(changed).not.toMatch(/<button[^>]*disabled=""[^>]*>Send new score/);
  });
});
