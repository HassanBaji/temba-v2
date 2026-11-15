import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { AddPlayerLevel } from "./add-player-by-phone";
import {
  footballPositionCode,
  footballSlotCode,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import { formatOvr } from "./football-ovr";
import type { FootballSelfPlacement } from "./football-self-placement";
import { initials } from "./initials";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import { formatInternationalNumber } from "./phone-number";
import type { Sport } from "./sport";
import { formatsPlayable, teamIsComplete, teamRosterRule } from "./team-roster";
import { teamCreateInput } from "./teams";

/** What the row under a player's name says about how they play. */
export type TeamRosterPlayerTag = {
  levelBand?: LevelBand | null;
  /** Football only: the whole OVR football shows in place of the band. */
  ovr?: number | null;
  footballRole?: FootballRole | null;
  footballPosition?: FootballPosition | null;
};

/** Where an invite came from, for "Invited from Gooz of Arad". */
export type TeamRosterDraftSource =
  | { kind: "phone" }
  | { kind: "temba" }
  | { kind: "group"; groupName: string };

/** Someone found on Temba, who gets a Lookup invite when the Team is created. */
export type TeamRosterDraftInvite = {
  userId: string;
  name: string;
  source?: TeamRosterDraftSource;
} & TeamRosterPlayerTag;

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
} & TeamRosterPlayerTag;

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

function inviteKey(invite: { userId: string }) {
  return `invite:${invite.userId}`;
}

function phoneKey(phone: TeamRosterDraftPhone) {
  return `phone:${phone.e164}`;
}

function tagLevel(sport: Sport, tag: TeamRosterPlayerTag) {
  if (sport === "football") {
    return tag.ovr != null ? formatOvr(tag.ovr) : null;
  }
  return tag.levelBand ? displayLabelFromStoredBand(tag.levelBand) : null;
}

/**
 * "DEF, 72" for football and "C+" for padel: the short position, then the
 * Level, whichever are known.
 */
export function teamPlayerTag(
  sport: Sport,
  tag: TeamRosterPlayerTag,
  locale: Locale,
): string | null {
  const all = messagesFor(locale);
  const slot =
    sport === "football"
      ? footballSlotCode(
          tag.footballRole ?? null,
          tag.footballPosition ?? null,
          locale,
        )
      : null;
  const level = tagLevel(sport, tag);
  const parts = [slot, level].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(all.common.listSeparator) : null;
}

export type TeamRosterSeat = "in" | "pending" | "open";

export type TeamRosterDraftRow = {
  key: string;
  name: string;
  initials: string;
  /** The Captain is in; an invite waits; a number not on Temba was added. */
  tile: "in" | "invited" | "added";
  meta: string | null;
  status: string;
  statusDetail: string | null;
  isCaptain: boolean;
  removeLabel: string | null;
};

function sourceLine(source: TeamRosterDraftSource | undefined, locale: Locale) {
  const m = messagesFor(locale).team.create.row;
  if (source?.kind === "group") {
    return m.invitedFromGroup(source.groupName);
  }
  return source?.kind === "phone" ? m.invitedByPhone : m.invitedOnTemba;
}

function phoneTag(phone: TeamRosterDraftPhone, sport: Sport, locale: Locale) {
  return teamPlayerTag(
    sport,
    phone.kind === "new"
      ? {
          footballRole: phone.football?.role ?? null,
          footballPosition: phone.football?.position ?? null,
        }
      : phone,
    locale,
  );
}

function sentence(parts: readonly (string | null)[], locale: Locale) {
  return messagesFor(locale).team.create.row.sentence(
    parts.filter((part): part is string => Boolean(part)),
  );
}

