Status: ready-for-agent

# Game details mobile chrome

## Problem Statement

Game home already has Overview, Players, and Results, and the real join, waitlist, seat, score, invite, and cancel doors. On a phone it still reads as a dashboard: Game name as the title, badge soup, tile cards, and header actions that compete with the App’s bottom nav.

Players opening an individual Friendly game want the in-phone details chrome from the product mock: Group (or Pickup) in the top bar, a time-led hero, viewer standing, sticky tabs, a single bottom CTA, and clearer Team A / Team B seats and results — without changing who may join, sit, leave, organize, score, or cancel.

## Solution

Restyle Game home for **individual Friendly games** only. Other formats keep today’s header and panels.

Keep every shipped door and rule. Sticky **Join** opens the same vacant-Position picker the Games hub already uses. Do not auto-seat. Permissions stay `isOrganizer` (never a Host role). Top-bar title is the **Group** name, or **Pickup** when groupless. Game name remains the page heading.

Hero status stays registration **Open / Full / Closed / Cancelled**. Score CTA appears when the viewer may enter Sets and the Match is not completed. Steppers 0–7 are UI-only; **Complete Match** stays a separate control. Cancel keeps seats. No rematch. Share stays Organizer Invite-link copy when mint is allowed.

Directions show only when the Venue has latitude and longitude (add those fields to Game by-id). Price per player keeps the existing formatter; muted “Paid at the venue” only when the amount is greater than zero.

Closed registration, Soft-archive, Level-range request, partner register, team-only register, and the leftover seat picker stay.

Approving this spec approves the Test seams in Testing Decisions. It amends the Game home visual contract in `.scratch/redesign/games-and-rankings-contract.md` (identity header / section order). It does **not** replace `.scratch/games-matches/spec.md`, `.scratch/individual-game-seats/spec.md`, `.scratch/friendly-only-ui/spec.md`, `.scratch/game-price-per-player/spec.md`, or `.scratch/game-invite-share-preview/spec.md`.

## User Stories

1. As a User opening an individual Friendly game, I want Game home to use the new mobile chrome (top bar, hero, sticky tabs, Overview rows), so that the page matches the in-phone details design.

2. As a User opening an Americano, Friendly tournament, or team-only Game, I want today’s header and panels, so that this restyle does not invent Team A/B chrome those formats do not have.

3. As a User on mobile, I want the top bar to show a back control that returns to the Games hub, so that I am not trapped on details.

4. As a User of a Group Game, I want the top-bar title to be that Group’s name, truncated, so that I know which Group the Game belongs to.

5. As a User of a groupless Game, I want the top-bar title to be Pickup, so that the page does not invent a Group or a Community.

6. As a User, I want the Game name to remain the page heading (visually secondary under the clock, or sr-only when the name is unset), so that the page still has one h1 and does not title the Game as a Community.

7. As a User on mobile, I want the overflow control in the top bar, so that Edit, Invite, Share, Leave, and Cancel are one tap from the chrome.

8. As a User on desktop, I want the same stacked content column and the overflow in the hero row (not a second layout), so that desktop does not fork Game home.

9. As a User, I want the hero to lead with a large local start time and a date · duration line, so that when we play is the first fact.

10. As a User when the Game is cancelled, I want a cancelled banner and a struck-through time, so that I do not treat the window as live.

11. As a User, I want Venue and Court in the hero when they exist, so that I know where to go.

12. As a User when the Venue has latitude and longitude, I want a Directions control that opens a maps URL for those coordinates, so that I can navigate to the site.

13. As a User when the Venue has no coordinates, I want no Directions control, so that we do not invent a pin.

14. As a User, I want an avatar stack and “N of capacity players” in the hero, so that occupancy is obvious before I open Players.

15. As a User, I want a registration status dot and label (Open, Full, Closed, or Cancelled), so that join state is not called “played”.

16. As a User who is seated or registered and not waitlisted, I want a viewer line “You're playing”, so that my standing matches the Joined badge we already compute.

17. As a User who is waitlisted, I want a viewer line “You're on the waitlist”, so that overflow standing is visible in the hero.

18. As a User with no standing, I want no viewer standing line, so that the hero stays quiet.

19. As a User, I want sticky tabs labelled Overview, Players, and Results, so that the sections stay the ones we already ship.

20. As a User opening `?tab=results`, I want Results selected, so that existing deep links keep working.

21. As a User opening `?tab=players`, I want Players selected, so that Overview’s players row can switch tabs without a dead query.

22. As a User on Overview, I want rows for date/time, Venue (and Directions when allowed), price per player, Group or Pickup, and players (switching to Players), so that facts are a list instead of tile cards.

23. As a User when price per player is unset, I want no price row, so that skipped amounts stay quiet.

