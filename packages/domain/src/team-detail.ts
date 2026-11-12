import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { FOOTBALL_POSITIONS } from "./football-lineup";
import { formatGameDay, formatMonth, formatWeekday } from "./format-game-start";
import { initials } from "./initials";
import { displayLabelFromStoredBand } from "./level-bands";
import { isPreferredPosition } from "./preferred-position";
import { productDaysBetween, zonedParts } from "./product-timezone";
import {
  resultMarkLabel,
  resultMarkVariant,
  type MatchOutcome,
  type ResultMarkVariant,
} from "./result-mark";
import { sportLabel, sportOrDefault } from "./sport";
import { teamLevel } from "./team-level";
import {
  headToHeadLine,
  headToHeadSpoken,
  opponentName,
  type TeamRivalInput,
} from "./team-rivals";
import {
  TEAM_FORM_SLOTS,
  teamHomeView,
  type TeamHomeInput,
  type TeamHomeMemberInput,
} from "./teams";

type SetScore = { us: number | null; them: number | null };

type DetailRivalInput = TeamRivalInput & { lastSets?: readonly SetScore[] };

export type TeamDetailInput = Omit<TeamHomeInput, "rivals" | "closestRival"> & {
  createdAt: Date | string;
  formGames: readonly { result: MatchOutcome; playedAt: Date | string }[];
  rivals: DetailRivalInput[];
  closestRival: DetailRivalInput | null;
  challengeGames: readonly {
    startsAt: Date | string;
    cancelled: boolean;
    opponent: { teamId: string | null };
  }[];
  shareUrl?: string | null;
  imageUrl?: string | null;
};

/** A day this close reads as its weekday: "Friday makes it two". */
const WEEKDAY_HORIZON_DAYS = 6;

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function isSquad(data: TeamDetailInput) {
  return data.roster.max > data.roster.min;
}

/** "6–3, 4–6, 6–2" from this Team's side; null when no set was scored. */
export function teamSetsLine(sets: readonly SetScore[], locale: Locale) {
  const scored = sets.flatMap((set) =>
    set.us != null && set.them != null ? [`${set.us}–${set.them}`] : [],
  );
  return scored.length > 0
    ? messagesFor(locale).team.detail.games.sets(scored)
    : null;
}

function nextGameAgainst(
  data: TeamDetailInput,
  opponentTeamId: string,
  now: Date,
) {
  const upcoming = data.challengeGames
    .filter(
      (game) =>
        !game.cancelled &&
        game.opponent.teamId === opponentTeamId &&
        asDate(game.startsAt).getTime() > now.getTime(),
    )
    .map((game) => asDate(game.startsAt))
    .sort((a, b) => a.getTime() - b.getTime());
  return upcoming[0] ?? null;
}

