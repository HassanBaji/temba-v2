import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { AddPlayerFootballPosition } from "./add-player-by-phone";
import { footballPositionChoices, type FootballRole } from "./football-lineup";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import { memberMatchesQuery, type MemberNicknameData } from "./member-nickname";

export type AddPlayerMode = "group" | "phone";

export type GroupMemberToAdd = {
  userId: string;
  name: string;
  /** The Member nickname, when the organizer may see it. */
  nickname?: MemberNicknameData | null;
  levelBand: LevelBand | null;
  footballRole: FootballRole | null;
  footballPosition: Exclude<AddPlayerFootballPosition, "none"> | null;
  status: "in_game" | "waitlisted" | null;
};

export type GroupMemberFootballPick = {
  role: FootballRole;
  position: AddPlayerFootballPosition;
};

export type GroupMemberRowView = {
  userId: string;
  /** The Member nickname when there is one, else the Temba name. */
  name: string;
  /** Marks `name` as this Group's name for the member. */
  isNickname?: boolean;
  tembaName?: string;
  meta: string;
  /** "In game" or "On waitlist"; such a member cannot be picked. */
  status: string | null;
  selected: boolean;
  /** Not picked, and every open spot is already taken by a pick. */
  blocked: boolean;
};

/** The member's profile, so a pick starts from how they say they play. */
export function groupMemberFootballDefaults(
  member: Pick<GroupMemberToAdd, "footballRole" | "footballPosition">,
): GroupMemberFootballPick {
  return {
    role: member.footballRole ?? "outfield",
    position: member.footballPosition ?? "none",
  };
}

function footballLabel(pick: GroupMemberFootballPick, locale: Locale): string {
  const m = messagesFor(locale).group.addPlayer;
  if (pick.role === "keeper") {
    return m.roles.keeper;
  }
  return pick.position === "none"
    ? m.positions.any
    : m.positions[pick.position];
}

/**
 * Members matching the search, those who can still be added first. A picked
 * member's line drops the role, since the choices under the row show it.
 */
export function groupMemberRows(
  input: {
    members: readonly GroupMemberToAdd[];
    query: string;
    picked: readonly string[];
    openSpots: number;
    isFootball: boolean;
  },
  locale: Locale,
): GroupMemberRowView[] {
  const m = messagesFor(locale).group.addPlayer.fromGroup;
  const full = input.picked.length >= input.openSpots;
  return input.members
    .filter((member) => memberMatchesQuery(member, input.query))
    .sort((a, b) => Number(a.status != null) - Number(b.status != null))
    .map((member) => {
      const selected = input.picked.includes(member.userId);
      const blocked = member.status == null && !selected && full;
      const level = member.levelBand
        ? m.level(displayLabelFromStoredBand(member.levelBand))
        : null;
      const role =
        input.isFootball && !selected
          ? footballLabel(groupMemberFootballDefaults(member), locale)
          : null;
      const nickname = member.nickname?.name ?? null;
      const parts = [role, level, blocked ? m.noSpotsLeft : null].filter(
        (part): part is string => part != null,
      );
      return {
        userId: member.userId,
        name: nickname ?? member.name,
        isNickname: nickname != null,
        tembaName: member.name,
        meta: parts.join(" · "),
        status:
          member.status === "in_game"
            ? m.inGame
            : member.status === "waitlisted"
              ? m.onWaitlist
              : null,
        selected,
        blocked,
      };
    });
}

/** Picking stops at the number of open spots; unpicking always works. */
export function toggleGroupMemberPick(
  picked: readonly string[],
  userId: string,
  openSpots: number,
): string[] {
  if (picked.includes(userId)) {
    return picked.filter((id) => id !== userId);
  }
  return picked.length < openSpots ? [...picked, userId] : [...picked];
}

export function groupSpotsLine(
  openSpots: number,
  pickedCount: number,
  locale: Locale,
): string {
  const m = messagesFor(locale).group.addPlayer.fromGroup;
  return openSpots <= 0
    ? m.gameFull
    : m.spotsLeft(Math.max(0, openSpots - pickedCount), openSpots);
}

export function groupAddActionLabel(pickedCount: number, locale: Locale) {
  const m = messagesFor(locale).group.addPlayer.fromGroup;
  return pickedCount === 0 ? m.select : m.addCount(pickedCount);
}

/** Nicknames or first names of the picks, in the order they were picked. */
export function groupPickedNames(
  members: readonly Pick<GroupMemberToAdd, "userId" | "name" | "nickname">[],
  picked: readonly string[],
  locale: Locale,
): string {
  const byId = new Map(
    members.map((member) => [
      member.userId,
      member.nickname?.name ?? member.name.trim().split(/\s+/)[0],
    ]),
  );
  return picked
    .map((userId) => byId.get(userId))
    .filter((name): name is string => Boolean(name))
    .join(messagesFor(locale).group.addPlayer.fromGroup.listSeparator);
}

export function groupAddedToast(
  added: readonly { name: string }[],
  locale: Locale,
): string {
  const [only] = added;
  return added.length === 1 && only
    ? messagesFor(locale).group.addPlayer.addedToast(only.name)
    : messagesFor(locale).group.addPlayer.fromGroup.addedCount(added.length);
}

export function groupNoMatchLine(query: string, locale: Locale) {
  return messagesFor(locale).group.addPlayer.fromGroup.noMatch(query.trim());
}

/** The compact position choices under a picked member. */
export function groupMemberPositionChoices(locale: Locale): {
  value: AddPlayerFootballPosition;
  name: string;
}[] {
  return [
    {
      value: "none",
      name: messagesFor(locale).group.addPlayer.fromGroup.noPreferenceShort,
    },
    ...footballPositionChoices(locale).map((choice) => ({
      value: choice.value,
      name: choice.label,
    })),
  ];
}
