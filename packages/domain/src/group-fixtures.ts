import type {
  GroupHomeData,
  GroupLeaderboardEntryData,
  GroupMineRowData,
  GroupJoinRequestData,
  GroupPlayedGameData,
  GroupPublicRowData,
} from "./group-data";
import { createGamesHubFixtures } from "./games-hub-fixtures";

const DAY_MS = 24 * 60 * 60 * 1000;

function entry(
  position: number,
  userId: string,
  name: string,
  record: { wins: number; losses: number },
  extra: Partial<GroupLeaderboardEntryData> = {},
): GroupLeaderboardEntryData {
  const played = record.wins + record.losses;
  return {
    userId,
    name,
    image: null,
    totalSetsWon: record.wins * 2,
    totalPointsWon: record.wins * 12,
    totalGamesPlayed: played,
    position,
    isViewer: false,
    isOrganizer: false,
    wins: record.wins,
    losses: record.losses,
    levelBand: "C2",
    levelProvisional: false,
    formMarks: [],
    joinedAt: new Date("2025-02-11T12:00:00Z"),
    ...extra,
  };
}

function playedGame(
  id: string,
  daysAgo: number,
  now: Date,
  extra: Partial<GroupPlayedGameData> = {},
): GroupPlayedGameData {
  return {
    id,
    displayTime: new Date(now.getTime() - daysAgo * DAY_MS),
    cancelled: false,
    slot1Members: [
      { id: "viewer", name: "Alex Rivera", image: null, isViewer: true },
      { id: "ada", name: "Ada Lindqvist", image: null, isViewer: false },
    ],
    slot2Members: [
      { id: "kim", name: "Kim Holm", image: null, isViewer: false },
      { id: "elin", name: "Elin Nilsson", image: null, isViewer: false },
    ],
    scoredSets: [
      { slot1GamesWon: 6, slot2GamesWon: 4 },
      { slot1GamesWon: 4, slot2GamesWon: 6 },
      { slot1GamesWon: 7, slot2GamesWon: 5 },
    ],
    viewerSlot: 1,
    outcome: "won",
    ...extra,
  };
}

