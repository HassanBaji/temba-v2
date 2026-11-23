# A Side captain is named per Football side and answers without blocking

**Status:** accepted. Spec: `.scratch/football-draft-line-up/spec.md`. Builds on
[ADR-0107](0107-a-draft-line-up-is-kept-apart-from-the-football-sides.md).

The people an Organizer shows a Draft line-up to are the two players who run each side on the day.
The design calls them captains and lets each approve their own side or ask for a change. Captain
already means a Team's creator (ADR-0059), who acts for the Team on Challenges.

## Decision

- **A Side captain is a per-Game pick, not a Captain.** One per Football side or none, named by an
  Organizer. The glossary term is Side captain; product copy says "captain". Copy says "team"
  where the design says "squad", which stays the Challenge word.
- **The pick is a reference to a `game_players` row**, on the draft and on the published Football
  side (`game_teams.captain_game_player_id`), cleared by the foreign key when that player leaves.
- **Always a player on that side with an account.** Moving them to the other side clears the pick.
  A Guest player or an Unclaimed player cannot be named.
- **A Captain's answer is stored with the players it was given for.** A side whose players differ
  from the answer's reads as waiting again, whether an Organizer edited it or someone left. No door
  that changes the roster resets anything.
- **An answer never gates publishing.** The Organizer publishes when they like.
- **A Side captain sees both sides and answers for one.** The note goes to the Organizers and
  stays with its writer; the other Side captain sees only that a change was asked.
- **A side captained by an Organizer has nobody to ask**, as a side with no Side captain does.
- **The C is carried onto the published side and is a label there.** It shows on the Game screen's
  teams and on Make teams. A Side captain holds no Organizer power before or after publishing.
- **Not on a Challenge Game.** Its sides belong to the two Teams and their Captains.

## Considered options

- Reusing Captain. Rejected: a Captain owns a Team and acts for it; this role owns nothing and
  lasts one Game.
- A revision counter bumped by every door that changes a side. Rejected: leave and kick remove
  players by cascade and would each have to know about drafts.
- Requiring both approvals to publish. Rejected by the design: the Organizer decides.
- The C on the Result card, the played board and the Live board. Not in this pass.

## Consequences

- Four Notification types: a Side captain is told when named on a saved draft and when their side
  of it changes after they answered; the Game admins are told when a Side captain approves or asks
  for a change.
- "Captain" has two meanings in product copy. They never meet: nothing here is offered on a
  Challenge Game, and a Team's screens never show a Side captain.
- Existing copy about captains picking starters before kick-off now has someone to point at, and
  still stores nothing.
