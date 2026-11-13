# Operators are mirrored onto Users by the Clerk webhook

**Status:** accepted. Amends [ADR-0046](./0046-an-operator-can-set-any-users-level.md) ("Operators stay a Clerk `publicMetadata.operator` flag") for finding Operators; the Operator check is unchanged.

The Match dispute Notification goes to every Operator. Clerk cannot filter Users on public metadata, so the API host paged through Clerk's whole User list 500 at a time and kept the result for five minutes. That cost grows with every sign-up, a Clerk outage silently dropped the Notification, and the list lived in `apps/api`, which holds no business logic.

## Decision

- **`user.is_operator` is a copy of Clerk's `publicMetadata.operator`.** The Clerk webhook writes it on every `user.created` and `user.updated`, true only when the flag is exactly `true`. Granting or revoking Operator in the Clerk dashboard reaches the column with the `user.updated` Clerk sends for it. A deleted account is cleared.
- **It is a directory, not a permission.** Operator doors still check the session's Clerk public metadata through `requireOperator`. Nothing grants or revokes Operator in the App.
- **Notifications that go to every Operator read the column**, in one query inside `@repo/api`. The context host no longer lists Operators.
- **The request path does not refresh the column.** `resolveAppUser` sees only the Clerk id; the flag would cost a Clerk call on every request. A missed webhook is healed by the next `user.updated`, or by rerunning the backfill.
- **Backfill once.** `pnpm --filter @repo/api db:backfill-operators` copies the flag for every Clerk User, so Operators granted before the column shipped are found. It is safe to rerun.

**Considered Options**: keeping the Clerk scan with a longer cache (still grows with Users, still lost on an outage); moving authorization onto the column (a stale copy would open or keep Operator doors, and the session already carries the truth); refreshing the column from `getPublicMetadata` when an Operator door runs (only Operators who use a door would heal, and only on those doors).

## Consequences

- Until the backfill runs, an Operator granted before this change gets no dispute Notification; the dispute still waits on the Operator Disputes page.
- An Unclaimed player has no Clerk account and is never an Operator. Absorbing one into an account keeps the account's own flag.
- The seed marks `me` as an Operator so disputes notify in development.