export function rosterDraftView(
  draft: TeamRosterDraft,
  input: {
    sport: Sport;
    captain: { name: string } & TeamRosterPlayerTag;
  },
  locale: Locale,
) {
  const all = messagesFor(locale);
  const m = all.team;
  const row = m.create.row;
  const { sport } = input;
  const { max } = teamRosterRule(sport);
  const count = rosterDraftCount(draft);
  const pending = count - 1;
  const rows: TeamRosterDraftRow[] = [
    {
      key: "captain",
      name: input.captain.name,
      initials: initials(input.captain.name),
      tile: "in",
      meta: teamPlayerTag(sport, input.captain, locale),
      status: row.captain,
      statusDetail: null,
      isCaptain: true,
      removeLabel: null,
    },
    ...draft.invites.map(
      (invite): TeamRosterDraftRow => ({
        key: inviteKey(invite),
        name: invite.name,
        initials: initials(invite.name),
        tile: "invited",
        meta: sentence(
          [
            teamPlayerTag(sport, invite, locale),
            sourceLine(invite.source, locale),
          ],
          locale,
        ),
        status: row.invited,
        statusDetail: row.waiting,
        isCaptain: false,
        removeLabel: row.remove(invite.name),
      }),
    ),
    ...draft.phones.map((phone): TeamRosterDraftRow => {
      const tag = phoneTag(phone, sport, locale);
      const invited = phone.kind === "account";
      return {
        key: phoneKey(phone),
        name: phone.name,
        initials: initials(phone.name),
        tile: invited ? "invited" : "added",
        meta: sentence(
          [
            tag,
            invited
              ? row.invitedByPhone
              : formatInternationalNumber(
                  phone.countryIso,
                  phone.nationalNumber,
                ),
          ],
          locale,
        ),
        status: invited ? row.invited : row.addedByYou,
        statusDetail: invited ? row.waiting : row.notOnTemba,
        isCaptain: false,
        removeLabel: row.remove(phone.name),
      };
    }),
  ];
  const full = count >= max;
  const seats: TeamRosterSeat[] = Array.from({ length: max }, (_, index) =>
    index === 0 ? "in" : index <= pending ? "pending" : "open",
  );
  const playable = sport === "football" ? formatsPlayable(count) : [];
  const largestSide = playable[playable.length - 1];
  const footnote = [
    largestSide ? m.create.enough(count, largestSide) : null,
    draft.phones.some((phone) => phone.kind !== "account")
      ? m.create.addedNote
      : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    countLine: m.draft.countLine(count, max),
    seats,
    stripHelper: sport === "football" ? m.create.stripHelper : null,
    stripMax: m.create.stripMax(max),
    stripSpoken: m.create.stripSpoken(count, pending, max),
    rows,
    addMore: full ? null : m.create.addMore,
    fullLine: full ? m.draft.full(max) : null,
    footnote: footnote.length > 0 ? footnote : null,
  };
}

export type TeamRosterDraftView = ReturnType<typeof rosterDraftView>;

/**
 * "Create Gooz FC" once the Roster is enough to play; until then, and with
 * no name, the plain "Create team".
 */
export function teamCreateSubmitLabel(
  input: { name: string; sport: Sport; count: number },
  locale: Locale,
) {
  const m = messagesFor(locale).team.create;
  const name = input.name.trim();
  return name.length > 0 && teamIsComplete(input.count, input.sport)
    ? m.submitNamed(name)
    : m.submit;
}

/** "Padel, 2 players" and "Football, roster up to 20" for the sport picker. */
export function teamSportChoices(locale: Locale): {
  value: Sport;
  name: string;
  detail: string;
}[] {
  const m = messagesFor(locale).team.create.sport;
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
  gamesWithYou?: number;
} & TeamRosterPlayerTag;

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

