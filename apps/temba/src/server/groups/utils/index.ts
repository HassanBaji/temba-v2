import type { GameFormatEnum, GroupSportEnum, GroupTypeEnum } from "@repo/db";
// Value import required for `typeof groups.$inferSelect` (type-only import fails TS2749).
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { groups } from "@repo/db";

import type { GameListCandidate } from "~/server/home/upcoming-games";

export type GroupRow = typeof groups.$inferSelect;

export type GroupGameCandidate = GameListCandidate;

export type GroupGame = {
  id: string;
  name: string | null;
  startTime: Date;
  windowStart: Date | null;
  windowEnd: Date | null;
  pricePerPlayerCents: number | null;
  format: GameFormatEnum | string;
  cancelledAt: Date | null;
  sport: GroupSportEnum | string | null;
};

export type GroupSport = GroupSportEnum;
export type GroupType = GroupTypeEnum;