function sinceLine(createdAt: Date | string, locale: Locale) {
  const date = asDate(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return messagesFor(locale).team.detail.since(
    formatMonth(date, "short", locale),
    zonedParts(date).year,
  );
}

function heroSubtitle(data: TeamDetailInput, locale: Locale) {
  const m = messagesFor(locale).team;
  const sport = sportLabel(data.sport, locale);
  const level = teamLevel(
    data.members.map((member) => member.level),
    sportOrDefault(data.sport),
  );
  const lead =
    sport && level ? m.detail.sportLevel(sport, level.band) : (sport ?? null);
  const groupName = data.groupTag?.name?.trim();
  const group = data.groupTag
    ? m.groupTag.line(
        groupName && groupName.length > 0
          ? groupName
          : messagesFor(locale).group.untitled,
      )
    : null;
  const plays =
    isSquad(data) && data.roster.formatsPlayable.length > 0
      ? m.roster.plays(data.roster.formatsPlayable)
      : null;
  const extras = [group, plays];
  const since = extras.some(Boolean) ? null : sinceLine(data.createdAt, locale);
  const parts = [lead, ...extras, since].filter(
    (part): part is string => part != null && part.length > 0,
  );
  return parts.length > 0 ? m.detail.sentences(parts) : null;
}

function heroRecord(data: TeamDetailInput, locale: Locale) {
  const m = messagesFor(locale).team;
  const squad = isSquad(data);
  return {
    label: m.detail.record.label,
    value: headToHeadLine(data.record, data.sport, locale),
    caption: squad
      ? m.detail.record.wonDrawnLost
      : m.detail.record.games(data.record.gamesPlayed),
    spoken: [
      m.detail.record.label,
      squad
        ? m.recordSpokenWithDraws(
            data.record.wins,
            data.record.draws,
            data.record.losses,
          )
        : m.recordSpoken(data.record.wins, data.record.losses),
      m.detail.record.games(data.record.gamesPlayed),
    ].join(messagesFor(locale).group.metaSeparator),
  };
}

function heroSeats(data: TeamDetailInput, locale: Locale) {
  const m = messagesFor(locale);
  if (isSquad(data)) {
    return {
      kind: "roster" as const,
      label: m.team.roster.hero(data.roster.count, data.roster.max),
      filled: Math.min(data.roster.count, data.roster.max),
      total: data.roster.max,
    };
  }
  const names = data.members.map(
    (member) => member.name ?? m.team.memberFallback,
  );
  return {
    kind: "members" as const,
    tiles: data.members.map((member, index) => ({
      key: member.id,
      initials: initials(names[index] ?? m.team.memberFallback),
    })),
    openSeats: Math.max(0, data.roster.completeAt - data.roster.count),
    spoken: m.team.detail.membersSpoken(names.join(m.common.listSeparator)),
  };
}

/** Ten slots, oldest first; slots not played yet sit at the new end. */
function formView(data: TeamDetailInput, locale: Locale) {
  const m = messagesFor(locale).team;
  const shown = data.formGames.slice(-TEAM_FORM_SLOTS);
  const slots: ResultMarkVariant[] = [
    ...shown.map((game) => game.result),
    ...Array.from(
      { length: TEAM_FORM_SLOTS - shown.length },
      () => "not-played" as const,
    ),
  ];
  const oldest = shown[0];
  const newest = shown.at(-1);
  return {
    scope: m.detail.form.allTime,
    slots: slots.map((variant, index) => ({ key: `form-${index}`, variant })),
    ends:
      oldest && newest
        ? {
            oldest: formatGameDay(oldest.playedAt, locale),
            newest: formatGameDay(newest.playedAt, locale),
          }
        : null,
    emptyCopy: shown.length === 0 ? m.form.empty : null,
  };
}

function rivalLastLine(
  rival: DetailRivalInput,
  next: Date | null,
  locale: Locale,
) {
  const m = messagesFor(locale).team.detail.rivals;
  const day = formatGameDay(rival.lastPlayedAt, locale);
  const score = teamSetsLine(rival.lastSets ?? [], locale);
  const last =
    rival.lastResult && score
      ? m.last(m.result[rival.lastResult], score, day)
      : m.lastNoScore(day);
  return next
    ? m.next(last, formatGameDay(next, locale, { weekday: "short" }))
    : last;
}

function closestLine(
  data: TeamDetailInput,
  rival: DetailRivalInput,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).team.detail.rivals;
  const name = opponentName(rival.name, locale);
  const next = nextGameAgainst(data, rival.teamId, now);
  if (!next) {
    return m.closest(name);
  }
  const day =
    productDaysBetween(now, next) <= WEEKDAY_HORIZON_DAYS
      ? formatWeekday(next, "long", locale)
      : formatGameDay(next, locale, { weekday: "short" });
  return m.closestNext(name, day);
}

function rivalsView(
  data: TeamDetailInput,
  title: string,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.team.detail.rivals;
  const canRematch = data.viewerActsForTeam;
  const rows = data.rivals.map((rival) => {
    const name = opponentName(rival.name, locale);
    const line = rivalLastLine(
      rival,
      nextGameAgainst(data, rival.teamId, now),
      locale,
    );
    return {
      teamId: rival.teamId,
      initials: initials(name),
      name,
      headToHead: headToHeadLine(rival, data.sport, locale),
      line,
      accessibilityLabel: [
        name,
        headToHeadSpoken(rival, data.sport, locale),
        line,
      ].join(m.group.metaSeparator),
      rematch: canRematch
        ? {
            label: m.team.rivals.rematch,
            accessibilityLabel: m.team.rivals.rematchA11y(name),
          }
        : null,
    };
  });
  return {
    subtitle: rows.length > 0 ? copy.subtitle : copy.none,
    rows,
    footnote: rows.length > 0 && canRematch ? copy.footnote : null,
    empty:
      rows.length === 0
        ? {
            title: copy.emptyTitle,
            body: copy.emptyBody,
            initials: initials(title),
            versus: copy.versus,
            closest: data.closestRival
              ? closestLine(data, data.closestRival, now, locale)
              : null,
          }
        : null,
  };
}

function memberSeat(
  member: TeamHomeMemberInput,
  squad: boolean,
  locale: Locale,
) {
  const m = messagesFor(locale);
  if (squad) {
    if (member.footballRole === "keeper") {
      return m.football.positionCode.gk;
    }
    const position = FOOTBALL_POSITIONS.find(
      (value) => value === member.footballPosition,
    );
    return position ? m.football.positionCode[position] : null;
  }
  return isPreferredPosition(member.preferredPosition)
    ? m.team.detail.members.side[member.preferredPosition]
    : null;
}

function memberLevel(
  member: TeamHomeMemberInput,
  squad: boolean,
  locale: Locale,
) {
  if (!member.levelBand) {
    return null;
  }
  const band = displayLabelFromStoredBand(member.levelBand);
  if (squad || !member.level) {
    return band;
  }
  return messagesFor(locale).team.detail.members.level(band, member.level);
}

