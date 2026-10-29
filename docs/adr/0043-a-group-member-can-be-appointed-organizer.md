# A Group member can be an Appointed Organizer

**Status:** accepted.

Organizers of a Group's Games were derived only from the Group creator and, on a Club Group, Community Owner and Admin. A Group with one creator had one person able to create Games, cancel them and seat players. Group approvers now appoint other members as Organizers.

## Decision

- **The role lives on the membership.** `group_members.role` is a `group_member_role` enum, `member` or `organizer`, default `member`. Leaving the Group deletes the row and the role with it.
- **An Appointed Organizer runs Games only.** They are an Organizer for every check that reads `isGameOrganizer` and `mayCreateGameOnGroup`, and they join the Game admins audience. They are not a Group approver.
- **Group approvers grant and revoke** through `groups.setOrganizer`. The Group creator and Community Owner and Admin are Organizers by role and are refused, and so are Unclaimed players, who cannot sign in.
- **On a Club Group it lapses** while the player is not a Community Member, the same way the Group creator stops being a Group approver. The row keeps `organizer`, so rejoining the Community restores it.
- **Soft-archive is unchanged.** Appointed Organizers are refused exactly where other Organizers are: no new Games, and no change of Organizers while the Community is archived.

**Considered Options**: a separate `group_organizers` table (a second row per person to keep in step with membership on leave, kick and the Unclaimed merge); making Appointed Organizers Group approvers too (wider than asked, and it would let them appoint each other).

## Consequences

- Every place that listed a viewer's organized Groups by `groups.created_by` and Community staff also reads the appointment: the Game create picker and the home carousel.
- `groups.byId` adds `isAppointedOrganizer` per Standing row and `canAppointOrganizers` for the viewer. Both are additive.
- There is no Notification for being appointed yet.
