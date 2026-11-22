import { firstName } from "@repo/domain/game-card";
import { shortPlayerName } from "@repo/domain/player-name";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import {
  seriesWinnersLine,
  seriesWinOrdinal,
  seriesWinStanding,
} from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";
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
    | "standing"
    | "levelWith"
  >[];
  winnerBib: SeriesEditionData["winnerBib"];
};

type Winner = SeriesEditionCardInput["winners"][number];

/** Where the card sits: a Social's finished screen, or a Played game's. */
export type SeriesEditionGame = "social" | "played";

type Badge = { emblem: SeriesEmblem; colour: SeriesColour };

export type SeriesWinnerBlock = {
  key: string;
  ordinal: string;
  standing: string | null;
};

/** 3a: the winners card that leads a finished Social. */
export type SeriesWinnersCardModel = Badge & {
  title: string;
  names: string[];
  blocks: SeriesWinnerBlock[];
  /** What a screen reader says for the card's heading part. */
  spoken: string;
  /** The Series to open, or null when the viewer may not view its Group. */
  seriesId: string | null;
};

/** The paper card under a Played game's result hero. */
export type SeriesResultCardModel = Badge & {
  title: string;
  line: string;
  ordinal: string | null;
  spoken: string;
  seriesId: string | null;
};

export type SeriesEditionCard =
  | { kind: "partOf"; model: SeriesGameCardModel }
  | { kind: "winners"; model: SeriesWinnersCardModel }
  | { kind: "result"; model: SeriesResultCardModel };

function badgeOf(edition: SeriesEditionCardInput): Badge {
  return { emblem: edition.series.emblem, colour: edition.series.colour };
}

function seriesIdOf(edition: SeriesEditionCardInput) {
  return edition.canOpenSeries ? edition.series.id : null;
}

/** The winners by Game team, in the server's order; an Americano winner stands alone. */
function winningTeams(winners: SeriesEditionCardInput["winners"]) {
  const teams = new Map<string, Winner[]>();
  for (const winner of winners) {
    const key = winner.gameTeamId ?? winner.userId;
    teams.set(key, [...(teams.get(key) ?? []), winner]);
  }
  return [...teams.values()];
}

function winnerBlock(
  winner: Winner,
  name: string | null,
  locale: Locale,
): SeriesWinnerBlock {
  return {
    key: winner.userId,
    ordinal: seriesWinOrdinal(name, winner.winCount, locale),
    standing: seriesWinStanding(winner, locale),
  };
}

function winnersCard(
  edition: SeriesEditionCardInput,
  locale: Locale,
): SeriesWinnersCardModel {
  const m = messagesFor(locale).series.game;
  const title = m.facts(edition.series.name, edition.edition);
  const several = edition.winners.length > 2;
  const viewer = edition.winners.find((winner) => winner.isViewer);
  const names = several
    ? winningTeams(edition.winners).map((team) =>
        team
          .map((winner) => shortPlayerName(winner.name))
          .reduce((line, name) => m.team(line, name)),
      )
    : edition.winners.map((winner) => winner.name);
  const blocks = several
    ? viewer
      ? [winnerBlock(viewer, null, locale)]
      : []
    : edition.winners.map((winner) =>
        winnerBlock(winner, firstName(winner.name), locale),
      );
  return {
    ...badgeOf(edition),
    title,
    names,
    blocks,
    spoken: m.winnersCardLabel(title, names),
    seriesId: seriesIdOf(edition),
  };
}

function resultCard(
  edition: SeriesEditionCardInput,
  locale: Locale,
): SeriesResultCardModel {
  const m = messagesFor(locale).series.game;
  const title = m.facts(edition.series.name, edition.edition);
  const viewer = edition.winners.find((winner) => winner.isViewer);
  const line =
    edition.state === "won"
      ? m.wonBy(seriesWinnersLine(edition.winners, edition.winnerBib, locale))
      : m.draw(edition.edition);
  const ordinal =
    edition.state === "won" && viewer
      ? seriesWinOrdinal(null, viewer.winCount, locale)
      : null;
  const spoken = m.cardLabel(title, line);
  return {
    ...badgeOf(edition),
    title,
    line,
    ordinal,
    spoken: ordinal ? m.cardLabel(spoken, ordinal) : spoken,
    seriesId: seriesIdOf(edition),
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
export type SeriesTableMarks = Badge & {
  gameTeamIds: ReadonlySet<string>;
  userIds: ReadonlySet<string>;
  note: string;
};

/**
 * Marks for a Social whose table decides the Edition. The rows come from the
 * server's winners, never from the table, so the card and the table agree.
 */
export function seriesTableMarks(
  edition: SeriesEditionCardInput | null | undefined,
  locale: Locale,
): SeriesTableMarks | null {
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
