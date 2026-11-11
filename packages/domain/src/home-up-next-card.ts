import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { KEEPERS_PER_GAME } from "./football-lineup";
import {
  formatGameClock,
  formatGameDay,
  gameDayProximity,
} from "./format-game-start";
import { gameCustomName } from "./game-custom-name";
import { ratingScopeOf } from "./game-rating-impact";
import { gameRatingScopeLabel } from "./game-rating-scope";
import { homeComingUpRows } from "./home-coming-up";
import { formatHomeCountdown, formatHomeKickoff } from "./home-countdown";
import type { HomeNextGamePhase, HomeTarget } from "./home-next-game";
import type { HubGameRow } from "./hub-game-row";
import { formatLevelRangeLabel } from "./level-range";
import { sportLabel, type Sport } from "./sport";

/** How long before kick-off "Be there by" asks players to arrive. */
const ARRIVE_EARLY_MINUTES = 15;
const MINUTE_MS = 60_000;

export type CardPerson = {
  key: string;
  name: string;
  image: string | null;
  isViewer: boolean;
};

export type CardSeat =
  | (CardPerson & { filled: true; sideLabel: string })
  | { key: string; filled: false; sideLabel: string };

export type CardPositionCount = { value: string; label: string };

export type CardWho =
  | {
      kind: "sides";
      header: string;
      scope: string | null;
      sides: [CardSeat[], CardSeat[]];
    }
  | {
      kind: "pool";
      header: string;
      scope: string | null;
      bar: ("taken" | "open")[];
      positions: CardPositionCount[];
    }
  | {
      kind: "teams";
      header: string;
      scope: string | null;
      teams: {
        key: string;
        label: string;
        bib: string;
        members: CardPerson[];
      }[];
    }
  | { kind: "line"; header: string; scope: string | null };

export type CardStepIcon =
  | "invite"
  | "shirt"
  | "teams"
  | "clock"
  | "live"
  | "score"
  | "rounds"
  | "pay"
  | "court";

export type CardActionIcon = "invite" | "directions" | "teams" | "score";

export type CardTarget = HomeTarget | { kind: "directions" };

export type CardAction<T = CardTarget> = {
  label: string;
  icon: CardActionIcon | null;
  target: T;
};

/** The Home Up next card's next Game: a hub row with its Home phase. */
export type HomeCardGame = HubGameRow & {
  phase: HomeNextGamePhase;
  viewerIsOrganizer: boolean;
};

export type HomeCardItem = {
  key: string;
  startsAt: Date;
  sport: Sport;
  game: HomeCardGame;
};

export type UpNextCardView<T = CardTarget> = {
  key: string;
  sport: Sport;
  sportName: string;
  title: string | null;
  countdown: string | null;
  dateLine: string;
  kickoff: { time: string; meridiem: string };
  until: string | null;
  place: string | null;
  who: CardWho | null;
  step: { icon: CardStepIcon; title: string; body: string };
  secondary: CardAction<T> | null;
  primary: CardAction<T>;
  open: T;
  spoken: string;
};

type Game = HomeCardGame;
type Occupant = {
  userId: string;
  name: string;
  image: string | null;
  isViewer: boolean;
};

function person(occupant: Occupant): CardPerson {
  return {
    key: occupant.userId,
    name: occupant.name,
    image: occupant.image,
    isViewer: occupant.isViewer,
  };
}

function isPresent(value: string | null | undefined): value is string {
  return Boolean(value);
}

/** "Today", else the full date: the card says the day once. */
export function upNextCardDay(startsAt: Date, locale: Locale): string {
  if (gameDayProximity(startsAt) === "today") {
    return messagesFor(locale).home.upNextCard.today;
  }
  return formatGameDay(startsAt, locale, { weekday: "long", month: "long" });
}

/** "to 8:30" beside the kickoff. */
export function upNextCardUntil(
  endsAt: Date | null,
  locale: Locale,
): string | null {
  if (!endsAt) {
    return null;
  }
  const kickoff = formatHomeKickoff(endsAt, locale);
  return messagesFor(locale).home.upNextCard.to(kickoff.time);
}