24. As a User when price per player is zero, I want the existing Free label and no “Paid at the venue” helper, so that free is not described as venue payment.

25. As a User when price per player is greater than zero, I want the existing amount (including BD) and muted “Paid at the venue”, so that I know Temba is not charging me.

26. As a User on Overview, I want the Group row to link to that Group when a Group exists, so that I can open the parent Group.

27. As an Organizer or a User out of Level range, I want the existing Request to play / Organizer queue on Overview, so that Game Level range is not dropped by the restyle.

28. As a User of a Soft-archived Club Group Game, I want the existing Soft-archive banner and frozen join/invite doors, so that archive still reads as closed history.

29. As a User who may register on an open individual Friendly game, I want a sticky **Join** that opens the existing vacant-Position picker (same idea as the hub “Pick your spot” sheet), so that I choose a Position and Game admit stays one path.

30. As a User confirming a Position in that picker, I want the existing seat-register door to run, a success toast, and Game home to refresh with me seated, so that join matches the hub.

31. As a User, I want Join to refuse auto-seating me on Team B Left or any other implied seat, so that two people cannot be given the same Position.

32. As a User on a full Game I may waitlist, I want a sticky **Join waitlist** that calls the existing full-path door (no seat picker), so that overflow matches Game home and the hub.

33. As a waitlisted User, I want sticky copy that I am Nth on the Waitlist (FIFO order already on by-id) and a **Leave waitlist** action, so that I can see my place and exit.

34. As a seated or registered User who may leave and is not waitlisted, I want the hero to say I am playing and Leave to live in overflow (and the same confirm), so that Leave is not a second primary next to Invite or score.

35. As an Organizer who may mint Game invites, I want Invite on the “You're playing” bar or overflow, opening the existing Invite dialog, so that Lookup invite and Invite link stay the same doors.

36. As an Organizer who is not seated, I want that to be a normal state: overflow still has Organizer actions, and Join still appears when I may register, so that Owner/Admin organizers are not treated as a playing Host.

37. As a User who may enter Sets on an incomplete Match, I want a sticky **Enter score** unless I am already on Results, so that scoring is one tap from Overview or Players.

38. As a User on the Results tab who may enter Sets, I want no sticky Enter score, so that the tab and the CTA do not duplicate.

39. As a User after a cancelled Game, I want a sticky **Browse open games** that goes to the Games hub, so that I have a next step.

40. As a User after a completed Match, I want no rematch CTA, so that we do not ship a door that does not exist.

41. As a User when registration is closed and I have no score or cancelled CTA, I want no join/waitlist sticky, so that closed is not dressed up as Open.

42. As a User on a small screen, I want the sticky CTA above the App bottom nav (not replacing it), so that Join and Home/Games do not overlap.

43. As a User on a large screen, I want no viewport-sticky bottom CTA; actions sit in the content column, so that desktop does not grow a floating bar.

44. As a seated User choosing Leave, I want the existing confirm (mobile sheet / desktop dialog) titled as leaving this Game, with copy that the spot can open for someone else, so that Waitlist promote is explained without a new component.

45. As a waitlisted User choosing Leave waitlist, I want the existing confirm with tightened waitlist copy, so that leave waitlist stays a distinct door.

46. As an Organizer of a live individual Friendly game, I want overflow items Edit, close or reopen registration, Invite when mint is allowed, Share when mint is allowed, and Cancel Game (danger), so that Organizer tools remain complete.

47. As an Organizer using Share, I want the existing Invite-link copy (mint when allowed, clipboard share message), so that Share is not a second invite product.

48. As an Organizer of a cancelled, closed, or join-frozen Game, I want no Share and no new Invite-link mint, so that mint rules do not change.

49. As a seated User who is not an Organizer, I want overflow Leave (and not Edit or Cancel Game), so that Organizer powers do not leak.

50. As a User with nothing to do in overflow, I want the overflow hidden, so that an empty ⋯ is not shown.

51. As a User on Players for an individual Friendly game, I want Team A and Team B blocks with Left and Right, filled count out of two, and dashed Plus on open Positions, so that the 2v2 is scannable.

52. As a seated User looking at my row, I want a You cue, so that I can find myself.

53. As a User who may join or move, I want a vacant Plus to take or move to that Position using the existing doors, so that the restyle does not add Organizer-drag.

54. As an Organizer, I want a per-player action that Kicks any seated User except myself, so that kick stays the Organizer tool.

55. As an Organizer, I want no Move position / Move to other team action on another User, so that only that User moves their own seat.

56. As a seated User, I want move still refused when the Game is full, closed, cancelled, or I sit on a completed Match, so that seat rules stay as shipped.

57. As a User, I want the Waitlist section with FIFO names and Organizer kick of waitlisted rows, so that overflow management stays.

58. As a User who may register with a partner, I want the existing partner card on Players, so that pair join is not removed.

