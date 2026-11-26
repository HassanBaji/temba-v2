import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  ovrLabel,
  slotCode,
  teamsRating,
  teamsTileName,
  type BoardPlayer,
} from "./football-board";
import type { FootballBalanceOn } from "./football-lineup";
import { GROUP_FORM_MARK_LIMIT, type FormMark } from "./member-form-marks";
import { formatTierDelta } from "./tier-adjust";
import { TIER_PROVISIONAL_GAMES } from "./tier-points";

/**
 * The head of a pool player's sheet on Make teams: who they are, where they
 * stand, and the rating with the line under it. The line says how Tier points
 * moved this month once that is known, and when a Provisional tier settles.
 */
export function teamsPlayerCardHead(
  player: BoardPlayer,
  args: {
    balanceOn: FootballBalanceOn;
    /** The team the player is on; null while not placed. */
    sideName: string | null;
    pointsThisMonth: number | null | undefined;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).football.teamsCard;
  const rating = teamsRating(player, args.balanceOn, locale);
  const code = slotCode(player, locale);
  const place = args.sideName ?? m.notPlaced;
  const standing = code ? m.sideUsually(place, code) : place;
  const gamesLeft = Math.max(
    0,
    TIER_PROVISIONAL_GAMES - (player.tier?.gamesOfFive ?? 0),
  );
  const tierPoints =
    args.pointsThisMonth && rating.kind === "rated"
      ? m.pointsThisMonth(formatTierDelta(args.pointsThisMonth))
      : m.points;
  return {
    ...teamsTileName(player, locale),
    subtitle:
      rating.kind === "new"
        ? m.sentences(standing, m.notRatedYet(gamesLeft))
        : standing,
    ratingValue:
      rating.kind === "new"
        ? m.newValue
        : rating.kind === "guest"
          ? ovrLabel({ ovr: null })
          : rating.value,
    ratingLabel:
      rating.kind === "new"
        ? m.pointsAfter(TIER_PROVISIONAL_GAMES)
        : args.balanceOn === "ovr"
          ? m.ovr
          : tierPoints,
  };
}

/**
 * The last five results, oldest first, with the slots not reached yet left
 * as not played. The line beside them counts the same Games the sheet does.
 */
export function teamsPlayerCardForm(
  form: readonly FormMark[],
  games: number,
  locale: Locale,
) {
  const m = messagesFor(locale).football.teamsCard;
  const empty = Math.max(0, GROUP_FORM_MARK_LIMIT - form.length);
  return {
    slots: [...form, ...Array<FormMark>(empty).fill("not-played")],
    caption:
      games >= GROUP_FORM_MARK_LIMIT
        ? m.lastFive
        : games === 0
          ? m.nonePlayed
          : m.playedSoFar(games),
  };
}
