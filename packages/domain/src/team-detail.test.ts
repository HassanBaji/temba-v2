import { describe, expect, it } from "vitest";

import {
  teamDetailView,
  teamSetsLine,
  type TeamDetailInput,
} from "./team-detail";
import { formatsPlayable } from "./team-roster";

const NOW = new Date("2026-11-09T09:00:00.000Z");

function member(
  id: string,
  name: string,
  flags: Partial<TeamDetailInput["members"][number]> = {},
): TeamDetailInput["members"][number] {
  return {
    id,
    userId: `user-${id}`,
    name,
    image: null,
    isCreator: false,
    isViewer: false,
    level: null,
    levelBand: null,
    preferredPosition: null,
    footballRole: null,
    footballPosition: null,
    ...flags,
  };
}

function padel(overrides: Partial<TeamDetailInput> = {}): TeamDetailInput {
  return {
    displayName: "Seef Smashers",
    sport: "padel",
    waitingForPartner: false,
    record: { gamesPlayed: 10, wins: 7, draws: 0, losses: 3 },
    form: [],
    formGames: [
      { result: "won", playedAt: new Date("2026-09-14T17:00:00.000Z") },
      { result: "lost", playedAt: new Date("2026-10-20T17:00:00.000Z") },
      { result: "won", playedAt: new Date("2026-11-02T17:00:00.000Z") },
    ],
    rivals: [
      {
        teamId: "riffa",
        name: "Riffa Rackets",
        played: 3,
        wins: 2,
        draws: 0,
        losses: 1,
        lastResult: "won",
        lastPlayedAt: new Date("2026-10-30T17:00:00.000Z"),
        lastSets: [
          { us: 6, them: 3 },
          { us: 4, them: 6 },
          { us: 6, them: 2 },
        ],
      },
      {
        teamId: "juffair",
        name: "Juffair Duo",
        played: 2,
        wins: 1,
        draws: 0,
        losses: 1,
        lastResult: "lost",
        lastPlayedAt: new Date("2026-10-20T17:00:00.000Z"),
        lastSets: [
          { us: 3, them: 6 },
          { us: 5, them: 7 },
        ],
      },
    ],
    closestRival: null,
    challengeGames: [
      {
        startsAt: new Date("2026-11-12T17:00:00.000Z"),
        cancelled: false,
        opponent: { teamId: "riffa" },
      },
    ],
    games: [
      {
        matchId: "match-1",
        gameId: "game-1",
        playedAt: new Date("2026-11-02T17:00:00.000Z"),
        venueName: "Ace Padel",
        opponent: { teamId: "juffair", name: "Juffair Duo" },
        sets: [
          { us: 6, them: 3 },
          { us: 6, them: 4 },
        ],
        result: "won",
      },
    ],
    members: [
      member("hh", "Hassan Haji", {
        isCreator: true,
        isViewer: true,
        level: "3.4",
        levelBand: "C2",
        preferredPosition: "right",
      }),
      member("am", "Ali Mansoor", {
        level: "3.3",
        levelBand: "C2",
        preferredPosition: "left",
      }),
    ],
    roster: {
      min: 2,
      max: 2,
      completeAt: 2,
      count: 2,
      complete: true,
      full: true,
      formatsPlayable: [],
    },
    groupTag: null,
    canClearGroupTag: false,
    groupTagOptions: [],
    canInvite: false,
    canDissolve: true,
    viewerCanLeave: false,
    viewerActsForTeam: true,
    createdAt: new Date("2026-09-03T10:00:00.000Z"),
    shareUrl: "https://temba.example/dashboard/teams/seef",
    ...overrides,
  };
}

function football(overrides: Partial<TeamDetailInput> = {}): TeamDetailInput {
  const members = Array.from({ length: 12 }, (_, index) =>
    member(`p${index}`, `Player ${index}`),
  );
  members[0] = member("hh", "Hassan Haji", {
    isCreator: true,
    isViewer: true,
    level: "2.8",
    levelBand: "C2",
    ovr: 64,
    footballRole: "outfield",
    footballPosition: "def",
  });
  members[1] = member("gk", "Hamad A", { footballRole: "keeper" });
  return padel({
    displayName: "Gooz FC",
    sport: "football",
    record: { gamesPlayed: 7, wins: 4, draws: 1, losses: 2 },
    rivals: [],
    closestRival: {
      teamId: "hidd",
      name: "Hidd United",
      played: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      lastResult: "won",
      lastPlayedAt: new Date("2026-11-07T17:00:00.000Z"),
      lastSets: [{ us: 3, them: 1 }],
    },
    challengeGames: [
      {
        startsAt: new Date("2026-11-13T16:00:00.000Z"),
        cancelled: false,
        opponent: { teamId: "hidd" },
      },
    ],
    members,
    roster: {
      min: 5,
      max: 20,
      completeAt: 5,
      count: 12,
      complete: true,
      full: false,
      formatsPlayable: formatsPlayable(12),
    },
    groupTag: { id: "gooz", name: "Gooz of Arad" },
    canInvite: true,
    ...overrides,
  });
}