function memberWho(member: TeamHomeMemberInput, locale: Locale) {
  const m = messagesFor(locale).team.detail.members;
  if (member.isViewer && member.isCreator) {
    return m.youCaptain;
  }
  if (member.isViewer) {
    return m.you;
  }
  return member.isCreator ? m.captain : null;
}

function membersView(
  data: TeamDetailInput,
  home: ReturnType<typeof teamHomeView>,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.team.detail;
  const squad = isSquad(data);
  const rows = data.members.map((member, index) => {
    const base = home.members[index];
    const name = member.name ?? m.team.memberFallback;
    const who = memberWho(member, locale);
    const seat = memberSeat(member, squad, locale);
    const line =
      who && seat ? copy.members.line(who, seat) : (who ?? seat ?? null);
    const note = [base?.addedLabel ?? null, base?.phoneMasked ?? null]
      .filter((part): part is string => part != null)
      .join(m.common.listSeparator);
    const level = memberLevel(member, squad, locale);
    return {
      id: member.id,
      name,
      initials: initials(name),
      isViewer: member.isViewer,
      line,
      note: note.length > 0 ? note : null,
      unclaimed: member.unclaimed === true,
      level,
      profileUserId: member.unclaimed ? null : (member.userId ?? null),
      remove: base?.remove ?? null,
      accessibilityLabel: [name, line, note, level]
        .filter((part): part is string => Boolean(part))
        .join(m.group.metaSeparator),
    };
  });
  const openSeat = squad
    ? home.addMore
      ? {
          action: "add" as const,
          title: copy.roster.openSeat,
          detail: home.addMore.detail,
          cta: copy.roster.invite,
        }
      : null
    : data.canInvite && data.roster.count < data.roster.completeAt
      ? {
          action: "invite" as const,
          title: copy.roster.openSeat,
          detail: copy.roster.partnerDetail,
          cta: copy.roster.invite,
        }
      : null;
  return {
    title: squad ? m.team.roster.title : copy.members.title,
    count: m.team.roster.count(data.roster.count, data.roster.max),
    rows,
    preview: home.rosterPreview,
    more: home.rosterMore,
    openSeat,
    footnote: squad ? copy.roster.footnote : null,
    emptyCopy: rows.length === 0 ? m.team.noMembers.description : null,
  };
}

function gamesView(data: TeamDetailInput, locale: Locale) {
  const m = messagesFor(locale);
  return {
    subtitle: m.team.detail.games.subtitle,
    rows: data.games.map((game) => {
      const name = opponentName(game.opponent.name, locale);
      const title = m.team.detail.games.versus(name);
      const meta = [
        formatGameDay(game.playedAt, locale, { weekday: "short" }),
        game.venueName,
      ]
        .filter((part): part is string => Boolean(part))
        .join(m.common.listSeparator);
      const score = teamSetsLine(game.sets, locale) ?? m.game.history.noScore;
      const result = resultMarkVariant(game.result);
      return {
        key: game.matchId,
        gameId: game.gameId,
        result,
        title,
        meta,
        score,
        accessibilityLabel: [
          title,
          resultMarkLabel(result, locale),
          meta,
          score,
        ].join(m.group.metaSeparator),
      };
    }),
    emptyCopy: data.games.length === 0 ? m.team.games.empty : null,
  };
}

function primaryAction(
  data: TeamDetailInput,
  home: ReturnType<typeof teamHomeView>,
  locale: Locale,
) {
  if (home.primaryInvite) {
    return { kind: "invite" as const, label: home.inviteLabel };
  }
  if (data.viewerActsForTeam) {
    return {
      kind: "post" as const,
      label: messagesFor(locale).team.detail.postChallenge,
    };
  }
  return null;
}

/**
 * Team detail (design "Challenges v2.2" 4a and 4b): the ink hero with the
 * record and its seats, then Form, Rivals, the Members or Roster, and Games.
 */
export function teamDetailView(
  data: TeamDetailInput,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const home = teamHomeView(
    { ...data, rivals: [], closestRival: null },
    locale,
  );
  const title = home.title;
  return {
    home,
    squad: isSquad(data),
    hero: {
      title,
      initials: initials(title),
      imageUrl: data.imageUrl ?? null,
      subtitle: heroSubtitle(data, locale),
      record: heroRecord(data, locale),
      seats: heroSeats(data, locale),
      primary: primaryAction(data, home, locale),
      share: data.shareUrl
        ? {
            label: m.team.detail.share,
            url: data.shareUrl,
            text: m.team.detail.shareText(title, data.shareUrl),
            copied: m.team.detail.shareCopied,
          }
        : null,
    },
    form: formView(data, locale),
    rivals: rivalsView(data, title, now, locale),
    members: membersView(data, home, locale),
    games: gamesView(data, locale),
    openGroupLabel: data.groupTag?.name?.trim()
      ? m.team.detail.openGroup(data.groupTag.name.trim())
      : null,
  };
}

export type TeamDetailView = ReturnType<typeof teamDetailView>;
