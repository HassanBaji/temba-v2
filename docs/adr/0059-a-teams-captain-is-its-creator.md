# A Team's Captain is its creator

**Status:** proposed (draft for the owner's review).

Challenges need someone who acts for a Team: who posts, proposes, confirms and names a squad. ADR-0038 said a football Team "has a creator and no captain role", and the padel-teams spec (rule 25) kept a Team's home members-only. The Challenge detail shows the opposing Team's record, Roster and Levels to whoever opens it, so neither rule can stand as written.

## Decision

- **Captain is the product name for `teams.created_by`.** No captain column, no role table, no transfer door. The creator rules that exist today (the creator dissolves, others leave) are the Captain rules.
- **Who acts for a Team.** On a football Team, the Captain. On a padel Team, both members, as either may dissolve today. `teams.byId` returns `viewerActsForTeam` from this rule. (The Group tag half, which lets a tagged Group's Organizers act for a football Team, lands with the Group tag.)
- **A Team's detail is readable by any signed-in User.** `teams.byId` no longer refuses non-members: name, sport, record, form, Rivals, Roster with Levels and the Team's Games are public to signed-in Users. Invites, leave and dissolve stay member-only. This supersedes rule 25 of `.scratch/padel-teams/spec.md`.

**Considered options**: a `captain_user_id` column (a second permission model and a transfer door for no product need); keeping the Team home private and showing a reduced card on Challenges (two readers of the same Team that drift apart).

## Consequences

- ADR-0038's "no captain role" is amended: the role exists, and it is the creator.
- Copy says Captain, not Creator.
- A Team record, Rivals and head-to-head are derived on read in `packages/api/src/teams/team-record.ts`, shared by every reader of a Team.
