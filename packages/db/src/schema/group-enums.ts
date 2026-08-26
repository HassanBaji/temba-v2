import { pgEnum } from "drizzle-orm/pg-core";

export const groupTypes = pgEnum("group_type", ["public", "private"]);
export const groupSports = pgEnum("group_sport", ["padel", "football"]);

export enum GroupTypeEnum {
  PUBLIC = "public",
  PRIVATE = "private",
}

export enum GroupSportEnum {
  PADEL = "padel",
  FOOTBALL = "football",
}
