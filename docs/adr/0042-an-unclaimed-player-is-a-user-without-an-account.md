# An Unclaimed player is a User without an account

**Status:** accepted. Spec: `.scratch/manual-players/spec.md`.

Organizers and Group approvers may add people to Games and Groups by phone and name. When the phone belongs to no account, the person becomes an Unclaimed player, and signing up with that phone later claims their history.

## Decision

- **An Unclaimed player is a `user` row with `clerk_id` null and `added_at` set.** `added_by_user_id` records who added them. A check requires a phone on such a row. The explicit `added_at` marker keeps legacy rows without a clerkId from being read as Unclaimed.
- **One row per E.164 phone**, reusing the existing unique `user.phone_number`. A second Organizer who types the same number reaches the same row.
- **Everything that hangs off a User hangs off this row:** `game_players`, `game_team_players`, `group_members`, `community_members`, `ratings` and Match results. Standing, Last 10, All time and Win streak read it unchanged.
- **It is excluded where an account is assumed.** Lookup invite search, Partner search and Partner suggestions leave it out, `notify` never writes it a row, and it is not a required Match result confirmer. An Organizer's confirmation stands in for a side with no account holder.
- **The claim reuses the Clerk sync.** `upsertUserFromClerk` already falls back by phone to a row without a clerkId. It now does so only for a verified Clerk phone, and sets `user.claimed_at`.
- **A later verified phone merges.** When an existing account verifies a phone an Unclaimed player holds, the Unclaimed row is merged into the account in one transaction and deleted:
  - The account's seat wins on a shared Game.
  - The Rating with more Rated Matches wins per sport, and the account's wins a tie.
  - Memberships are combined.
  - `user_merges` keeps the audit record.

**Considered Options**: a separate `unclaimed_players` table with a nullable link on every seat, membership, Rating and confirmation table (every history and stats query would need a second join, and claiming would be a copy across a dozen tables); reusing Guest (a Guest is a Booking fact, not a person who plays Matches or holds a Rating).

## Consequences

- The glossary's User is no longer "a person with a Temba account". Code that must reach a real person (Notifications, search, confirmations, push later) checks the Unclaimed predicate in `packages/api/src/unclaimed-players/is-unclaimed.ts`.
- Unclaimed players are rated on Rated Games from an Organizer-picked starting Level, written through the same one-time self-declare as onboarding. Onboarding then keeps that Rating after the claim.
- A mistyped or misused number attaches history to the wrong person. v1 relies on leave and the wrong-score report. A "Not me" door is the recorded follow-up.
- The phone is never editable on an Unclaimed player, because editing it would hand the history to a different person.
