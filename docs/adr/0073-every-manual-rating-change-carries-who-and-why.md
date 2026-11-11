# Every manual rating change carries who and why

**Status:** accepted for Tier adjustments and a Group's Points and history; proposed (draft for the owner's review) for Level overrides and the rest of Rating history. Spec: `.scratch/rating-redesign/spec.md`. Amends [ADR-0023](./0023-level-override-is-a-confirmed-glicko-baseline.md).

A Level override already records who set it, and may carry a reason. A Group Level override records who and no reason. The owner's rule is stricter and covers the new ladder too: anything a person changed by hand carries their name and reason, and the player sees it the moment it happens.

## Decision

- **A reason is required** on every new Level override and every Tier adjustment, from the five existing `level_override_reason` values. An optional note may add the person's own words.
- **`level_overrides` gains `note` and `set_by_role`** (Level setter, Operator, Verifier), backfilled from whether the row has a Group.
- **The player is told at once**, by a Notification that names the person and the reason.
- **Rating history is a read, not a table.** It is the union of `rating_events`, `level_overrides` and `group_tier_events`, newest first, with filters for Level, Tier and Rank. Milestones such as "Level confirmed" are derived.
- **A player reads their own history.** An Organizer also reads a member's tier history in their Group.
- **Official Rank has no manual change**, so it never has such a row.

**Considered Options**: one audit table that every writer also writes (a second source of truth that can disagree with the ledgers); free text as the only reason (unsearchable, and the five chips already cover the cases the owner drew); showing manual changes only to the person who made them (the design's point is that the player sees them).

## Consequences

- An Operator or a Level setter can no longer save a Level without choosing a reason.
- Old overrides with no reason stay as they are and read "no reason given".
- There is no undo. A mistake is corrected by another change, which is also in the history.