function scopeLine(game: Game, locale: Locale): string | null {
  const m = messagesFor(locale);
  const scope = ratingScopeOf(game);
  const range = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
    locale,
  );
  const rating =
    scope === "temba"
      ? m.you.ratingScope.rated
      : gameRatingScopeLabel(scope, locale, game.sport);
  return m.home.upNextCard.scope([rating, range].filter(isPresent));
}

function whoHeader(filled: number, total: number, locale: Locale): string {
  const m = messagesFor(locale).home.upNextCard;
  return filled >= total && total > 0 ? m.allIn(total) : m.whoIn(filled, total);
}

/** Padel seats as two sides, the left seat first on each. */
function sidesWho(game: Game, locale: Locale): CardWho | null {
  const m = messagesFor(locale).home.upNextCard;
  const pair = [...game.sides]
    .sort((a, b) => a.sideIndex - b.sideIndex)
    .slice(0, 2);
  if (pair.length !== 2) {
    return null;
  }
  const seatsOf = (side: (typeof pair)[number]): CardSeat[] =>
    (
      [
        ["right", side.right, m.rightSide],
        ["left", side.left, m.leftSide],
      ] as const
    ).map(([slot, occupant, sideLabel]) =>
      occupant
        ? { ...person(occupant), filled: true, sideLabel }
        : { key: `${side.sideIndex}-${slot}`, filled: false, sideLabel },
    );
  const sides: [CardSeat[], CardSeat[]] = [
    seatsOf(pair[0]!),
    seatsOf(pair[1]!),
  ];
  const filled = sides.flat().filter((seat) => seat.filled).length;
  return {
    kind: "sides",
    header: whoHeader(filled, 4, locale),
    scope: scopeLine(game, locale),
    sides,
  };
}

function positionCounts(game: Game, locale: Locale): CardPositionCount[] {
  const counts = game.football?.positions;
  if (!counts) {
    return [];
  }
  const m = messagesFor(locale).home.upNextCard.positions;
  const all: (CardPositionCount & { count: number })[] = [
    {
      count: counts.keepers,
      value: m.keeperCount(counts.keepers, KEEPERS_PER_GAME),
      label: m.keeper,
    },
    {
      count: counts.def,
      value: String(counts.def),
      label: m.defenders(counts.def),
    },
    { count: counts.mid, value: String(counts.mid), label: m.mid },
    {
      count: counts.fwd,
      value: String(counts.fwd),
      label: m.forwards(counts.fwd),
    },
  ];
  return all
    .filter((item, index) => index === 0 || item.count > 0)
    .map(({ value, label }) => ({ value, label }));
}

function footballWho(game: Game, locale: Locale): CardWho {
  const m = messagesFor(locale);
  const sides = game.football?.sides;
  if (sides?.length === 2) {
    return {
      kind: "teams",
      header: m.home.upNextCard.teamsAreMade,
      scope: scopeLine(game, locale),
      teams: sides.map((side) => ({
        key: String(side.sideIndex),
        label: bibLabel(side.bib, locale),
        bib: side.bib,
        members: side.members.map(person),
      })),
    };
  }
  const total = game.playersAllowed ?? game.registeredUserCount;
  const filled = Math.min(game.registeredUserCount, total);
  return {
    kind: "pool",
    header: whoHeader(filled, total, locale),
    scope: scopeLine(game, locale),
    bar: Array.from({ length: total }, (_, index) =>
      index < filled ? "taken" : "open",
    ),
    positions: positionCounts(game, locale),
  };
}

function bibLabel(bib: string, locale: Locale): string {
  const bibs = messagesFor(locale).football.lineup.bibs as Record<
    string,
    string
  >;
  return bibs[bib] ?? bib;
}

function openSeats(who: CardWho | null): CardSeat[] {
  if (who?.kind !== "sides") {
    return [];
  }
  return who.sides.flat().filter((seat) => !seat.filled);
}

