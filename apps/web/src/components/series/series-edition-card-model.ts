import { firstName } from "@repo/domain/game-card";
import { shortPlayerName } from "@repo/domain/player-name";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import {
  seriesWinnersLine,
  seriesWinOrdinal,
  seriesWinTally,
} from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { seriesPagePath } from "~/lib/dashboard-paths";
import type { RouterOutputs } from "~/trpc/react";

import {
  seriesGameCardModel,
  type SeriesGameCardInput,
  type SeriesGameCardModel,
} from "./series-game-card-model";

type SeriesEditionData = NonNullable<RouterOutputs["series"]["edition"]>;
type SeriesEditionWinner = SeriesEditionData["winners"][number];

export type SeriesEditionCardInput = SeriesGameCardInput & {
  winners: readonly Pick<
    SeriesEditionWinner,
    | "userId"
    | "name"
    | "isViewer"
    | "gameTeamId"
    | "winCount"
    | "tally"
    | "levelWith"
  >[];
  winnerBib: SeriesEditionData["winnerBib"];
};

/** Where the card sits: a Social's finished screen, or a Played game's. */
export type SeriesEditionGame = "social" | "played";

type Badge = { emblem: SeriesEmblem; colour: SeriesColour };

export type SeriesWinnerBlock = {
  key: string;
  ordinal: string;
  tally: string | null;
};

/** 3a: the winners card that leads a finished Social. */
export type SeriesWinnersCardModel = Badge & {
  title: string;
  names: string[];
  blocks: SeriesWinnerBlock[];
  href: string | null;
};

/** The paper card under a Played game's result hero. */
export type SeriesResultCardModel = Badge & {
  title: string;
  line: string;
  ordinal: string | null;
  href: string | null;
};

export type SeriesEditionCard =
  | { kind: "partOf"; model: SeriesGameCardModel }
  | { kind: "winners"; model: SeriesWinnersCardModel }
  | { kind: "result"; model: SeriesResultCardModel };

function badgeOf(edition: SeriesEditionCardInput): Badge {
  return { emblem: edition.series.emblem, colour: edition.series.colour };
}

function hrefOf(edition: SeriesEditionCardInput) {
  return edition.canOpenSeries ? seriesPagePath(edition.series.id) : null;
}

/** The winners by Game team, in the server's order; an Americano winner stands alone. */
function winningTeams(winners: SeriesEditionCardInput["winners"]) {
  const teams = new Map<string, SeriesEditionCardInput["winners"][number][]>();
  for (const winner of winners) {
    const key = winner.gameTeamId ?? winner.userId;
    teams.set(key, [...(teams.get(key) ?? []), winner]);
  }
  return [...teams.values()];
}

function winnerBlock(
  winner: SeriesEditionCardInput["winners"][number],
  name: string | null,
  locale: Locale,
): SeriesWinnerBlock {
  return {
    key: winner.userId,
    ordinal: seriesWinOrdinal(name, winner.winCount, locale),
    tally: seriesWinTally(winner, locale),
  };
}

function winnersCard(
  edition: SeriesEditionCardInput,
  locale: Locale,
): SeriesWinnersCardModel {
  const m = messagesFor(locale).series.game;
  const base = {
    ...badgeOf(edition),
    title: m.facts(edition.series.name, edition.edition),
    href: hrefOf(edition),
  };
  if (edition.winners.length <= 2) {
    return {
      ...base,
      names: edition.winners.map((winner) => winner.name),
      blocks: edition.winners.map((winner) =>
        winnerBlock(winner, firstName(winner.name), locale),
      ),
    };
  }
  const viewer = edition.winners.find((winner) => winner.isViewer);
  return {
    ...base,
    names: winningTeams(edition.winners).map((team) =>
      team
        .map((winner) => shortPlayerName(winner.name))
        .reduce((line, name) => m.team(line, name)),
    ),
    blocks: viewer ? [winnerBlock(viewer, null, locale)] : [],
  };
}

function resultCard(
  edition: SeriesEditionCardInput,
  locale: Locale,
): SeriesResultCardModel {
  const m = messagesFor(locale).series.game;
  const viewer = edition.winners.find((winner) => winner.isViewer);
  return {
    ...badgeOf(edition),
    title: m.facts(edition.series.name, edition.edition),
    line:
      edition.state === "won"
        ? m.wonBy(seriesWinnersLine(edition.winners, edition.winnerBib, locale))
        : m.draw(edition.edition),
    ordinal:
      edition.state === "won" && viewer
        ? seriesWinOrdinal(null, viewer.winCount, locale)
        : null,
    href: hrefOf(edition),
  };
}

/**
 * Which Series card a Game shows: "Part of" until its Edition is decided,
 * then the winners card on a Social, or the result card on a Played game and
 * on any Edition nobody won.
 */
export function seriesEditionCard(
  edition: SeriesEditionCardInput | null | undefined,
  game: SeriesEditionGame,
  locale: Locale,
): SeriesEditionCard | null {
  if (!edition) {
    return null;
  }
  if (edition.state === "upcoming") {
    const model = seriesGameCardModel(edition, locale);
    return model ? { kind: "partOf", model } : null;
  }
  if (edition.state === "won" && game === "social") {
    return { kind: "winners", model: winnersCard(edition, locale) };
  }
  return { kind: "result", model: resultCard(edition, locale) };
}

const TABLE_RULES: ReadonlySet<SeriesEditionCardInput["rule"]> = new Set([
  "table",
  "tables",
  "americano",
]);

/** The final table's part: the winners' rows to badge, and the note under it. */
export type SeriesTableBadges = Badge & {
  gameTeamIds: ReadonlySet<string>;
  userIds: ReadonlySet<string>;
  note: string;
};

/**
 * Badges for a Social whose table decides the Edition. The rows come from the
 * server's winners, never from the table, so the card and the table agree.
 */
export function seriesTableBadges(
  edition: SeriesEditionCardInput | null | undefined,
  locale: Locale,
): SeriesTableBadges | null {
  if (!edition || !TABLE_RULES.has(edition.rule)) {
    return null;
  }
  const winners = edition.state === "won" ? edition.winners : [];
  return {
    ...badgeOf(edition),
    gameTeamIds: new Set(
      winners.flatMap((winner) =>
        winner.gameTeamId ? [winner.gameTeamId] : [],
      ),
    ),
    userIds: new Set(winners.map((winner) => winner.userId)),
    note: messagesFor(locale).series.game.tableNote,
  };
}
