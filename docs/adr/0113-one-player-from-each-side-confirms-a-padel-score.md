# One player from each side confirms a padel score

**Status:** accepted. Amends [ADR-0011](./0011-match-result-confirmation.md), which asked every seated User with an account to confirm a padel Match.

ADR-0011 made a padel Match wait for all four players. In practice one player of a pair confirms for both, and a Match sat unrated while a partner who had nothing to add never opened the app. Football (ADR-0069), drawn tournaments (ADR-0062) and Public Games (ADR-0071) already settle on one player from each side.

## Decision

- **Every Match is agreed by one account holder from each side**, padel included: the side that entered the score is agreed by the entry, and one tap from anyone on the other side completes and rates the Match. A partner's tap after their side agreed changes nothing.
- **Everything else stays.** A side with no account holder is still confirmed by an Organizer; an Organizer's confirmation is still final except on a Public Game (ADR-0044); a Verifier stamp is still final (ADR-0072); a changed score still clears every confirmation except its enterer's; a Public Game keeps its 24 hours and a drawn tournament its ten minutes.
- **Game details shows the side, not just the player.** `games.byId` adds `matchResultConfirmation.sideAgreedUserIds`, the account holders whose side has agreed. A partner of the player who confirmed reads "Partner confirmed" and is not offered Confirm. The footer of a completed Match reads "Confirmed by both sides".

**Considered Options**: keep unanimity and add a reminder — rejected, the reminder asks a player to repeat what their partner already said. Let the entering side's word stand after a timeout, as a drawn tournament does — rejected for Friendly games, since nobody on the other side would have checked the score.
