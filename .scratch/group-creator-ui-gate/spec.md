Status: ready-for-agent

## Problem Statement

V1 of the App lets any authenticated User open Create Community, Create Group, and Create Game. Those actions should be limited to a small set of Users. The product still wants join, browse, Team create, and existing Owner/Admin and Group-organizer rules to work as they do today. Server create procedures stay callable; this slice is a UI hide only.

## Solution

Gate those create actions behind Clerk `publicMetadata.groupCreator === true`. Absent or any value other than `true` hides them. The flag is independent of Operator (`publicMetadata.operator`). It is not a Community role, not Operator, and not the glossary term **Group creator** (the User who created a Group).

The App never displays the string `groupCreator`. Grant and revoke happen only in the Clerk dashboard. No in-App grant UI, You-page line, badge, or nav item.

Hide Create Community, Create Group (Loose Group on the Groups hub and Club Group on Community home), and Create Game (Home, Games hub, Group home). Existing `canCreateClubGroup` and `canCreateGame` stay; the UI requires the flag **and** those values. Do not widen who can create a Club Group or a Group Game.

Typed create URLs (`/dashboard/games/new`, `/dashboard/groups/new`, `/dashboard/communities/new`) use a client empty-state gate in the OperatorGate shape: wait until Clerk is loaded, skeleton, then empty state or the form. Not a server 403. Not a silent redirect.

Approving this spec approves the Test seams in Testing Decisions. No glossary edit and no ADR in this slice.

## User Stories

1. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want no Create Game control on Home, so that I cannot start a groupless Game from the dashboard.

2. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want no Create Game control on the Games hub, so that the Games list is browse-only for me.

3. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want no Create Group control in the Groups hub header, so that I cannot start a Loose Group from that page.

4. As a User whose Clerk `publicMetadata.groupCreator` is not `true` and who is in no Groups, I want the Groups empty state with no Create Group button, so that empty does not offer create.

5. As a User whose Clerk `publicMetadata.groupCreator` is not `true` and who is in no Groups, I want Groups empty copy to stay “No Groups yet” and “Groups are where you play and where your Standing lives.”, so that the page still explains Groups without telling me to create one.

6. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want no Create Community control in the Communities hub header, so that I cannot start a Community from that page.

7. As a User whose Clerk `publicMetadata.groupCreator` is not `true` and who belongs to no Communities, I want the Communities empty state with no Create Community button, so that empty does not offer create.

8. As a User on the Communities empty state, I want the description “Communities organise Club Groups around a Venue.” whether or not I have the flag, so that copy does not instruct create and flagged Users still get a button rather than a second sentence.

9. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want the Games hub empty state unchanged (no create CTA today), so that this slice does not invent a Games empty button.

10. As a User whose Home is empty, I want the existing empty action to Groups (not Create Game or Create Group), so that Home empty stays a join/browse door.

11. As a User whose Clerk `publicMetadata.groupCreator` is `true`, I want Create Game on Home and on the Games hub, so that I can open groupless Game create from those headers.

12. As a User whose Clerk `publicMetadata.groupCreator` is `true`, I want Create Group on the Groups hub header and empty state, so that I can open Loose Group create.

13. As a User whose Clerk `publicMetadata.groupCreator` is `true`, I want Create Community on the Communities hub header and empty state, so that I can open Community create.

14. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want `/dashboard/games/new` (with or without `groupId`) to show no create form, so that a typed URL is not a create door.

15. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want `/dashboard/groups/new` to show no create form, so that Loose Group create is not available by URL.

16. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want `/dashboard/communities/new` to show no create form, so that Community create is not available by URL.

17. As a User opening a denied create URL, I want the shell title to be the parent list (Games, Groups, or Communities), so that the page is not titled Create Game, Create Group, or Create Community.

18. As a User opening a denied create URL, I want an empty state titled “Creating is limited” with description “New Communities, Groups, and Games are set up by Temba staff.”, so that the App explains the limit without naming the flag or Operator.

19. As a User denied on `/dashboard/games/new`, I want a Back to Games action, so that I land on a list I can already open.

20. As a User denied on `/dashboard/groups/new`, I want a Back to Groups action, so that I land on the Groups hub.

21. As a User denied on `/dashboard/communities/new`, I want a Back to Communities action, so that I land on the Communities hub.

22. As a User whose Clerk `publicMetadata.groupCreator` is `true`, I want those three `/new` routes to show the existing create forms after Clerk has loaded, so that flagged Users still create from the App.

23. As any User opening a `/new` create route, I want a skeleton until Clerk `isLoaded`, so that a create form never flashes before metadata is known.

24. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want Create Game, Create Group, and Create Community buttons to stay hidden while Clerk is loading, so that I never see a create control flash and then vanish.

25. As an Owner or Admin of a live Community whose Clerk `publicMetadata.groupCreator` is not `true`, I want no Create Club Group control on Community home (actions card, Groups tab header, Groups tab empty state, and the create dialog), so that Community staff without the flag cannot start a Club Group from the App.

26. As an Owner or Admin of a live Community whose Clerk `publicMetadata.groupCreator` is `true`, I want Create Club Group where `canCreateClubGroup` is already true, so that flagged staff still create Club Groups from Community home.

