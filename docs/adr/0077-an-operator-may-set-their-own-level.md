# An Operator may set their own Level

**Status:** accepted. Amends [ADR-0046](./0046-an-operator-can-set-any-users-level.md).

ADR-0046 kept an Operator from setting their own Level, the same as a Level setter. Operators are Temba staff who calibrate Levels for everyone else, and their own Level sat out of reach on the Player Levels page: their row showed only "You", with no way to correct a wrong self-placement.

## Decision

- **`ratings.setLevelAsOperator` accepts the caller's own id.** The Player Levels page (`/dashboard/operator/levels`) shows Set Level on the Operator's own row, beside the "You" badge.
- **It is still a Level override like any other.** The audit row has `set_by_user_id` equal to `user_id` and no Group, so a self-set Level is plain in the record.
- **The Level setter door is unchanged.** `ratings.setLevel` still refuses a Level setter's own Level.

## Consequences

- An Operator can move their own Level without asking another Operator. The `level_overrides` row is the check on that.
