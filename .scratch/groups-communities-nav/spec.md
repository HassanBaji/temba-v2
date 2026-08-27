Status: ready-for-agent

## Problem Statement

The Groups section is one hub page. Communities sit in a flat list with no Club Groups nested. Loose Groups sit in a second list. Club Groups the User has joined never appear there. The App calls no-parent Groups “Loose Groups,” and it still offers a Directory of Community Public clubs plus a combined “Groups & Communities” nav item. Players cannot tell Groups they play in from Communities they belong to, and they cannot see a Community’s Club Groups without opening Community home.

## Solution

Split the hub into two sidebar items. **Groups** is a flat list of Groups the User is a member of (Loose Groups and joined Club Groups), with no word “Loose.” **Communities** is the Communities the User belongs to, with every Club Group nested. Delete the hub. Delete the Directory surface (page, Find clubs, join-from-list, list tRPC). Community Public stays request-to-join via the Community URL. Staff still admit. App copy does not claim a live Directory. The glossary keeps **Directory** as a planned list and keeps **Loose Group** as the domain term.

Approving this spec approves the Test seams in Testing Decisions.

## User Stories

1. As an authenticated User, I want a sidebar item **Groups** that opens `/dashboard/groups`, so that squads I play in have their own destination.

2. As an authenticated User, I want a sidebar item **Communities** that opens `/dashboard/communities`, so that clubs I belong to have their own destination.

3. As an authenticated User, I want no combined “Groups & Communities” sidebar item, so that I am not sent to one stacked hub.

4. As an authenticated User, I want the Groups page title to be **Groups**, so that the page matches the sidebar.

5. As an authenticated User, I want the Communities page title to be **Communities**, so that the page is not called “My Communities.”

6. As an authenticated User on the Groups page, I want to see every Group I am a member of (Loose Groups and Club Groups I joined), so that this list is the squads I play in.

7. As a Member of a Community who has not joined a Club Group Public in that Community, I want that Club Group absent from the Groups page, so that unjoined squads are not mixed into “my Groups.”

8. As a Member of a Community who was never invited to a Club Group Private, I want that Club Group absent from the Groups page, so that Private squad names do not appear on my personal Groups list.

9. As a member of a Loose Group, I want that Group on the Groups page, so that Groups with no Community still appear.

10. As a User on the Groups page, I want one flat list, so that I do not hunt under Community headings for squads I play in.

11. As a User looking at a Club Group row on Groups, I want secondary text `Community name · type`, a sport badge, and Soft-archived when that Community is Soft-archived, so that I know which club it belongs to and whether it is history-only.

12. As a User looking at a Loose Group row on Groups, I want secondary text `type` only, plus a sport badge, so that a Group with no Community does not invent a parent.

13. As a User on the Groups page, I want no word “Loose” on headings, empty states, or rows, so that the App says Groups.

14. As a User who is in no Groups, I want an empty Groups list that says I am not in any Groups yet, so that empty copy matches the page.

15. As a User, I want clicking a Groups row to open Group home, so that the row is the door to that squad.

16. As a User on the Communities page, I want every Community I belong to, including Soft-archived ones with the existing Soft-archived badge, so that archive hides from browse later, not from members.

17. As a User on the Communities page, I want every Club Group in each Community nested under that Community (Public and Private, joined or not), so that this page is the club tree, not only membership.

18. As an Owner of a Community with zero Club Groups, I want that Community on the Communities page with an empty nested Groups list, so that an empty club is still visible.

19. As a User, I want clicking a Community parent row to open that Community home, so that the club has a door.

20. As a User, I want the parent row link to wrap only the Community, not its nested Club Groups, so that a nested Group click is not stolen.

21. As a User, I want clicking a nested Club Group row to open Group home, so that a named squad has a door.

22. As a User looking at a nested Club Group I have joined, I want a Joined marker, so that I can tell inventory from membership.

23. As a User looking at a nested Club Group I have not joined, I want no Joined marker, so that Private and unjoined Public squads stay honest.

24. As a User looking at a nested Club Group, I want name, type, and sport, so that nested rows match Community home’s Group facts without staff chrome.

25. As a User on the Communities page, I want no Create Club Group, invites, or Soft-archive controls, so that staff work stays on Community home.