describe("teamDetailView hero", () => {
  it("carries the Team image for the crest", () => {
    const view = teamDetailView(
      padel({ imageUrl: "https://media.example/team.jpg" }),
      NOW,
      "en",
    );
    expect(view.hero.imageUrl).toBe("https://media.example/team.jpg");
    expect(view.hero.initials).toBe("SS");
  });

  it("reads a padel Team as its sport, Team Level and month made, with the two members", () => {
    const view = teamDetailView(padel(), NOW, "en");
    expect(view.hero.initials).toBe("SS");
    expect(view.hero.imageUrl).toBeNull();
    expect(view.hero.subtitle).toBe("Padel, C. Since Sep 2026");
    expect(view.hero.record).toMatchObject({
      label: "Record",
      value: "7–3",
      caption: "10 games",
    });
    expect(view.hero.seats).toMatchObject({
      kind: "members",
      tiles: [{ initials: "HH" }, { initials: "AM" }],
      openSeats: 0,
    });
    expect(view.hero.primary).toEqual({
      kind: "post",
      label: "Post a challenge",
    });
    expect(view.hero.share?.url).toBe(
      "https://temba.example/dashboard/teams/seef",
    );
  });

  it("reads a football Team with draws, its Group and Formats, and the Roster strip", () => {
    const view = teamDetailView(football(), NOW, "en");
    expect(view.hero.subtitle).toBe(
      "Football, OVR 64. Gooz of Arad's team. Plays 5, 6 and 7-a-side",
    );
    expect(view.hero.record).toMatchObject({
      value: "4–1–2",
      caption: "won, drawn, lost",
    });
    expect(view.hero.seats).toEqual({
      kind: "roster",
      label: "Roster 12 of 20",
      filled: 12,
      total: 20,
    });
  });

  it("offers the partner invite before posting while the seat is open", () => {
    const data = padel({
      waitingForPartner: true,
      canInvite: true,
      members: [padel().members[0]!],
      roster: { ...padel().roster, count: 1, complete: false, full: false },
    });
    const view = teamDetailView(data, NOW, "en");
    expect(view.hero.primary?.kind).toBe("invite");
    expect(view.hero.seats).toMatchObject({ openSeats: 1 });
    expect(view.members.openSeat).toMatchObject({ action: "invite" });
  });

  it("shows no post button to someone who does not act for the Team", () => {
    const view = teamDetailView(padel({ viewerActsForTeam: false }), NOW, "en");
    expect(view.hero.primary).toBeNull();
    expect(view.rivals.rows[0]?.rematch).toBeNull();
    expect(view.rivals.footnote).toBeNull();
  });
});

describe("teamDetailView form", () => {
  it("lists results oldest first with the slots still to play at the new end", () => {
    const view = teamDetailView(padel(), NOW, "en");
    expect(view.form.slots.map((slot) => slot.variant)).toEqual([
      "won",
      "lost",
      "won",
      ...Array.from({ length: 7 }, () => "not-played"),
    ]);
    expect(view.form.ends).toEqual({ oldest: "14 Sep", newest: "2 Nov" });
    expect(view.form.scope).toBe("All time");
    expect(view.form.emptyCopy).toBeNull();
  });

  it("is all hatched with no dates before the first result", () => {
    const view = teamDetailView(padel({ formGames: [] }), NOW, "en");
    expect(view.form.slots.every((slot) => slot.variant === "not-played")).toBe(
      true,
    );
    expect(view.form.ends).toBeNull();
    expect(view.form.emptyCopy).not.toBeNull();
  });
});

