import type {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
} from "@repo/db";
// Value import required for `typeof games.$inferSelect` (type-only import fails TS2749).
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { games } from "@repo/db";

import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";

type AppTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type RegistrationStatus = "open" | "full" | "closed" | "cancelled";

export type HubListSideOccupant = {
  userId: string;
  name: string;
  image: string | null;
};

export type HubListSide = {
  sideIndex: number;
  left: HubListSideOccupant | null;
  right: HubListSideOccupant | null;
};

export type HubListRow = {
  id: string;
  name: string | null;
  format: GameFormatEnum | string;
  registrationMode: GameRegistrationModeEnum | string;
  sport: GameSportEnum | string | null;
  isPublic: boolean;
  groupId: string | null;
  groupName: string | null;
  startTime: Date;
  windowStart: Date | null;
  windowEnd: Date | null;
  venue: { id: string; name: string; city: string } | null;
  pricePerPlayerCents: number | null;
  registeredUserCount: number;
  playersAllowed: number | null;
  registeredTeamCount: number;
  teamsAllowed: number | null;
  registrationStatus: RegistrationStatus;
  joinFrozen: boolean;
  isRegistered: boolean;
  isSeated: boolean;
  isWaitlisted: boolean;
  canRegister: boolean;
  canWaitlist: boolean;
  sides: HubListSide[];
};

export type GameCreateGroupKind = "club" | "loose" | "none";

export type GameCreateVenueContext = {
  locked: boolean;
  groupKind: GameCreateGroupKind;
  linkedVenueId: string | null;
};

export type GameCreateVenueOption = {
  id: string;
  name: string;
  city: string;
  country: string;
  archivedAt: Date | null;
  courts: { id: string; name: string }[];
};

export type CreateFriendlyDb = typeof db | AppTx | TestDatabase;

export type CreateFriendlyGameInput = {
  createdBy: string;
  name?: string | null;
  groupId?: string | null;
  venueId: string;
  courtId?: string | null;
  windowStart: Date;
  windowEnd: Date;
  /** Null / omitted = unset. 0 = free. Positive = cents per User occupying a seat. */
  pricePerPlayerCents?: number | null;
};

export type CreateFriendlyGameResult = {
  game: typeof games.$inferSelect;
  matchId: string;
};

export type CreateGameInput = {
  createdBy: string;
  name?: string;
  groupId?: string;
  isPublic: boolean;
  format: "friendly_game" | "americano" | "friendly_tournament";
  registrationMode: "individual" | "team_only";
  playersAllowed?: number;
  teamsAllowed?: number;
  windowStart: Date;
  windowEnd: Date;
  venueId: string;
  courtId?: string | null;
  courtIds?: string[];
  pricePerPlayerCents?: number | null;
};
