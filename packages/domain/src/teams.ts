import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { isFootballPosition } from "./football-lineup";
import { formatGameDay } from "./format-game-start";
import type { GroupTeamData } from "./group-data";
import { groupHomeSportLabel } from "./group-home-chrome";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import { historyScoreLine } from "./match-history-card";
import { isPreferredPosition } from "./preferred-position";
import {
  resultMarkVariant,
  type MatchOutcome,
  type ResultMarkVariant,
} from "./result-mark";
import type { Sport } from "./sport";
import { teamAvatarPeople } from "./team-avatar-people";
import { teamLevelLabel } from "./team-level";
import {
  closestRivalLine,
  headToHeadLine,
  opponentName,
  teamRivalRow,
  type HeadToHead,
  type TeamRivalInput,
} from "./team-rivals";

export function teamCreateInput(form: {
  name: string;
  sport: Sport;
  groupId?: string | null;
}) {
  return {
    name: teamNameInput(form.name),
    sport: form.sport,
    ...(form.groupId ? { groupId: form.groupId } : {}),
  };
}

export function teamNameInput(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type TeamListRowInput = {
  id: string;
  displayName: string;
  sport: string;
  incomplete: boolean;
  members: { name: string; image?: string | null }[];
};

export function teamListRowView(team: TeamListRowInput, locale: Locale) {
  const m = messagesFor(locale);
  const meta = groupHomeSportLabel(team.sport, locale);
  return {
    id: team.id,
    title: team.displayName,
    meta,
    people: teamAvatarPeople(team.members, locale),
    openSeats: team.incomplete ? 1 : 0,
    incompleteLabel: team.incomplete ? m.team.incompleteLabel : null,
    accessibilityLabel: [
      team.displayName,
      meta,
      team.incomplete ? m.team.incompleteLabel : null,
    ]
      .filter(Boolean)
      .join(m.group.metaSeparator),
  };
}

export type TeamCardInput = TeamListRowInput & {
  rosterCount: number;
  record: HeadToHead;
  groupTag: TeamGroupTagInput | null;
};

/** A Team in Challenges › Teams: "Football. 12 on the roster. Gooz of Arad's team" and its record. */
export function teamCardView(team: TeamCardInput, locale: Locale) {
  const m = messagesFor(locale);
  const squad = team.sport === "football";
  const line = [
    groupHomeSportLabel(team.sport, locale),
    squad ? m.team.onRoster(team.rosterCount) : null,
    !squad && team.incomplete ? m.team.incompleteLabel : null,
    team.groupTag
      ? m.team.groupTag.line(groupName(team.groupTag, locale))
      : null,
  ]
    .filter((part): part is string => part != null)
    .join(m.challenge.teams.lineSeparator);
  const recordSpoken = squad
    ? m.team.recordSpokenWithDraws(
        team.record.wins,
        team.record.draws,
        team.record.losses,
      )
    : m.team.recordSpoken(team.record.wins, team.record.losses);
  return {
    id: team.id,
    title: team.displayName,
    line,
    record: {
      label: squad
        ? m.challenge.teams.recordWithDraws
        : m.challenge.teams.record,
      value: headToHeadLine(team.record, team.sport, locale),
    },
    accessibilityLabel: [team.displayName, line, recordSpoken].join(
      m.group.metaSeparator,
    ),
  };
}

/** "Create from Gooz of Arad", one per Group the viewer organizes. */
export function teamCreateFromGroupOptions(
  groups: readonly TeamGroupTagInput[],
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.teams;
  return groups.map((group) => ({
    groupId: group.id,
    label: m.createFromGroup(groupName(group, locale)),
  }));
}

export function teamDissolveConfirm(displayName: string, locale: Locale) {
  const m = messagesFor(locale).team;
  return {
    title: m.dissolveConfirm.title(displayName),
    description: m.dissolveConfirm.description,
    confirmLabel: m.dissolveLabel,
  };
}

export function teamLeaveConfirm(displayName: string, locale: Locale) {
  const m = messagesFor(locale).team;
  return {
    title: m.leaveConfirm.title(displayName),
    description: m.leaveConfirm.description,
    confirmLabel: m.leaveLabel,
  };
}

export type TeamRosterInput = {
  min: number;
  max: number;
  completeAt: number;
  count: number;
  complete: boolean;
  full: boolean;
};

function isSquadRoster(roster: TeamRosterInput) {
  return roster.max > roster.min;
}

/** Only a Team that can grow past its completion size shows a count. */
export function teamRosterView(roster: TeamRosterInput, locale: Locale) {
  if (!isSquadRoster(roster)) {
    return { label: null, status: null };
  }
  const m = messagesFor(locale).team.roster;
  return {
    label: m.count(roster.count, roster.max),
    status: roster.full ? m.full : roster.complete ? m.complete : null,
  };
}

/** Seats a creator can still hand out as invites, pending ones included. */
export function teamInviteSeatsLeft(
  roster: TeamRosterInput,
  pendingInvites: number,
) {
  return Math.max(0, roster.max - roster.count - pendingInvites);
}

export function teamInviteLabel(squad: boolean, locale: Locale) {
  const m = messagesFor(locale).team;
  return squad ? m.squadInviteLabel : m.invitePartnerLabel;
}

export function teamLookupNote(squad: boolean, locale: Locale) {
  const m = messagesFor(locale).team;
  return squad ? m.squadLookupNote : m.lookupNote;
}

export function teamInviteDescription(squad: boolean, locale: Locale) {
  const m = messagesFor(locale).team;
  return squad ? m.squadInviteDescription : m.inviteDescription;
}

export type TeamHomeMemberInput = {
  id: string;
  name: string | null;
  image: string | null;
  isCreator: boolean;
  isViewer: boolean;
  level: string | null;
  levelBand: LevelBand | null;
  preferredPosition: string | null;
  footballRole: string | null;
  footballPosition: string | null;
  userId?: string;
  /** Added by phone and not on Temba yet. */
  unclaimed?: boolean;
  /** Set for the Captain only. */
  phoneMasked?: string | null;
  removable?: boolean;
};

export type TeamHomeGameInput = {
  matchId: string;
  gameId: string;
  playedAt: Date | string;
  venueName: string | null;
  opponent: { teamId: string | null; name: string | null };
  sets: { us: number | null; them: number | null }[];
  result: MatchOutcome | null;
};

export type TeamGroupTagInput = { id: string; name: string | null };

export type TeamHomeInput = {
  displayName: string | null;
  sport: string;
  waitingForPartner: boolean;
  record: HeadToHead & { gamesPlayed: number };
  form: MatchOutcome[];
  rivals: TeamRivalInput[];
  closestRival: TeamRivalInput | null;
  games: TeamHomeGameInput[];
  members: TeamHomeMemberInput[];
  roster: TeamRosterInput & { formatsPlayable: readonly number[] };
  groupTag: TeamGroupTagInput | null;
  canClearGroupTag: boolean;
  groupTagOptions: TeamGroupTagInput[];
  canInvite: boolean;
  canDissolve: boolean;
  viewerCanLeave: boolean;
  viewerActsForTeam: boolean;
};

export const TEAM_FORM_SLOTS = 10;

/** The Roster section lists this many members before "and N more". */
export const TEAM_ROSTER_PREVIEW = 6;

function groupName(group: TeamGroupTagInput, locale: Locale) {
  const name = group.name?.trim();
  return name && name.length > 0 ? name : messagesFor(locale).group.untitled;
}

/** Football only: "Roster 12 of 20" and the Formats the Roster can post. */
function rosterHero(data: TeamHomeInput, locale: Locale) {
  if (!isSquadRoster(data.roster)) {
    return null;
  }
  const m = messagesFor(locale).team.roster;
  return {
    label: m.hero(data.roster.count, data.roster.max),
    plays:
      data.roster.formatsPlayable.length > 0
        ? m.plays(data.roster.formatsPlayable)
        : null,
  };
}

function addMoreRow(data: TeamHomeInput, locale: Locale) {
  if (!isSquadRoster(data.roster) || !data.canInvite) {
    return null;
  }
  const m = messagesFor(locale).team.roster.addMore;
  return {
    title: m.title,
    detail: data.groupTag
      ? m.detailWithGroup(groupName(data.groupTag, locale), data.roster.max)
      : m.detail(data.roster.max),
  };
}

function groupTagView(data: TeamHomeInput, locale: Locale) {
  const m = messagesFor(locale).team.groupTag;
  return {
    line: data.groupTag ? m.line(groupName(data.groupTag, locale)) : null,
    options: data.groupTagOptions.map((group) => ({
      groupId: group.id,
      label: m.tagAs(groupName(group, locale)),
      toast: m.tagged(groupName(group, locale)),
    })),
    remove: data.canClearGroupTag
      ? { label: m.remove, toast: m.removed }
      : null,
  };
}

function recordTiles(data: TeamHomeInput, locale: Locale) {
  const m = messagesFor(locale);
  const { record } = data;
  return [
    { key: "wins", label: m.common.wins, value: String(record.wins) },
    data.sport === "football"
      ? { key: "draws", label: m.team.stats.draws, value: String(record.draws) }
      : null,
    { key: "losses", label: m.common.losses, value: String(record.losses) },
    {
      key: "games",
      label: m.team.stats.gamesPlayed,
      value: String(record.gamesPlayed),
    },
  ].filter((tile) => tile != null);
}

/** Ten slots, oldest first, hatched on the older side until ten are played. */
function formSlots(form: readonly MatchOutcome[]) {
  const shown = form.slice(-TEAM_FORM_SLOTS);
  const variants: ResultMarkVariant[] = [
    ...Array.from(
      { length: TEAM_FORM_SLOTS - shown.length },
      () => "not-played" as const,
    ),
    ...shown,
  ];
  return variants.map((variant, index) => ({ key: `form-${index}`, variant }));
}

function memberSeatLabel(
  member: TeamHomeMemberInput,
  sport: string,
  locale: Locale,
) {
  const m = messagesFor(locale);
  if (sport === "football") {
    if (member.footballRole === "keeper") {
      return m.team.seat.keeper;
    }
    if (isFootballPosition(member.footballPosition)) {
      return m.football.lineup.positions[member.footballPosition];
    }
    return member.footballRole === "outfield" ? m.team.seat.outfield : null;
  }
  return isPreferredPosition(member.preferredPosition)
    ? m.team.seat[member.preferredPosition]
    : null;
}

function memberLevelLabel(member: TeamHomeMemberInput, locale: Locale) {
  return member.levelBand && member.level
    ? messagesFor(locale).team.level.member(
        displayLabelFromStoredBand(member.levelBand),
        member.level,
      )
    : null;
}

function gameRow(game: TeamHomeGameInput, locale: Locale) {
  const m = messagesFor(locale);
  const scored = game.sets.flatMap((set) =>
    set.us != null && set.them != null ? [{ us: set.us, them: set.them }] : [],
  );
  const day = formatGameDay(game.playedAt, locale);
  return {
    key: game.matchId,
    gameId: game.gameId,
    opponentName: opponentName(game.opponent.name, locale),
    meta: [day, game.venueName]
      .filter((part): part is string => Boolean(part))
      .join(m.common.listSeparator),
    scoreLine: historyScoreLine(scored, locale),
    result: resultMarkVariant(game.result),
  };
}

export function teamHomeView(data: TeamHomeInput, locale: Locale) {
  const m = messagesFor(locale);
  const title = data.displayName ?? m.team.fallbackName;
  const squad = isSquadRoster(data.roster);
  const seatsToComplete = Math.max(
    0,
    data.roster.completeAt - data.roster.count,
  );
  const badges = [
    groupHomeSportLabel(data.sport, locale),
    data.waitingForPartner ? m.team.incompleteLabel : null,
  ].filter((badge): badge is string => badge != null);
  const rivals = data.rivals.map((rival) =>
    teamRivalRow(rival, data.sport, locale),
  );
  const closestLine =
    rivals.length === 0 && data.closestRival
      ? closestRivalLine(data.closestRival, locale)
      : null;

  return {
    title,
    badges,
    teamLevel: teamLevelLabel(
      data.members.map((member) => member.level),
      locale,
    ),
    people: data.members.map((member) => ({
      name: member.name ?? m.team.memberFallback,
      image: member.image,
    })),
    openSeats: seatsToComplete,
    squad,
    roster: teamRosterView(data.roster, locale),
    rosterHero: rosterHero(data, locale),
    groupTag: groupTagView(data, locale),
    rosterPreview: TEAM_ROSTER_PREVIEW,
    rosterMore:
      data.members.length > TEAM_ROSTER_PREVIEW
        ? messagesFor(locale).team.roster.more(
            data.members.length - TEAM_ROSTER_PREVIEW,
          )
        : null,
    addMore: addMoreRow(data, locale),
    inviteLabel: teamInviteLabel(squad, locale),
    primaryInvite: data.waitingForPartner && data.canInvite,
    waitingNote: data.waitingForPartner && !data.canInvite,
    waitingCopy: squad
      ? m.team.roster.waitingSquad(seatsToComplete)
      : m.team.waitingCopy,
    recordTiles: recordTiles(data, locale),
    form: {
      slots: formSlots(data.form),
      emptyCopy: data.form.length === 0 ? m.team.form.empty : null,
    },
    rivals,
    closestLine,
    rivalsEmptyCopy:
      rivals.length === 0 && closestLine == null ? m.team.rivals.empty : null,
    rematch:
      data.viewerActsForTeam && rivals.length > 0
        ? {
            label: m.team.rivals.rematch,
            accessibilityLabels: Object.fromEntries(
              rivals.map((rival) => [
                rival.teamId,
                m.team.rivals.rematchA11y(rival.name),
              ]),
            ),
          }
        : null,
    games: data.games.map((game) => gameRow(game, locale)),
    gamesEmptyCopy: data.games.length === 0 ? m.team.games.empty : null,
    members: data.members.map((member) => ({
      id: member.id,
      name: member.name ?? m.team.memberFallback,
      image: member.image,
      isViewer: member.isViewer,
      captainLabel: member.isCreator ? m.team.captainLabel : null,
      seatLabel: memberSeatLabel(member, data.sport, locale),
      levelLabel: memberLevelLabel(member, locale),
      userId: member.userId ?? null,
      addedLabel: member.unclaimed ? m.team.draft.added : null,
      phoneMasked: member.phoneMasked ?? null,
      remove:
        member.removable && member.userId
          ? {
              userId: member.userId,
              label: m.team.draft.remove(member.name ?? m.team.memberFallback),
              confirm: {
                title: m.team.addPlayers.removeConfirm.title(
                  member.name ?? m.team.memberFallback,
                ),
                description: m.team.addPlayers.removeConfirm.description,
                confirmLabel: m.team.addPlayers.removeConfirm.confirm,
              },
              toast: m.group.addPlayer.removedToast(
                member.name ?? m.team.memberFallback,
              ),
            }
          : null,
    })),
    canInvite: data.canInvite,
    canDissolve: data.canDissolve,
    canLeave: data.viewerCanLeave,
  };
}

export type TeamHomeView = ReturnType<typeof teamHomeView>;

/** One Team on its Group's page: name, Roster count on football, record. */
export function groupTeamRowView(team: GroupTeamData, locale: Locale) {
  const m = messagesFor(locale);
  const squad = team.sport === "football";
  const record = headToHeadLine(team.record, team.sport, locale);
  const spoken = squad
    ? m.team.recordSpokenWithDraws(
        team.record.wins,
        team.record.draws,
        team.record.losses,
      )
    : m.team.recordSpoken(team.record.wins, team.record.losses);
  const roster = squad ? m.team.onRoster(team.rosterCount) : null;
  return {
    id: team.id,
    title: team.displayName ?? m.team.fallbackName,
    meta: [roster, record]
      .filter((part): part is string => part != null)
      .join(m.group.metaSeparator),
    accessibilityLabel: [
      m.group.teams.openTeam(team.displayName ?? m.team.fallbackName),
      roster,
      spoken,
    ]
      .filter((part): part is string => part != null)
      .join(m.group.metaSeparator),
  };
}
