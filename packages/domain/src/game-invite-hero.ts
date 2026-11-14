import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { footballHeroLines, shortName } from "./football-board";
import { formatOvrFromTenths } from "./football-ovr";
import { formatGameStart } from "./format-game-start";
import { sideSizeLabel } from "./game-shape";
import { initials } from "./initials";
import { displayLabelFromStoredBand } from "./level-bands";
import { formatLevelRangeLabel, tenthsToLevelBand } from "./level-range";
import { formatPricePerPlayerFils } from "./price-per-player";
import { sportLabel } from "./sport";

type DateLike = Date | string;

/** What a Game Invite link shows before anyone joins (`games.previewInviteLink`). */
export type GameInviteHero = {
  sport: string | null;
  windowStart: DateLike | null;
  windowEnd: DateLike | null;
  cancelledAt: DateLike | null;
  venueName: string | null;
  venueCity: string | null;
  courtName: string | null;
  sideSize: number | null;
  /** Seats on the Game; null when it has no cap. */
  seatCount: number | null;
  /** Seated players in the order they joined. */
  players: { name: string | null; isViewer: boolean }[];
  pricePerPlayerFils: number | null;
  rated: boolean;
  organizerName: string | null;
  sharedByName: string | null;
  linkExpiresAt: DateLike | null;
  /** The Game's Group as anyone holding the link sees it. */
  groupCard: {
    id: string;
    name: string | null;
    sport: string | null;
    imageUrl: string | null;
    memberCount: number;
    memberNames: string[];
  } | null;
};

export type GameInviteHeroTile =
  | { kind: "player"; initials: string; isViewer: boolean }
  | { kind: "open" };