describe("teamDetailView rivals", () => {
  it("scores the last Match and names the next one", () => {
    const view = teamDetailView(padel(), NOW, "en");
    expect(view.rivals.subtitle).toBe("played 2 or more times");
    expect(view.rivals.rows.map((row) => [row.name, row.headToHead])).toEqual([
      ["Riffa Rackets", "2–1"],
      ["Juffair Duo", "1–1"],
    ]);
    expect(view.rivals.rows[0]?.line).toBe(
      "Last: won 6–3, 4–6, 6–2 on 30 Oct. Next Thu 12 Nov",
    );
    expect(view.rivals.rows[1]?.line).toBe("Last: lost 3–6, 5–7 on 20 Oct");
    expect(view.rivals.rows[0]?.initials).toBe("RR");
    expect(view.rivals.footnote).not.toBeNull();
    expect(view.rivals.empty).toBeNull();
  });

  it("shows the empty state with the closest opponent and the game that makes it two", () => {
    const view = teamDetailView(football(), NOW, "en");
    expect(view.rivals.subtitle).toBe("none yet");
    expect(view.rivals.empty).toEqual({
      title: "No rivals yet",
      body: "Play the same team twice and they show up here with the head-to-head.",
      initials: "GF",
      versus: "vs",
      closest: "Closest: Hidd United, played once. Friday makes it two.",
    });
  });

  it("drops the next game once it is cancelled", () => {
    const data = football();
    const view = teamDetailView(
      {
        ...data,
        challengeGames: data.challengeGames.map((game) => ({
          ...game,
          cancelled: true,
        })),
      },
      NOW,
      "en",
    );
    expect(view.rivals.empty?.closest).toBe(
      "Closest: Hidd United, played once.",
    );
  });
});

describe("teamDetailView members", () => {
  it("names the viewer and Captain, the court side and the Level on padel", () => {
    const view = teamDetailView(padel(), NOW, "en");
    expect(view.members.title).toBe("Members");
    expect(view.members.count).toBe("2 of 2");
    expect(view.members.rows.map((row) => [row.line, row.level])).toEqual([
      ["You, captain. Right side", "C 3.4"],
      ["Left side", "C 3.3"],
    ]);
    expect(view.members.rows[0]?.isViewer).toBe(true);
    expect(view.members.openSeat).toBeNull();
    expect(view.members.footnote).toBeNull();
  });

  it("gives football the Roster, position codes, an open seat and the squad note", () => {
    const view = teamDetailView(football(), NOW, "en");
    expect(view.members.title).toBe("Roster");
    expect(view.members.count).toBe("12 of 20");
    expect(view.members.rows[0]?.line).toBe("You, captain. DEF");
    expect(view.members.rows[0]?.level).toBe("64");
    expect(view.members.rows[0]?.accessibilityLabel).toBe(
      "Hassan Haji, You, captain. DEF, OVR 64",
    );
    expect(view.members.rows[1]?.line).toBe("GK");
    expect(view.members.more).toBe("and 6 more");
    expect(view.members.openSeat).toEqual({
      action: "add",
      title: "Open seat",
      detail: "By phone, on Temba, or from Gooz of Arad. Up to 20",
      cta: "Invite",
    });
    expect(view.members.footnote).toMatch(/^The roster is who’s on the team/);
  });
});

describe("teamDetailView games", () => {
  it("lists each game against its opponent with day, venue and every set", () => {
    const view = teamDetailView(padel(), NOW, "en");
    expect(view.games.subtitle).toBe("all from challenges");
    expect(view.games.rows).toEqual([
      expect.objectContaining({
        gameId: "game-1",
        result: "won",
        title: "vs Juffair Duo",
        meta: "Mon 2 Nov, Ace Padel",
        score: "6–3, 6–4",
      }),
    ]);
  });
});

describe("teamSetsLine", () => {
  it("skips unscored sets and is null without any", () => {
    expect(
      teamSetsLine(
        [
          { us: 4, them: 2 },
          { us: null, them: null },
        ],
        "en",
      ),
    ).toBe("4–2");
    expect(teamSetsLine([], "en")).toBeNull();
  });
});

describe("teamDetailView in Arabic", () => {
  it("builds every line from the Arabic catalog", () => {
    const view = teamDetailView(football(), NOW, "ar");
    expect(view.hero.record.caption).toBe("فوز، تعادل، خسارة");
    expect(view.rivals.empty?.title).toBe("لا منافسين بعد");
    expect(view.members.openSeat?.title).toBe("مقعد شاغر");
  });
});
