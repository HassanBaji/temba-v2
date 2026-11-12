# A playing Organizer's tournament score is final

**Status:** accepted. Amends [ADR-0062](./0062-tournament-rounds-are-drafts-and-the-other-team-confirms.md).

ADR-0062 let an Organizer who is not playing in a drawn tournament Match set its score outright, and
had an Organizer who plays in the Match enter it as a player. On a Friendly tournament the Organizer
often plays, so their own Match waited on the other team's tap, or ten minutes, while every other
Match on the day could be settled by them in one step.

## Decision

- **Any Organizer's `games.enterTournamentScore` is final**, whether or not they sit on the Match. It
  completes the Match at once, removes the `match.score-stands` Job and does not ask the other team.
  It may also replace a confirmed score, under the same wrong-score rule as before.
- **Any Organizer may confirm a pending score**, including one entered by their own teammate.
  `canConfirm` on `games.tournamentRounds` and `canConfirmScore` on `games.byId` follow.
- The score sheet tells a playing Organizer their score is final instead of saying the other team
  gets a tap.

## Consequences

- An Organizer's score on their own Match stands on their word alone. The other team cannot correct
  it themselves; another Organizer, or the same one, can enter a new score over it.