26. As a User who joined a Club Group, I want that Club Group on the Groups page and nested under its Community, so that two views of the same Group are allowed.

27. As a User on the Groups page, I want a **Create Group** button only, so that this page does not create Communities.

28. As an authenticated User using Create Group, I want that flow to still create a Loose Group (no Community parent, no parent picker), so that ADR-0004 stays.

29. As an Owner or Admin, I still want to create a Club Group only on Community home, so that staff still control squads inside the club.

30. As a User on the Communities page, I want a **Create Community** button only, so that this page does not create Groups and does not Find clubs.

31. As a User on Groups or Communities, I want no Find clubs control, so that those lists are not a browse Directory.

32. As a User who cancels Create Community, I want to return to the Communities list, so that cancel lands on the flow’s home.

33. As a User who cancels Create Group, I want to return to the Groups page, so that cancel does not send me to Communities.

34. As a User on Loose Group home, I want a **Groups** control that opens the Groups page, so that a no-parent Group is not sent to a Communities list.

35. As a User on Club Group home, I want **Community** to that Community home and **Communities** to the Communities list, so that club context and the club list both have a back link.

36. As a User on Community home, I want **Communities** to the Communities list, so that I can return to the club tree.

37. As a User on Community home, I want no Directory button, so that Community home does not pretend a browse list exists.

38. As the creator who deletes an empty Loose Group, I want to land on the Groups page, so that delete does not dump me on the create form.

39. As staff who deletes an empty Club Group, I still want to land on that Community home, so that Club Group delete is unchanged.

40. As a User on Home with no upcoming Games, I want the empty-state link to go to Groups and say **Groups**, so that Home does not send me to a removed hub.

41. As a User on Home who is in no Groups, I want the standing empty-state link to go to Groups and say **Groups**, so that standing points at squads, not a combined hub.

42. As a User with an old `/dashboard/hub` bookmark, I want to be redirected to `/dashboard/groups`, so that the hub URL does not 404.

43. As a User who opens `/dashboard/directory`, I want a 404, so that the Directory page is gone, not redirected to a successor browse list.

44. As a User, I want Create Group chrome (title, body, toasts, button) to say Group, not Loose Group, so that create matches the Groups page.

45. As a User on Group home of a Loose Group, I want the kind label and badge to describe a Group outside a Community without the word Loose, so that Group home matches App copy.

46. As a User on Group home of a Club Group, I still want to see that it is a Club Group in that Community, so that dropping “Loose” does not hide the parent.

47. As a User creating a Community Public, I want the type picker to stay Public vs Private, so that the two Community types remain.

48. As a User creating a Community Public, I want copy that it is joinable by request via the Community URL and is not listed in the App today, so that create does not claim a live Directory.

49. As a User creating a Community Private, I want copy that it is invite-only (Email invite and Invite link), so that Private is not defined as “unlisted vs Directory.”

50. As a User on Group create, Group home, Community home Groups blurb, or Soft-archive chrome, I want no string that claims a live Directory, so that leftover copy is not a lie.

51. As a User who has a live Community Public URL and is not a member, I still want to request to join from Community home, so that deleting the list does not delete the join door.

52. As an Owner or Admin of a Community Public, I still want to approve, reject, or ignore join requests on Community home, so that admit stays a Community Public rule.

53. As a User with a pending request, I want that request to stay valid after Directory is removed, so that in-flight requests are not dropped.

54. As a User of a Community Private, I still want Email invite and Invite link on Community home for staff, so that Private admit does not change.

55. As a User, I want Soft-archive to still pause new requests, Email invites, and Invite links, and members to still see the Community and its Club Groups, so that archive rules do not change.

56. As a caller of the App API, I want no Directory list procedure, so that a deleted product has no zombie list endpoint.

57. As a User, I want API error strings, code identifiers, and the glossary term Loose Group to stay, so that Club Group vs Loose Group remains the domain split.

58. As a reader of CONTEXT.md, I want Directory kept as a planned list of live Community Public clubs, not a shipped surface, so that the term is reserved without claiming the App has it.

59. As a reader of CONTEXT.md, I want Community Public defined as request-to-join via Community URL today, and listed when Directory ships, so that type and future browse do not fight.

60. As a Member who is not Owner or Admin, I still cannot create a Club Group, so that staff control is unchanged.

