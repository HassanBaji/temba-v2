import { describe, expect, it } from "vitest";

import { isForbiddenError } from "./is-forbidden-error";
import {
  teamDissolveConfirm,
  teamHomeView,
  teamListRowView,
  teamNameInput,
  teamRowMeta,
  teamUnlinkConfirm,
} from "./teams";
import { createTeamsFixtures } from "./teams-fixtures";

const fixtures = createTeamsFixtures();

describe("teamNameInput", () => {
  it("trims, and leaves a blank name out", () => {
    expect(teamNameInput("  Smashers ")).toBe("Smashers");
    expect(teamNameInput("   ")).toBeUndefined();
    expect(teamNameInput("")).toBeUndefined();
  });
});

describe("teamRowMeta", () => {
  it("names the Community of a Club Team", () => {
    expect(teamRowMeta({ name: "Södermalm Padel" })).toBe(
      "Club Team · Södermalm Padel",
    );
  });

  it("says a loose Team is not linked", () => {
    expect(teamRowMeta(null)).toBe("Not linked to a Community");
  });
});

describe("teamListRowView", () => {
  it("marks an incomplete Team with an open seat", () => {
    const row = teamListRowView(fixtures.list.mixed[1]!);
    expect(row.openSeats).toBe(1);
    expect(row.incompleteLabel).toBe("Incomplete");
    expect(row.accessibilityLabel).toBe(
      "Sunday Smashers, Not linked to a Community, Incomplete",
    );
  });

  it("has no open seat on a full Team", () => {
    const row = teamListRowView(fixtures.list.mixed[0]!);
    expect(row.openSeats).toBe(0);
    expect(row.incompleteLabel).toBeNull();
    expect(row.people).toHaveLength(2);
  });
});

describe("teamHomeView", () => {
  it("shows the record and a dash for no games", () => {
    expect(teamHomeView(fixtures.home.complete).stats).toEqual([
      { label: "Games played", value: "0" },
      { label: "Wins", value: "0" },
      { label: "Losses", value: "0" },
      { label: "Win rate", value: "—" },
    ]);
    expect(teamHomeView(fixtures.home.record).stats[3]).toEqual({
      label: "Win rate",
      value: "67%",
    });
  });

  it("badges sport, link state and incompleteness", () => {
    expect(teamHomeView(fixtures.home.complete).badges).toEqual([
      "Padel",
      "Not linked to a Community",
    ]);
    expect(teamHomeView(fixtures.home.linked).badges).toEqual([
      "Padel",
      "Club Team",
    ]);
    expect(teamHomeView(fixtures.home.incomplete).badges).toEqual([
      "Padel",
      "Not linked to a Community",
      "Incomplete",
    ]);
  });

  it("offers the invite to the creator and a waiting note to others", () => {
    const creator = teamHomeView(fixtures.home.incomplete);
    expect(creator.primaryInvite).toBe(true);
    expect(creator.waitingNote).toBe(false);
    expect(creator.openSeats).toBe(1);
    const other = teamHomeView(fixtures.home.waiting);
    expect(other.primaryInvite).toBe(false);
    expect(other.waitingNote).toBe(true);
  });

  it("describes a pending link request", () => {
    expect(teamHomeView(fixtures.home.pendingLink).pendingLinkNote).toBe(
      "Pending request to Södermalm Padel.",
    );
    expect(teamHomeView(fixtures.home.complete).pendingLinkNote).toBeNull();
  });

  it("falls back for a missing name and marks the creator", () => {
    const view = teamHomeView({
      ...fixtures.home.complete,
      displayName: null,
      members: [
        { id: "m", name: null, image: null, isCreator: true, isViewer: true },
      ],
    });
    expect(view.title).toBe("Team");
    expect(view.members[0]).toMatchObject({
      name: "Member",
      creatorLabel: "Creator",
      isViewer: true,
    });
  });
});

describe("confirm copy", () => {
  it("names the Team", () => {
    expect(teamDissolveConfirm("Smashers")).toEqual({
      title: "Dissolve Smashers?",
      description: "This cannot be undone.",
      confirmLabel: "Dissolve Team",
    });
    expect(teamUnlinkConfirm("Smashers").title).toBe("Unlink Smashers?");
  });
});

describe("isForbiddenError", () => {
  it("matches only the FORBIDDEN code", () => {
    expect(isForbiddenError({ data: { code: "FORBIDDEN" } })).toBe(true);
    expect(isForbiddenError({ data: { code: "NOT_FOUND" } })).toBe(false);
    expect(isForbiddenError(null)).toBe(false);
    expect(isForbiddenError(new Error("x"))).toBe(false);
  });
});
