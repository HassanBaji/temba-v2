export type HubGameOccupant = {
  userId: string;
  name: string;
  image: string | null;
  isViewer: boolean;
};

export type HubGameSide = {
  sideIndex: number;
  left: HubGameOccupant | null;
  right: HubGameOccupant | null;
};

export type HubGameTournamentTeam = {
  gameTeamId: string;
  sideIndex: number | null;
  poolIndex: number | null;
  isViewerTeam: boolean;
  left: HubGameOccupant | null;
  right: HubGameOccupant | null;
};

export type HubGameRow = {
  id: string;
  name: string | null;
  format: string;
  registrationMode: string;
  sport: string | null;
  isPublic: boolean;
  groupId: string | null;
  groupName: string | null;
  startTime: Date;
  windowStart: Date | null;
  windowEnd: Date | null;
  venue: { id: string; name: string; city: string } | null;
  pricePerPlayerFils: number | null;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  registeredUserCount: number;
  playersAllowed: number | null;
  registeredTeamCount: number;
  teamsAllowed: number | null;
  registrationStatus: "open" | "full" | "closed" | "cancelled";
  joinFrozen: boolean;
  isRegistered: boolean;
  isSeated: boolean;
  isWaitlisted: boolean;
  canRegister: boolean;
  canWaitlist: boolean;
  sides: HubGameSide[];
  poolCount: number | null;
  tournamentShape: string | null;
  tournament: {
    roundCount: number | null;
    drawPosted: boolean;
    allowSoloRegister: boolean;
    teams: HubGameTournamentTeam[];
    joinSides: HubGameSide[];
    knockout: {
      roundCount: number | null;
      currentRoundName: string | null;
      champion: string | null;
    } | null;
  } | null;
  matchId: string | null;
  roundNumber: number | null;
  roundCount: number | null;
  courtName: string | null;
  poolMatch: {
    poolLabel: string;
    poolSize: number;
    viewerPosition: number | null;
    lastResult: {
      roundNumber: number;
      outcome: "won" | "lost" | "draw" | "cancelled";
      viewerSets: { viewer: number; opponent: number }[];
    } | null;
  } | null;
  knockoutMatch: { round: number; roundCount: number } | null;
};

export type HubHistoryMember = {
  id: string;
  name: string;
  image: string | null;
  isViewer: boolean;
};

export type HubHistoryRow = {
  id: string;
  name: string | null;
  format: string;
  venue: { name: string };
  displayTime: Date;
  matchId: string;
  groupName: string | null;
  slot1Members: HubHistoryMember[];
  slot2Members: HubHistoryMember[];
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  viewerSlot: 1 | 2;
  outcome: "won" | "lost" | "draw";
};
