import { type CommunityRole } from "#src/communities/utils";

export function asRole(role: string): CommunityRole {
  return role as CommunityRole;
}
