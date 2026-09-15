Status: ready-for-agent

## Problem Statement

V1 already hides Create Community, Create Group, and Create Game unless Clerk `publicMetadata.groupCreator === true`. The Communities destination itself — rail, bottom nav, and the `/dashboard/communities` list — still shows to every authenticated User, including people the product treats as customers. Those Users should not see a Communities tab or that list. Community home, Club Groups, membership, and join doors must keep working.

## Solution

Hide the Communities destination behind the existing Clerk flag `publicMetadata.groupCreator === true`. Absent or any value other than `true` omits Communities from primary nav and refuses the typed list URL with an Operator-style lock empty state and Back to Home. Membership does not restore the tab.

Community home, joined Club Groups on Groups, Open {Community}, Invite link, Lookup invite, and Community Public request-to-join stay as they are. Owner, Admin, and Member stay DB Community roles. Operator stays Venues. The App never displays `groupCreator`. Grant and revoke stay in the Clerk dashboard.

This slice is a client hide, matching the existing create gate. Approving this spec approves the Test seams in Testing Decisions. No glossary edit and no ADR.

## User Stories

1. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want no Communities item in the desktop rail, so that the Communities list is not a customer destination.

2. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want no Communities item in the bottom nav, so that phone chrome matches the rail.

3. As a User who is Owner, Admin, or Member of a Community and whose Clerk `publicMetadata.groupCreator` is not `true`, I want Communities still absent from nav, so that membership does not restore the tab.

4. As a User whose Clerk `publicMetadata.groupCreator` is `true`, I want a Communities item in the rail that opens the Communities list, so that flagged Users still have that destination.

5. As a User whose Clerk `publicMetadata.groupCreator` is `true`, I want a Communities item in the bottom nav that opens the Communities list, so that phone chrome matches the rail.

6. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want primary nav to be Home, Games, Groups, and You only, so that hiding Communities does not invent a fifth replacement destination.

7. As a User whose Clerk `publicMetadata.groupCreator` is `true`, I want primary nav to keep Home, Games, Groups, Communities, and You, so that flagged Users still have both Groups and Communities as two destinations.

8. As an Operator whose Clerk `publicMetadata.groupCreator` is not `true`, I want Communities still hidden from nav, so that Operator does not imply the Communities list.

9. As a User whose Clerk `publicMetadata.groupCreator` is `true` and who is not an Operator, I want the Communities list and still no Venues in primary nav, so that the two Clerk flags stay independent.

10. As a User who is both Operator and flagged, I want both Venues tools and the Communities destination, so that one Clerk User may wear both hats.

11. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want `/dashboard/communities` to show a lock empty state rather than my membership list, so that typing the URL is not a list door.

12. As a User opening that denied list URL, I want a skeleton until Clerk is loaded, so that the membership list never flashes before metadata is known.

13. As a User opening that denied list URL, I want the shell title to remain Communities (the destination name), so that the page matches OperatorGate’s use of Venues as the destination title rather than looking like “No Communities yet.”

14. As a User opening that denied list URL, I want an empty state titled “Communities list is limited” with description “This list is set up by Temba staff.”, so that the App explains the limit without naming the flag or Operator and without using create-denied copy.

15. As a User opening that denied list URL, I want a Back to Home action, so that I land on a destination I can already open.

16. As a User opening that denied list URL, I want no Create Community control and no “No Communities yet” empty state, so that a lock page is not a create door and not an empty membership list.

17. As a User whose Clerk `publicMetadata.groupCreator` is `true`, I want `/dashboard/communities` to keep listing Communities I belong to with every Club Group nested, so that the flagged hub is unchanged.

18. As a User whose Clerk `publicMetadata.groupCreator` is `true` and who belongs to no Communities, I want the existing empty hub (including Create Community), so that flagged empty copy stays.

19. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want `/dashboard/communities/[id]` to keep opening Community home, so that a club URL is not the staff list.

20. As an Owner or Admin without the flag, I want Community home staff actions other than Create Club Group to stay (invites, Soft-archive, Venue link, roles, admit), so that hiding the list does not strip Community manage.

21. As a Member who is not Owner or Admin and who lacks the flag, I want Community home to stay readable (Venue when linked, Groups, leave rules), so that membership is not revoked.

22. As a User who is not a member, I want a live Community Public URL to still offer request-to-join, so that hiding the list does not close that door.

23. As a User on Groups, I want joined Club Groups to stay on that list with Community name in the row meta, so that hiding the Communities destination does not hide Club Groups.

