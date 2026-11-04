import {
  asGroupMemberFilter,
  asGroupMemberSort,
  type GroupMemberFilter,
  type GroupMemberSort,
} from "@repo/domain/group-members-table";

export type StoredMemberLens = {
  sort: GroupMemberSort | null;
  filter: GroupMemberFilter | null;
};

export const EMPTY_MEMBER_LENS: StoredMemberLens = { sort: null, filter: null };

export function memberLensKey(groupId: string) {
  return `temba.groupMembers.lens.${groupId}`;
}

/** Private mode or blocked site data can make even reading the property throw. */
function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The Members tab sort and filter this device last picked for a Group. */
export function readMemberLens(groupId: string): StoredMemberLens {
  try {
    const raw = storage()?.getItem(memberLensKey(groupId));
    if (!raw) {
      return EMPTY_MEMBER_LENS;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      sort: asGroupMemberSort(parsed.sort),
      filter: asGroupMemberFilter(parsed.filter),
    };
  } catch {
    return EMPTY_MEMBER_LENS;
  }
}

export function writeMemberLens(groupId: string, lens: StoredMemberLens) {
  try {
    storage()?.setItem(memberLensKey(groupId), JSON.stringify(lens));
  } catch {
    // The tab still sorts and filters for this visit; it just will not remember.
  }
}
