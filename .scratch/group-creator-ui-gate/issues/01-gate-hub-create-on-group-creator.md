Spec: `.scratch/group-creator-ui-gate/spec.md`

Linear: [TEM-89](https://linear.app/temba-app/issue/TEM-89/gate-hub-create-community-create-group-and-create-game-on-clerk)

# 01: Gate hub Create Community, Create Group, and Create Game on Clerk `groupCreator`

**What to build:** Any authenticated User can still browse Home, Games, Groups, and Communities, and can still create a Team. Create Community, Create Group (Loose Group from the Groups hub), and Create Game (Home, Games hub, and the three `/new` create pages) are visible only when Clerk `publicMetadata.groupCreator` is `true`. A User without that flag who types a create URL sees a staff empty state, not a form. Grant stays in the Clerk dashboard. The App never shows the string `groupCreator`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Clerk `UserPublicMetadata` includes optional `groupCreator?: boolean`. Create UI treats only `publicMetadata.groupCreator === true` as allowed; absent, `false`, or any other value hides create.
- [ ] Operator (`publicMetadata.operator`) is unchanged and does not grant these create controls. A User with only Operator still has hub create hidden. A User with only `groupCreator` still has hub create (and still has no Venues nav from this ticket).
- [ ] A client gate in the OperatorGate shape (not a reuse of OperatorGate) wraps `/dashboard/games/new` (with or without `groupId`), `/dashboard/groups/new`, and `/dashboard/communities/new`.
- [ ] Those `/new` routes show a skeleton until Clerk is loaded, then either the existing create form (flag is `true`) or the denied empty state. A create form never appears before metadata is known.
- [ ] Denied `/new` shell title is the parent list: Games, Groups, or Communities — not “Create Game”, “Create Group”, or “Create Community”.
- [ ] Denied empty title is `Creating is limited`. Denied description is `New Communities, Groups, and Games are set up by Temba staff.`
- [ ] Denied `/dashboard/games/new` has Back to Games. Denied `/dashboard/groups/new` has Back to Groups. Denied `/dashboard/communities/new` has Back to Communities. Not Back to Home.
- [ ] Home and the Games hub show Create Game only when the flag is `true`. While Clerk is loading, those buttons stay hidden (no flash for a User without the flag).
- [ ] Groups hub header and Groups empty state show Create Group only when the flag is `true`. Groups empty title and description stay “No Groups yet” and “Groups are where you play and where your Standing lives.”
- [ ] Communities hub header and Communities empty state show Create Community only when the flag is `true`. Communities empty description is `Communities organise Club Groups around a Venue.` for every User (flagged Users still get the button, not a second sentence).
- [ ] Games hub empty copy is unchanged (still no create CTA there). Home empty still goes to Groups, not to create.
- [ ] Create Team and `/dashboard/teams/new` stay as they are for every authenticated User.
- [ ] No You-page line, badge, sidebar item, or in-App grant/revoke for this flag. The App never displays `groupCreator`.
- [ ] `communities.create`, `groups.createLoosePublic`, `groups.createLoosePrivate`, and `games.create` are not modified. Route-loading titles may stay pathname-based. No CONTEXT.md or ADR edits.
- [ ] Manual check from the spec: User without the flag vs User with the flag on Home, Games hub, Groups hub, Communities hub, and the three `/new` routes, including denied copy and no create flash while Clerk loads.