24. As a User on Club Group home whose Clerk `publicMetadata.groupCreator` is not `true`, I want Open {Community} to still go to that Community home, so that the parent club remains reachable.

25. As a User on Club Group home whose Clerk `publicMetadata.groupCreator` is not `true`, I want no All Communities overflow item, so that Group home does not send me to a staff-only list.

26. As a User on Club Group home whose Clerk `publicMetadata.groupCreator` is `true`, I want All Communities to keep opening the Communities list, so that flagged Users still have the list from Group home.

27. As a User on Community home whose Clerk `publicMetadata.groupCreator` is not `true`, I want no All Communities action, so that Community home does not send me to a staff-only list.

28. As a User on Community home whose Clerk `publicMetadata.groupCreator` is `true`, I want All Communities to keep opening the Communities list.

29. As a User on Community home whose Clerk `publicMetadata.groupCreator` is not `true`, I want the mobile back control to go to Home, not the Communities list, so that the top-bar back is not a list leak.

30. As a User on Community home whose Clerk `publicMetadata.groupCreator` is `true`, I want the mobile back control to keep going to the Communities list.

31. As a User who accepts a Community Invite link, I want to land on that Community home, so that join still has a destination that customers may open.

32. As a User who accepts a Community Lookup invite on Invites, I want that flow unchanged, so that Invites is not tied to the Communities tab.

33. As a Team member who may request a Community link, I want the existing picker of Communities I belong to to stay, so that hiding the hub does not block Team→Community link.

34. As a User on a linked Team home, I want the Community name to still open that Community home, so that Team chrome is not the staff list.

35. As a User whose Clerk `publicMetadata.groupCreator` is not `true`, I want `/dashboard/communities/new` to keep the create-denied empty state (“Creating is limited”) but with Back to Home, so that Back to Communities is not a second lock page.

36. As a User whose Clerk `publicMetadata.groupCreator` is `true`, I want `/dashboard/communities/new` to keep the create form, and Cancel to keep returning to the Communities list.

37. As a User denied on `/dashboard/groups/new` or `/dashboard/games/new`, I want those Back to Groups / Back to Games actions unchanged, so that this slice only retargets Community create deny.

38. As an Owner or Admin of a live Community, I want Create Club Group to stay hidden unless the flag is `true` and `canCreateClubGroup` is already true, so that this slice does not reopen the create AND.

39. As a User, I want no You-page line, badge, or in-App grant for the flag, so that Communities appearing in nav for flagged Users is the only new App signal.

40. As a User, I want the App never to show the string `groupCreator`, so that the Clerk key is not product copy.

41. As a Temba staff person in the Clerk dashboard, I want granting `publicMetadata.groupCreator` to `true` to reveal the Communities destination, so that bootstrap matches create access.

42. As a Temba staff person in the Clerk dashboard, I want removing that key or setting it to anything other than `true` to hide the destination again.

43. As a User, I want no in-App control that grants or revokes this flag, so that this slice does not add a grant product.

44. As a caller of `communities.mine`, I want the procedure to stay a protected membership read, so that Team link pick and cache invalidation keep working and a crafted client can still read seats.

45. As a caller of `communities.byId`, `communities.create`, join, and Invite procedures, I want those doors unchanged, so that hiding the list does not add `requireGroupCreator` middleware.

46. As a User whose Clerk session is still loading, I want Communities hidden from nav, so that the tab never flashes and then vanishes for a User without the flag.

47. As a User who deletes an empty Club Group, I want to still land on that Community home, so that delete is not sent to the staff list.

48. As a Member of a Soft-archived Community without the flag, I want to still open that Community home, so that archive history rules do not change.

49. As a reader of CONTEXT.md, I want no new glossary term for this flag, so that it does not collide with **Group creator**.

50. As a reader of `docs/adr/`, I want no new ADR for this slice, so that a reversible UI hide is recorded in this spec only.

51. As a User on Home or You, I want those pages unchanged (still no Communities row), so that this slice does not invent Home/You chrome.

52. As a User on Groups, I want Create Group visibility unchanged (still the create flag), so that this slice only hides the Communities destination.

## Implementation Decisions

- Source of truth remains Clerk session `publicMetadata.groupCreator === true`. Absent, `false`, or any other value hides the Communities destination. Same read as today’s create access. No User column. No env allow-list. No new Clerk key. Do not reuse Operator.

- Operator and this flag stay independent. Neither implies the other.

- Grant and revoke only in the Clerk dashboard. No in-App grant, revoke, or audit UI. Do not put `groupCreator` in App copy, empty states, denied pages, You, nav labels, or badges.

