import { describe, expect, it } from "vitest";

import { MARKS_FIXTURE_VIEWER_ID, createMarksFixtures } from "./marks-fixtures";
import { canGiveMark, remainingMarks, type GivenMark } from "./marks";

const NOW = new Date("2026-11-06T12:00:00.000Z");

describe("createMarksFixtures", () => {
  const fixtures = createMarksFixtures(NOW);

  it("covers no window, open and closed", () => {
    expect(fixtures.notCompleted.window).toBeNull();
    expect(fixtures.openNoneGiven.window?.state).toBe("open");
    expect(fixtures.closed.window?.state).toBe("closed");
  });

  it("only seats viewers who can give while the window is open and marks remain", () => {
    expect(fixtures.openNoneGiven.viewer).toMatchObject({
      isParticipant: true,
      canGive: true,
      remaining: 3,
    });
    expect(fixtures.capReached.viewer).toMatchObject({
      canGive: false,
      remaining: 0,
    });
    expect(fixtures.spectator.viewer).toMatchObject({
      isParticipant: false,
      canGive: false,
    });
    expect(fixtures.closed.viewer.canGive).toBe(false);
    expect(fixtures.notCompleted.viewer.canGive).toBe(false);
  });

  it("has an Unclaimed receiver and a football roster with goals and keepers", () => {
    expect(
      fixtures.unclaimedReceiver.participants.some(
        (participant) => participant.isUnclaimed,
      ),
    ).toBe(true);
    const football = fixtures.football.participants;
    expect(football.every((participant) => participant.bib != null)).toBe(true);
    expect(football.some((participant) => participant.keeper)).toBe(true);
    expect(football.some((participant) => (participant.goals ?? 0) > 0)).toBe(
      true,
    );
  });

  it("holds only marks the rules allow, and consistent counts", () => {
    for (const [key, fixture] of Object.entries(fixtures)) {
      const givenBy = new Map<string, GivenMark[]>();
      for (const mark of fixture.marks) {
        const given = givenBy.get(mark.giverUserId) ?? [];
        expect(
          canGiveMark({
            giverUserId: mark.giverUserId,
            receiverUserId: mark.receiverUserId,
            kind: mark.kind,
            sport: fixture.sport,
            window: {
              state: "open",
              opensAt: NOW,
              closesAt: NOW,
            },
            participants: fixture.participants,
            given,
          }),
          `${key} ${mark.id}`,
        ).toEqual({ ok: true });
        givenBy.set(mark.giverUserId, [...given, mark]);
      }
      const viewerGiven = givenBy.get(MARKS_FIXTURE_VIEWER_ID) ?? [];
      expect(fixture.viewer.given, key).toHaveLength(viewerGiven.length);
      expect(fixture.viewer.remaining, key).toBe(remainingMarks(viewerGiven));
      expect(fixture.summary.given, key).toBe(fixture.marks.length);
      const received = fixture.participants.reduce(
        (total, participant) =>
          total +
          participant.received.reduce((sum, entry) => sum + entry.count, 0),
        0,
      );
      expect(received, key).toBe(fixture.marks.length);
    }
  });

  it("covers every MVP state, the tally shown only once settled", () => {
    expect(fixtures.openNoneGiven.mvp).toMatchObject({
      mode: "vote",
      state: "pending",
    });
    expect(fixtures.mvpVoting.mvp).toMatchObject({
      state: "pending",
      votes: { cast: 2, eligible: 4 },
      tally: null,
    });
    expect(fixtures.mvpVoting.viewer).toMatchObject({
      canVote: true,
      vote: "user-ali",
    });
    expect(fixtures.mvpTie.mvp).toMatchObject({
      state: "tie",
      tiedUserIds: ["user-ali", MARKS_FIXTURE_VIEWER_ID],
    });
    expect(fixtures.mvpTie.viewer).toMatchObject({
      isOrganizer: true,
      canPickMvp: true,
      canVote: false,
    });
    expect(fixtures.mvpDecided.mvp).toMatchObject({
      state: "decided",
      userId: "user-yousif",
      decidedBy: "vote",
    });
    expect(fixtures.mvpDecided.mvp.tally).not.toBeNull();
    expect(fixtures.mvpDecided.mvp.settledAt).not.toBeNull();
    expect(fixtures.mvpOrganizerPick.mvp).toMatchObject({
      mode: "organizer",
      state: "decided",
      decidedBy: "organizer",
      settledAt: null,
    });
    expect(fixtures.mvpNone.mvp).toMatchObject({
      mode: "none",
      state: "none",
      userId: null,
    });
    expect(fixtures.closed.mvp).toMatchObject({ state: "none" });
    expect(fixtures.closed.mvp.settledAt).not.toBeNull();
  });
});
