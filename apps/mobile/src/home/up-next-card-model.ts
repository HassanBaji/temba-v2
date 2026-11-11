import {
  formatGameClock,
  formatGameDay,
  gameDayProximity,
} from "@repo/domain/format-game-start";
import { KEEPERS_PER_GAME } from "@repo/domain/football-lineup";
import { gameCustomName } from "@repo/domain/game-custom-name";
import { gameRatingScopeLabel } from "@repo/domain/game-rating-scope";
import {
  formatHomeCountdown,
  formatHomeKickoff,
} from "@repo/domain/home-countdown";
import { homeComingUpRows } from "@repo/domain/home-coming-up";
import { formatLevelRangeLabel } from "@repo/domain/level-range";
import { ratingScopeOf } from "@repo/domain/game-rating-impact";
import { sportLabel, type Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { minutesBetween } from "../booking/booking-model";
import { nextBookingAction } from "../booking/my-bookings-model";
import type { HomeNavTarget } from "./home-target";
import type { UpNextBooking, UpNextGame, UpNextItem } from "./up-next-model";

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

export type CardTarget =
  | HomeNavTarget
  | { kind: "directions" }
  | { kind: "share-booking" };

export type CardAction = {
  label: string;
  icon: CardActionIcon | null;
  target: CardTarget;
};

export type UpNextCardView = {
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
  secondary: CardAction | null;
  primary: CardAction;
  open: HomeNavTarget;
  spoken: string;
};

type Game = UpNextGame;
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

function dateLine(startsAt: Date, locale: Locale): string {
  if (gameDayProximity(startsAt) === "today") {
    return messagesFor(locale).mobileHome.card.today;
  }
  return formatGameDay(startsAt, locale, { weekday: "long", month: "long" });
}

function untilLine(endsAt: Date | null, locale: Locale): string | null {
  if (!endsAt) {
    return null;
  }
  const kickoff = formatHomeKickoff(endsAt, locale);
  return messagesFor(locale).mobileHome.card.to(kickoff.time);
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
      : gameRatingScopeLabel(scope, locale);
  return m.mobileHome.card.scope([rating, range].filter(isPresent));
}

function whoHeader(filled: number, total: number, locale: Locale): string {
  const m = messagesFor(locale).mobileHome.card;
  return filled >= total && total > 0 ? m.allIn(total) : m.whoIn(filled, total);
}

/** Padel seats as two sides, the left seat first on each. */
function sidesWho(game: Game, locale: Locale): CardWho | null {
  const m = messagesFor(locale).mobileHome.card;
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
  const m = messagesFor(locale).mobileHome.card.positions;
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
      header: m.mobileHome.card.teamsAreMade,
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
  const m = messagesFor(locale).mobileHome.card.step;
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
  const place = messagesFor(locale).mobileHome.join.parts(
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
    return m.mobileHome.card.ended;
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
  const card = m.mobileHome.card;
  const open: HomeNavTarget = { kind: "game", gameId: game.id };
  const details: CardAction = {
    label: m.mobileHome.upNext.details,
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
  const m = messagesFor(locale).mobileHome.card;
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
  item: Extract<UpNextItem, { kind: "game" }>,
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
  const day = dateLine(startsAt, locale);
  const sportName = sportLabel(item.sport, locale) ?? "";

  return {
    key: item.key,
    sport: item.sport,
    sportName,
    title,
    countdown: gameCountdown(game, live, startsAt, now, locale),
    dateLine: day,
    kickoff: { time: kickoff.time, meridiem: kickoff.meridiem },
    until: untilLine(endsAt, locale),
    place,
    who,
    ...plan,
    open: { kind: "game", gameId: game.id },
    spoken: m.mobileHome.upNext.gameHeroSpoken(
      title ?? sportName,
      day,
      formatGameClock(startsAt, locale),
      place ?? "",
    ),
  };
}

function bookingPlan(booking: UpNextBooking, locale: Locale): Plan {
  const m = messagesFor(locale);
  const card = m.mobileHome.card;
  const share: CardAction = {
    label: m.mobileHome.upNext.invite,
    icon: "invite",
    target: { kind: "share-booking" },
  };
  switch (nextBookingAction(booking)) {
    case "finish_payment":
      return {
        step: {
          icon: "pay",
          title: card.step.payCourt,
          body: card.step.payCourtBody,
        },
        secondary: share,
        primary: {
          label: m.mobileBooking.finishPayment,
          icon: null,
          target: { kind: "booking-payment", bookingId: booking.id },
        },
      };
    case "make_game":
      return {
        step: {
          icon: "teams",
          title: card.step.makeGame,
          body: card.step.makeGameBody,
        },
        secondary: share,
        primary: {
          label: m.mobileBooking.cards.makeItAGame,
          icon: null,
          target: { kind: "booking-game", bookingId: booking.id },
        },
      };
    case "open_game":
      if (booking.gameId) {
        return {
          step: {
            icon: "court",
            title: card.step.gameSet,
            body: card.step.gameSetBody,
          },
          secondary: share,
          primary: {
            label: m.mobileBooking.openGame,
            icon: null,
            target: { kind: "game", gameId: booking.gameId },
          },
        };
      }
      break;
    default:
      break;
  }
  return {
    step: {
      icon: "court",
      title: card.step.courtBooked,
      body: card.step.courtBookedBody,
    },
    secondary: {
      label: m.mobileHome.upNext.details,
      icon: null,
      target: { kind: "booking", bookingId: booking.id },
    },
    primary: share,
  };
}

export function bookingCardView(
  item: Extract<UpNextItem, { kind: "booking" }>,
  now: Date,
  locale: Locale,
): UpNextCardView {
  const m = messagesFor(locale);
  const { booking } = item;
  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(booking.endsAt);
  const kickoff = formatHomeKickoff(startsAt, locale);
  const day = dateLine(startsAt, locale);
  const place = m.mobileHome.join.parts([
    booking.venue.name,
    booking.court.name,
  ]);
  return {
    key: item.key,
    sport: item.sport,
    sportName: sportLabel(item.sport, locale) ?? "",
    title: m.mobileHome.upNext.kind.booking,
    countdown: formatHomeCountdown(startsAt, now, locale),
    dateLine: day,
    kickoff: { time: kickoff.time, meridiem: kickoff.meridiem },
    until: untilLine(endsAt, locale),
    place,
    who: {
      kind: "line",
      header: m.mobileHome.upNext.bookingDetail(
        booking.court.name,
        minutesBetween(startsAt, endsAt),
      ),
      scope: null,
    },
    ...bookingPlan(booking, locale),
    open: { kind: "booking", bookingId: booking.id },
    spoken: m.mobileHome.upNext.bookingHeroSpoken(
      day,
      formatGameClock(startsAt, locale),
      booking.court.name,
      booking.venue.name,
    ),
  };
}

export function upNextCardView(
  item: UpNextItem,
  now: Date,
  locale: Locale,
): UpNextCardView {
  return item.kind === "game"
    ? gameCardView(item, now, locale)
    : bookingCardView(item, now, locale);
}
