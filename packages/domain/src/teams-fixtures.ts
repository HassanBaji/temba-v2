import type { TeamHomeInput, TeamListRowInput } from "./teams";

const ADA = { name: "Ada Lindqvist", image: null };
const KIM = { name: "Kim Holm", image: null };

function member(
  id: string,
  person: { name: string; image: string | null },
  flags: { isCreator?: boolean; isViewer?: boolean } = {},
): TeamHomeInput["members"][number] {
  return {
    id,
    name: person.name,
    image: person.image,
    isCreator: flags.isCreator ?? false,
    isViewer: flags.isViewer ?? false,
    level: null,
    levelBand: null,
    preferredPosition: null,
    footballRole: null,
    footballPosition: null,
  };
}

const COMPLETE_MEMBERS = [
  member("m1", ADA, { isCreator: true, isViewer: true }),
  member("m2", KIM),
];

function roster(
  sport: "padel" | "football",
  count: number,
): TeamHomeInput["roster"] {
  const rule =
    sport === "padel"
      ? { min: 2, max: 2, completeAt: 2 }
      : { min: 2, max: 25, completeAt: 5 };
  return {
    ...rule,
    count,
    complete: count >= rule.completeAt,
    full: count >= rule.max,
  };
}

const BASE_HOME: TeamHomeInput = {
  displayName: "Ada Lindqvist & Kim Holm",
  sport: "padel",
  waitingForPartner: false,
  record: { gamesPlayed: 0, wins: 0, draws: 0, losses: 0 },
  form: [],
  rivals: [],
  closestRival: null,
  games: [],
  members: COMPLETE_MEMBERS,
  canInvite: false,
  canDissolve: true,
  roster: roster("padel", 2),
  viewerCanLeave: false,
  viewerActsForTeam: true,
};

const PLAYED_AT = new Date("2026-09-04T17:00:00.000Z");

const SEEF_SMASHERS = {
  teamId: "team-rival",
  name: "Seef Smashers",
  played: 3,
  wins: 2,
  draws: 0,
  losses: 1,
  lastResult: "won" as const,
  lastPlayedAt: PLAYED_AT,
};

function footballMembers(count: number) {
  return Array.from({ length: count }, (_, index) =>
    member(`f${index + 1}`, index === 0 ? ADA : KIM, {
      isCreator: index === 0,
      isViewer: index === 0,
    }),
  );
}

export function createTeamsFixtures() {
  const list: Record<"mixed" | "empty", TeamListRowInput[]> = {
    mixed: [
      {
        id: "team-1",
        displayName: "Ada Lindqvist & Kim Holm",
        sport: "padel",
        incomplete: false,
        members: [ADA, KIM],
      },
      {
        id: "team-2",
        displayName: "Sunday Smashers",
        sport: "padel",
        incomplete: true,
        members: [ADA],
      },
    ],
    empty: [],
  };

  const pendingInvites = [
    {
      id: "team-invite-1",
      displayName: "Elin & Noor",
      invitedBy: { name: "Elin Nilsson", image: null },
    },
  ];

  const home: Record<
    | "complete"
    | "record"
    | "rivals"
    | "closest"
    | "footballRecord"
    | "incomplete"
    | "waiting"
    | "footballCreatorBuilding"
    | "footballCreatorComplete"
    | "footballCreatorFull"
    | "footballMember",
    TeamHomeInput
  > = {
    complete: BASE_HOME,
    record: {
      ...BASE_HOME,
      record: { gamesPlayed: 12, wins: 8, draws: 1, losses: 3 },
      form: ["won", "won", "lost"],
      members: [
        {
          ...COMPLETE_MEMBERS[0]!,
          level: "2.8",
          levelBand: "C2",
          preferredPosition: "left",
        },
        {
          ...COMPLETE_MEMBERS[1]!,
          level: "3.4",
          levelBand: "C2",
          preferredPosition: "either",
        },
      ],
      games: [
        {
          matchId: "match-1",
          gameId: "game-1",
          playedAt: PLAYED_AT,
          venueName: "Seef Courts",
          opponent: { teamId: "team-rival", name: "Seef Smashers" },
          sets: [
            { us: 6, them: 3 },
            { us: 6, them: 4 },
          ],
          result: "won",
        },
      ],
    },
    rivals: {
      ...BASE_HOME,
      record: { gamesPlayed: 3, wins: 2, draws: 0, losses: 1 },
      rivals: [SEEF_SMASHERS],
      closestRival: { ...SEEF_SMASHERS, teamId: "team-once", name: "Hidd" },
    },
    closest: {
      ...BASE_HOME,
      record: { gamesPlayed: 1, wins: 0, draws: 0, losses: 1 },
      closestRival: {
        ...SEEF_SMASHERS,
        played: 1,
        wins: 0,
        losses: 1,
        lastResult: "lost",
      },
    },
    footballRecord: {
      ...BASE_HOME,
      sport: "football",
      displayName: "Sunday Five",
      record: { gamesPlayed: 4, wins: 2, draws: 1, losses: 1 },
      rivals: [{ ...SEEF_SMASHERS, wins: 1, draws: 1, losses: 1 }],
      members: [
        { ...footballMembers(1)[0]!, footballRole: "keeper" },
        {
          ...member("f2", KIM),
          footballRole: "outfield",
          footballPosition: "fwd",
        },
        { ...member("f3", KIM), footballRole: "outfield" },
      ],
      roster: roster("football", 3),
      viewerActsForTeam: false,
    },
    incomplete: {
      ...BASE_HOME,
      displayName: "Sunday Smashers",
      waitingForPartner: true,
      members: [COMPLETE_MEMBERS[0]!],
      canInvite: true,
      roster: roster("padel", 1),
    },
    waiting: {
      ...BASE_HOME,
      displayName: "Sunday Smashers",
      waitingForPartner: true,
      members: [member("m3", KIM, { isCreator: true })],
      canDissolve: false,
      roster: roster("padel", 1),
    },
    footballCreatorBuilding: {
      ...BASE_HOME,
      sport: "football",
      displayName: "Sunday Five",
      waitingForPartner: true,
      members: footballMembers(2),
      canInvite: true,
      roster: roster("football", 2),
    },
    footballCreatorComplete: {
      ...BASE_HOME,
      sport: "football",
      displayName: "Sunday Five",
      members: footballMembers(7),
      canInvite: true,
      roster: roster("football", 7),
    },
    footballCreatorFull: {
      ...BASE_HOME,
      sport: "football",
      displayName: "Sunday Five",
      members: footballMembers(25),
      canInvite: false,
      roster: roster("football", 25),
    },
    footballMember: {
      ...BASE_HOME,
      sport: "football",
      displayName: "Sunday Five",
      waitingForPartner: true,
      members: footballMembers(3),
      canDissolve: false,
      viewerCanLeave: true,
      roster: roster("football", 3),
    },
  };

  return { list, pendingInvites, home };
}
