# A padel Level is confirmed after five Rated Matches in a Verified Group

**Status:** accepted. Amends [ADR-0009](./0009-glicko-2-user-ratings.md) (Provisional from φ) for padel. Football keeps [ADR-0069](./0069-a-football-level-is-an-ovr-moved-by-four-parts.md).

Under ADR-0009 a padel Level stayed Provisional until its Glicko-2 φ fell to 200 or below. In practice that took 8 to 16 Matches or more: a pair that won every Match in a Club Group still had φ near 208 after 8 Matches, and at weight 0.5 near 212 after 14. Football already confirms at its fifth counting Match. The owner asked for padel to be confirmed after five Matches in a Verified Group.

## Decision

- **Five Rated Matches in a Verified Group confirm a padel Level.** A padel `rating_events` row counts when its Game is on a Group. A Game is stored rated only on a Verified Group, as the Group was when the Game was created (ADR-0035), so verifying or unverifying a Group later changes nothing that already counted.
- **Other Rated Matches move the Level but do not count.** Public Games (ADR-0071) and padel Challenge Games have no Group. A padel Game on a Group that is not Verified is Unrated (ADR-0066) and writes no event.
- **A reversed Match does not count.** A wrong-score reopen or an upheld dispute deletes its events, so the count is read from the ledger and drops with it.
- **A Level override confirms, as before** (ADR-0023, ADR-0072). Once a padel Level has any Level override it is confirmed, whatever the count.
- **One read.** `padelConfirmations` in `@repo/api` counts the events and the overrides; `tembaLevelView` in `@repo/domain/level` turns it into Provisional and the Matches still to play, for `ratings.me`, Home, the Player profile, the You page, Group tables, join and Level range requests, and the Operator list. The rating impact on a Game reads it as of that Match. The "Level confirmed" milestone and its Notification (ADR-0073) sit on the fifth such Match, unless a Level override came before it.
- **φ is unchanged.** Weights, the Glicko-2 step, idle inflation and the override φ ceiling stay as they are. φ still decides how far a Match moves the Level; it no longer decides Provisional on padel, so idle time never makes a confirmed padel Level Provisional again.

**Considered Options**: lowering the φ threshold (still a guess at a Match count, and it varies with weight and results); storing a counter on `ratings` (a second copy of the ledger that a reversal, an Unclaimed player merge or the seed would have to keep in step); reading whether the Group is Verified now (unlinking a Club Group from its Venue would take every member's confirmation away).

## Consequences

- Most padel players confirm sooner. A player who plays only Public Games stays Provisional until five Matches in a Verified Group or a Level override.
- The "To confirm N of 5" count and its ring count the confirming Matches, not every Rated Match.
- A padel Group Level row (retired, ADR-0066) keeps reading Provisional from its φ.
