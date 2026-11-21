import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  bibNames,
  shortName,
  slotCode,
  type Bibs,
  type BoardPlayer,
  type SideCaptains,
} from "./football-board";
import type { FootballDraftSides } from "./football-draft";
import type { FootballBib } from "./football-lineup";
import { formatGameClock, formatGameDay } from "./format-game-start";
import { gameCustomName } from "./game-custom-name";
import { cardVenue, cardWhen } from "./game-result-share";
import { sideSizeLabel } from "./game-shape";
import { initials } from "./initials";

/** What a Draft card shows: both teams, or one team for that team's chat. */
export type DraftShareMode = "both" | "slot1" | "slot2";

export type DraftCardPlayer = {
  userId: string;
  init: string;
  name: string;
  /** GK for a keeper, else the position code; null without a position. */
  code: string | null;
  captain: boolean;
};

export type DraftCardSide = {
  slot: 1 | 2;
  bib: FootballBib;
  /** "Black". */
  name: string;
  /** "TEAM BLACK", over the side's list on the both-teams card. */
  listLabel: string;
  /** "CAPTAIN RASHID N" or "NO CAPTAIN". */
  captainLine: string;
  /** "8 PLAYERS". */
  countLine: string;
  players: DraftCardPlayer[];
};

/**
 * A Draft line-up as a picture (ADR-0107): names, positions and Side
 * captains only. No Level, OVR, Tier or average, and nobody is marked as the
 * viewer, so the image reads the same for whoever receives it.
 */
export type DraftShareCard = {
  mode: DraftShareMode;
  /** "DRAFT / FOOTBALL / 7-A-SIDE". */
  typeLine: string;
  sides: DraftCardSide[];
  /** On a one-team card: "against White, 7 start, the captain picks them". */
  against: string | null;
  venue: string;
  when: string;
  /** "DRAFT, NOT FINAL". */
  stamp: string;
};

export type DraftShareGame = {
  windowStart: Date | null;
  windowEnd: Date | null;
  venue: { name: string; city: string | null } | null;
  sideSize: number | null;
  recordedCourts: readonly { name: string }[];
};

export type DraftShareBoard = {
  players: readonly Pick<
    BoardPlayer,
    "userId" | "name" | "role" | "position"
  >[];
  draft: {
    bibs: Bibs;
    sides: FootballDraftSides;
    captains: SideCaptains;
  } | null;
};

const POSITION_ORDER = ["def", "mid", "fwd"] as const;

function lineOrder(player: Pick<BoardPlayer, "role" | "position">) {
  if (player.role === "keeper") {
    return 0;
  }
  const index = player.position ? POSITION_ORDER.indexOf(player.position) : -1;
  return index === -1 ? POSITION_ORDER.length + 1 : index + 1;
}

/**
 * Keepers, then defence, midfield and attack, then by name: a team sheet's
 * order, so the list gives away nothing about who is stronger.
 */
function byLine(locale: Locale) {
  return (
    a: Pick<BoardPlayer, "name" | "role" | "position">,
    b: Pick<BoardPlayer, "name" | "role" | "position">,
  ) => lineOrder(a) - lineOrder(b) || a.name.localeCompare(b.name, locale);
}

/**
 * The Draft card for both teams or one, or null when the viewer has no
 * draft: they are neither an Organizer nor one of its Side captains, or the
 * teams are published. An incomplete draft gives the players placed.
 */
export function draftShareCard(
  game: DraftShareGame,
  board: DraftShareBoard | null,
  mode: DraftShareMode,
  locale: Locale,
): DraftShareCard | null {
  const draft = board?.draft;
  if (!draft) {
    return null;
  }
  const messages = messagesFor(locale);
  const m = messages.football.draftShare;
  const isolate = messages.common.isolate;
  const names = bibNames(draft.bibs, locale);
  const playerById = new Map(
    board.players.map((player) => [player.userId, player]),
  );

  const side = (slot: 1 | 2): DraftCardSide => {
    const key = slot === 1 ? "slot1" : "slot2";
    const captainId = draft.captains[key];
    const members = draft.sides[key]
      .flatMap((userId) => {
        const player = playerById.get(userId);
        return player ? [player] : [];
      })
      .sort(byLine(locale));
    const captain = members.find((player) => player.userId === captainId);
    return {
      slot,
      bib: draft.bibs[key],
      name: names[key],
      listLabel: m.teamLabel(names[key]).toUpperCase(),
      captainLine: captain
        ? m.captain(isolate(shortName(captain.name))).toUpperCase()
        : m.noCaptain,
      countLine: m.players(members.length),
      players: members.map((player) => ({
        userId: player.userId,
        init: initials(player.name),
        name: shortName(player.name),
        code: slotCode(player, locale),
        captain: player.userId === captainId,
      })),
    };
  };

  const sides =
    mode === "both" ? [side(1), side(2)] : [side(mode === "slot1" ? 1 : 2)];
  const other = mode === "slot1" ? names.slot2 : names.slot1;
  return {
    mode,
    typeLine: m.typeLine(
      game.sideSize ? sideSizeLabel(game.sideSize, locale).toUpperCase() : null,
    ),
    sides,
    against: mode === "both" ? null : m.against(other, game.sideSize),
    venue: cardVenue(
      {
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
        venue: game.venue,
        courtName: game.recordedCourts[0]?.name ?? null,
      },
      locale,
    ),
    when: cardWhen(game.windowStart, locale).when,
    stamp: m.stamp,
  };
}

/**
 * The note under the preview: what the image holds and that it goes wherever
 * it is sent. A Group Game's draft is seen by the group's admins too.
 */
export function draftShareNote(
  mode: DraftShareMode,
  bibs: Bibs,
  game: { groupId: string | null },
  locale: Locale,
) {
  const m = messagesFor(locale).football.draftShare;
  if (mode === "both") {
    return game.groupId ? m.noteBothGroup : m.noteBoth;
  }
  return m.noteOne(bibNames(bibs, locale)[mode]);
}

/**
 * The Message line with the Game page link: "Draft teams for Friday
 * Football, Sat 18 Oct, 8:00 PM. Not final." A Game without a name of its
 * own reads by its day and time alone.
 */
export function draftShareMessage(
  game: {
    name: string | null | undefined;
    hasCustomName?: boolean | null;
    windowStart: Date | null;
  },
  url: string,
  locale: Locale,
) {
  const messages = messagesFor(locale);
  const isolate = messages.common.isolate;
  const name = gameCustomName(game);
  const when = game.windowStart
    ? messages.game.share.when(
        formatGameDay(game.windowStart, locale, { weekday: "short" }),
        formatGameClock(game.windowStart, locale),
      )
    : null;
  const line = messages.football.draftShare.message(
    name ? isolate(name) : null,
    when ? isolate(when) : null,
  );
  return url ? `${line}\n${url}` : line;
}