59. As a leftover unpaired User, I want the existing vacant-Position picker before I occupy a side, so that old pool rows still seat.

60. As a User of a cancelled Game, I want seated people still listed (not wiped), and copy that may say the Game was cancelled, so that history is not erased.

61. As a User on Results when no Set has games-won, I want a pending empty treatment (dashes / needs a score), so that an unscored Friendly game is obvious.

62. As a User who may enter Sets, I want a stepper per side per Set clamped 0–7 in the UI, so that padel set games are quick to tap.

63. As a User, I want saving Sets to call the existing score-Set door (API still unbounded), so that a crafted client can still store values outside 0–7.

64. As a User who may complete the Match, I want Complete Match as its own control after Sets can freeze, so that Save is not a silent Rated Match.

65. As a User viewing a completed Match, I want a winner line and set scores with winner emphasis, so that the final notepad is readable.

66. As a User on a cancelled Game’s Results, I want a cancelled empty or cancelled Match treatment without offering score, so that cancelled is not entry.

67. As an Organizer, I want existing Court assign and Cancel Match on Results to remain available where they are today, so that the restyle does not strip Match tools.

68. As a User who may not enter Sets, I want read-only results, so that scoring does not widen.

69. As a User of a team-only, Americano, or Friendly tournament Game, I want today’s Players and Results (including Americano’s empty results), so that those formats are unchanged.

70. As a developer, I want Game by-id to include Venue latitude and longitude when stored, so that Directions does not need a second query.

71. As a User, I want no new font family, so that Game home stays on the App’s existing type tokens.

72. As a User, I want existing black primary actions, emerald “You're playing”, and red leave/cancel, so that the restyle uses tokens we already have.

73. As a User, I want no prototype scenario switcher, phone frame, or fake bottom tab bar, so that production chrome stays the App shell.

## Implementation Decisions

- App-only restyle of Game home. No new Package. No schema migration. No new tRPC procedure. Follow one-endpoint-per-file: enrich Game by-id in that procedure; do not add a twin domain-verb file or a service layer. Soft-archive, Game admit, seats, Invite doors, Friendly create, and ratings stay shared modules.

- **Who gets the new chrome:** `friendly_game` and `individual` only (the same cut as the hub rich roster). Americano, Friendly tournament, and team-only keep the current Game home header and the current Overview / Players / Results panels.

- **Top bar:** Reuse the existing mobile top bar and back-to-Games-hub rule. Pass Group name or the word Pickup as the mobile title (truncate). Forward the shell action slot into that top bar so overflow lives there on small screens. Do not put a Community name in the title.

- **Heading:** One page h1 is the Game name (fallback “Game” when unset). The large clock is visual, not the document heading.

- **Overflow:** Reuse the existing action menu. Organizer + not cancelled: Edit (existing dialog), close or reopen registration, Invite (existing dialog) when invites are allowed, Share when Invite-link mint is allowed (existing copy mutation + clipboard share message), Cancel Game (existing confirm). Seated non-Organizer: Leave. Waitlisted: Leave waitlist. Hide overflow when it would be empty. Cancelled / closed / join-frozen: no Share.

- **Sticky CTA (small screens only), first match wins:**
  - cancelled → Browse open games (Games hub)
  - viewer `canScoreSets` on a non-completed Match and current tab is not Results → Enter score (selects Results)
  - `canWaitlist` → Join waitlist
  - `isWaitlisted` → You're Nth on the waitlist + Leave waitlist
  - `canRegister` → Join (opens vacant-Position sheet)
  - seated or registered, not waitlisted → You're playing (not a second join); show Invite on that bar when the Organizer may mint
  - else → no sticky CTA (closed, completed, viewer-only)

- **Join sheet:** Reuse the hub vacant-Position `ResponsiveDialog` pattern (“Pick your spot”). Confirm calls the existing seat-register door with the chosen side index and Position. Full waitlist is one tap with no sheet. Do not pick a default Position.

- **Leave:** Reuse the existing confirm primitive (already a sheet on mobile). Tighten title/description only. Do not add a new leave component. Waitlist promote stays server-side as shipped.

- **Hero / Overview facts:** Window start/end and first Match duration as today. Occupancy from registered User count / players allowed. Avatar stack from registered Users. Court from the Friendly game’s one Match. Group link uses existing Group id/name. No Host row and no Community row.

- **Price:** Existing cents formatter. Helper “Paid at the venue” only when cents > 0. Still no checkout.

- **Directions:** Game by-id Venue object gains nullable latitude and longitude (same stored decimals as Venue reads). Show Directions only when both parse to a number. Open `https://www.google.com/maps/search/?api=1&query={lat},{lng}` in a new browsing context. Hide when either coordinate is missing. No name-only fallback search.

