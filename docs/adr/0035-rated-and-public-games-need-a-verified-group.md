# Rated and public Games need a Verified Group

**Status:** accepted. Spec: `.scratch/verified-groups/spec.md`.

Group creation was limited to a few Users by a client-only Clerk flag, `publicMetadata.groupCreator`, and every Group Game was rated. The product wants anyone to create a Group. Without a guard, any Group could move Levels and Standings or open Games to anyone with the link.

## Decision

- **Verification is a Group fact.** `groups.verified_at` and `groups.verified_by` record it. A Group with `verified_at` set is a Verified Group. A later change adds a second, derived way to be Verified (membership of a Venue Community); `groupIsVerified` is the one place that reads both.
- **`rated` and `isPublic` are snapshots taken at Game create.** `games.create` and `games.createTournament` store `rated = groupIsVerified`. On a Group that is not Verified, `createTournament` refuses `isPublic: true` with `FORBIDDEN`; `games.create` keeps storing `isPublic = false`. No procedure changes either value afterwards, so verifying or unverifying a Group never touches existing Games.
- **The server enforces the rule.** Unlike the `groupCreator` UI gate, a client cannot bypass it.
- **Creators with `groupCreator` get a Verified Group.** The four `groups.create*` doors set `verified_at` and `verified_by` when the caller's public metadata has `groupCreator === true`. This keeps today's staff flow.
- **Migration backfill.** Every Group that exists at migration time gets `verified_at = created_at`, so current behaviour is unchanged.
- **Additive outputs.** `verified` is added to `games.listCreateGroups` and `groups.byId`. No procedure path is renamed.

**Considered Options**: a per-User flag (the permission follows the person, not the Group, and cannot be revoked per Group); inferring `rated` on read (changing a Group's status would rewrite history and ratings).

## Consequences

- A Group that is not Verified plays Unrated Games: no rating events, no Level change, no Standing, but Last 10, All time stats and Win streak still count them.
- Rating integrity depends on shipping the Group-creation gate removal after this change.
