import type { TeamHomeInput, TeamListRowInput } from "./teams";

const ADA = { name: "Ada Lindqvist", image: null };
const KIM = { name: "Kim Holm", image: null };

function member(
  id: string,
  person: { name: string; image: string | null },
  flags: { isCreator?: boolean; isViewer?: boolean } = {},
) {
  return {
    id,
    name: person.name,
    image: person.image,
    isCreator: flags.isCreator ?? false,
    isViewer: flags.isViewer ?? false,
  };
}

const COMMUNITY = { id: "community-1", name: "Södermalm Padel" };

const COMPLETE_MEMBERS = [
  member("m1", ADA, { isCreator: true, isViewer: true }),
  member("m2", KIM),
];

const BASE_HOME: TeamHomeInput = {
  displayName: "Ada Lindqvist & Kim Holm",
  sport: "padel",
  isLoose: true,
  waitingForPartner: false,
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  community: null,
  pendingLinkRequest: null,
  members: COMPLETE_MEMBERS,
  canInvite: false,
  canRequestLink: true,
  canUnlink: false,
  canDissolve: true,
};

export function createTeamsFixtures() {
  const list: Record<"mixed" | "empty", TeamListRowInput[]> = {
    mixed: [
      {
        id: "team-1",
        displayName: "Ada Lindqvist & Kim Holm",
        community: { name: COMMUNITY.name },
        incomplete: false,
        members: [ADA, KIM],
      },
      {
        id: "team-2",
        displayName: "Sunday Smashers",
        community: null,
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
    "complete" | "record" | "incomplete" | "waiting" | "linked" | "pendingLink",
    TeamHomeInput
  > = {
    complete: BASE_HOME,
    record: { ...BASE_HOME, gamesPlayed: 12, wins: 8, losses: 3 },
    incomplete: {
      ...BASE_HOME,
      displayName: "Sunday Smashers",
      waitingForPartner: true,
      members: [COMPLETE_MEMBERS[0]!],
      canInvite: true,
      canRequestLink: false,
    },
    waiting: {
      ...BASE_HOME,
      displayName: "Sunday Smashers",
      waitingForPartner: true,
      members: [member("m3", KIM, { isCreator: true })],
      canRequestLink: false,
      canDissolve: false,
    },
    linked: {
      ...BASE_HOME,
      isLoose: false,
      community: COMMUNITY,
      gamesPlayed: 5,
      wins: 2,
      losses: 3,
      canRequestLink: false,
      canUnlink: true,
    },
    pendingLink: {
      ...BASE_HOME,
      pendingLinkRequest: { community: { name: COMMUNITY.name } },
      canRequestLink: false,
    },
  };

  const communities = [
    { id: "community-1", name: COMMUNITY.name, archivedAt: null },
    { id: "community-2", name: "Bromma Padel Club", archivedAt: null },
  ];

  return { list, pendingInvites, home, communities };
}
