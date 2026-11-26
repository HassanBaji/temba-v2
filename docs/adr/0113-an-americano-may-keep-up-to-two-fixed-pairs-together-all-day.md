# An Americano may keep up to two fixed pairs together all day

**Status:** accepted. Amends ADR-0094 (Americano is a Tournament shape whose Matches seat players).

Groups that run an Americano sometimes bring two players who want to play the whole morning together: a couple, a coach and a beginner, two friends who came as a team. ADR-0094 gives everyone a new partner every Round, so the Organizer had no way to keep them together.

## Decision

- **The Organizer may fix up to two pairs before the Rounds are made.** Each is two players on the Social. `games.setAmericanoFixedPairs({ gameId, pairs })` replaces the whole set; an empty list clears it. The pairs are stored in `americano_fixed_pairs` (Game, pair number, two Game player ids, every reference `ON DELETE CASCADE`), so a player who leaves or is taken off breaks their pair and their partner goes back into the rotation.
- **Everyone else still gets a new partner every Round.** A fixed pair is refused when it leaves fewer rotating players than one more than the Round count: 16 players and 7 Rounds take two pairs (12 rotate), 8 players and 7 Rounds take none. `americanoFixedPairsFit` in `@repo/domain/tournament-americano` decides for the door, `games.postAmericanoRounds` and the web sheet.
- **The Rounds place fixed pairs first.** `americanoRounds(order, rounds, fixedPairs)` puts each fixed pair in every Round's pair list ahead of the circle-method pairs of the rotating players, then splits the Round's pairs into Matches with the fewest repeat opponents as before. A fixed pair is never a Game team: its Matches seat its two players as Americano seats, like any other pair.
- **The pairs lock when the Rounds are made.** The door refuses once `drawPostedAt` is set. Undoing the Rounds (allowed until a score is in) opens them again.
- **No swap splits a fixed pair.** `games.swapAmericanoPlayers` refuses a swap that involves a fixed player; the web draw sheet does not let the Organizer pick one.
- **The table stays one table of players.** Fixed partners share every result, so their numbers match; a tie keeps them in adjacent rows. `games.americanoBoard` returns `fixedPairs` so both Apps can mark them ("fixed" on a court, "with Khalid J" in Standings).
- **Only the Organizer sets them.** Players do not ask for a partner at sign-up.

**Considered options**: a nullable pair number on `game_players` (a leaving player would leave their partner holding a lone number); passing the pairs only with `postAmericanoRounds` (nothing to show on the Social before the Rounds, and lost when the sheet closes); letting rotating players repeat partners when the pairs leave too few (it breaks the one rule an Americano promises); more than two pairs (each pair costs every rotating player a possible partner, and the design caps it at two).

## Consequences

- Additive only: one table (migration `0139_americano_fixed_pairs`), one procedure and one field on `games.americanoBoard`.
- A fixed pair always plays on the first Courts of each Round, since the opponent search anchors on the first pair it is given.
- Changing the Round count or the seats after setting pairs can make them stop fitting; `postAmericanoRounds` then refuses with the same message, and the Organizer removes a pair.
- The mobile App reads the pairs (Standings) but does not set them, like the rest of Americano administration.