/** Each key is one state of the Groups tab or of a Group home. */
export function createGroupFixtures(now = new Date()) {
  const upcomingGames = createGamesHubFixtures(now).mixed.myGames.filter(
    (game) => game.matchId === null,
  );

  const mine: GroupMineRowData[] = [
    {
      id: "group-bromma",
      name: "Bromma Tuesday",
      imageUrl: "/api/media/group-images/group-bromma/image?v=1",
      memberCount: 14,
      standingPosition: 3,
      nextGameStartTime: new Date(now.getTime() + 2 * DAY_MS),
      formMarks: ["won", "won", "lost", "won", "not-played"],
    },
    {
      id: "group-new",
      name: "Sunday Smash",
      imageUrl: null,
      memberCount: 1,
      standingPosition: null,
      nextGameStartTime: null,
      formMarks: [],
    },
    {
      id: "group-unnamed",
      name: null,
      imageUrl: null,
      memberCount: 6,
      standingPosition: 5,
      nextGameStartTime: null,
      formMarks: ["lost", "not-played"],
    },
  ];

  const publicGroups: GroupPublicRowData[] = [
    {
      id: "public-open",
      name: "Hammarby Open Play",
      imageUrl: null,
      communityName: null,
      memberCount: 22,
      requiresApproval: false,
      joinMode: "join",
    },
    {
      id: "public-approval",
      name: "Södermalm Padel Club",
      imageUrl: "/api/media/group-images/public-approval/image?v=1",
      communityName: "Södermalm Padel",
      memberCount: 9,
      requiresApproval: true,
      joinMode: "request",
    },
    {
      id: "public-requested",
      name: "Lidingö Ladder",
      imageUrl: null,
      communityName: null,
      memberCount: 1,
      requiresApproval: true,
      joinMode: "requested",
    },
  ];

  const leaderboard: GroupLeaderboardEntryData[] = [
    entry(
      1,
      "ada",
      "Ada Lindqvist",
      { wins: 6, losses: 1 },
      {
        isOrganizer: true,
        levelBand: "B1",
        formMarks: ["won", "won", "won", "lost"],
      },
    ),
    entry(
      2,
      "kim",
      "Kim Holm",
      { wins: 4, losses: 2 },
      { formMarks: ["lost", "won", "won", "won"] },
    ),
    entry(
      3,
      "viewer",
      "Alex Rivera",
      { wins: 3, losses: 3 },
      {
        isViewer: true,
        levelProvisional: true,
        formMarks: ["won", "lost", "lost", "won"],
      },
    ),
    entry(
      4,
      "elin",
      "Elin Nilsson",
      { wins: 1, losses: 4 },
      { levelBand: null, levelProvisional: true },
    ),
  ];

  const unplayed = leaderboard.map((member, index) =>
    entry(
      index + 1,
      member.userId,
      member.name ?? "Member",
      { wins: 0, losses: 0 },
      { isViewer: member.isViewer, isOrganizer: member.isOrganizer },
    ),
  );

  const base: GroupHomeData = {
    id: "group-bromma",
    name: "Bromma Tuesday",
    imageUrl: "/api/media/group-images/group-bromma/image?v=1",
    sport: "padel",
    communityId: null,
    createdAt: new Date("2025-01-15T12:00:00Z"),
    totalGamesPlayed: 7,
    community: null,
    isCommunityArchived: false,
    membership: {},
    communityMembership: null,
    standing: { memberCount: 4, leaderboard, awaitingScoreCount: 1 },
    upcomingGames,
    gameHistory: [
      playedGame("played-won", 3, now),
      playedGame("played-lost", 10, now, {
        outcome: "lost",
        viewerSlot: 2,
        slot1Members: [
          { id: "kim", name: "Kim Holm", image: null, isViewer: false },
          { id: "elin", name: "Elin Nilsson", image: null, isViewer: false },
        ],
        slot2Members: [
          { id: "viewer", name: "Alex Rivera", image: null, isViewer: true },
          { id: "ada", name: "Ada Lindqvist", image: null, isViewer: false },
        ],
        scoredSets: [
          { slot1GamesWon: 6, slot2GamesWon: 2 },
          { slot1GamesWon: 6, slot2GamesWon: 3 },
        ],
      }),
      playedGame("played-unscored", 17, now, {
        outcome: null,
        scoredSets: [],
      }),
      playedGame("played-cancelled", 24, now, {
        cancelled: true,
        outcome: null,
        scoredSets: [],
      }),
    ],
    joinMode: "member",
    canJoinLoosePublic: false,
    canJoinClubPublic: false,
    isLoose: true,
    canManageLookupInvites: false,
    canManageInviteLinks: false,
    requiresApproval: false,
    canSetRequiresApproval: false,
    canDecideJoinRequests: false,
    canManageImage: false,
    canDelete: false,
  };

  const creator: GroupHomeData = {
    ...base,
    canManageLookupInvites: true,
    canManageInviteLinks: true,
    canSetRequiresApproval: true,
    canDecideJoinRequests: true,
    canManageImage: true,
  };

  const joinRequests: GroupJoinRequestData[] = [
    {
      id: "request-nora",
      createdAt: new Date(now.getTime() - 2 * DAY_MS),
      user: { id: "nora", name: "Nora Berg", image: null },
      isCommunityMember: null,
    },
    {
      id: "request-sam",
      createdAt: new Date(now.getTime() - 10 * DAY_MS),
      user: { id: "sam", name: "Sam Ek", image: null },
      isCommunityMember: false,
    },
  ];

  const nonMember: GroupHomeData = {
    ...base,
    membership: null,
    joinMode: "join",
    canJoinLoosePublic: true,
  };

  const administration = {
    creator,
    requiresApproval: { ...creator, requiresApproval: true },
    noImage: { ...creator, imageUrl: null },
    deletable: { ...creator, canDelete: true },
    club: {
      ...creator,
      communityId: "community-sodermalm",
      community: { id: "community-sodermalm", name: "Södermalm Padel" },
      communityMembership: {},
      isLoose: false,
      requiresApproval: true,
      canDelete: true,
    },
    private: {
      ...creator,
      canSetRequiresApproval: false,
      canDecideJoinRequests: false,
    },
    member: base,
  };

  return {
    mine,
    publicGroups,
    administration,
    joinRequests,
    home: {
      member: base,
      noResults: {
        ...base,
        totalGamesPlayed: 0,
        standing: {
          memberCount: 4,
          leaderboard: unplayed,
          awaitingScoreCount: 0,
        },
        gameHistory: [],
      },
      noGames: { ...base, upcomingGames: [], gameHistory: [] },
      nonMemberJoin: nonMember,
      nonMemberRequest: {
        ...nonMember,
        joinMode: "request",
        canJoinLoosePublic: false,
      },
      requested: {
        ...nonMember,
        joinMode: "requested",
        canJoinLoosePublic: false,
      },
      clubRequest: {
        ...nonMember,
        communityId: "community-sodermalm",
        community: { id: "community-sodermalm", name: "Södermalm Padel" },
        joinMode: "request",
        canJoinLoosePublic: false,
      },
      organizer: {
        ...base,
        canManageLookupInvites: true,
        canManageInviteLinks: true,
      },
      archivedClub: {
        ...base,
        communityId: "community-sodermalm",
        community: { id: "community-sodermalm", name: "Södermalm Padel" },
        isCommunityArchived: true,
        communityMembership: {},
      },
    },
  };
}
