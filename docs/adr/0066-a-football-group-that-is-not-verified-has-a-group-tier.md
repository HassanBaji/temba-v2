# A football Group that is not Verified has a Group Tier, and a padel Group has only a Standing

**Status:** accepted. Spec: `.scratch/rating-redesign/spec.md`. Supersedes [ADR-0053](./0053-every-group-game-rates-a-group-level.md). Amends [ADR-0035](./0035-rated-and-public-games-need-a-verified-group.md) and [ADR-0045](./0045-a-standing-counts-unrated-games.md).

ADR-0053 gave every Group a second Glicko-2 Level. On padel it duplicated the Temba Level's face; on football it never moved, because football had no rating step. The owner's design gives football Groups a Group Tier and padel Groups none: padel pairs rotate, so one honest Level does the balancing.

## Decision

- **A tier Group is a football Group that is not Verified.** Its Games move Tier points and nothing else.
- **A Verified football Group has no Group Tier.** Its Games count for Temba Level. Members shows OVR where a tier Group shows fish, and Make teams balances on OVR.
- **A padel Group has only a Standing.** A padel Game on a Verified Group counts for Temba Level, as before. A padel Game on a Group that is not Verified is Unrated.
- **The stored flags keep their columns.** `games.rated` still means "moves the Temba Level". `games.group_rated` now means "moves Tier points". Both remain snapshots taken at create.

| Game | Padel | Football |
| --- | --- | --- |
| On a Group that is not Verified | Unrated | `group`: Tier points |
| On a Verified Group | `temba` | `temba` |

- **The creator's Unrated choice stays**, and is offered on football.
- **Group Level is retired, not deleted.** `group_ratings`, `group_rating_events` and `group_level_overrides` stop being written. `ratings.setGroupLevel` keeps its path and refuses. `ratings.myGroupLevels` stays for old clients. Reversing an old padel Match still restores its Group Level rows.
- **A Group that changes verification changes ladder from its next Game.** Tier points stop moving and stay in Rating history; if the Group stops being Verified they resume where they stopped. Existing Games keep their snapshot.
- **One data migration** clears `group_rated` on padel Games with no completed Match.

**Considered Options**: keeping the padel Group Level beside the new ladders (two letters for one player again); giving padel the fish (the design says no, and rotating pairs make a per-Group order weak); letting a Verified football Group have both a tier and a Level (declined by the owner: one Game feeds one ladder); a new `rating_scope` enum column (ADR-0053 already rejected the churn, and the two booleans still express the exclusive three).

## Consequences

- Club Groups, which are always Verified, never show fish.
- "Counts for group rating" disappears from padel. Football reads "Counts for group tier".
- A padel player in a Group that is not Verified loses a number they had. Their Standing and their Temba Level are unchanged.
