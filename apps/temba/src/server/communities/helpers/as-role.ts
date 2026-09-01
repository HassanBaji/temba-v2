import { type CommunityRole } from "~/server/communities/utils";

export function asRole(role: string): CommunityRole {
  return role as CommunityRole;
}