function asDate(value: DateLike | null | undefined) {
  if (value == null) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

/** Past this many open seats the grid stops drawing them one by one. */
const MAX_OPEN_TILES = 12;

export function gameInviteHeroTiles(
  hero: GameInviteHero,
): GameInviteHeroTile[] {
  const players: GameInviteHeroTile[] = hero.players.map((player) => ({
    kind: "player",
    initials: initials(player.name ?? ""),
    isViewer: player.isViewer,
  }));
  const viewerFirst = [
    ...players.filter((tile) => tile.kind === "player" && tile.isViewer),
    ...players.filter((tile) => !(tile.kind === "player" && tile.isViewer)),
  ];
  const open =
    hero.seatCount == null
      ? 0
      : Math.min(
          MAX_OPEN_TILES,
          Math.max(0, hero.seatCount - hero.players.length),
        );
  return [
    ...viewerFirst,
    ...Array.from({ length: open }, () => ({ kind: "open" as const })),
  ];
}

/** The ink head of a Game Invite link: when, where, and who is in. */
export function gameInviteHeroModel(
  hero: GameInviteHero,
  now: Date,
  locale: Locale,
) {
  const messages = messagesFor(locale);
  const m = messages.mobileInvite.link.hero;
  const lines = footballHeroLines(
    {
      windowStart: asDate(hero.windowStart),
      windowEnd: asDate(hero.windowEnd),
      cancelledAt: asDate(hero.cancelledAt),
      sideSize: null,
      venueName: hero.venueName,
      pitchName: hero.courtName,
      teamsSet: false,
      scored: false,
    },
    now,
    locale,
  );
  const price = formatPricePerPlayerFils(hero.pricePerPlayerFils, locale);
  const detailLine =
    [
      lines.subLine,
      hero.sideSize ? sideSizeLabel(hero.sideSize, locale) : null,
      price ? m.priceEach(price) : null,
    ]
      .filter(Boolean)
      .join(messages.common.listSeparator) || null;
  const inCount = hero.players.length;
  return {
    tag: messages.mobileInvite.link.fromALink,
    sport: sportLabel(hero.sport, locale),
    status: lines.status,
    time: lines.time,
    meridiem: lines.meridiem,
    dayLine: lines.dayLine,
    detailLine,
    countLine: m.countIn(inCount, hero.seatCount),
    rosterA11y: m.rosterA11y(inCount, hero.seatCount),
    tiles: gameInviteHeroTiles(hero),
    openSeats:
      hero.seatCount == null ? null : Math.max(0, hero.seatCount - inCount),
  };
}

export type GameInviteLevelFit = "fits" | "outside" | "no_level" | "signed_out";

export function gameInviteLevelFit(args: {
  isSignedIn: boolean;
  viewerLevelTenths: number | null;
  viewerPassesLevelRange: boolean | null;
}): GameInviteLevelFit {
  if (!args.isSignedIn) {
    return "signed_out";
  }
  if (args.viewerLevelTenths == null) {
    return "no_level";
  }
  return args.viewerPassesLevelRange === false ? "outside" : "fits";
}

/** The viewer's Level as the card's big value: their band, or their OVR on football. */
function viewerLevelOf(
  tenths: number | null,
  sport: string | null | undefined,
) {
  if (tenths == null) {
    return null;
  }
  return sport === "football"
    ? formatOvrFromTenths(tenths)
    : displayLabelFromStoredBand(tenthsToLevelBand(tenths));
}

/** The Level row under the hero: the range, and whether the viewer is in it. */
export function gameInviteLevelRow(args: {
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  fit: GameInviteLevelFit;
  locale: Locale;
  sport?: string | null;
}) {
  const range = formatLevelRangeLabel(
    args.levelMinTenths,
    args.levelMaxTenths,
    args.locale,
    args.sport,
  );
  if (!range) {
    return null;
  }
  const m = messagesFor(args.locale).mobileInvite.link.hero;
  if (args.fit === "fits") {
    return m.levelFits(range);
  }
  if (args.fit === "outside") {
    return m.levelOutside(range);
  }
  return range;
}

/**
 * The web landing's Level card (design 3a, 3b): the viewer's band in large
 * type, or their OVR on football, and a sentence.
 */
export function gameInviteLevelCard(args: {
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  viewerLevelTenths: number | null;
  fit: GameInviteLevelFit;
  asksAboutGroup: boolean;
  locale: Locale;
  sport?: string | null;
}) {
  const range = formatLevelRangeLabel(
    args.levelMinTenths,
    args.levelMaxTenths,
    args.locale,
    args.sport,
  );
  if (!range) {
    return null;
  }
  const messages = messagesFor(args.locale);
  const m = messages.mobileInvite.link.hero.levelCard;
  const viewerLevel = viewerLevelOf(args.viewerLevelTenths, args.sport);
  const yours =
    viewerLevel != null && args.sport === "football"
      ? messages.level.ovr(viewerLevel)
      : viewerLevel;
  const sentence =
    args.fit === "signed_out"
      ? m.signedOut(range)
      : args.fit === "no_level" || !yours
        ? m.noLevel(range)
        : args.fit === "outside"
          ? m.outside(range, yours)
          : m.fits(range, yours);
  const text =
    args.asksAboutGroup && args.fit === "fits"
      ? `${sentence} ${m.asksFirst}`
      : sentence;
  return { band: args.fit === "signed_out" ? null : viewerLevel, text };
}

/** Rows under the hero on both Apps: who organizes, the Group, the Level. */
export function gameInviteInfoRows(args: {
  hero: GameInviteHero;
  levelRow: string | null;
  locale: Locale;
}) {
  const messages = messagesFor(args.locale);
  const m = messages.mobileInvite.link;
  const rows: { label: string; value: string }[] = [];
  if (args.hero.organizerName) {
    rows.push({ label: m.hero.organizerRow, value: args.hero.organizerName });
  }
  const group = args.hero.groupCard;
  if (group) {
    const name = group.name ?? messages.group.untitled;
    const sport = sportLabel(group.sport, args.locale);
    rows.push({
      label: m.group.groupRow,
      value: [
        name,
        sport ? sport.toLocaleLowerCase(args.locale) : null,
        m.group.members(group.memberCount),
      ]
        .filter(Boolean)
        .join(messages.common.listSeparator),
    });
  }
  if (args.levelRow) {
    rows.push({ label: messages.common.level, value: args.levelRow });
  }
  return rows;
}

/** The web landing's rows (design 3a): format, court and how long the link works. */
export function gameInviteWebRows(hero: GameInviteHero, locale: Locale) {
  const m = messagesFor(locale).mobileInvite.link.hero;
  const expires = asDate(hero.linkExpiresAt);
  return [
    { label: m.formatRow, value: hero.rated ? m.rated : m.unrated },
    { label: m.courtRow, value: m.payAtVenue(hero.courtName) },
    {
      label: m.linkRow,
      value: expires
        ? m.linkUntil(formatGameStart(expires, locale))
        : m.linkOpen,
    },
  ];
}

/** "Shared by Yousif K." over the hero, or how the viewer stands to the Group. */
export function gameInviteSharerName(hero: GameInviteHero) {
  return hero.sharedByName ? shortName(hero.sharedByName) : null;
}