function firstWord(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export type TeamPhoneLookupCard =
  | {
      kind: "found" | "unclaimed";
      name: string;
      initials: string;
      line: string;
      note: string | null;
      action: string;
      actionA11y: string;
    }
  | { kind: "blocked"; name: string; initials: string; line: string }
  | { kind: "new"; title: string; line: string };

/**
 * The card under the phone field: "On Temba. Football OVR 72, FWD. 9 games with
 * you" with Invite, or "Not on Temba yet" with a name to add them by.
 */
export function teamPhoneLookupCard(
  preview: TeamPhonePreview,
  input: { listed: boolean; sport: Sport },
  locale: Locale,
): TeamPhoneLookupCard {
  const all = messagesFor(locale);
  const m = all.team.create.lookup;
  if (preview.kind === "new") {
    return { kind: "new", title: m.newTitle, line: m.newLine };
  }
  // A number the Captain has no tie to comes back without a name: the card
  // shows the masked number instead of telling them whose it is.
  const name =
    preview.name ??
    preview.phoneMasked ??
    all.group.addPlayer.preview.thisPlayer;
  const tile = initials(preview.name ?? "");
  const shortName = preview.name ? firstWord(preview.name) : name;
  if (preview.alreadyOnTeam || preview.alreadyInvited || input.listed) {
    return {
      kind: "blocked",
      name,
      initials: tile,
      line: teamPhonePreviewLine(preview, { listed: input.listed }, locale),
    };
  }
  if (preview.kind === "unclaimed") {
    return {
      kind: "unclaimed",
      name,
      initials: tile,
      line: m.unclaimedLine,
      note: null,
      action: m.add,
      actionA11y: m.addA11y(name),
    };
  }
  const sportName = all.team.create.sport[input.sport].name;
  const tagged = tagLevel(input.sport, preview);
  const level =
    tagged && input.sport === "football"
      ? all.rating.ovr.value(tagged)
      : tagged;
  const slot =
    input.sport === "football"
      ? footballSlotCode(
          preview.footballRole ?? null,
          preview.footballPosition ?? null,
          locale,
        )
      : null;
  const sportTag =
    level || slot
      ? [m.sportLevel(sportName, level), slot]
          .filter(Boolean)
          .join(all.common.listSeparator)
      : null;
  return {
    kind: "found",
    name,
    initials: tile,
    line: m.found(sportTag, preview.gamesWithYou ?? 0),
    note: m.inviteNote(shortName),
    action: m.invite,
    actionA11y: m.inviteA11y(name),
  };
}

/** The label on the add button of the Not on Temba card. */
export function teamNewPlayerAddLabel(name: string, locale: Locale) {
  const m = messagesFor(locale).team.create.lookup;
  const trimmed = name.trim();
  return trimmed.length > 0 ? m.addNamed(firstWord(trimmed)) : m.addUnnamed;
}

export type TeamNewPlayerRole = "gk" | FootballPosition;

/** GK keeper, DEF defence, MID midfield, FWD attack. */
export function teamNewPlayerRoleChoices(locale: Locale): {
  value: TeamNewPlayerRole;
  code: string;
  name: string;
}[] {
  const all = messagesFor(locale);
  const names = all.team.create.lookup.roles;
  return [
    { value: "gk", code: all.football.positionCode.gk, name: names.gk },
    ...(["def", "mid", "fwd"] as const).map((value) => ({
      value,
      code: footballPositionCode(value, locale),
      name: names[value],
    })),
  ];
}

/** No pick plays outfield with no preferred position. */
export function teamNewPlayerFootball(role: TeamNewPlayerRole | null): {
  role: FootballRole;
  position: FootballPosition | null;
} {
  if (role === "gk") {
    return { role: "keeper", position: null };
  }
  return { role: "outfield", position: role };
}

export type TeamGroupMemberToAdd = {
  userId: string;
  name: string;
  unclaimed: boolean;
  levelBand: LevelBand | null;
  /** Football only: the whole OVR; null on padel or without a Rating. */
  ovr?: number | null;
  footballRole: FootballRole | null;
  footballPosition?: FootballPosition | null;
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
    const tagged = tagLevel(input.sport, member);
    const level = tagged
      ? input.sport === "football"
        ? all.rating.ovr.value(tagged)
        : all.group.addPlayer.fromGroup.level(tagged)
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

export type TeamGroupChoice = {
  id: string;
  name: string | null;
  sport: Sport;
  memberCount: number;
  teamCount: number;
};

/** "Football, 14 members. No team yet" for each Group on Team from a group. */
export function teamGroupChoiceRows(
  groups: readonly TeamGroupChoice[],
  locale: Locale,
) {
  const all = messagesFor(locale);
  const m = all.team.create;
  return groups.map((group) => ({
    id: group.id,
    name: group.name ?? all.group.untitled,
    meta: m.group.meta(
      m.sport[group.sport].name,
      group.memberCount,
      group.teamCount,
    ),
  }));
}

export type TeamSquadPickRow = {
  userId: string;
  name: string;
  initials: string;
  meta: string | null;
  picked: boolean;
  isCaptain: boolean;
  /** Not on Temba, so not invitable; or every seat is taken. */
  disabled: boolean;
};

/**
 * Pick the squad: you first, then the Group's members. A pick is an invite on
 * the draft; someone not on Temba is added by phone instead.
 */
export function teamSquadPickRows(
  input: {
    captainName: string;
    members: readonly TeamGroupMemberToAdd[];
    draft: TeamRosterDraft;
    sport: Sport;
  },
  locale: Locale,
): TeamSquadPickRow[] {
  const all = messagesFor(locale);
  const full = rosterDraftSpotsLeft(input.draft, input.sport) === 0;
  return [
    {
      userId: "captain",
      name: input.captainName,
      initials: initials(input.captainName),
      meta: all.team.create.group.youCaptain,
      picked: true,
      isCaptain: true,
      disabled: true,
    },
    ...input.members.map((member) => {
      const picked = rosterDraftHasUser(input.draft, member.userId);
      return {
        userId: member.userId,
        name: member.name,
        initials: initials(member.name),
        meta: member.unclaimed
          ? all.team.addPlayers.memberUnclaimed
          : teamPlayerTag(input.sport, member, locale),
        picked,
        isCaptain: false,
        disabled: member.unclaimed || (!picked && full),
      };
    }),
  ];
}

/** Ticks a Group member onto the draft as an invite, or takes them off. */
export function toggleDraftGroupMember(
  draft: TeamRosterDraft,
  member: TeamGroupMemberToAdd,
  input: { groupName: string; sport: Sport },
): TeamRosterDraft {
  if (rosterDraftHasUser(draft, member.userId)) {
    return removeDraftRow(draft, inviteKey(member));
  }
  if (member.unclaimed) {
    return draft;
  }
  return addDraftInvites(
    draft,
    [
      {
        userId: member.userId,
        name: member.name,
        levelBand: member.levelBand,
        ovr: member.ovr ?? null,
        footballRole: member.footballRole,
        footballPosition: member.footballPosition ?? null,
        source: { kind: "group", groupName: input.groupName },
      },
    ],
    input.sport,
  );
}

/** "6 of 20, football" over the squad list. */
export function teamSquadCountLine(
  draft: TeamRosterDraft,
  sport: Sport,
  locale: Locale,
) {
  const m = messagesFor(locale).team.create.group;
  return m.squadCount(
    rosterDraftCount(draft),
    teamRosterRule(sport).max,
    m.sportLower[sport],
  );
}
