# A Booking Game is groupless and unrated

**Status:** accepted.

## Unrated

A Game carries `rated boolean not null default true`. The rule is one pure function, `gameRates` in `@repo/domain/game-rating-eligibility`: a Game rates when `rated` is true and it is not cancelled.

- `applyRatedMatch` is the only writer of rating state. It returns before loading slots when the Game does not rate, so an Unrated Game writes no rating events, touches no `ratings` row and moves no Level.
- `load-group-standing` reads `rated` and skips a Game that does not rate, so an Unrated Game contributes nothing to a Standing even if it sits on a Group.
- `games.byId` returns `rated` and `ratingImpact: null` for an Unrated Game. Web and mobile Game details show "Unrated" in place of the Rating impact block.
- Last 10, All time stats, Win streak and win rate are unchanged: an Unrated Match was played. Last 10 rows and Match history rows carry `rated` so the card can mark them.
- Match result confirmation (ADR-0011) still applies. It is about the score being right, not about rating.

Only `bookings.createGame` sets `rated = false`. Every other Game is `rated = true`.

## Groupless

`bookings.createGame` creates the Booking Game with `groupId = null`, through the same `createFriendlyGame` as `games.create`. The `groupCreator` gate and the organizable-Group requirement do not apply: anyone holding a confirmed, upcoming Booking may create one.

The rule "a new Game must belong to a Group" exists because Standing, the join gate and Organizer resolution hang off the Group. A Booking Game wants none of them: it has no Standing because it is unrated, the join gate is the holder's invitation, and the Organizer is the holder. The groupless paths already exist for legacy rows: `isGameOrganizer` and `gameAdminUserIds` fall back to `createdBy`, `userPassesJoinGate` admits only the creator on a private groupless Game (invited Users join through Lookup invite and the Invite link), `canViewGame` admits seated and waitlisted Users, and `load-group-standing` skips `groupId = null`.

`bookings.game_id` links the two, set in the same transaction as the Game insert while the Booking row is locked. The holder may create a new Game after cancelling the first; the link then moves to the new Game.

## Considered options

1. An auto-created Loose Group for each Booking Game. Rejected: it invents a social entity nobody asked for, shows on the Groups hub, carries a Standing of one, and collides with the `groupCreator` gate that hides Loose Group creation.
2. Infer unrated from a missing Group. Rejected: a Loose Group Game is rated at half weight, and a future unrated Game on a Group would leak into Standing.
3. A rating weight of zero. Rejected: it would still write rating events and touch `ratings`, and it cannot express "no Standing".

## Consequences

- The `rated` flag is read with the Game row, so no index is needed.
- A Game cannot become rated or unrated after Matches complete without a reversal of its rating events; nothing offers that.
