# A Booking Game is groupless and unrated

**Status:** accepted. The unrated half is recorded here; the groupless half is appended by the Booking Game ticket.

## Unrated

A Game carries `rated boolean not null default true`. The rule is one pure function, `gameRates` in `@repo/domain/game-rating-eligibility`: a Game rates when `rated` is true and it is not cancelled.

- `applyRatedMatch` is the only writer of rating state. It returns before loading slots when the Game does not rate, so an Unrated Game writes no rating events, touches no `ratings` row and moves no Level.
- `load-group-standing` reads `rated` and skips a Game that does not rate, so an Unrated Game contributes nothing to a Standing even if it sits on a Group.
- `games.byId` returns `rated` and `ratingImpact: null` for an Unrated Game. Web and mobile Game details show "Unrated" in place of the Rating impact block.
- Last 10, All time stats, Win streak and win rate are unchanged: an Unrated Match was played. Last 10 rows and Match history rows carry `rated` so the card can mark them.
- Match result confirmation (ADR-0011) still applies. It is about the score being right, not about rating.

No door sets `rated = false` yet. Every existing Game is `rated = true` after the migration.

## Considered options

1. Infer unrated from a missing Group. Rejected: a Loose Group Game is rated at half weight, and a future unrated Game on a Group would leak into Standing.
2. A rating weight of zero. Rejected: it would still write rating events and touch `ratings`, and it cannot express "no Standing".

## Consequences

- The `rated` flag is read with the Game row, so no index is needed.
- A Game cannot become rated or unrated after Matches complete without a reversal of its rating events; nothing offers that.
