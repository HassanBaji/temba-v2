import type {
  GameInviteLinkReady,
  InviteInboxSources,
  InviteLinkPreview,
  InviteSide,
} from "./invites";

const HOUR_MS = 60 * 60 * 1000;

function ago(now: Date, hours: number) {
  return new Date(now.getTime() - hours * HOUR_MS);
}

const SAM = { name: "Sam Chen", image: null };
const TARIQ = { name: "Tariq Aziz", image: null };

function seat(name: string) {
  return { name };
}

const OPEN_SIDES: InviteSide[] = [
  { sideIndex: 1, left: seat("Ada Lindqvist"), right: null },
  { sideIndex: 2, left: null, right: null },
];

const FULL_SIDES: InviteSide[] = [
  { sideIndex: 1, left: seat("Ada Lindqvist"), right: seat("Kim Holm") },
  { sideIndex: 2, left: seat("Elin Nilsson"), right: seat("Noor Haddad") },
];

function gameInboxRow(
  now: Date,
  overrides: Partial<InviteInboxSources["game"][number]> = {},
): InviteInboxSources["game"][number] {
  return {
    id: "game-invite-1",
    createdAt: ago(now, 2),
    invitedBy: SAM,
    gameName: "Tuesday padel",
    needsSeatPick: false,
    registrationStatus: "open",
    sides: [],
    vacantSeats: [],
    ...overrides,
  };
}

const READY_GAME: GameInviteLinkReady = {
  gameId: "game-1",
  gameName: "Tuesday padel",
  registrationStatus: "open",
  needsSeatPick: false,
  partnerRequiredJoin: false,
  sides: [],
  vacantSeats: [],
  levelMinTenths: null,
  levelMaxTenths: null,
  viewerLevelTenths: null,
  viewerPassesLevelRange: null,
  levelRangeRequest: null,
  canRequestLevelRange: false,
};

function readyGame(
  overrides: Partial<GameInviteLinkReady> = {},
): InviteLinkPreview {
  return {
    status: "ready",
    kind: "game",
    game: { ...READY_GAME, ...overrides },
  };
}

export function createInvitesFixtures(now = new Date()) {
  const vacantSeats = [
    { sideIndex: 1, position: "right" },
    { sideIndex: 2, position: "left" },
    { sideIndex: 2, position: "right" },
  ];

  const inbox = {
    mixed: {
      community: [
        {
          id: "community-invite-1",
          createdAt: ago(now, 30),
          invitedBy: TARIQ,
          communityName: "Södermalm Padel",
        },
      ],
      group: [
        {
          id: "group-invite-1",
          createdAt: ago(now, 5),
          invitedBy: SAM,
          groupName: "Bromma Tuesday",
        },
        {
          id: "group-invite-2",
          createdAt: ago(now, 50),
          invitedBy: { name: null, image: null },
          groupName: null,
        },
      ],
      team: [
        {
          id: "team-invite-1",
          createdAt: ago(now, 12),
          invitedBy: TARIQ,
          displayName: "Tariq Aziz & you",
        },
      ],
      game: [gameInboxRow(now)],
    } satisfies InviteInboxSources,
    seatPick: {
      game: [
        gameInboxRow(now, {
          needsSeatPick: true,
          sides: OPEN_SIDES,
          vacantSeats,
        }),
      ],
    } satisfies Partial<InviteInboxSources>,
    waitlistOnly: {
      game: [
        gameInboxRow(now, {
          needsSeatPick: true,
          registrationStatus: "full",
          sides: FULL_SIDES,
          vacantSeats: [],
        }),
      ],
    } satisfies Partial<InviteInboxSources>,
    frozen: {
      game: [
        gameInboxRow(now, {
          needsSeatPick: true,
          registrationStatus: "closed",
          sides: OPEN_SIDES,
          vacantSeats,
        }),
      ],
    } satisfies Partial<InviteInboxSources>,
    empty: {} satisfies Partial<InviteInboxSources>,
  };

  const links: Record<string, InviteLinkPreview> = {
    community: { status: "ready", kind: "community", name: "Södermalm Padel" },
    group: { status: "ready", kind: "group", name: "Bromma Tuesday" },
    team: { status: "ready", kind: "team", name: "Tariq Aziz & you" },
    game: readyGame(),
    gameSeatPick: readyGame({
      needsSeatPick: true,
      sides: OPEN_SIDES,
      vacantSeats,
    }),
    gameWaitlist: readyGame({
      needsSeatPick: true,
      registrationStatus: "full",
      sides: FULL_SIDES,
    }),
    gamePartner: readyGame({ partnerRequiredJoin: true }),
    gameLevelRange: readyGame({
      levelMinTenths: 30,
      levelMaxTenths: 45,
      viewerLevelTenths: 22,
      viewerPassesLevelRange: false,
      canRequestLevelRange: true,
    }),
    gameLevelRangePending: readyGame({
      levelMinTenths: 30,
      levelMaxTenths: 45,
      viewerLevelTenths: 22,
      viewerPassesLevelRange: false,
      levelRangeRequest: { status: "pending" },
      canRequestLevelRange: false,
    }),
    expired: { status: "invalid" },
    unavailable: { status: "unavailable" },
  };

  const send = {
    results: [
      { id: "user-ada", name: "Ada Lindqvist", cue: "Played with you" },
      { id: "user-kim", name: "Kim Holm", cue: null },
      { id: "user-noor", name: "Noor Haddad", cue: "In Bromma Tuesday" },
    ],
    pending: [
      {
        id: "lookup-1",
        createdAt: ago(now, 3),
        user: {
          id: "user-elin",
          name: "Elin Nilsson",
          email: "elin@example.com",
        },
      },
      {
        id: "lookup-2",
        createdAt: ago(now, 8),
        user: { id: "user-phone", name: "+46701234567", email: null },
      },
    ],
    refused: [
      {
        name: "Kim Holm",
        message: "That User is already registered on this Game",
      },
    ],
    linkUrl: "https://temba.example/g/AbCd1234",
  };

  return { inbox, links, send };
}
