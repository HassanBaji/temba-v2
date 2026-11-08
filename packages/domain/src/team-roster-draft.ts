import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { AddPlayerLevel } from "./add-player-by-phone";
import type { FootballPosition, FootballRole } from "./football-lineup";
import type { FootballSelfPlacement } from "./football-self-placement";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import type { Sport } from "./sport";
import { teamRosterRule } from "./team-roster";
import { teamCreateInput } from "./teams";

/** Someone found on Temba, who gets a Lookup invite when the Team is created. */
export type TeamRosterDraftInvite = { userId: string; name: string };

/**
 * A number added By phone. An account holder's number still becomes an
 * invite on create; only a number not on Temba joins the Roster by name.
 */
export type TeamRosterDraftPhone = {
  e164: string;
  countryIso: string;
  nationalNumber: string;
  name: string;
  kind: "account" | "unclaimed" | "new";
  phoneMasked?: string;
  level?: AddPlayerLevel | FootballSelfPlacement;
  football?: { role: FootballRole; position: FootballPosition | null };
};

export type TeamRosterDraft = {
  invites: TeamRosterDraftInvite[];
  phones: TeamRosterDraftPhone[];
};

export const EMPTY_TEAM_ROSTER_DRAFT: TeamRosterDraft = {
  invites: [],
  phones: [],
};

/** The Captain counts: a new Team starts with them on it. */
export function rosterDraftCount(draft: TeamRosterDraft) {
  return 1 + draft.invites.length + draft.phones.length;
}

export function rosterDraftSpotsLeft(draft: TeamRosterDraft, sport: Sport) {
  return Math.max(0, teamRosterRule(sport).max - rosterDraftCount(draft));
}

export function rosterDraftHasUser(draft: TeamRosterDraft, userId: string) {
  return draft.invites.some((invite) => invite.userId === userId);
}

export function rosterDraftHasPhone(draft: TeamRosterDraft, e164: string) {
  return draft.phones.some((phone) => phone.e164 === e164);
}

/** Adds the people not already listed, up to the Roster maximum. */
export function addDraftInvites(
  draft: TeamRosterDraft,
  invites: readonly TeamRosterDraftInvite[],
  sport: Sport,
): TeamRosterDraft {
  let next = draft;
  for (const invite of invites) {
    if (
      rosterDraftHasUser(next, invite.userId) ||
      rosterDraftSpotsLeft(next, sport) === 0
    ) {
      continue;
    }
    next = { ...next, invites: [...next.invites, invite] };
  }
  return next;
}

export function addDraftPhone(
  draft: TeamRosterDraft,
  phone: TeamRosterDraftPhone,
  sport: Sport,
): TeamRosterDraft {
  if (
    rosterDraftHasPhone(draft, phone.e164) ||
    rosterDraftSpotsLeft(draft, sport) === 0
  ) {
    return draft;
  }
  return { ...draft, phones: [...draft.phones, phone] };
}

export function removeDraftRow(
  draft: TeamRosterDraft,
  key: string,
): TeamRosterDraft {
  return {
    invites: draft.invites.filter((invite) => inviteKey(invite) !== key),
    phones: draft.phones.filter((phone) => phoneKey(phone) !== key),
  };
}

/**
 * Switching sport keeps who fits: padel holds one partner, and a padel
 * number carries no football role.
 */
export function rosterDraftForSport(
  draft: TeamRosterDraft,
  sport: Sport,
): TeamRosterDraft {
  const room = teamRosterRule(sport).max - 1;
  const invites = draft.invites.slice(0, room);
  const phones = draft.phones
    .slice(0, Math.max(0, room - invites.length))
    .map((phone) =>
      sport === "football" ? phone : { ...phone, football: undefined },
    );
  return { invites, phones };
}

function inviteKey(invite: TeamRosterDraftInvite) {
  return `invite:${invite.userId}`;
}

function phoneKey(phone: TeamRosterDraftPhone) {
  return `phone:${phone.e164}`;
}

export type TeamRosterDraftRow = {
  key: string;
  name: string;
  status: string;
  detail: string | null;
  isCaptain: boolean;
  removeLabel: string | null;
};

export function rosterDraftView(
  draft: TeamRosterDraft,
  input: { sport: Sport; captainName: string; groupName: string | null },
  locale: Locale,
) {
  const m = messagesFor(locale).team;
  const { max } = teamRosterRule(input.sport);
  const removable = (name: string) => m.draft.remove(name);
  const rows: TeamRosterDraftRow[] = [
    {
      key: "captain",
      name: input.captainName,
      status: m.captainLabel,
      detail: null,
      isCaptain: true,
      removeLabel: null,
    },
    ...draft.invites.map((invite) => ({
      key: inviteKey(invite),
      name: invite.name,
      status: m.draft.invited,
      detail: null,
      isCaptain: false,
      removeLabel: removable(invite.name),
    })),
    ...draft.phones.map((phone) => ({
      key: phoneKey(phone),
      name: phone.name,
      status: phone.kind === "account" ? m.draft.invited : m.draft.added,
      detail: phone.kind === "account" ? null : (phone.phoneMasked ?? null),
      isCaptain: false,
      removeLabel: removable(phone.name),
    })),
  ];
  const full = rosterDraftSpotsLeft(draft, input.sport) === 0;
  return {
    countLine: m.draft.countLine(rosterDraftCount(draft), max),
    rows,
    addMore: full
      ? null
      : {
          title: m.roster.addMore.title,
          detail: input.groupName
            ? m.roster.addMore.detailWithGroup(input.groupName, max)
            : m.roster.addMore.detail(max),
        },
    fullLine: full ? m.draft.full(max) : null,
    helper: input.sport === "football" ? m.rosterHelper(max) : null,
    footer: input.sport === "football" ? m.draft.footer : null,
  };
}