- Do not add a glossary entry and do not add an ADR. **Group creator** in CONTEXT.md remains the User who created a Group.

- Client-only gate, matching the create hide. No `requireGroupCreator`, no tRPC middleware, no change to Community procedures. Crafted clients can still call `communities.mine`, `communities.byId`, create, join, and Invite doors as they do today.

- Do not refuse `communities.mine` on the server. The Communities hub is not its only caller: Team home still loads that membership list to pick a Community for a Team link request. Hiding the hub must not break that picker.

- Do not wrap Community home or Create Community in a parent layout that also gates the list. Operator Venues may wrap a whole destination; Communities must not, because `[id]` stays open to customers.

- Primary nav visibility: the helper that returns rail and bottom-nav items omits Communities unless the flag is `true`. While Clerk is not loaded, treat as hidden (Venues / create-button pattern: no flash for a User without the flag). Flagged Users may see Communities appear after load.

- Bottom nav shows only the visible items. Four items without the flag; five with it. Do not add a replacement fifth destination. Layout follows the visible count so an empty slot is not left behind.

- If the unused legacy sidebar that always listed Communities is still in the tree, gate Communities there the same way it already gates Venues. Do not revive that sidebar as live chrome.

- Typed `/dashboard/communities` (the list only): OperatorGate shape, not a reuse of OperatorGate (Operator copy is Venue-specific) and not the create-denied copy. Wait until Clerk `isLoaded`; skeleton in the dashboard shell; then either the existing membership list or the lock empty state. Never paint the membership list until `isLoaded` and the flag is `true`.

  - Shell title: `Communities` (destination name, like Venues on OperatorGate).
  - Empty title: `Communities list is limited`
  - Empty description: `This list is set up by Temba staff.`
  - Action: Back to Home. Lock-style empty presentation like OperatorGate is fine.
  - No Create Community on the denied page.

- Create Community `/new` denied empty state keeps title `Creating is limited` and description `New Communities, Groups, and Games are set up by Temba staff.` Change only the action to Back to Home (not Back to Communities). Games and Groups `/new` deny actions stay Back to those lists. Flagged Users still see the create form; Cancel on that form still returns to the Communities list.

- Club Group home overflow: Open {Community} stays for everyone on a Club Group. All Communities is included only when the flag is `true`. Extend the existing overflow helper with that boolean; do not invent a second Clerk read.

- Community home overflow: All Communities only when the flag is `true`. Other staff and leave actions unchanged.

- Community home mobile back: Home when the flag is not `true`; the Communities list when it is. Do not send unflagged Users from `[id]` to the list.

- Invite accept, Lookup invite, request-to-join, Team Community link, and delete-empty-Club-Group landing on Community home stay. Do not retarget those to the list or to Groups.

- Home and You stay unchanged. Unused `communitiesCount` on the Home payload stays unused; do not delete it in this slice.

- Route-loading titles may remain pathname-based, including Communities and Create Community, matching Create Venue behind OperatorGate.

- Reuse the existing client create-access read for nav, list gate, overflow, and mobile back. Do not add a parallel `communityHub` metadata key or a second “is staff” helper that re-reads Clerk differently.

- Create Club Group UI, Group Game create UI, Create Team, Directory, Soft-archive rules, and Venue/Operator behavior are unchanged except the leftover All Communities / list back links above.

## Testing Decisions

### What a good test is

Assert user-visible behaviour: Communities present or absent in the nav item list, typed list shows membership tree vs lock copy, All Communities present or absent in overflow, Open {Community} still listed, no flash of the membership list before Clerk is loaded. Do not assert Clerk dashboard grant, tRPC procedure bodies, CSS grid class names, or that a function “lives in its own file.”

### Test seams

Highest seam (one): a User whose Clerk `publicMetadata.groupCreator` is not `true` cannot open the Communities destination (no nav item; typed list is a staff lock with Back to Home) and is not offered All Communities, while Community home, Club Groups on Groups, Open {Community}, join doors, and Team link pick stay; a User whose flag is `true` still has the nested Communities list as today.

If you implement this spec, you implement these seams:

- Nav omits Communities unless the flag is `true`; membership does not restore it; Operator does not restore it
- Without the flag, primary destinations are Home, Games, Groups, You (four), with no replacement item
- With the flag, Groups and Communities remain two destinations
- Typed list URL: skeleton until Clerk loaded; then lock empty copy and Back to Home; membership list never flashes; no Create Community on the lock page
- Flagged typed list URL still shows `communities.mine` nested Club Groups and existing empty/create
- Community home `[id]` still opens without the flag; request-to-join, invites, and staff manage other than Create Club Group stay
- Group home: Open {Community} stays; All Communities only with the flag
- Community home: All Communities only with the flag; mobile back is Home without the flag and the list with it
- `/dashboard/communities/new` deny backs to Home; flagged Cancel still goes to the list
- Team link picker still lists Communities the User belongs to
- Invite accept still lands on Community home
- Procedures unchanged; no `requireGroupCreator`

