import type {
  GroupMemberFilter,
  GroupMemberSort,
} from "@repo/domain/group-members-table";

export type StoredMemberLens = {
  sort: GroupMemberSort | null;
  filter: GroupMemberFilter | null;
};

export type MemberLensStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

const SORTS: readonly GroupMemberSort[] = ["recent", "joined", "name", "level"];
const FILTERS: readonly GroupMemberFilter[] = [
  "all",
  "organizers",
  "active",
  "inactive",
  "noGames",
  "notOnTemba",
];

export const EMPTY_MEMBER_LENS: StoredMemberLens = { sort: null, filter: null };

export function memberLensKey(groupId: string) {
  return `temba.groupMembers.lens.${groupId}`;
}

function oneOf<T extends string>(options: readonly T[], value: unknown) {
  return options.find((option) => option === value) ?? null;
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
      sort: oneOf(SORTS, parsed.sort),
      filter: oneOf(FILTERS, parsed.filter),
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