export type TeamRosterDraftView = ReturnType<typeof rosterDraftView>;

/** "Padel, 2 players" and "Football, Roster up to 20" for the sport picker. */
export function teamSportChoices(locale: Locale): {
  value: Sport;
  name: string;
  detail: string;
}[] {
  const m = messagesFor(locale).team.sportChoice;
  return [
    { value: "padel", name: m.padel.name, detail: m.padel.detail },
    {
      value: "football",
      name: m.football.name,
      detail: m.football.detail(teamRosterRule("football").max),
    },
  ];
}

/** The one `teams.create` call: the Team, its tag, and everyone on the draft. */
export function rosterDraftCreateInput(
  form: { name: string; sport: Sport; groupId?: string | null },
  draft: TeamRosterDraft,
) {
  const fitted = rosterDraftForSport(draft, form.sport);
  return {
    ...teamCreateInput(form),
    inviteUserIds: fitted.invites.map((invite) => invite.userId),
    phonePlayers: fitted.phones.map((phone) => ({
      countryIso: phone.countryIso,
      nationalNumber: phone.nationalNumber,
      ...(phone.kind === "new"
        ? { name: phone.name, level: phone.level, football: phone.football }
        : {}),
    })),
  };
}

export type TeamPhonePreview = {
  kind: "account" | "unclaimed" | "new";
  name: string | null;
  alreadyOnTeam: boolean;
  alreadyInvited: boolean;
  phoneMasked?: string;
};

export function teamPhonePreviewLine(
  preview: TeamPhonePreview,
  input: { listed: boolean },
  locale: Locale,
): string {
  const all = messagesFor(locale);
  const m = all.team.addPlayers.preview;
  const group = all.group.addPlayer.preview;
  const name = preview.name ?? group.thisPlayer;
  if (preview.alreadyOnTeam) {
    return m.alreadyOnTeam(name);
  }
  if (preview.alreadyInvited) {
    return m.alreadyInvited(name);
  }
  if (input.listed) {
    return m.alreadyListed(name);
  }
  if (preview.kind === "account") {
    return group.accountInvited(name);
  }
  if (preview.kind === "unclaimed") {
    return group.unclaimed(name);
  }
  return group.new;
}

export function teamPhoneCanSubmit(input: {
  preview: TeamPhonePreview | null;
  listed: boolean;
  name: string;
}): boolean {
  const { preview } = input;
  if (
    !preview ||
    preview.alreadyOnTeam ||
    preview.alreadyInvited ||
    input.listed
  ) {
    return false;
  }
  return preview.kind !== "new" || input.name.trim().length > 0;
}

export type TeamGroupMemberToAdd = {
  userId: string;
  name: string;
  unclaimed: boolean;
  levelBand: LevelBand | null;
  footballRole: FootballRole | null;
  invited: boolean;
};

export type TeamGroupMemberRow = {
  userId: string;
  name: string;
  meta: string;
  /** Why the row cannot be picked: already invited, or not on Temba. */
  status: string | null;
  selected: boolean;
  /** Not picked, and every spot left is already taken by a pick. */
  blocked: boolean;
};

/**
 * From a group. Someone not on Temba cannot accept an invite, so they are
 * added by phone instead; picking stops at the spots left.
 */
export function teamGroupMemberRows(
  input: {
    members: readonly TeamGroupMemberToAdd[];
    query?: string;
    picked: readonly string[];
    listedUserIds: readonly string[];
    spotsLeft: number;
    sport: Sport;
  },
  locale: Locale,
): TeamGroupMemberRow[] {
  const all = messagesFor(locale);
  const m = all.team.addPlayers;
  const full = input.picked.length >= input.spotsLeft;
  const needle = (input.query ?? "").trim().toLocaleLowerCase();
  const matching = input.members.filter(
    (member) =>
      needle === "" || member.name.toLocaleLowerCase().includes(needle),
  );
  return matching.map((member) => {
    const listed = input.listedUserIds.includes(member.userId);
    const status = member.invited
      ? m.invitedMark
      : listed
        ? m.listed(member.name)
        : member.unclaimed
          ? m.memberUnclaimed
          : null;
    const selected = status == null && input.picked.includes(member.userId);
    const role =
      input.sport === "football" && member.footballRole
        ? member.footballRole === "keeper"
          ? all.team.seat.keeper
          : all.team.seat.outfield
        : null;
    const level = member.levelBand
      ? all.group.addPlayer.fromGroup.level(
          displayLabelFromStoredBand(member.levelBand),
        )
      : null;
    return {
      userId: member.userId,
      name: member.name,
      meta: [role, level].filter(Boolean).join(all.common.listSeparator),
      status,
      selected,
      blocked: status == null && !selected && full,
    };
  });
}

export function toggleTeamGroupPick(
  picked: readonly string[],
  userId: string,
  spotsLeft: number,
): string[] {
  if (picked.includes(userId)) {
    return picked.filter((id) => id !== userId);
  }
  return picked.length < spotsLeft ? [...picked, userId] : [...picked];
}

export function teamAddPlayersSpotsLine(spotsLeft: number, locale: Locale) {
  const m = messagesFor(locale).team.addPlayers;
  return spotsLeft <= 0 ? m.full : m.spotsLeft(spotsLeft);
}

export function teamGroupAddLabel(count: number, locale: Locale) {
  const m = messagesFor(locale).team.addPlayers;
  return count === 0 ? m.select : m.addCount(count);
}
