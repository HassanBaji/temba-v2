import {
  MEMBER_NICKNAME_MAX_LENGTH,
  normalizeMemberNickname,
  type MemberNicknameData,
  type MemberNicknameVisibility,
} from "@repo/domain/member-nickname";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { firstName } from "./group-home-model";

export type MemberNicknameTarget = {
  userId: string;
  name: string;
  imageUri: string | null;
  nickname: MemberNicknameData | null;
  /** An approver naming themselves. */
  isViewer: boolean;
};

/** The "Name in this Group" sheet (design "Group names" 1c) for a draft. */
export function memberNicknameSheetView(
  input: {
    member: MemberNicknameTarget;
    draft: string;
    visibility: MemberNicknameVisibility;
    groupName: string;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).group.nickname;
  const next = normalizeMemberNickname(input.draft);
  const current = input.member.nickname;
  const changed =
    next !== (current?.name ?? null) ||
    (next != null && input.visibility !== current?.visibility);
  const length = input.draft.length;
  const first = firstName(input.member.name);
  const self = input.member.isViewer;
  return {
    subtitle: self
      ? m.forYou(input.groupName)
      : m.forMember(input.member.name, input.groupName),
    counter: m.counter(length, MEMBER_NICKNAME_MAX_LENGTH),
    counterSpoken: m.counterSpoken(length, MEMBER_NICKNAME_MAX_LENGTH),
    preview: next
      ? { main: next, sub: input.member.name, isNickname: true }
      : { main: input.member.name, sub: m.noNickname, isNickname: false },
    note:
      input.visibility === "approvers"
        ? self
          ? m.approversNoteSelf
          : m.approversNote(first)
        : self
          ? m.groupNoteSelf
          : m.groupNote(first),
    nickname: next,
    saveLabel: next ? m.save(next) : m.typeFirst,
    canSave: next != null && changed,
    canClear: current != null,
  };
}
