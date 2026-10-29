import { pgEnum } from "drizzle-orm/pg-core";

export const groupTypes = pgEnum("group_type", ["public", "private"]);
export const groupSports = pgEnum("group_sport", ["padel", "football"]);
export const groupMemberRoles = pgEnum("group_member_role", [
  "member",
  "organizer",
]);

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
