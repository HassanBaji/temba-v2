# A Verifier is a per-Venue role that calibrates Levels and stamps Matches

**Status:** accepted. Spec: `.scratch/rating-redesign/spec.md`. Amends [ADR-0023](./0023-level-override-is-a-confirmed-glicko-baseline.md) and [ADR-0046](./0046-an-operator-can-set-any-users-level.md). Follows [ADR-0025](./0025-venue-manager-is-a-per-venue-table-role.md).

The design says a Temba Level is controlled by "Temba admins and verifier roles": club staff, referees and coaches who can assess a new player and vouch for a result. Today only an Operator can set a football Level, and only a Level setter who shares a Group can set a padel one.

## Decision

- **A Verifier is a row in `venue_verifiers`**: a User, a Venue and a kind (club staff, referee, coach), granted and removed by an Operator.
- **A Verifier may calibrate a Level**, in either sport, of a User who has played a Game at that Venue or belongs to one of its Club Groups. Never their own. It is a Level override with a required reason and an optional note; the player is told who and why.
- **A Verifier may stamp a Match** at their Venue that they are not seated in. A stamp is a final confirmation by a neutral party and is shown on the Match. It changes no weight.
- **A Verifier reaches what they may act on.** They may open the Player profile of every User they may calibrate, and Game details of every Game at their Venue, a private Group Game included, to stamp its Matches. Opening a Game gives them no other door on it: joining, scoring, confirming and editing keep their own checks. You lists the Matches they may stamp now.
- **Disputes go to Operators.** A seated player may dispute a Match that counted for Temba Level within seven days. An Operator upholds it, which runs the wrong-score reversal, or dismisses it.
- **Level setter is unchanged.**

**Considered Options**: a Clerk flag like Level setter (the role is about one Venue, and Clerk flags cannot be listed per Venue); folding the role into Venue manager (managing bookings and judging players are different trusts, and ADR-0025 gives a manager no door on players); letting a stamp raise a Match's weight (a second axis of trust nobody has asked for yet); the unused `coach` tables (they model coaching sessions, not a permission).

## Consequences

- A football Level can be set by someone other than an Operator.
- The Venue page for Operators gains a Verifiers list beside its managers.
- A Verifier with a grudge can move a Level once; the override is in the player's Rating history with their name on it.
