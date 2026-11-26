import {
  ovrLabel,
  slotCode,
  teamsRating,
  teamsTileName,
  type BoardPlayer,
} from "@repo/domain/football-board";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import {
  GROUP_FORM_MARK_LIMIT,
  type FormMark,
} from "@repo/domain/member-form-marks";
import { formatTierDelta } from "@repo/domain/tier-adjust";
import { TIER_PROVISIONAL_GAMES } from "@repo/domain/tier-points";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
  const m = messagesFor(locale).mobileTournament.makeTeams;
  const rating = teamsRating(player, args.balanceOn, locale);
  const code = slotCode(player, locale);
  const place = args.sideName ?? m.notPlaced;
  const standing = code ? m.card.sideUsually(place, code) : place;
  const gamesLeft = Math.max(
    0,
    TIER_PROVISIONAL_GAMES - (player.tier?.gamesOfFive ?? 0),
  );
  const tierPoints =
    args.pointsThisMonth && rating.kind === "rated"
      ? m.card.pointsThisMonth(formatTierDelta(args.pointsThisMonth))
      : m.card.points;
  return {
    ...teamsTileName(player, locale),
    subtitle:
      rating.kind === "new"
        ? m.card.sentences(standing, m.card.notRatedYet(gamesLeft))
        : standing,
    ratingValue:
      rating.kind === "new"
        ? m.card.newValue
        : rating.kind === "guest"
          ? ovrLabel({ ovr: null })
          : rating.value,
    ratingLabel:
      rating.kind === "new"
        ? m.card.pointsAfter(TIER_PROVISIONAL_GAMES)
        : args.balanceOn === "ovr"
          ? m.card.ovr
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
  const m = messagesFor(locale).mobileTournament.makeTeams.card;
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
