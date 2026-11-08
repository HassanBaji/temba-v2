# A Team's Captain is its creator

**Status:** proposed (draft for the owner's review).

Challenges need someone who acts for a Team: who posts, proposes, confirms and names a squad. ADR-0038 said a football Team "has a creator and no captain role", and the padel-teams spec (rule 25) kept a Team's home members-only. The Challenge detail shows the opposing Team's record, Roster and Levels to whoever opens it, so neither rule can stand as written.

## Decision

- **Captain is the product name for `teams.created_by`.** No captain column, no role table, no transfer door. The creator rules that exist today (the creator dissolves, others leave) are the Captain rules.
- **Who acts for a Team.** On a football Team, the Captain and the Organizers (creator and Appointed Organizers) of the Group the Team is tagged to. On a padel Team, both members, as either may dissolve today. `packages/api/src/teams/acts-for-team.ts` holds the rule (`userActsForTeam`, and `actingUserIds` for Notification audiences); `teams.byId` returns `viewerActsForTeam` from it. Acting covers the Challenge doors only: the Roster (invites, adds, dissolve) stays the Captain's.
- **A Group tag does not own the Team.** `teams.group_id` is a nullable reference to one Group of the same sport, `on delete set null`, and the Group delete door clears it too. Set at create or later with `teams.setGroupTag` by the Captain or an Organizer of the target Group, and only to a Group the Captain is a member of (owner, 2026-11-08); cleared by the Captain or an Organizer of the tagged Group; moving the tag to another Group needs both. The tag shows on the Team detail ("Gooz of Arad's team") and lists the Team on the Group page (`groups.byId.teams`). The Group gains no ownership, cascade or counters, and the Team's record and Rivals stay the Team's. This amends the glossary's "a Team belongs to no Group".
- **A Team's detail is readable by any signed-in User.** `teams.byId` no longer refuses non-members: name, sport, record, form, Rivals, Roster with Levels and the Team's Games are public to signed-in Users. Invites, leave and dissolve stay member-only. This supersedes rule 25 of `.scratch/padel-teams/spec.md`.

**Considered options**: a `captain_user_id` column (a second permission model and a transfer door for no product need); keeping the Team home private and showing a reduced card on Challenges (two readers of the same Team that drift apart); a Group-owned Team (the mockup's "Teams are yours, not a group's" rules it out, and dissolving or deleting would have to cascade).

## Consequences

- ADR-0038's "no captain role" is amended: the role exists, and it is the creator.
- Copy says Captain, not Creator.
- A Group Organizer who is not on a Team may tag it to their Group and then act for it on Challenge doors, but only when the Captain is a member of that Group. Anyone can make a Group and become its Organizer, so without that rule a stranger could tag any untagged football Team and act for it. `teams.create`, `teams.setGroupTag` and the tag options in `teams.byId` hold the rule; a Captain who later leaves the Group does not clear an existing tag.
- A Team record, Rivals and head-to-head are derived on read in `packages/api/src/teams/team-record.ts`, shared by every reader of a Team.
