import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { groupHomeSportLabel } from "./group-home-chrome";
import type { Sport } from "./sport";
import { teamAvatarPeople } from "./team-avatar-people";
import { formatWinRate } from "./win-rate";

export function teamCreateInput(form: { name: string; sport: Sport }) {
  return { name: teamNameInput(form.name), sport: form.sport };
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

export type TeamHomeInput = {
  displayName: string | null;
  sport: string;
  waitingForPartner: boolean;
  gamesPlayed: number;
  wins: number;
  losses: number;
  members: {
    id: string;
    name: string | null;
    image: string | null;
    isCreator: boolean;
    isViewer: boolean;
  }[];
  roster: TeamRosterInput;
  canInvite: boolean;
  canDissolve: boolean;
  viewerCanLeave: boolean;
};

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

  return {
    title,
    badges,
    people: data.members.map((member) => ({
      name: member.name ?? m.team.memberFallback,
      image: member.image,
    })),
    openSeats: seatsToComplete,
    squad,
    roster: teamRosterView(data.roster, locale),
    inviteLabel: teamInviteLabel(squad, locale),
    primaryInvite: data.waitingForPartner && data.canInvite,
    waitingNote: data.waitingForPartner && !data.canInvite,
    waitingCopy: squad
      ? m.team.roster.waitingSquad(seatsToComplete)
      : m.team.waitingCopy,
    stats: [
      { label: m.team.stats.gamesPlayed, value: String(data.gamesPlayed) },
      { label: m.common.wins, value: String(data.wins) },
      { label: m.common.losses, value: String(data.losses) },
      {
        label: m.team.stats.winRate,
        value: formatWinRate(data.wins, data.gamesPlayed),
      },
    ],
    members: data.members.map((member) => ({
      id: member.id,
      name: member.name ?? m.team.memberFallback,
      image: member.image,
      isViewer: member.isViewer,
      creatorLabel: member.isCreator ? m.team.creatorLabel : null,
    })),
    canInvite: data.canInvite,
    canDissolve: data.canDissolve,
    canLeave: data.viewerCanLeave,
  };
}

export type TeamHomeView = ReturnType<typeof teamHomeView>;
