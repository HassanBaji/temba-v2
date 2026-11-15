# The Games list shows a Groups only tournament as one card

**Status:** accepted. Design: `.scratch/design-import/tournament-game-card.html` (1a to 2d). Amends [ADR-0018](./0018-hub-lists-expand-a-drawn-tournament.md) for the Games list only.

ADR-0018 split a posted drawn tournament into one My Games row per open Pool Match the viewer sits on, so that a Match tonight sits beside the viewer's other games. On a one-night tournament this turned four Rounds into four cards that repeat the same venue, team and evening, and the Played tab listed every finished Round as its own game. The tab counts said 4 and 9 when the viewer had 1 and 6 things to play and look back on.

## Decision

- **The Games tab shows a posted Groups only tournament the viewer plays in as one card**, in Upcoming and in Played. Its Rounds are cells inside the card: a result and score, the Round on court, the next Round, the rest hatched.
- **Upcoming keeps the card while the tournament is live** (`isGameLive`). **Played picks it up once it is not live**, with the viewer's place in the group as the headline and a footer only when a Round has no score.
- **The API change is additive.** `games.listMyGames` and `games.listMyMatchHistory` take an optional `groupTournaments` flag, and their rows carry `myTournament` (the viewer's Game team, group, place and Rounds). Without the flag both return what they returned before, so Home's Up next still gets one row per Pool Match and Home's recent form still counts every Match.
- **Each Pool Match still counts on its own** for the record, the last 10 and Levels. Only the Games list groups them.
- **The card before the draw is unchanged** (the existing Friendly tournament card), and so are Groups then knockout and Knockout only tournaments: their Matches keep their own rows, because a group place would misstate where a team finished once a knockout follows.

**Considered Options**: grouping on the client from the expanded rows (the rows carry only open Matches, so finished Rounds and scores would be missing); changing what `listMyMatchHistory` returns for everyone (Home's recent form needs one row per Match, and released mobile builds read it); a new procedure per tab (two doors for what is one list with a different grouping).

## Consequences

- A tournament with no scored Round for the viewer does not appear in Played until a score is entered.
- Knockout shapes still list per Match; extending the card to them needs a design for the place headline.
