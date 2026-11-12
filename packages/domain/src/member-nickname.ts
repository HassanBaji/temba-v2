/** Who sees a Member nickname: Group approvers only, or everyone in the Group. */
export type MemberNicknameVisibility = "approvers" | "group";

export type MemberNicknameData = {
  name: string;
  visibility: MemberNicknameVisibility;
};

export const MEMBER_NICKNAME_MAX_LENGTH = 24;

export const MEMBER_NICKNAME_VISIBILITIES: readonly MemberNicknameVisibility[] =
  ["approvers", "group"];

/** Trimmed, inner runs of whitespace collapsed; an empty result clears the name. */
export function normalizeMemberNickname(input: string): string | null {
  const name = input.trim().replace(/\s+/g, " ");
  return name === "" ? null : name;
}

/**
 * Whether a viewer may see a member's nickname. An approvers-only name is a
 * working label: never shown to the member it names, even when they are an
 * approver themselves.
 */
export function memberNicknameIsVisible(input: {
  visibility: MemberNicknameVisibility;
  viewerIsApprover: boolean;
  viewerIsMember: boolean;
}): boolean {
  if (input.visibility === "group") {
    return true;
  }
  return input.viewerIsApprover && !input.viewerIsMember;
}

/** Search on a Group list matches the Temba name and the nickname. */
export function memberMatchesQuery(
  member: { name: string | null; nickname?: MemberNicknameData | null },
  query: string,
): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") {
    return true;
  }
  return [member.name, member.nickname?.name].some(
    (name) => name?.toLocaleLowerCase().includes(needle) === true,
  );
}