61. As any authenticated User, I still can create a Loose Group from Create Group, so that no-parent Groups remain open to everyone.

62. As a User who leaves a Community, I still lose its Club Groups and keep Loose Groups, so that leave rules are unchanged.

63. As a User on Home, I still want separate Communities and Groups counts that include Club Group and Loose Group memberships, so that overview is unchanged.

## Implementation Decisions

- Sidebar nav is Home, then Groups, then Communities. Remove the combined hub item. Page titles match those labels.

- Add a Groups index route. It lists Groups the User is a member of. Reuse existing dashboard list primitives (rows, badges, empty states). Do not use tabs; this is two pages, not one hub with tabs.

- Keep `/dashboard/communities` as the Communities list. Upgrade it from a flat list to the nested club tree. Do not keep a second Communities list. Community home stays at the existing Community id route.

- Delete the hub page. Redirect the old hub path to the Groups index so bookmarks and leftover Home links do not 404.

- Delete the Directory page. The old Directory path 404s. There is no successor browse list. Remove Find clubs, Community home’s Directory control, and join-from-list.

- Remove the Directory list tRPC procedure and every App caller and cache invalidate for it. Do not leave an unused list endpoint. Do not change `requestJoin`, approve, reject, or Community Public/Private types.

- Groups index needs a read of Groups the User is a member of (Club Group and Loose Group) with Community id, name, and Soft-archive timestamp when the Group is a Club Group. The existing Loose-only mine procedure is insufficient for this page. It may remain unused; it does not have to be renamed.

- Communities list needs nested Club Groups plus Joined on each nested Group. Extend the existing mine-Communities read (or add one companion query used by that page). Do not N× fetch Community home from the client as the product design. Nested Group shape matches Community home’s Group facts (id, name, type, sport, isMember). Parent shape stays (id, name, type, role, sports, archivedAt).

- Create Group still inserts a Loose Group (null Community parent). No parent picker. Club Group create stays on Community home, Owner or Admin only, padel-only App submit unchanged.

- Groups page header: Create Group only. Communities page header: Create Community only. Create Community Cancel goes to the Communities list. Create Group Cancel goes to the Groups index.

- Back links: Loose Group home → Groups; Club Group home keeps Community (that Community home) and Communities (the list); Community home → Communities list (drop Directory). Delete Loose Group lands on Groups index, not create. Delete Club Group still lands on Community home.

- Home empty states that pointed at the hub go to Groups and say Groups. Home overview counts stay.

- User-facing App copy drops “Loose Groups”: lists, empty states, CTAs, Create Group title/body/toasts, Group home kind label/badge for no-parent Groups. Copy may say a Group outside a Community. API errors, procedure names, and CONTEXT.md keep Loose Group vs Club Group.

- Rewrite every User-facing string that claims a live Directory (create Community Public/Private helpers, Group create/home, Community home Groups blurb, Soft-archive “Hidden from the Directory,” and any remaining Find clubs / Directory buttons). Community Public create copy: joinable by request via the Community URL, not listed in the App today. Community Private: Email invite and Invite link only.

- Update root CONTEXT.md with this spec: keep Loose Group; keep Directory as a planned list of live Community Public clubs, not a shipped surface; redefine Community Public as request-to-join via Community URL today (listed when Directory ships); Community Private as invite-only (not “unlisted vs a live Directory”).

- No schema change. No change to join, leave, create, archive, or invite rules except deleting the Directory list surface. ADR-0004 (immutable optional parent) stands. ADR-0005 Soft-archive still pauses new requests/invites and keeps members able to open history; “listing” there means the planned Directory door plus those join rules, not a shipped Directory page. Do not write a new ADR.

- Community spec (`.scratch/community/spec.md`) and padel-only spec still describe Community Public, request-to-join, and admit. This spec is the delta for nav, Groups vs Communities lists, App copy, and removing the Directory surface. Do not rebuild a Directory from older stories. Do not rebuild football pickers.

- Reuse existing UI primitives (dashboard shell, sidebar, badges, buttons, list cards). Nested Communities rows may use the same list visual language as Community home Groups, as row links rather than an Open button.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): an authenticated User can use Groups (membership) and Communities (club tree) as two sidebar destinations, with Club Groups they joined on both when that applies, with no live Directory, while Community Public request-to-join via Community URL and staff admit still work, and Create Group still creates a Loose Group.

