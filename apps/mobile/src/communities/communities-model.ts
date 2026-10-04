export const COMMUNITIES_PATH = "/communities";
export const NEW_COMMUNITY_PATH = "/communities/new";

export function communityPath(communityId: string) {
  return `${COMMUNITIES_PATH}/${communityId}`;
}

export function newClubGroupPath(communityId: string) {
  return `/groups/new?communityId=${communityId}`;
}
