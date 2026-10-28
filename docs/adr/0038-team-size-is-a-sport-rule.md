# Team size is a sport rule

**Status:** accepted.

A Team's minimum, maximum, completion count and pair-uniqueness come from `teamRosterRule(sport)` in `@repo/domain/team-roster`. Padel is `{ min 2, max 2, completeAt 2, pairIsUnique }`, which reproduces every existing rule. Football is `{ min 2, max 25, completeAt 5, not unique }`.

## Decision

- **A Team is complete at `completeAt` members and full at `max`.** Linking a Team to a Community requires complete; accepting an invite is refused when full.
- **Pair uniqueness runs only when `pairIsUnique`.** The same two Users may sit together in several football Teams.
- **The one-open-seat rule becomes an invite budget.** The creator may hold at most `max − members` unused Lookup and Email invites. The Invite link is one shared door and does not draw on the budget; accepting it is refused at full. The two database indexes that allowed one unused invite per Team are dropped; the per-User and per-email indexes stay.
- **A football Team is a squad with a creator and no captain role.** A non-creator member leaves with `teams.leave`; the creator dissolves. Padel Teams cannot leave: dissolve instead.
- **Stats counters stay at zero for football** until football results exist.
- **Game-side checks stay at two.** Football Teams do not register on Games in v1.

**Considered Options**: a second `squads` table (duplicates invites, links, Community rules and stats for one dimension); a `max_members` column per Team (a product rule, not per-row data).

## Consequences

- Every Team door reads the rule, so a third sport with its own roster is a new entry, not new branches.
- The padel one-open-seat limit is now enforced by the door, not by a unique index, so two concurrent invites could both pass the budget check.