If you implement this spec, you implement these seams:

- Sidebar is Home, Groups, Communities; no combined hub item; page titles match
- Groups index lists only Groups the User is a member of (Loose Group + joined Club Group); unjoined Club Group Public and Club Group Private are absent
- Groups list is flat; Club Group row shows Community name, type, sport, Soft-archived when the Community is archived; Loose Group row shows type and sport only, no “Loose”
- Communities list nests all Club Groups (joined or not, Public and Private); empty Community still appears; parent click → Community home; nested click → Group home; Joined only when member; no staff chrome on the list
- Same joined Club Group appears on Groups and nested under its Community
- Groups header Create Group only; Communities header Create Community only; no Find clubs on either
- Create Group still creates a Loose Group; Club Group create still only on Community home for Owner/Admin
- Create Group Cancel → Groups; Create Community Cancel → Communities
- Loose Group home links to Groups; Club Group home keeps Community plus Communities; Community home links to Communities and has no Directory button
- Delete empty Loose Group → Groups index; delete empty Club Group → Community home
- Home empty states → Groups, label Groups
- Old hub URL redirects to Groups; Directory URL 404s
- No Directory list tRPC; request-to-join and admit on Community Public home still work; pending requests stay; Community Private invites unchanged
- User-facing copy has no “Loose Groups” and no live Directory claim; API/glossary still use Loose Group; CONTEXT.md Directory is planned
- Soft-archive still pauses new joins/requests/invites; members still see the Community and joined Club Groups on these lists
- Leave Community still drops Club Groups and keeps Loose Groups
- Home counts still split Communities vs Groups and still count Club + Loose memberships

Manual check: login, Home, Community home staff flows, Group home, invite-accept URLs, Route `/public` still redirects to login.

### Modules under that seam

App dashboard nav, Groups index, Communities list, Group home and Community home chrome/copy, Create Group and Create Community copy and cancel targets, deletion of hub and Directory page, Groups and Communities reads, removal of the Directory list procedure — only as they affect the flows above. DB Package schema is in the seam as must not change.

### Prior art

Community spec and padel-only spec: no runner, one authenticated product seam, manual Clerk and Route `/public` check.

## Out of Scope

- Attaching a Loose Group to a Community, or detaching a Club Group (immutable parent)
- A parent picker on Create Group
- Rebuilding Directory, Directory filters, or listing Groups in a Directory
- Collapsing Community Public and Community Private
- Removing request-to-join or staff admit
- Changing Email invite, Invite link, Soft-archive, leave, or role rules
- Renaming Loose Group in the glossary or in API identifiers
- Retiring the term Directory (it stays as planned)
- Changing Home overview counts
- Padel-only / sport pickers (`.scratch/padel-only-ui/spec.md`)
- Game create or Game display changes
- A new ADR
- CI or a test runner
- Visual redesign beyond these two list pages, nav, copy, and removing hub/Directory
- Linear tickets in this spec (publish tickets only when `/to-tickets` is asked and Linear is connected)

## Further Notes

Glossary: root `CONTEXT.md`. Architecture: docs/adr/0004 (optional Community parent), 0005 (Soft-archive). Directory in ADR-0005 “listing” is the planned Directory door plus join-rule pause/restore; join-rule pause is live now; the Directory page is not.

Community spec Directory stories (browse list of live Community Public) are superseded for the App surface by this spec. Request-to-join, admit, Community types, and Soft-archive pause remain. Padel-only spec Directory sport-badge story is moot while Directory is unshipped; badges stay on Groups, Communities, Community home, Group home, and Home.

Locked decisions (not a further grill): two sidebar items not tabs; Groups = membership; Communities = nested inventory of all Club Groups; duplicate listing intended; Create Group still Loose Group; no Find clubs; delete hub with redirect to Groups; delete Directory page (404) and list tRPC; keep request-to-join and admit; rewrite live Directory copy; keep Loose Group in glossary; keep Directory as planned; new/extended reads allowed; no schema or membership-rule changes except removing the Directory list.

Next step: vertical tickets via `/to-tickets` when Linear is connected. Do not implement until tickets exist and an implementer is asked to run them.