27. As a Member who is not Owner or Admin, I want Create Club Group to stay hidden even if my Clerk `publicMetadata.groupCreator` is `true`, so that the flag does not widen Club Group create beyond Owner and Admin.

28. As an Owner or Admin of a Soft-archived Community, I want Create Club Group to stay hidden (existing `canCreateClubGroup` is false), so that archive plus the flag still does not offer create.

29. As an Owner or Admin without the flag, I want invites, Soft-archive, Venue link, and other staff actions to stay as they are, so that hiding Create Club Group does not strip the rest of Community staff UI.

30. As a Group creator, or an Owner or Admin on a Club Group, whose Clerk `publicMetadata.groupCreator` is not `true`, I want no Create Game control on Group home (header menu and actions card), so that organizers without the flag cannot start a Group Game from the App.

31. As a Group creator, or an Owner or Admin on a Club Group, whose Clerk `publicMetadata.groupCreator` is `true`, I want Create Game on Group home where `canCreateGame` is already true, so that flagged organizers still create Group Games.

32. As a Group member who is not an organizer, I want Create Game on Group home to stay hidden even if my Clerk `publicMetadata.groupCreator` is `true`, so that the flag does not widen Group Game create.

33. As a User whose Clerk `publicMetadata.groupCreator` is `true` who types `/dashboard/games/new?groupId=…` without being an organizer of that Group, I want the create form to still appear after the flag check, so that this slice does not add a new organizer UI check on the create page; the existing create procedure still refuses the write.

34. As an Operator whose Clerk `publicMetadata.groupCreator` is not `true`, I want all Community, Group, and Game create controls hidden, so that Operator does not imply create access.

35. As a User whose Clerk `publicMetadata.groupCreator` is `true` and who is not an Operator, I want those create controls (subject to Owner/Admin and organizer AND) and no Venues nav, so that the two flags stay independent.

36. As a User who is both Operator and flagged, I want both Venues tools and the create controls, so that one Clerk User may wear both hats.

37. As any authenticated User, I want Create Team on the Teams hub to stay visible, so that Team create is not part of this gate.

38. As any authenticated User, I want `/dashboard/teams/new` to keep working as it does today, so that a typed Team create URL is unchanged.

39. As a User without the flag, I want Groups, Communities, Games, Home, You, Invites, and sidebar items other than Venues to stay reachable, so that hiding create does not hide browse or join.

40. As a User, I want no You-page line, badge, or sidebar item for the flag, so that create buttons appearing are the only App signal.

41. As a User, I want the App never to show the string `groupCreator`, so that the Clerk key is not product copy.

42. As a Temba staff person in the Clerk dashboard, I want to grant create access by setting `publicMetadata.groupCreator` to `true`, so that bootstrap matches Operator.

43. As a Temba staff person in the Clerk dashboard, I want to revoke create access by removing that key or setting it to anything other than `true`, so that the App hides create again.

44. As a User, I want no in-App control that grants or revokes this flag on myself or others, so that this slice does not add a grant product.

45. As a caller of `communities.create`, I want the procedure to stay a protected create with today’s input, so that a crafted client can still create a Community.

46. As a caller of `groups.createLoosePublic` and `groups.createLoosePrivate`, I want those procedures unchanged, so that Loose Group create stays an API.

47. As a caller of `groups.createClubPublic` and `groups.createClubPrivate`, I want those procedures unchanged, including existing Owner/Admin enforcement, so that Club Group create is not rewritten.

48. As a caller of `games.create`, I want the procedure unchanged, including existing organizer checks when `groupId` is set, so that Game create is not rewritten.

49. As a developer, I want `canCreateClubGroup` and `canCreateGame` payloads unchanged, so that the UI overlay does not pretend the server grew a `groupCreator` field.

50. As a User navigating to a create URL, I want route-loading titles to stay pathname-based (including “Create Game”, “Create Group”, “Create Community”), so that loading matches Create Venue behind OperatorGate.

51. As a reader of CONTEXT.md, I want no new glossary term for this flag, so that it does not collide with **Group creator**.

52. As a reader of `docs/adr/`, I want no new ADR for this slice, so that a reversible UI hide is recorded in this spec only.

## Implementation Decisions

- Source of truth is Clerk session `publicMetadata.groupCreator === true` (boolean). Absent, `false`, or any other value hides create. Same read style as Operator (`publicMetadata.operator === true`). No User column. No env allow-list of User ids.

- Extend the existing Clerk `UserPublicMetadata` type with optional `groupCreator?: boolean`, next to `operator`.

- Operator and this flag are independent. Neither implies the other. A Clerk User may have neither, either, or both.

- Grant and revoke only in the Clerk dashboard. No in-App grant, revoke, or audit UI.

- Do not put `groupCreator` in App copy, empty states, denied pages, You, sidebar, or badges.

- Do not add a glossary entry and do not add an ADR. The Clerk key lives in this spec and in the metadata type. **Group creator** in CONTEXT.md remains the User who created a Group.

