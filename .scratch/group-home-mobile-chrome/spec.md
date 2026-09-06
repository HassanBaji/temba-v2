Status: ready-for-agent

# Group home mobile chrome

## Problem Statement

Group home already has Standing, Games, and Members, and the real Join Group, Leave, Delete, Create Game, Invite-door, and Soft-archive behaviour. On a phone it still reads as a dashboard: type-badge soup in the header, a four-cell strip that mixes Group Games with the viewer’s sets, Join and overflow competing in the header, tabs without a deep link, thin Game cards, and Members that stamp every row Member.

People opening a Group want the in-phone details chrome from the product mock: collapsed Group name in a sticky top bar, a quiet hero, a viewer record, two honest actions, sticky Standing / Games / Members, and denser rows — without changing who may join, leave, delete, invite, create Games, or admit to Games.

## Solution

Restyle Group home on `/dashboard/groups/[id]` for every Group type (Club Group and Loose Group, Public and Private). Keep every shipped door and rule.

Map mock labels onto glossary terms. **Join game** is a link to Game home, never Game admit from this page, and never a substitute for **Join Group**. Viewer record and Standing stay sets / points / Games played. Invite stays Lookup invite + Invite link (6-hour tokens, `/gr/{code}`). Soft-archive banners and frozen doors stay. Create Game stays behind the group-creator UI gate and `canCreateGame`.

Desktop is one stacked column (same decision as Game details mobile chrome). App bottom nav, Groups hub, and global `MobileTopBar` used by other pages stay.

