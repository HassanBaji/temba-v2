import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { poolLetter } from "./tournament-knockout";
import { tournamentRoundSummary } from "./tournament-rounds";
import { resolveRoundCount } from "./tournament-sizing";

function gameTeamName(
  team: {
    name: string | null;
    members: readonly { name: string }[];
  },
  locale: Locale,
) {
  if (team.members.length > 0) {
    return team.members.map((member) => member.name).join(" / ");
  }
  return team.name ?? messagesFor(locale).tournament.gameTeam;
}

export function poolLabel(poolIndex: number, locale: Locale) {
  return messagesFor(locale).tournament.poolDraw.poolLabel(
    poolLetter(poolIndex),
  );
}

export function hasDraftPoolDraw(
  gameTeams: readonly { poolIndex: number | null | undefined }[],
) {
  return gameTeams.some((team) => team.poolIndex != null);
}

export function canOpenOrganizerDrawDrawer(args: {
  isOrganizer: boolean;
  cancelled: boolean;
  drawPosted: boolean;
}) {
  return args.isOrganizer && !args.cancelled && !args.drawPosted;
}

export function canShowUndoPoolDraw(args: {
  isOrganizer: boolean;
  cancelled: boolean;
  drawPosted: boolean;
  canUndo: boolean;
}) {
  return args.isOrganizer && !args.cancelled && args.drawPosted && args.canUndo;
}

export function drawEntryTitle(
  hasDraft: boolean,
  locale: Locale,
  knockoutOnly = false,
) {
  const m = messagesFor(locale).tournament.poolDraw;
  if (knockoutOnly) {
    return hasDraft ? m.knockoutEntryDraftedTitle : m.knockoutEntryTitle;
  }
  return hasDraft ? m.entryDraftedTitle : m.entryTitle;
}

export function drawEntryStateLine(
  completeTeams: number,
  teamCount: number,
  locale: Locale,
) {
  return messagesFor(locale).tournament.poolDraw.entryStateLine(
    completeTeams,
    teamCount,
  );
}

export function drawDrawerLead(
  teamCount: number | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.poolDraw;
  if (teamCount == null || teamCount <= 0) {
    return m.random;
  }
  return m.drawerLead(teamCount);
}

/** The tree sizes itself to the complete Game teams, not the planned count. */
export function knockoutDrawDrawerLead(completeTeams: number, locale: Locale) {
  const m = messagesFor(locale).tournament.poolDraw;
  if (completeTeams <= 0) {
    return m.knockoutRandom;
  }
  return m.knockoutDrawerLead(completeTeams);
}

export function draftPoolMetaLine(
  args: {
    dateLines: readonly string[];
    courtNames: readonly string[];
  },
  locale: Locale,
) {
  const { common } = messagesFor(locale);
  const parts = [...args.dateLines];
  const courts = args.courtNames.filter((name) => name.trim().length > 0);
  if (courts.length > 0) {
    parts.push(courts.map(common.isolate).join(common.listSeparator));
  }
  return parts.join(common.listSeparator);
}

export type DraftPoolTeam = {
  id: string;
  name: string | null;
  sideIndex: number | null;
  poolIndex: number | null;
  members: readonly { name: string }[];
};

export type DraftPoolView = {
  poolIndex: number;
  label: string;
  teams: { id: string; name: string }[];
  dateLines: string[];
  courtNames: string[];
};

export function draftPoolsFromGameTeams(args: {
  gameTeams: readonly DraftPoolTeam[];
  storedRoundCount: number | null | undefined;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  matchMinutes: number | null;
  courtNames: readonly string[];
  locale: Locale;
}): DraftPoolView[] {
  const byPool = new Map<number, DraftPoolTeam[]>();
  for (const team of args.gameTeams) {
    if (team.poolIndex == null) {
      continue;
    }
    const list = byPool.get(team.poolIndex) ?? [];
    list.push(team);
    byPool.set(team.poolIndex, list);
  }

  const draftPoolSizes = [...byPool.values()].map((teams) => teams.length);
  const rounds = tournamentRoundSummary({
    roundCount: resolveRoundCount(draftPoolSizes, args.storedRoundCount),
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
    matchMinutes: args.matchMinutes,
    locale: args.locale,
  });
  const dateLines = rounds?.dateLines ?? [];
  const courtNames = [...args.courtNames];

  return [...byPool.entries()]
    .sort(([left], [right]) => left - right)
    .map(([poolIndex, teams]) => ({
      poolIndex,
      label: poolLabel(poolIndex, args.locale),
      teams: [...teams]
        .sort((left, right) => {
          const leftSide = left.sideIndex ?? Number.MAX_SAFE_INTEGER;
          const rightSide = right.sideIndex ?? Number.MAX_SAFE_INTEGER;
          if (leftSide !== rightSide) {
            return leftSide - rightSide;
          }
          return left.id.localeCompare(right.id);
        })
        .map((team) => ({
          id: team.id,
          name: gameTeamName(team, args.locale),
        })),
      dateLines,
      courtNames,
    }));
}
