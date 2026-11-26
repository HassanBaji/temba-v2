# An Americano may keep up to two fixed pairs together all day

**Status:** accepted. Amends ADR-0094 (Americano is a Tournament shape whose Matches seat players).

Groups that run an Americano sometimes bring two players who want to play the whole morning together: a couple, a coach and a beginner, two friends who came as a team. ADR-0094 gives everyone a new partner every Round, so the Organizer had no way to keep them together.

## Decision

- **The Organizer may fix up to two pairs before the Rounds are made.** Each is two players on the Social. `games.setAmericanoFixedPairs({ gameId, pairs })` replaces the whole set; an empty list clears it. The pairs are stored in `americano_fixed_pairs` (Game, pair number, two Game player ids, every reference `ON DELETE CASCADE`), so a player who leaves or is taken off breaks their pair and their partner goes back into the rotation.
- **Everyone else still gets a new partner every Round.** A fixed pair is refused when it leaves fewer rotating players than one more than the Round count: 16 players and 7 Rounds take two pairs (12 rotate), 8 players and 7 Rounds take none. `americanoFixedPairsFit` in `@repo/domain/tournament-americano` decides for the door, `games.postAmericanoRounds` and the web sheets; `americanoFixedPairsLeft` adds the two-pair cap for the picker. Setting pairs is judged on the Social's seats, since the Organizer plans for a full Social; making the Rounds is judged on the players actually in, and the rounds sheet says so before the server does.
- **The Rounds place fixed pairs first.** `americanoRounds(order, rounds, fixedPairs)` puts each fixed pair in every Round's pair list ahead of the circle-method pairs of the rotating players, then splits the Round's pairs into Matches with the fewest repeat opponents as before. A fixed pair is never a Game team: its Matches seat its two players as Americano seats, like any other pair.
- **The pairs lock when the Rounds are made.** The door refuses once `drawPostedAt` is set. Undoing the Rounds (allowed until a score is in) opens them again.
- **No swap splits a fixed pair.** `games.swapAmericanoPlayers` refuses a swap that involves a fixed player; the web draw sheet does not let the Organizer pick one.
- **The table stays one table of players, and fixed partners share a place.** They share every result, so their numbers match: `americanoTable` keeps them in adjacent rows and gives both the same place, and the next player takes the place after both (1, 1, 3). Every reader of the table passes the pairs: the board, the live board, Played, the Group page and the Series result. `games.americanoBoard` returns `fixedPairs` so both Apps can mark them ("fixed" on a court, "with Khalid J" in Standings).
- **A fixed pair at the top both win the day.** `americanoWinners` is every row in first place. The finished screen names both, the Played card reads "Won by Hassan Haji and Khalid Janahi", both share cards read "Won the day", and a Series Edition is won by both Users (`seriesEditionResult` already carries several).
- **Only the Organizer sets them.** Players do not ask for a partner at sign-up.

**Considered options**: one winner for a winning fixed pair, by sign-up order (two players with identical results, one of them told they came second); a nullable pair number on `game_players` (a leaving player would leave their partner holding a lone number); passing the pairs only with `postAmericanoRounds` (nothing to show on the Social before the Rounds, and lost when the sheet closes); letting rotating players repeat partners when the pairs leave too few (it breaks the one rule an Americano promises); more than two pairs (each pair costs every rotating player a possible partner, and the design caps it at two).

## Consequences

- Additive only: one table (migration `0139_americano_fixed_pairs`), one procedure, one field on `games.americanoBoard` and one (`winner.partnerName`) on the Played summary.
- The design's Standings (1d) numbers fixed partners 2 and 3; they now both read 2 and the next player 4.
- A fixed pair always plays on the first Courts of each Round, since the opponent search anchors on the first pair it is given.
- Changing the Round count or the seats after setting pairs can make them stop fitting; the rounds sheet then shows why and `postAmericanoRounds` refuses, and the Organizer removes a pair or waits for more players.
- The mobile App reads the pairs (Standings) but does not set them, like the rest of Americano administration.