Tickets (Linear, `ready-for-agent`): [TEM-161](https://linear.app/temba-app/issue/TEM-161/group-home-chrome) Group home chrome → [TEM-162](https://linear.app/temba-app/issue/TEM-162/group-home-standing-and-members-restyle) Standing and Members restyle, [TEM-163](https://linear.app/temba-app/issue/TEM-163/group-home-games-cards-and-join-game-link) Games cards and Join game link, [TEM-164](https://linear.app/temba-app/issue/TEM-164/group-home-invite-sheet-restyle) Invite sheet restyle.

Approving this spec approves the Test seams in Testing Decisions. It **amends** the Group home visual contract in `.scratch/redesign/spec.md` §5.4. It does **not** replace `.scratch/invite-lookup-and-link/spec.md`, `.scratch/group-creator-ui-gate/spec.md`, `.scratch/user-ratings/spec.md`, `.scratch/games-hub-tabs-and-cards/spec.md`, `.scratch/match-history-tab/spec.md`, `.scratch/friendly-only-ui/spec.md`, or `.scratch/game-details-mobile-chrome/spec.md`.

## User Stories

1. As a User opening a Group I belong to, I want Group home to use the new chrome (sticky top bar, hero, record strip, action bar, sticky tabs), so that the page matches the in-phone Group details design.

2. As a User on a small screen, I want a sticky 52px top bar with a 44px Back control that returns to the Groups hub, so that I am not trapped on Group home.

3. As a User on a small screen, I want the Group name absent from that top bar until I scroll past the hero (about 56px), then faded and slid in, so that the hero `h1` is the name until it leaves the viewport.

4. As a User on a small screen after that collapse, I want a hairline under the top bar, so that the bar reads as chrome only once the hero is gone.

5. As a User on a small screen, I want overflow in that top bar (44px), so that secondary Group actions are one tap from the chrome.

6. As a User on a large screen, I want no page-local 52px top bar (the shell rail is enough) and overflow in the hero row, so that desktop does not grow a second mobile nav.

7. As a User, I want the App bottom nav unchanged on Group home, so that Home / Groups / Games stay reachable (this restyle does not copy Game home’s hidden bottom nav).

8. As a User, I want the hero to show the Group monogram (existing EntityMonogram) and the Group name as the page `h1`, so that identity is still one heading.

9. As a User of a Club Group, I want the hero meta line `Sport · N members · Community name` joined with ` · `, so that club parentage is one quiet fact, not a Community card.

10. As a User of a Loose Group, I want that meta line `Sport · N members` with Community omitted entirely, so that we do not invent a club.

11. As a User, I want no Public / Private / Club Group type badges in the hero, so that the mock’s quiet meta is not badge soup.

12. As a User of a Soft-archived Club Group, I want the existing Soft-archive banners to remain above the tabs, so that archive is still visible after badges leave the hero.

13. As a Community Member who is not in this Club Group, I want the existing “cannot join until you are a member of its Community” copy when that case applies, so that join rules stay explained.

14. As a Group member who has played at least one Game on this Group (`membership.totalGamesPlayed` > 0), I want a dark three-cell strip labelled “Your record in this group” with Games, Sets, and Points from my membership counters, so that the strip is my record, not the Group’s Games total and not mock Wins.

15. As a Group member who has not played yet, I want no numeric strip and the muted sentence “Your record appears here after your first game.”, so that zeros are not dressed up as a record.

16. As a User who is not a Group member, I want no record strip, so that we do not invent a standing for someone who has not joined.

17. As a User who `canJoin` (Loose Group Public, or Club Group Public with Community membership, live), I want primary **Join Group** on the action bar using the existing join mutations, so that joining the Group stays the door.

18. As a User who `canJoin`, I want Join game never to take Join Group’s primary slot, so that an open Game does not silently replace Group membership.

19. As a User who `canJoin` and may create Games, I want secondary **Create game**; if I cannot create but may manage Invite doors, secondary **Invite**; otherwise no second button.

20. As a Group member (or a viewer who passes the Game join gate on a public Group Game) when there is a next Open Game I am not already registered or waitlisted on, I want primary **Join game** as a link to that Game home, so that the next session is one tap without mutating occupancy here.

21. As that User when Join game is primary, I want secondary **Create game** if allowed, else **Invite** if allowed, else no second button.

22. As a User with no next Open Game and with create access, I want primary **Create game** linking to existing Group Game create, so that organizing still starts from Group home.

23. As a User with no next Open Game and no create access who may manage Invite doors, I want primary **Invite**, so that inviting is still available.

24. As a User with none of Join Group, Join game, Create game, or Invite, I want no action bar, so that an empty pair of buttons is not shown.

25. As a User without the group-creator UI flag, I want Create game absent from the action bar, overflow, and empty-tab CTAs even if `canCreateGame` is true, so that the UI gate is unchanged.

26. As an organizer without that flag, I want Create game still refused in the App the same way as today’s header menu and aside card.

27. As a Club Group creator who is not Owner or Admin, I want Invite to open Lookup invite only (no Invite-link mint), so that creator mint rules do not change.

28. As an Owner or Admin of a live Club Group, I want Invite to include Lookup invite and Invite-link mint.

29. As a Loose Group creator, I want Invite to include Lookup invite and Invite-link mint.

30. As anyone else, I want Invite absent, so that Invite-door permission does not widen.

31. As a User of a Soft-archived Club Group, I want Join Group, Create game, Invite mint, and Join game absent (join frozen ⇒ registration Closed), with banners still explaining history, so that archive still reads as closed.

32. As a User, I want sticky tabs labelled Standing, Games, and Members, equal flex, with a 2px foreground underline on the active tab, sticking under the 52px nav on small screens.

33. As a User opening Group home with no tab query, I want Standing selected.

34. As a User opening `?tab=games` or `?tab=members`, I want that tab selected, so that deep links work the way Game home already does `?tab=`.

35. As a User switching tabs, I want `replaceState` without scrolling the page, so that Back still leaves Group home.

36. As a User opening `?tab=score` or any unknown value, I want Standing, so that junk queries do not crash.

37. As a User who is not a member, I want Standing to keep “Join to see your standing” (and not list ranked rows), so that non-member Standing is unchanged.

38. As a member when nobody has sets, points, or Games played yet, I want copy “Standings appear once the first result is recorded.” and the member list unranked (`rank` hidden / not shown as #1), so that zeros are not a fake ladder.

39. As a member in that empty-results state who may create Games, I want a quiet Create the first game action on that empty treatment.

40. As a member when any result exists, I want ranked rows in existing compare-standing order (sets won, then points won, then Games played, then name), so that Standing is not reordered by mock wins.

41. As a User scanning a Standing row, I want rank with Trophy / Medal / Award for 1–3 (already shipped), UserAvatar, name, You marker on my row, and subline `N sets · N pts · N Games`.

42. As a User looking at my Standing row, I want `bg-muted` plus a You badge (text, not colour-only), without relying on a brand left bar, so that You stays identifiable after the mock dropped the bar.

43. As a User, I want no All time / This month control, so that we do not invent seasons.

44. As a User, I want no Level on Standing rows, so that platform Rating is not dressed up as Group Standing.

45. As the signed-in User on my Standing or Members row, I want the row to open You; as a User looking at anyone else, I want no fake profile button (no other User profile route).

46. As a User on Games when upcoming and history are both empty, I want EmptyState “No Games yet” with the existing Soft-archive sentence when archived, and Create the first game when create is allowed.

47. As a User on Games when some Games exist, I want Upcoming then History (already shipped), soonest-first and newest-first as today.

48. As a User scanning an upcoming Group Game card, I want date/time lead, Venue · Court when those exist, a registration chip Open / Full / Closed / Cancelled, an avatar stack of seated Users when we have them, and `filled/slots · price each` using existing occupancy and price-per-player formatters.

49. As a User, I want no Confirmed chip meaning occupancy-full or Match `confirmed`, so that Group home matches Game home registration language, not the hub’s occupancy-full “Confirmed”.

50. As a User on a history Game with a completed Match and scored Sets in the Group payload, I want those Set scores on the card; if scores are not in the payload, I want no invented score.

51. As a User activating Join or the card surface, I want Game home to open (`/dashboard/games/{id}`), so that Game admit, Waitlist, seats, and scoring stay on Game home.

52. As a User, I want no seat picker and no occupancy mutation from Group home, so that this tab is not a second Games hub join surface.

53. As a User who may enter Sets, I want scoring to stay on Game home Results, not an inline Complete Match from Group home.

54. As a User of a Soft-archived Club Group, I want the existing Games-tab archive copy to remain on Upcoming / empty.

55. As a User on Members when the list is empty, I want “No members yet”.

56. As a User on Members when there are more than eight members, I want a search field sticky under nav + tabs that filters the already-loaded list by name, so that search does not need a new door.

57. As a User whose member search matches nobody, I want a quiet empty, not the “No members yet” first-load copy.

58. As a User on Members, I want avatar, name, You on my row, and a subline of `N Games` from Games played (not Level).

59. As a User looking at the Group creator, I want a Creator label (same idea as Team home), not Organiser and not Group Admin.

60. As a User, I want no invented Group Admin chip; Community Owner / Admin chips appear only if that Community role is already on the Group payload — this restyle does not add a Community-member fetch just to paint chips.

61. As a User who may manage Invite doors, I want a dashed Invite members footer row that opens the same Invite sheet as the action bar.

62. As a User opening overflow, I want only real items: Open {Community} and All Communities on Club Groups; Copy Group URL on Loose Group Public; Create Game if allowed and not already on the action bar; Manage invites / Invite if allowed and not already on the action bar; Leave Group when I am a member; Delete Group when `canDelete`.

63. As a User, I want no Edit group, Notification settings, or Report group, so that overflow does not advertise doors that do not exist.

64. As a User with nothing for overflow, I want the overflow hidden.

65. As a User confirming Leave or Delete, I want the existing confirms and existing mutations, so that destructive doors are unchanged.

66. As a User opening Invite, I want the existing Lookup invite and Invite-link panels in the existing responsive dialog/sheet, retitled toward Invite, so that chrome changes and doors do not.

67. As a User copying an Invite link, I want the existing mint + clipboard share message (6-hour token, `/gr/{code}` when short URL exists), so that Share is not a slug product.

68. As a User of Loose Group Public, I want Copy Group URL to remain a distinct overflow item (dashboard Group URL), so that it is not merged with Invite link.

69. As a User on desktop, I want the same stacked column and content width as Game details (no 280px aside, no second layout), so that Community, record, and actions live in the column.

70. As a User waiting for Group home to load, I want a skeleton that matches the new geometry (hero, three-cell or muted record, two-button bar, tabs, rows), so that loading is not the old four-cell + badge header.

71. As a User when Group by-id fails or is missing, I want the existing ErrorState / not-found behaviour inside the shell.

72. As a User, I want existing near-monochrome tokens, StatStrip, EmptyState, UserAvatar, EntityMonogram, ActionMenu, ResponsiveDialog, and Button — not a second greyscale system or a new avatar stack.

73. As a User, I want no prototype dataset switcher, phone frame, or fake Clubs tab bar.

74. As a developer, I want Group by-id to stay the one Group home read, enriched in that procedure file if Games cards need Venue, Court, occupancy, registration status, seated Users, or scores — no new procedure, no twin domain-verb file, no service layer.

75. As a developer, I want Invite, Soft-archive, Game admit, Community membership, group-creator UI gate, and ratings modules called, not reimplemented under the Groups router.

## Implementation Decisions

- App-only restyle of Group home. No new Package. No schema migration. No new tRPC procedure. Follow one-endpoint-per-file: if the Games tab needs Venue, Court, occupancy, registration status, seated Users, `isPublic`, or completed Set scores, enrich Group by-id in that procedure. Do not add a twin domain-verb file or a service layer. Reuse existing registration-status and freeze helpers and price/occupancy formatters; do not clone Games-hub join mutations into Group home.

- **Who gets the chrome:** every Group home. Not format-gated (Groups are not Friendly-only).

- **Shell:** Keep Dashboard shell, App rail, and Bottom nav. Set Group home to hide the shell MobileTopBar on this page only and render a page-local 52px sticky bar below `lg`. Do not change MobileTopBar behaviour for other routes. Do **not** set hide-nav (Game home did; this page must not). Switch from wide + aside to the content container and a single stacked column.

- **Top bar (small screens):** Back → Groups hub (same target as today’s detail back). Collapsed Group name: opacity 0 and slightly translated until the main column `scrollTop` is greater than 56px, then fade/slide in; respect reduced motion (opacity only). Border-b only when collapsed. Overflow is the existing ActionMenu (keep MoreVertical; do not fork a MoreHorizontal primitive). Hide overflow when it would be empty.

- **Hero:** EntityMonogram + `h1` Group name. Meta: sport display label (Padel / Football) · member count · Community name when present. No type badges. Soft-archive stays on the existing banners, not a hero badge. Community aside card goes away; Open Community lives in overflow.

- **Record strip:** Members only. If `membership.totalGamesPlayed` > 0, StatStrip `tone="dark"`, three cells: Games (`membership.totalGamesPlayed`), Sets (`totalSetsWon`), Points (`totalPointsWon`). Label the block “Your record in this group”. If member and Games played is 0: muted sentence only. Non-members: omit. Do not use Group-level `totalGamesPlayed` in this strip. Do not show Position here (Standing tab owns rank). Do not show Wins, win-rate, or Level.

- **Action bar matrix** (max two buttons, 44px min; first matching family wins). Extract a small pure helper (same idea as Game home’s CTA family) so tests can lock it without rendering the page:

  1. `canJoin` → primary Join Group (existing join mutations); secondary Create game if `hasCreateAccess && canCreateGame`, else Invite if `canManageLookupInvites || canManageInviteLinks`.
  2. Else if `nextJoinableGame` → primary Join game **link** to that Game home; secondary Create game or Invite as above.
  3. Else if create allowed → primary Create game (`/dashboard/games/new?groupId=`); secondary Invite if allowed.
  4. Else if invite allowed → primary Invite.
  5. Else → no action bar.

  `nextJoinableGame` is the soonest upcoming Group Game with registration status `open`, not join-frozen, viewer not registered and not waitlisted, and join gate passed (Group member or Game `isPublic`). If upcoming rows are not yet enriched, omit family 2 until that enrichment ships (families 1, 3–5 still ship with chrome). Never call Game admit, Waitlist, or seat-register from this bar.

- **Tabs:** Existing line Tabs. Values `standing` | `games` | `members`. Default standing. Query helper parallel to Game home tab: unknown → standing; `replace` without scroll. Stick under the page-local nav on small screens (`top` = that 52px bar); on large screens stick at 0.

- **Standing:** Non-member EmptyState unchanged. Empty results: new copy + optional Create the first game; still list members with rank hidden. With results: LeaderboardRow restyle — keep rank icons 1–3, keep sets/points/Games subline, keep You badge, use muted row background, drop colour-only / left-bar-only identification. Trailing chevron only on the viewer row (link to You). Sort function unchanged.

- **Members:** Client filter when `memberCount > 8`. Rows: UserAvatar, name, You, `N Games`, Creator on `createdBy`. Remove the universal Member RoleBadge. Footer Invite members when invite allowed. Viewer row may link to You; others are static. Do not add Level.

- **Games:** Keep Upcoming / History sections and Soft-archive copy. Restyle cards **on this tab** toward date/time, Venue · Court, registration chip, avatar stack, occupancy · price. Prefer a Group-tab presentation that reuses formatters and AvatarStack; do not drive hub seat-picker Join from this tab; do not overload Match History cards (those are viewer WON/LOST). Entire card (and any Join label) navigates to Game home. Enter score / Record result omitted on this tab (scoring stays on Game home). Cancelled uses Cancelled. Full uses Full, not Confirmed.

- **Overflow items (real doors only):** Open {Community}; All Communities; Create Game if allowed and not already on the action bar; Copy Group URL if Loose Public; Manage invites if allowed and Invite is not already on the action bar; separator; Leave Group; Delete Group. Confirms unchanged.

- **Invite sheet:** Restyle title/chrome of the existing Group invites ResponsiveDialog. Keep LookupInvitePanel and InviteLinkPanel, gated by existing `canManageLookupInvites` / `canManageInviteLinks`. Copy link = existing create-invite-link mutation + existing clipboard share helper. Do not add a permanent public join URL for Private Groups.

- **Tokens:** Redesign tokens and primitives. Do not introduce `neutral-900` as a parallel palette; StatStrip dark tone already covers the record block. User faces stay circular UserAvatar; Group identity stays EntityMonogram (do not mix a second Group mark shape on this page).

- **Copy:** Group, Club Group, Loose Group, Community, Member, Standing, Game, Match, Venue, Court, price per player, Soft-archive, Lookup invite, Invite link, You, Creator, Organizer (Game role only — do not label Group members Organizer). Avoid club (for Community), lobby, channel, organiser-as-Group-role, Confirmed-as-Game-status, Level-as-Standing.

## Testing Decisions

### What a good test is

Test external behaviour: what Group by-id returns, which action-bar family a viewer is offered from that payload, tab query parsing, and that join / leave / delete / invite / create gates still hit the existing doors. Do not assert pixel-perfect mock spacing, 52px vs 48px, or font names. Do not add tests whose only purpose is that a component was renamed or moved.

### Highest seam

A signed-in User opening Group home sees the new chrome and the correct action-bar / overflow / record / tab bodies for their membership and gates — without changing Standing sort, Invite mint rules, Soft-archive freeze, or Game admit.

If you implement this spec, you implement these seams:

1. **Tab query:** `standing` default; `games` / `members` from `?tab=`; unknown → standing; replace without scroll. Prior art: Game home tab helper tests.
2. **Action-bar family** from `canJoin`, create gate, invite flags, Soft-archive, and (once enriched) `nextJoinableGame`. Join Group still calls existing join mutations. Join game is a link only. Create game absent without `hasCreateAccess && canCreateGame`.
3. **Record strip:** non-member omitted; member with 0 Games → sentence; member with Games → Games / Sets / Points from membership (not Group totals, not wins).
4. **Standing:** non-member empty unchanged; empty-results copy + unranked list; ranked order still compare-standing; You marker without colour-only.
5. **Games cards:** navigate to Game home; no registerSeat / complete Match from Group home; registration chip Open/Full/Closed/Cancelled; Soft-archive copy remains.
6. **Group by-id enrichment** (if shipped): Venue / occupancy / registrationStatus / seated people / Court from existing Game fields; PGLite prior art is hub-list row tests. No new procedure.
7. **Invite:** Lookup + Invite link still gated as today (Club creator cannot mint links; Owner/Admin can; Loose creator can; freeze refuses mint).
8. **Regression:** Leave / Delete confirms; Copy Group URL Loose Public only; overflow hidden when empty; skeleton/error/not-found.

### Prior art

Game home tab tests; Friendly Game CTA-family tests; hub-list occupancy/registration tests; Invite-door tests; group-creator UI gate; Soft-archive consult tests. Group by-id currently has no dedicated PGLite file — add one only for enrichment behaviour, not for “the procedure lives in its own file.” UI chrome is those seams plus a manual phone pass (collapsed title vs Bottom nav, sticky tabs, overflow, Invite sheet, Join Group vs Join game).

## Out of Scope

- Changing join, leave, delete, invite, create-Game, or Game-admit permission
- Changing Standing sort or adding seasons / All time / This month
- Level on Group Standing or Members (no Group-scoped Level; do not extend ratings onto this read unless a later spec says so)
- Wins / win-rate derived from Match winners
- Completing Matches, scoring Sets, or seat-register / Waitlist from Group home
- Hub GameSummaryCard join picker on this tab
- Edit Group, notification settings, report Group
- Permanent `temba.app/j/slug` (or any non-token Group join URL besides Loose Public Copy Group URL)
- Redesigning App Bottom nav, Groups hub, Community home, or global MobileTopBar
- Hiding Bottom nav the way individual Friendly Game home does
- A second greyscale token system or new Button/Chip/Avatar stack
- Prototype dataset switcher, toasts instead of navigation, local recordResult
- Thin tRPC assemblers or a parallel `server/<domain>/<verb>.ts` tree
- New CONTEXT.md terms or a new ADR

## Further Notes

- Domain vocabulary: Group, Club Group, Loose Group, Community, Member, Owner, Admin, Standing, Game, Match, Set, Venue, Court, price per player, Soft-archive, Lookup invite, Invite link, You, Level (not on this page), Organizer (Game role). Avoid club, lobby, channel, Group admin, organiser-as-Group-role, Confirmed-as-Game-status.
- Amend `.scratch/redesign/spec.md` §5.4 when this ships: hero meta without type badges; record strip three honest cells; action bar matrix; `?tab=`; stacked desktop (drop the 280px aside); Standing/Members/Games visual contract above. Do not replace backend/invite/ratings specs.
- Related specs this does not replace: invite-lookup-and-link, group-creator-ui-gate, user-ratings (leaderboards out), games-hub-tabs-and-cards, match-history-tab (Group History is still Group Games, not hub Match History), friendly-only-ui, game-details-mobile-chrome (prior art only; Bottom nav stays here).
- CONTEXT.md / ADRs: no glossary or ADR change. Restyle fails none of the ADR tests.

### Tickets

Linear issues (`ready-for-agent`), in dependency order. TEM-161 blocks TEM-162, TEM-163, and TEM-164.

1. [TEM-161](https://linear.app/temba-app/issue/TEM-161/group-home-chrome) Group home chrome — sticky nav, hero, record strip, action-bar families 1 and 3–5, tabs, `?tab=`, overflow, stacked desktop, skeleton.
2. [TEM-162](https://linear.app/temba-app/issue/TEM-162/group-home-standing-and-members-restyle) Standing and Members restyle — empty-results copy, ranked rows with existing metrics, member search, Creator chip, You.
3. [TEM-163](https://linear.app/temba-app/issue/TEM-163/group-home-games-cards-and-join-game-link) Games cards and Join game link — Group by-id enrichment, card restyle, Join game as a Game-home link.
4. [TEM-164](https://linear.app/temba-app/issue/TEM-164/group-home-invite-sheet-restyle) Invite sheet restyle — chrome around existing Lookup invite and Invite-link panels.

See the Linear issue bodies for What to build / Acceptance criteria / Blocked by.