### Modules under that seam

Primary nav visibility, Communities list page gate (not Community home), Group home and Community home “All Communities” actions, Community create deny back target, Community home mobile back — only as they affect the flows above. No schema change. No new tRPC procedure.

### Prior art

- Overflow CTAs: existing unit tests for Group home overflow items. Extend those tests so All Communities depends on the same boolean as create access, and Open {Community} does not.
- Nav items: if visibility is a pure function of the flag, add unit tests for omit vs include. Do not stand up a Clerk component harness for the rail.
- OperatorGate, Venues, and CreateAccessGate remain without a component harness. Do not add one for the list lock. Manual check covers Clerk loading flash and the typed list lock page.

Manual check, as a User without the flag and as a User with the flag:

- Rail and bottom nav
- Typed `/dashboard/communities` (lock vs list; no list flash while Clerk loads)
- Typed `/dashboard/communities/[id]` as member and as non-member Public request-to-join
- Typed `/dashboard/communities/new` (deny Back to Home vs form + Cancel to list)
- Group home Open {Community} / All Communities
- Community home All Communities and mobile back
- Groups hub still shows joined Club Groups
- Team link picker still lists memberships
- Invite accept lands on Community home
- Operator without the flag: no Communities nav
- Flagged non-Operator: Communities nav, Venues still not in primary nav
- Create Club Group still AND with Owner/Admin

Approving this spec approves that unit tests for nav visibility and Group home overflow, plus that manual pass, as sufficient for V1.

## Out of Scope

- Server enforcement of `groupCreator` on any tRPC procedure
- Hiding Community home, Club Groups, or Community name on Group rows
- Closing Invite link, Lookup invite, or Community Public request-to-join
- Replacing Owner/Admin/Member with a Clerk role
- A new Clerk boolean, or using Operator for this destination
- In-App grant or revoke
- Directory
- Changing Create Club Group, Create Group, or Create Game beyond leftover Back to Communities on Community create deny
- Changing Operator, Venues, or `operatorProcedure`
- Deleting unused `communitiesCount` on Home
- CONTEXT.md or ADR edits
- A Clerk component/e2e harness
- Showing the Clerk key in the App
- Renaming the Clerk key
- Collapsing Groups and Communities into one tab

## Further Notes

- “Group creator” in product language remains the User who created a Group. Implementers must not name UI copy “Group creator” for this flag. The metadata key `groupCreator` is Clerk-only and already used for create access.

- This spec is a delta on `.scratch/groups-communities-nav/spec.md` (two destinations) and `.scratch/group-creator-ui-gate/spec.md` (create hide, browse still open). Flagged Users still have Groups and Communities as two destinations. Unflagged Users keep Groups and lose only the Communities destination. It does not reopen Directory or ADR-0004.

- UI hide is a V1 speed choice, same as the create gate. Adding server checks later is a new spec. Do not “secure” `communities.mine` in this slice; Team link depends on it.

- Redesign’s five-slot nav still applies when the flag is true. When it is false the Communities slot is omitted, not replaced.

Tickets (labelled `ready-for-agent`):

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-220 Gate Communities nav and typed list on Clerk groupCreator](https://linear.app/temba-app/issue/TEM-220/gate-communities-nav-and-typed-list-on-clerk-groupcreator) | — |
| 2 | [TEM-221 Hide All Communities and retarget Community list back-links without the flag](https://linear.app/temba-app/issue/TEM-221/hide-all-communities-and-retarget-community-list-back-links-without) | TEM-220 |

Do not implement until an implementer is asked to run them. Work the frontier: **TEM-220** only.

## Comments

Round 1 (all recommended answers accepted):

- Hide destination only (nav + `/dashboard/communities` list). Community home, Club Groups, and membership stay.
- Reuse Clerk `publicMetadata.groupCreator`. Not Operator. Not a new boolean.
- Existing Owner/Admin/Member seats keep Community home and Club Groups. Hide All Communities without the flag. Open {Community} still goes to that Community home.
- Invite link, Lookup invite, and Community Public request-to-join stay as today.
- Communities nav is strictly the Clerk flag. Membership does not restore the tab.