- **Players (individual Friendly game):** Restyle the existing two-side Left/Right grid: Team A / Team B, filled n/2, dashed Plus, You on the viewer. Vacant Plus → existing join or self-move. Organizer per-player menu → Kick only, not self, not move-others. Keep Waitlist, partner card, leftover unseated picker, and cancelled seats.

- **Results:** Pending dashes when no games-won. Entry: steppers 0–7 per existing Set shell (Friendly create already inserts three). Persist through the existing score-Set door; a single Save may write each Set that has both sides entered. Complete Match remains its own existing control and still writes a Rated Match. Final: winner line + emphasis using existing outcome. Keep Court assign and Cancel Match for Organizers where they already appear. Do not add Add Set / Remove Set.

- **Tabs:** Keep the existing tab primitive and sticky tab row. Extend the tab query helper so `players` is a first-class value alongside `overview` and `results`.

- **Desktop:** Same stacked column and existing content max-width. Seat blocks may stay two-up on medium as today. No separate two-column Game home. Extra bottom padding when a small-screen sticky CTA is shown, above `--bottom-nav-height`.

- **Copy:** Say Organizer, never Host. Say Group or Pickup, never Community as the Game header. Say Position, Game admit, Waitlist, Complete Match, Soft-archive, price per player.

- **Unrelated WIP:** Do not fold the current lookup-invite-panel / extra dependency work into this feature.

## Testing Decisions

### What a good test is

Test external behavior: what Game by-id returns, which CTA a viewer is offered from that payload, and that join/leave/score/invite still hit the existing doors. Do not assert pixel-perfect mock spacing or font names. Do not add tests whose only purpose is that a component was renamed.

### Highest seam

A signed-in User opening an individual Friendly game sees the new chrome and the correct sticky CTA / overflow for their standing, and Join still seat-registers through the same door as the hub — without changing Organizer, admit, Waitlist, Complete Match, or cancel side-effects.

If you implement this spec, you implement these seams:

1. **Chrome gate:** individual Friendly game → new chrome; Americano / Friendly tournament / team-only → current header and panels.
2. **Top bar:** Group name or Pickup; back to Games hub; Game name remains the h1.
3. **CTA family** from by-id flags (cancelled, `canScoreSets` + tab, `canWaitlist` / `isWaitlisted`, `canRegister`, seated/registered, Organizer-not-seated, closed, Soft-archive freeze) matches the mapping above; Enter score hidden on Results; no rematch.
4. **Join:** sticky Join opens vacant-Position sheet; chosen seat calls seat-register with that side + Position; full → Join waitlist with no sheet; no auto-seat.
5. **Directions:** by-id includes Venue lat/lng; Directions visible only when both present; omitted otherwise. No new procedure.
6. **Price:** unset omitted; Free without helper; positive amount + “Paid at the venue”.
7. **Players:** Kick only for Organizer (not self); viewer moves via vacant Position; cancelled Game still lists seats.
8. **Results:** steppers persist via score-Set; Complete Match remains separate; who may score unchanged.
9. **Regression:** close/reopen, Soft-archive banner, Level-range request, partner register, leftover picker, Invite dialog, Invite-link mint refused when cancelled/closed/frozen.

### Prior art

Game by-id reads in Level-range tests; `game-summary-cta` tests for list verbs; hub seat picker + `registerSeat`; seats/move/kick tests; existing Confirm + Invite dialogs. Prefer Vitest + PGLite for the by-id coordinate enrichment and any extracted CTA-family helper. UI chrome is covered by those seams plus a manual phone pass (sticky CTA vs bottom nav, overflow, leave sheet).

## Out of Scope

- Host as a role; Organizer moving other Users
- Auto-seat / implied Team B Left
- Rematch or create-from-Game
- Game-level “played” or “result” columns
- Wiping seats on cancel
- Widening Invite-link mint to non-Organizers or cancelled Games
- Payments, currency picker, or changing price per player semantics
- Community as Game header title
- Americano / Friendly tournament / team-only visual redesign
- New font family; prototype scenario switcher; fake bottom tabs; phone frame
- Thin tRPC assemblers or a parallel `server/<domain>/<verb>.ts` tree
- Unrelated branch WIP (lookup invite panel / extra UI dependency)

## Further Notes

- Domain vocabulary: Game, Match, Set, Friendly game, Game team, Position, Organizer, Group, Pickup, Waitlist, Game admit, Soft-archive, price per player, Invite link, Lookup invite, Venue, Court. Avoid Host, Community (as this page’s title), Event, and “played” as a Game status.
- Organizer who is not seated is required (Club Group Owner/Admin).
- Sticky score wins over Join when the viewer may enter Sets; they can still sit from Players if `canRegister`.
- List hub join is unchanged and must stay the same seat-register contract.
