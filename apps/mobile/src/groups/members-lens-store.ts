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

export type MemberLensStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const EMPTY_MEMBER_LENS: StoredMemberLens = { sort: null, filter: null };

export function memberLensKey(groupId: string) {
  return `temba.groupMembers.lens.${groupId}`;
}

export async function readMemberLens(
  storage: MemberLensStorage,
  groupId: string,
): Promise<StoredMemberLens> {
  try {
    const raw = await storage.getItem(memberLensKey(groupId));
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

export async function writeMemberLens(
  storage: MemberLensStorage,
  groupId: string,
  lens: StoredMemberLens,
): Promise<void> {
  try {
    await storage.setItem(memberLensKey(groupId), JSON.stringify(lens));
  } catch {
    // Remembering the lens is a convenience; the tab works without storage.
  }
}
