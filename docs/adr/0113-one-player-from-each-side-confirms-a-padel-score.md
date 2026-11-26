# One player from each side confirms a padel score

**Status:** accepted. Amends [ADR-0011](./0011-match-result-confirmation.md), which asked every seated User with an account to confirm a padel Match.

ADR-0011 made a padel Match wait for all four players. In practice one player of a pair confirms for both, and a Match sat unrated while a partner who had nothing to add never opened the app. Football (ADR-0040), drawn tournaments (ADR-0062) and Public Games (ADR-0071) already settle on one player from each side.

## Decision

- **Every Match is confirmed by one account holder from each side**, padel included: entering the score confirms the entering player's side, and one tap from anyone on the other side completes and rates the Match. A partner's tap after their side is confirmed changes nothing, before or after the Match completes.
- **Saving a Set with the games it already had confirms nothing**, except on a Public Game. The Apps save a score one Set at a time, so an opponent correcting the second Set first resends the first one unchanged; were that a confirmation, it would be the other side's one tap and would complete the Match on the score being corrected. A player who agrees with the score taps Confirm. A Public Game keeps ADR-0071's rule that the same score saved again agrees with it.
- **Everything else stays.** A side with no account holder is still confirmed by an Organizer; an Organizer's confirmation is still final except on a Public Game (ADR-0044); a Verifier stamp is still final (ADR-0072); a changed score still clears every confirmation except its enterer's; a Public Game keeps its 24 hours and a drawn tournament its ten minutes.
- **Game details shows the side, not just the player.** `games.byId` adds `matchResultConfirmation.sideConfirmedUserIds`, the account holders whose side is confirmed. A partner of the player who confirmed reads "Partner confirmed" and is not offered Confirm. The footer of a completed Match reads "Confirmed by both sides".

**Considered options**: keep unanimity and add a reminder — rejected, the reminder asks a player to repeat what their partner already said. Let the entering side's word stand after a timeout, as a drawn tournament does — rejected for Friendly games, since nobody on the other side would have checked the score. One call that saves every Set, so the server sees a correction whole — not needed for this rule, and built later for the confirm-or-dispute flow (ADR-0114); an unchanged score still confirms nothing there.

## Consequences

- A Match the players confirmed has two rows in `match_result_confirmations` where it had four.
- `matchResultConfirmation.requiredUserIds` keeps its name and still lists every account holder seated on the Match, but they are no longer all required: it is who may confirm. `sideConfirmedUserIds` says whose side is done.
- "Confirmed by the Organizer" is read from the two sides, not from whether every player confirmed.
- A Public Game keeps ADR-0071's rule, so a client that saves Set by Set through `games.scoreSet` can still confirm the score it is correcting there. The Apps save in one call (ADR-0114), which closes it for them.
- On a Match with an empty side, the players' confirmations can no longer complete it; an Organizer or a Verifier must. A Friendly game's score cannot be entered until both sides are full, so this needs a seat to empty afterwards.
