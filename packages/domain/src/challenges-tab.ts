import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { groupHomeSportLabel } from "./group-home-chrome";
import { shortPlayerName } from "./player-name";
import { isSport } from "./sport";
import { teamSeatsToComplete } from "./team-roster";
import {
  teamCardView,
  type TeamCardInput,
  type TeamGroupTagInput,
} from "./teams";

export const CHALLENGES_TABS = ["open", "mine", "teams"] as const;

export type ChallengesTab = (typeof CHALLENGES_TABS)[number];

export function challengesTabFromQuery(
  tab: string | null | undefined,
): ChallengesTab {
  if (tab === "mine" || tab === "teams") {
    return tab;
  }
  return "open";
}

export function challengesTabQuery(tab: ChallengesTab) {
  return tab === "open" ? "" : `?tab=${tab}`;
}

export type ChallengesCounts = Record<ChallengesTab, number | null>;

/** Open, Mine and Teams in order; a count shows once it is known, zero included. */
export function challengesSegments(counts: ChallengesCounts, locale: Locale) {
  const m = messagesFor(locale).challenge.segments;
  return CHALLENGES_TABS.map((key) => {
    const count = counts[key];
    return {
      key,
      label: m[key],
      count,
      accessibilityLabel: count == null ? m[key] : m.withCount(m[key], count),
    };
  });
}

export type ChallengeTeamRowInput = TeamCardInput & {
  members: { name: string; image?: string | null; you?: boolean }[];
  rivalCount?: number;
};

function groupTagName(group: TeamGroupTagInput, locale: Locale) {
  const name = group.name?.trim();
  return name && name.length > 0 ? name : messagesFor(locale).group.untitled;
}

/** "You and Ali M", the viewer first. */
function pairLine(members: ChallengeTeamRowInput["members"], locale: Locale) {
  const m = messagesFor(locale).challenge.tab.teams;
  const names = [...members]
    .sort((a, b) => Number(b.you === true) - Number(a.you === true))
    .map((member) => (member.you ? m.you : shortPlayerName(member.name)));
  const [first, second] = names;
  if (!first) {
    return null;
  }
  return second ? m.pair(first, second) : first;
}

/**
 * A Team row in Challenges › Teams. Padel: "Padel. You and Ali M. 1 rival";
 * football: "Football. 12 on the roster. Gooz of Arad's team". The record
 * reads "7–3" over "record".
 */
export function challengeTeamRowView(
  team: ChallengeTeamRowInput,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const card = teamCardView(team, locale);
  const record = {
    value: card.record.value,
    label: m.challenge.tab.teams.record,
  };
  if (team.sport !== "padel") {
    return { ...card, record };
  }
  const rivals = team.rivalCount ?? 0;
  const line = [
    groupHomeSportLabel(team.sport, locale),
    pairLine(team.members, locale),
    team.incomplete ? m.team.incompleteLabel : null,
    rivals > 0 ? m.challenge.tab.teams.rivals(rivals) : null,
    team.groupTag
      ? m.team.groupTag.line(groupTagName(team.groupTag, locale))
      : null,
  ]
    .filter((part): part is string => part != null)
    .join(m.challenge.teams.lineSeparator);
  return {
    ...card,
    line,
    record,
    accessibilityLabel: [team.displayName, line, card.record.value].join(
      m.group.metaSeparator,
    ),
  };
}

export type ChallengeTeamInviteInput = {
  id: string;
  displayName: string;
  sport?: string | null;
  rosterCount?: number | null;
  invitedBy: { name: string | null };
};

/** An invite row: "Football. Noor S invited you, 2 seats open". */
export function challengeTeamInviteView(
  invite: ChallengeTeamInviteInput,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.challenge.tab.teams;
  const invited = copy.invitedYou(
    shortPlayerName(invite.invitedBy.name ?? m.team.memberFallback),
  );
  const sport = isSport(invite.sport) ? invite.sport : null;
  const seats =
    sport && invite.rosterCount != null
      ? teamSeatsToComplete(invite.rosterCount, sport)
      : 0;
  const tail =
    seats > 0 ? copy.invitedLine(invited, copy.seatsOpen(seats)) : invited;
  const line = sport
    ? [groupHomeSportLabel(sport, locale), tail].join(
        m.challenge.teams.lineSeparator,
      )
    : tail;
  return {
    id: invite.id,
    title: invite.displayName,
    line,
    joinA11y: m.challenge.teams.joinA11y(invite.displayName),
  };
}
