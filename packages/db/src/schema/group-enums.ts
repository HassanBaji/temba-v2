import { pgEnum } from "drizzle-orm/pg-core";

export const groupTypes = pgEnum("group_type", ["public", "private"]);
export const groupSports = pgEnum("group_sport", ["padel", "football"]);
export const groupMemberRoles = pgEnum("group_member_role", [
  "member",
  "organizer",
]);

export const PERFORMANCE_RATING_MODE_VALUES = [
  "off",
  "organizer",
  "everyone",
] as const;

/** Who gives Performance ratings in a tier Group (ADR-0068). */
export const performanceRatingModes = pgEnum(
  "performance_rating_mode",
  PERFORMANCE_RATING_MODE_VALUES,
);

export enum GroupTypeEnum {
  PUBLIC = "public",
  PRIVATE = "private",
}

export enum GroupSportEnum {
  PADEL = "padel",
  FOOTBALL = "football",
}

export enum GroupMemberRoleEnum {
  MEMBER = "member",
  ORGANIZER = "organizer",
}
