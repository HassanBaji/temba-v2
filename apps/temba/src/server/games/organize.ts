export { addMatch, addTournamentMatch } from "~/server/games/add-match";
export { cancelGame } from "~/server/games/cancel";
export { cancelMatch } from "~/server/games/cancel-match";
export { closeRegistration } from "~/server/games/close-registration";
export { kickRegisteredUser } from "~/server/games/kick-registered-user";
export { kickWaitlistEntry } from "~/server/games/kick-waitlist-entry";
export { reopenRegistration } from "~/server/games/reopen-registration";
export { updateFriendlyGameMatchCourt } from "~/server/games/update-friendly-game-match-court";
export { updateGameMatch, updateMatch } from "~/server/games/update-match";
export { updateTournamentMatch } from "~/server/games/update-tournament-match";
export { updateGamePricePerPlayer } from "~/server/games/update-price-per-player";
export { updateGameWindow } from "~/server/games/update-window";
export { updateGameCaps } from "~/server/games/update-caps";
export type {
  MatchUpdateInput,
  TournamentMatchInput,
} from "~/server/games/utils";