/** "One seat left, on Ahmed's side" names the teammate the open seat joins. */
function openSeatStep(who: CardWho | null, locale: Locale) {
  const m = messagesFor(locale).home.upNextCard.step;
  const open = openSeats(who);
  if (open.length === 1 && who?.kind === "sides") {
    const side = who.sides.find((seats) => seats.some((seat) => !seat.filled));
    const mate = side?.find(
      (seat): seat is Extract<CardSeat, { filled: true }> =>
        seat.filled && !seat.isViewer,
    );
    if (mate) {
      return {
        title: m.seatLeftOnSide(firstName(mate.name)),
        body: m.inviteBody,
      };
    }
  }
  return { title: m.seatsLeft(Math.max(1, open.length)), body: m.inviteBody };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function placeLine(game: Game, locale: Locale): string | null {
  const place = messagesFor(locale).home.comingUp.parts(
    [game.venue?.name, game.courtName].filter(isPresent),
  );
  return place || null;
}

function arriveBy(startsAt: Date, locale: Locale): string {
  return formatGameClock(
    new Date(startsAt.getTime() - ARRIVE_EARLY_MINUTES * MINUTE_MS),
    locale,
  );
}

function isLive(game: Game, startsAt: Date, endsAt: Date | null, now: Date) {
  return (
    game.phase === "ongoing" ||
    (game.phase === "upcoming" &&
      startsAt.getTime() <= now.getTime() &&
      (endsAt == null || endsAt.getTime() > now.getTime()))
  );
}

function gameCountdown(
  game: Game,
  live: boolean,
  startsAt: Date,
  now: Date,
  locale: Locale,
): string | null {
  const m = messagesFor(locale);
  if (live) {
    return m.home.nextGame.playingNow;
  }
  if (game.phase === "needs_results") {
    return m.home.upNextCard.ended;
  }
  return formatHomeCountdown(startsAt, now, locale);
}

type Step = UpNextCardView["step"];
type Plan = { step: Step; secondary: CardAction | null; primary: CardAction };

function gamePlan(
  game: Game,
  who: CardWho | null,
  live: boolean,
  startsAt: Date,
  locale: Locale,
): Plan {
  const m = messagesFor(locale);
  const card = m.home.upNextCard;
  const open: HomeTarget = { kind: "game", gameId: game.id };
  const details: CardAction = {
    label: card.action.details,
    icon: null,
    target: open,
  };
  const directions: CardAction = {
    label: card.action.directions,
    icon: "directions",
    target: { kind: "directions" },
  };

  if (game.phase === "needs_results") {
    return {
      step: {
        icon: "score",
        title: card.step.howDidItGo,
        body: card.step.howDidItGoBody,
      },
      secondary: details,
      primary: {
        label: card.action.addScore,
        icon: "score",
        target: { ...open, intent: "results" },
      },
    };
  }
  if (live) {
    return {
      step: {
        icon: "live",
        title: card.step.playingNow,
        body: card.step.playingNowBody,
      },
      secondary: null,
      primary: { label: m.home.nextGame.viewGame, icon: null, target: open },
    };
  }
  if (game.tournament) {
    const drawn = game.tournament.drawPosted;
    return {
      step: {
        icon: "rounds",
        title: drawn ? card.step.drawOut : card.step.drawPending,
        body: drawn ? card.step.drawOutBody : card.step.drawPendingBody,
      },
      secondary: details,
      primary: { label: card.action.seeRounds, icon: null, target: open },
    };
  }

  const invite: CardAction = {
    label: m.home.nextGame.invitePlayer,
    icon: "invite",
    target: { ...open, intent: "invite" },
  };

  if (who?.kind === "teams") {
    const viewerTeam = who.teams.find((team) =>
      team.members.some((member) => member.isViewer),
    );
    const viewer = game.football?.viewer;
    const where =
      viewer?.role === "keeper"
        ? card.step.where.keeper
        : viewer?.position
          ? card.step.where[viewer.position]
          : null;
    const title = !viewerTeam
      ? card.teamsAreMade
      : where
        ? card.step.inTeamAt(viewerTeam.label, where)
        : card.step.inTeam(viewerTeam.label);
    const body =
      viewerTeam?.bib === "black"
        ? card.step.shirtDark
        : viewerTeam?.bib === "white"
          ? card.step.shirtLight
          : card.step.lineupsOnGame;
    return {
      step: { icon: "shirt", title, body },
      secondary: game.venue ? directions : details,
      primary: { label: card.action.seeLineups, icon: null, target: open },
    };
  }

  if (who?.kind === "pool") {
    const missing = who.bar.filter((seat) => seat === "open").length;
    if (missing > 0) {
      return {
        step: {
          icon: "teams",
          title: card.step.poolShort(missing),
          body: card.step.poolShortBody,
        },
        secondary: details,
        primary: invite,
      };
    }
    if (game.viewerIsOrganizer) {
      return {
        step: {
          icon: "teams",
          title: card.step.poolFullOrganizer,
          body: card.step.poolFullOrganizerBody,
        },
        secondary: details,
        primary: { label: card.action.makeTeams, icon: "teams", target: open },
      };
    }
    return {
      step: {
        icon: "teams",
        title: card.step.poolFull,
        body: card.step.poolFullBody,
      },
      secondary: details,
      primary: { label: m.home.nextGame.viewGame, icon: null, target: open },
    };
  }

  if (openSeats(who).length > 0) {
    return {
      step: { icon: "invite", ...openSeatStep(who, locale) },
      secondary: details,
      primary: invite,
    };
  }

  const place = placeLine(game, locale);
  return {
    step: {
      icon: "clock",
      title: card.step.beThereBy(arriveBy(startsAt, locale)),
      body: place ? card.step.beThereByBody(place) : card.step.lineupsOnGame,
    },
    secondary: details,
    primary: game.venue
      ? directions
      : { label: m.home.nextGame.viewGame, icon: null, target: open },
  };
}

function tournamentWho(game: Game, locale: Locale): CardWho {
  const m = messagesFor(locale).home.upNextCard;
  const [row] = homeComingUpRows([game], locale);
  const teams = game.tournament?.teams.length ?? game.registeredTeamCount;
  return {
    kind: "line",
    header:
      row?.kind === "tournament" && row.teamsLine
        ? row.teamsLine
        : m.teams(teams),
    scope: scopeLine(game, locale),
  };
}

function gameWho(game: Game, sport: Sport, locale: Locale): CardWho | null {
  if (game.tournament) {
    return tournamentWho(game, locale);
  }
  if (sport === "football" && game.football) {
    return footballWho(game, locale);
  }
  return sidesWho(game, locale);
}

export function gameCardView(
  item: HomeCardItem,
  now: Date,
  locale: Locale,
): UpNextCardView {
  const m = messagesFor(locale);
  const { game } = item;
  const startsAt = item.startsAt;
  const endsAt = game.windowEnd ? new Date(game.windowEnd) : null;
  const live = isLive(game, startsAt, endsAt, now);
  const who = gameWho(game, item.sport, locale);
  const plan = gamePlan(game, who, live, startsAt, locale);
  const kickoff = formatHomeKickoff(startsAt, locale);
  const title = gameCustomName(game) ?? game.groupName ?? null;
  const place = placeLine(game, locale);
  const day = upNextCardDay(startsAt, locale);
  const sportName = sportLabel(item.sport, locale) ?? "";

  return {
    key: item.key,
    sport: item.sport,
    sportName,
    title,
    countdown: gameCountdown(game, live, startsAt, now, locale),
    dateLine: day,
    kickoff: { time: kickoff.time, meridiem: kickoff.meridiem },
    until: upNextCardUntil(endsAt, locale),
    place,
    who,
    ...plan,
    open: { kind: "game", gameId: game.id },
    spoken: m.home.upNextCard.spoken(
      title ?? sportName,
      day,
      formatGameClock(startsAt, locale),
      place ?? "",
    ),
  };
}
