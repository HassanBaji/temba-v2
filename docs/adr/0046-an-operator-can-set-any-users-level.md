# An Operator can set any User's Level

**Status:** accepted.

A Level override could only come from a Level setter, inside a Group both people belong to, and only for padel. Temba staff had no way to correct a Level for someone outside their Groups, or to fix a football self-placement that Make teams balances on.

## Decision

- **An Operator may set any other User's Level, padel or football.** The web App's Player Levels page (`/dashboard/operator/levels`) lists every User, claimed or Unclaimed, with their Level in one sport, and opens the same Set Level form a Level setter uses.
- **It is a Level override like any other.** `ratings.setLevelAsOperator` writes through the same `applyLevelOverride` as `ratings.setLevel`: same μ and φ baseline, same audit row, with `level_overrides.group_id` null. No new table or column.
- **Not your own Level.** An Operator cannot set their own Level, the same as a Level setter.
- **The Level setter door is unchanged.** It still needs a shared Group and still refuses football.

## Consequences

- A football Level an Operator sets stays put until football results rate, since football Games are Unrated.
- Operators stay a Clerk `publicMetadata.operator` flag; nothing is granted in the App.