- Client-only gate. No `requireGroupCreator`, no tRPC middleware, no change to create procedures. Crafted clients and existing authenticated sessions can still call create APIs as they do today.

- New client gate in the OperatorGate shape, not a reuse of OperatorGate (OperatorGate copy is Venue-specific: “Operator access only” / Venue and Court curation). Shared denied empty state for the three create `/new` routes:

  - Shell title: parent list — Games, Groups, or Communities — not “Create …”.
  - Empty title: `Creating is limited`
  - Empty description: `New Communities, Groups, and Games are set up by Temba staff.`
  - Action: Back to that parent list (Games, Groups, or Communities), not Back to Home.
  - Lock-style empty presentation like OperatorGate is fine.

- `/new` create pages: if Clerk is not loaded, skeleton in the dashboard shell (parent list title is acceptable). Then either the denied empty state or the existing form. Never paint the form until `isLoaded` and the flag is `true`.

- Hub and detail create CTAs (Home Create Game; Games hub Create Game; Groups header and empty Create Group; Communities header and empty Create Community; Group home Create Game in the header menu and actions card; Community home Create Club Group in the actions card, Groups tab header, Groups tab empty state, and the create dialog): render only when the flag is `true`. While Clerk is loading, treat as hidden. Do not add header skeletons solely for this flag (sidebar Venues pattern: hide until `=== true`).

- Club Group create UI: flag **and** existing `canCreateClubGroup`. Do not show Create Club Group, and do not mount the create dialog, unless both are true. Do not change `canCreateClubGroup`.

- Group home Create Game UI: flag **and** existing `canCreateGame`. Do not change `canCreateGame`. Do not add an organizer check to `/dashboard/games/new` beyond the flag gate on the page.

- Hub creates (Community, Loose Group, groupless Game) have no extra role check in the UI beyond the flag. That matches today’s “any authenticated User” forms, now hidden unless flagged.

- Communities empty description for everyone: `Communities organise Club Groups around a Venue.` Create Community button only if flagged. Groups empty title and description unchanged; Create Group button only if flagged. Games public-pickup empty copy unchanged.

- Create Team, Teams hub, and `/dashboard/teams/new` are untouched.

- Sidebar, You, Invites, join, Lookup invite, Invite link, Soft-archive, Venue, and OperatorGate behavior are untouched except that create CTAs listed above become flag-gated.

- Route-loading titles may remain derived from the pathname, including Create Game / Create Group / Create Community, matching Create Venue for non-Operators.

- Prefer one small client helper or gate component that reads `publicMetadata.groupCreator === true` so list headers, empty CTAs, and `/new` pages do not each invent a different check. Inline reads matching the Operator sidebar are acceptable if a shared gate would be a new abstraction with only one call site; the `/new` denied UI is the shared gate’s job.

## Testing Decisions

- Good tests for this slice would only assert user-visible behavior: create controls present or absent, `/new` shows form vs denied empty copy, no flash of a form before Clerk is loaded. They would not assert Clerk dashboard grant, tRPC procedure bodies, or CSS structure.

- Highest existing seam is the same as Operator: Clerk `useUser` / `publicMetadata` on the client, then hide or show UI. There is no server seam because there is no server enforcement.

- Prior art: OperatorGate, Venues nav, and You Operator tools are untested. This Workspace has no component or App test harness for those gates.

- Do not add a test harness in this slice. No new unit, component, or e2e files.

- Manual check is the acceptance pass. Exercise, as a User without the flag and as a User with the flag:

  - Home Create Game
  - Games hub Create Game and `/dashboard/games/new` (plain and with `groupId`)
  - Groups hub header and empty Create Group; `/dashboard/groups/new`
  - Communities hub header and empty Create Community (copy + button); `/dashboard/communities/new`
  - Community home Create Club Group as Owner/Admin with and without the flag, and as a flagged Member who is not Owner or Admin
  - Group home Create Game as organizer with and without the flag, and as a flagged member who is not an organizer
  - Create Team still visible
  - Operator without the flag: Venues yes, create no
  - Flagged non-Operator: create yes (hub), Venues no
  - Denied `/new` copy and back links
  - Clerk loading: no create form or button flash for a non-flagged User

Approving this spec approves that manual pass as sufficient for V1.

## Out of Scope

- Server enforcement of `groupCreator` on any tRPC procedure
- In-App grant or revoke
- Changing Operator, Venues, or `operatorProcedure`
- Create Team
- Join, Lookup invite, Invite link, Directory, Soft-archive rules, Venue link
- Widening Club Group create or Group Game create beyond today’s Owner/Admin and organizer rules
- Organizer UI gate on `/dashboard/games/new` itself
- CONTEXT.md or ADR edits
- A test harness
- Showing the Clerk key in the App
- Renaming the Clerk key

## Further Notes

- “Group creator” in product language remains the User who created a Group (Lookup limits, Game organizers). Implementers must not name UI components or copy “Group creator” for this flag. The metadata key `groupCreator` is Clerk-only.

- UI hide is a V1 speed choice. Adding server checks later is a new spec, not a surprise extension of this one.

- Empty Communities copy is shared so flagged Users do not keep the old “Create a Community to organise…” sentence next to a button.
