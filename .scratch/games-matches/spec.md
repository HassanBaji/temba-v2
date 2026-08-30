Status: ready-for-agent

## Problem Statement

Players need to create a **Game** they can join: a Friday night Friendly game, an Americano with a player pool, or a Friendly tournament with several head-to-heads. Each Game has one registration list (Users or complete Teams), a cap, a waitlist, and optional Courts and times on the contests inside it. After play they need to record the sets they actually played.

Today the contest row is still called Game, `games.create` is a stub, Home and Group lists read leftover contest fields, and there is no parent event, no Match, no Set record, and no registration product. Padel Teams already deferred counter updates until play exists. ADR-0008 renames the old contest to **Match** and makes **Game** the parent.

## Solution

Ship Game create, registration, waitlist, Game invites, Friendly tournament Matches, and static Set entry in the DB Package and App.

A **Game** is the parent event (optional Group, public flag on the Game, never Community-direct). Formats this slice: **Friendly game** (exactly one Match at create with **three Set shells**, caps forced 4 / 2), **Americano** (individual-only, no Matches until a later generation slice), **Friendly tournament** (organizer adds Matches by hand over tRPC; no bracket). The **App** only creates Friendly game (`.scratch/friendly-only-ui/spec.md`); Americano and Friendly tournament remain tRPC formats. People register on the Game as Users (Americano), as an ad-hoc **Game team** with a partner (individual Friendly game / tournament), or as a complete persistent **Team** (team-only). Overflow is an unbounded FIFO **Waitlist**. Organizers close, reopen, kick, cancel, assign Courts, and mint Lookup invites and Invite links (token rules as shipped). After play, organizer or the Users on a Match’s two Game teams score **Sets** (games won per slot, draws allowed) and may mark the Match completed. The App does not offer Add Match, Add Set, or Remove Set; crafted clients still can. Team / User / Group counters stay at zero.

Approving this spec approves the Test seams in Testing Decisions.

## User Stories

1. As an Owner, Admin, or that Club Group’s creator, I want to create a Friendly game on a Club Group with a name, public flag, individual or team-only, and an optional window, so that the Group has a Friday-night contest. The App stores padel and does not choose a format. Creating the Game creates its one Match with three Set shells. Caps are forced: 4 players or 2 Teams.

2. As a Member who is not Owner, Admin, or that Club Group’s creator, I want creating a Club Group Game to be refused, so that Club play stays staff-run (or run by the squad’s creator).

3. As the creator of a Loose Group, I want to create a Game on that Group from the App as a Friendly game (one Match, three Set shells), so that the people in the Group can organize play without Community staff. Crafted clients may still pass any format. As a Loose Group member who is not the creator, I want creating a Game, cancelling a Match, and kicking players to be refused.

4. As an authenticated User, I want to create a groupless Game (public or not) from the App as a Friendly game with one Match and three Set shells, so that I can run pickup or an invite-only event with no Group. I become the only organizer.

5. As an Owner or Admin of a Soft-archived Community, I want creating a new Club Group Game to be refused, so that archived clubs do not start new events.

6. As a crafted client, I want to create an Americano that is individual-only with a players-allowed cap (multiple of 4, minimum 4), so that people sign up as themselves. I want team-only on an Americano to be refused. No Matches are created. The App does not offer Americano create.

7. As a crafted client, I want to create a Friendly tournament with individual or team-only and an organizer-chosen cap (players allowed ×4 min 4, or teams allowed ≥ 2), so that I can add Matches by hand later over tRPC. Creating the Game creates zero Matches. The App does not offer Friendly tournament create.

8. As a User of the App, I want create-Game UI with no sport picker and always padel, so that padel-only UI stays consistent (`.scratch/padel-only-ui/spec.md`). I also want no format picker and always Friendly game (`.scratch/friendly-only-ui/spec.md`).

9. As an organizer, I want format, public flag, and individual vs team-only to be immutable after create, so that the join door does not change under people.

10. As an authenticated User on a public Game, I want to register (or waitlist if full) without joining the Group, so that public is a real join door.

11. As a Group member on a non-public Group Game, I want to register or waitlist, so that Group-only events stay inside the Group.

12. As a User who is not a Group member, I want register, waitlist, Lookup send/accept, and Invite link accept on a non-public Group Game to be refused, so that invites do not widen that Game.

13. As a User on a groupless non-public Game, I want to join only via Lookup invite or Invite link from the creator (or as the creator), so that that Game is invite-only.

14. As a User on an Americano, I want to register as myself via tRPC, so that I join the player pool. There is no Game team this slice. The App does not show the Americano pool-register card.

15. As a User on an individual Friendly game or Friendly tournament, I want to register **with a partner** as an ad-hoc Game team (not a Team), so that we are one side for the whole Game. **Amended:** partner-register remains; solo seat-join is the other path — `.scratch/individual-game-seats/spec.md`.

16. As a User who registered alone on an individual Friendly game or tournament, I want to count toward players allowed but not occupy a side until I register with a partner, so that a Friendly game still has exactly two Game teams when full of sides. **Superseded:** solo occupy a Position immediately — `.scratch/individual-game-seats/spec.md`.

17. As a member of a complete Team, I want to register that Team on a team-only Game, so that the partnership occupies one Game team.

18. As a member of an incomplete Team, I want team-only register to be refused, so that only full partnerships enter.

19. As a Team whose partner is not allowed on a non-public Group Game, I want team-only register to be refused, so that a Team cannot smuggle a non-member.

20. As a User arriving when the Game is below cap, I want to register and the Game to stay **open** (or become **full** when I take the last seat), so that the cap is enforced.

21. As a User arriving when the Game is **full**, I want to join the **Waitlist** (unbounded FIFO), so that I can promote if someone leaves.

22. As a User arriving when the Game is **closed**, I want register, waitlist, Lookup send/accept, and Invite link accept to be refused, so that closed means the door is shut.

23. As a registered User or Game team, I want to leave the Game, so that my seat frees and the first eligible waitlisted entry promotes. On a tournament Match, my Game team **clears its slot**; the Match and its Sets remain.

24. As a waitlisted User or Team, I want to leave the Waitlist, so that I am no longer in line.

25. As an organizer, I want to kick a registered or waitlisted entry with the same effects as that party leaving, so that I can run the list.

26. As an organizer, I want to close registration, so that the Game becomes **closed**.

27. As an organizer, I want to reopen a closed Game that is not cancelled and whose Community is not Soft-archived, so that it becomes **open** if under cap or **full** if at cap. Window already ended still allows reopen until cancel.

28. As an organizer of an Americano or Friendly tournament, I want to raise the cap anytime and lower it not below the current registered count via tRPC, so that I can grow the field without ejecting anyone. The App does not show the cap-edit form on those formats.

29. As an organizer, I want to edit the Game window, so that Saturday morning can move.

30. As a crafted client, I want to add a Match on a Friendly tournament anytime (open, full, or closed) with optional start/end/duration, optional Court, and optional Game teams in two ordered slots, so that I can schedule before sides exist. App Game home has no Add Match, including on existing tournament rows and Soft-archived Club Group Games.

31. As an organizer, I want to assign or change a Match’s Game teams later, so that empty Matches can be filled.

32. As an organizer assigning a Court on a Club Group Game, I want only Courts on the Community’s linked Venue, so that club play stays on the club site. No Venue link means I cannot pick a Court (the Match may still exist). **Amended:** `.scratch/game-create-venue-court/spec.md` — Venue is required at create; an unlinked Club Group picks any live Venue; after create, Courts follow Game.venueId.

33. As an organizer of a Loose Group or groupless Game, I want to pick any Court on a live Operator Venue or skip Court, so that pickup can use the catalog. **Amended:** Venue is required first; Court stays optional on that Venue. `.scratch/game-create-venue-court/spec.md`.

34. As an organizer, I want assigning a Court on an archived Venue to be refused, so that hidden sites are not scheduled. **Amended:** locked Club Group create on a Soft-archived linked Venue is still allowed with skip Court; new Court assign after create is refused. `.scratch/game-create-venue-court/spec.md`.

35. As an organizer, I want to cancel a Friendly tournament Match without cancelling the Game, so that one head-to-head can die.

36. As an organizer, I want to cancel the Game, so that the waitlist is discarded and Matches are cancelled. Cancelling the only Match of a Friendly game cancels the Game. Americano cancel is Game-only (no Matches).

37. As a User, I want cancelling or editing format/public/mode to be refused for non-organizers, so that only organizers run the Game.

38. As an organizer, I want to mint a Game Lookup invite and a Game Invite link, so that I can pull people in with the same token rules as Groups (Lookup: existing User, accept required, revoke unused; Invite link: new 6-hour token per copy, no revoke). No Email invite.

39. As a User who may organize a Game, I want to mint Game invites, so that Game invite power follows Game organizers (Group creator; Club Group also Owner or Admin), not every Group member.

40. As a User with a Game Lookup invite on an individual Game, I want to accept and register (or waitlist if full), so that accept is a real door.

41. As a User, I want team-only Game Lookup invites to be refused at send, so that a User-shaped Lookup cannot drag in a partner.

42. As a User opening a team-only Game Invite link, I want my click to ask my Team partner to accept in-app, so that the Team occupies a seat only when **both** have accepted. Pending does not occupy cap or waitlist. If both accept when full, the Team waitlists. If the partner never accepts, nothing is registered.

43. As a User accepting a Game invite when the Game is closed, or when I fail the join gate, I want accept to be refused without registering me, so that invites never widen a non-public Group Game and closed stays closed.

44. As a signed-out person opening a Game Invite link, I want to sign in or sign up with Clerk and then join if the token is live and I pass the gate, so that Temba is not an identity provider.

45. As an unused Game Lookup invitee, I want that invite on the dashboard Invites page, so that Game Lookup sits with Community, Group, and Team Lookup invites.

46. As an organizer, I want unused Game Lookup invites listed on Game home with revoke, so that a wrong named invite does not stay live.

47. As a Home viewer, I want upcoming **Games** (not Matches) I can see because I am registered, waitlisted, organizer, or a member of the Game’s Group, so that a tournament is one row. Groupless public does not land on Home until one of those is true. List cards have no format badge.

48. As an authenticated User, I want public pickup to list **isPublic Games**, excluding Soft-archived Club Group Games, so that pickup is events, not contests.

49. As a Group member, I want Group home to list that Group’s Games, so that I can open Saturday’s tournament from Thursday Padel.

50. As a User who can see a Game on a list, I want to open Game home, so that the card and the page share the same visibility set (Invite-link accept pages remain a separate door). Game home has no format badge.

51. As a crafted client, I want to add a Set on a Friendly game or Friendly tournament Match, so that we can record what we played. Americano has no Sets this slice. App Game home has no Add Set. Friendly game create already inserted three shells.

52. As a crafted client, I want to add a Set **shell** while one or both Match slots are empty, so that I can prepare the notepad. Games-won stay blank. The App has no Add Set button. An organizer opening Game home may call add Set only to ensure three shells on a historical Friendly game Match.

53. As anyone, I want entering or editing games-won to be refused until **both** slots have Game teams, so that scoring cannot happen without sides.

54. As an organizer or a User on those Game teams, I want to store games won per slot on a Set (including equal games), so that 6–4 and 6–6 are both possible. No games-draw on a single side: both counts are stored; equal counts mean the Set is drawn.

55. As a viewer of a completed or in-progress Match, I want Set-wins to be 1 for the slot with more games and 0 for both when games are equal, so that a drawn Set awards nobody. Match winner is more Set-wins; equal Set-wins is a Match draw; zero Sets is no result.

56. As an organizer or a User on those Game teams, I want to mark a Match completed once it has at least one Set, so that the notepad freezes (no add/remove Sets, no score edits). The App still shows Complete Match. I cannot uncomplete; I cancel the Match if it was a mistake.

57. As a User not on the Match’s Game teams and not an organizer, I want add/remove Sets and complete to be refused, so that strangers cannot write results. Seeing the Game is not enough.

58. As a User after leave/kick clears a slot, I want existing Sets to remain and scoring to freeze until both slots are filled again, so that a kick does not delete the scoreline.

59. As an allowed viewer of a Soft-archived Community’s existing Club Group Game, I want the Game to stay visible (not on public pickup), so that archive is not data loss.

60. As a User of that archived Club Group Game, I want register, waitlist, Lookup send/accept, and Invite link mint/accept to behave as closed, and reopen to be refused, so that join doors freeze.

61. As an organizer of that archived Club Group Game, I want to still add Matches and assign Courts via tRPC, so that scheduling is not frozen. The App does not offer Add Match while archived.

62. As a User, I want deleting a Group that still has Games to be refused, so that events are not orphaned (same idea as today’s contest-row block, now on the parent Game).

63. As a User of Home, Group home, and pickup, I want leftover contest-row lists to show Games after the rename, so that I do not see one row per Match.

64. As a developer of a later Americano generation slice, I want this slice to store the Americano player pool and cap without creating Matches, so that generation can hang off a real Game.

65. As a developer of a later completion slice, I want Team, User, and Group counters to stay at zero after Sets and Match complete, so that attribution is a separate product.

66. As a User, I want no Game Email invite and no Game invite that auto-joins a Group or Community, so that Game doors do not become a second Club admit machine.

## Implementation Decisions

- Schema, migrations, and kit live in the DB Package. App tRPC and dashboard UI stay in the Temba App. No new Package. Follow existing Drizzle style: uuid PKs, Postgres enums plus TypeScript enums, created/updated timestamps. Kit table filter includes new tables. Clerk remains the only identity provider.

- **Rename (ADR-0008).** Today’s contest table becomes **Match**. A new parent table is **Game**. Do not keep the contest as Game internally. Group delete “has Games” means parent Games. Home upcoming, Group upcoming/history, and public pickup read **Games**, not Matches. If leftover contest rows exist, wrap each as a Friendly game plus one Match rather than dropping them.

- **Game** (conceptual): id; optional name; format (`friendly_game` | `americano` | `friendly_tournament`); registration mode (`individual` | `team_only`); optional `groupId` (restrict on Group delete; null = groupless); `isPublic`; optional window start/end; `playersAllowed` / `teamsAllowed` (Friendly game forced 4 / 2; Americano individual-only and playersAllowed ×4 min 4; tournament as grilled); sport (padel | football; App always padel); `createdBy`; `cancelledAt`; `registrationClosedAt` (null = not organizer-closed); timestamps. Derive **open / full / closed**: cancelled is its own dead state; else closed if `registrationClosedAt` set, or the Game window has ended, or the Club Group’s Community is Soft-archived; else full if registered count ≥ cap; else open. Organizer reopen clears `registrationClosedAt` and is allowed even after the window ended (not when cancelled or Soft-archived). Format, public, and mode immutable. **Amended:** required `venueId` and optional Courts on the Game at create — `.scratch/game-create-venue-court/spec.md`. `venueId` is immutable with format, public, and mode.

- **Registered count:** Americano = Users in the pool. Individual Friendly game / tournament = Users on the Game (paired or solo) toward players allowed; Game teams occupy sides (Friendly game max two). Team-only = registered Game teams (complete Teams). Waitlist is not in the count.

- **Match:** `gameId` required (cascade with Game cancel/delete as implementation chooses; prefer keep rows cancelled rather than hard-delete when the Game is cancelled). Optional start/end/duration. Optional `courtId` referencing **Court** (the playing surface), not Venue — fix the ADR-0007 leftover that pointed contest `court_id` at venues. Two ordered slots. Status: at least cancelled and completed (reuse pending/confirmed if useful for lists; completed is the freeze). Friendly game: insert the one Match **and three Set shells** in the same create transaction. Americano: no Match rows. Tournament: organizer inserts over tRPC (zero Sets on that Match). The App does not offer Add Match.

- **Match slots:** slot 1 and slot 2, each optional `gameTeamId`. Leave/kick of that Game team clears every slot it occupies; Sets stay. Assigning a Game team fills a slot.

- **Game team:** belongs to the **Game**, not the Match. Either `teamId` (complete Team, team-only Games) or an ad-hoc pair of two Users. Unique enough that the same Team or the same pair is not registered twice on one Game. Americano has **no** Game teams this slice. Dissolving a Team: refuse if it is registered on a live Game, or detach `teamId` and keep the Game team as history — prefer **refuse register-time dissolve** only if needed; otherwise `onDelete` set null on `teamId` and keep the Game team as an ad-hoc pair of the two Users if they still exist. Do not invent a third team-like noun.

- **Game players / pool:** Users on the Game for Americano and for individual Games (solos and members of ad-hoc Game teams). Reuse or replace `game_players` so the pool is Game-scoped, not Match-scoped.

- **Waitlist:** Game-scoped FIFO (`createdAt` order). Individual = User; team-only = complete Team. Unbounded. Promote the first still-eligible entry on leave/kick of a registered seat. Closed: no new waitlist; existing line still promotes.

- **Sets:** rows on a Match. Order is add order. Each Set: optional games-won for slot 1 and slot 2 (both null = shell). Organizer may insert a shell with empty slots over tRPC. Entering or editing games-won requires both slots filled; both values required together; equal values allowed (draw); no tie-break points. Unequal → 1 Set-win for the higher slot; equal → 0 both. Match result is computed, not stored, except completed/cancelled flags. Who may add/remove Sets or complete: organizer, or Users on the two Game teams currently in the slots (complete requires ≥1 Set). Completed: refuse add/remove/edit. Cancelled Match: refuse Sets. No Set table on Americano this slice. The App hides Add Set and Remove Set. Friendly game Matches start with three shells at create. Historical Friendly game ensure-3 is App-only (organizer Game home, skip cancelled/completed, do not delete 4+).

- **Payment fields** on the old contest row (`totalPrice`, `pricePerPlayer`, paid columns): unread this slice. Do not ship payment UI. Do not require them on Match.

- **Old integer set counters** (`setsPlayed`, `setsWon`, `setsLost`): unused for product; prefer drop or ignore in the migration. Do not invent Set rows from them.

- **Invites:** New Game Lookup invite table (User-keyed, unused unique per Game+User, revoke unused, no 6h). New Game Invite link table (token, expiresAt = created + 6 hours, many live tokens, no revoke). Paths `/invites/game/email` are **not** added. Invite-shell pages: `/invites/game/lookup` is not a URL (accept on Invites dashboard); `/invites/game/link/[token]` for Invite link. Authorization to mint = Game organizers. Team-only: do not insert Lookup invites. Team-only Invite link: first accept creates a pending pair-consent that does not occupy cap; second accept registers or waitlists the Team; refuse if the clicker has no exactly-one eligible complete Team, or if the partner is not the other member of that Team. Soft-archived Club Group Game: refuse mint and accept. Non-public Group Game: refuse send/accept if invitee/clicker is not a Group member. Accept never inserts Community or Group membership.

- **Organizer set:** Club Group Game: any Owner or Admin of that Community, or that Group’s creator (not only `createdBy` on the Game). Loose Group Game: the Group creator only (not every member). Groupless: `createdBy` only. Same people: create, close/reopen, kick, cancel Game/Match, add/edit tournament Matches, assign Courts, mint/revoke Lookup, mint Invite link, add Set shells, score when allowed, complete Match.

- **Join gate** on every register, waitlist, Lookup send/accept, Invite link accept: public → any authenticated User (individual) or any complete Team that is allowed (team-only). Non-public Group → Group members (both Team partners if team-only). Groupless non-public → organizer or successful invite only. Incomplete Teams never enter.

- **Lists:** Replace Home upcoming contest query with Games matching the visibility set that are not cancelled and still live (window not ended if set, or any non-completed Match with start ≥ now or unset, or Americano/tournament with no completed-only life and registration not cancelled). Sort soonest window start, else soonest Match start, else createdAt. Public pickup: `isPublic` Games whose Group’s Community is not Soft-archived (groupless public included). Group home: that Group’s Games (upcoming + history). Do not list Match rows on those surfaces.

- **Game home authorization:** same visibility set as lists, plus Invite-link accept. Soft-archived Club Group Games stay open to that set (not pickup).

- **UI:** Create Game (from Group home and a hub/groupless entry) has no format picker and always submits Friendly game; no one-option picker; copy does not name Americano or Friendly tournament. Keep Individual vs Team-only on create. **Amended:** required Venue Select and optional Court Select — `.scratch/game-create-venue-court/spec.md`. Game home (register, waitlist, organizer controls, Matches, Sets, invites) has no Add Match, no Add Set, no Remove Set, no Americano pool-register card, no non–Friendly-game cap form, and no format badge. Keep score / Save / Complete Match and other typed labels. Match detail or inline on Game home for slots/Court/Sets; Home and Group and pickup cards are Games. Reuse existing primitives. No visual redesign. Copy newest Game Invite link like other entities. Padel-only lock unchanged. Friendly-only UI lock: `.scratch/friendly-only-ui/spec.md`.

- **Counters:** Do not increment User, Group member, Group, or Team stored counters when a Match completes or Sets are saved.

- **tRPC:** Replace the stub `games.create`. Friendly game create inserts three Set shells on the one Match. Create still accepts Americano and Friendly tournament. Extend or replace `listPublicPickup` to return Games. Register Game, Match, Set, waitlist, and Game invite procedures on the existing app router. add Match / add Set / remove Set stay. tRPC may still accept football on sport fields; App never sends it.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): an authenticated User can create a Friendly game from the App (one Match, three Set shells), fill registration and waitlist under the join gates, record Sets and complete a Match, use Game Lookup invite and Invite link, and see Games on Home / pickup / Group home — without a format picker, without Add Match / Add Set / Remove Set in the App, without Americano Match generation, without counter updates, and without Temba acting as an identity provider. App format lock and three Set shells: `.scratch/friendly-only-ui/spec.md`. Crafted clients can still create Americano and Friendly tournament, add Matches, and add Sets.

If you implement this spec, you implement these seams:

- Rename: lists and Group-delete talk about parent Games; leftover contest rows wrapped or absent
- Create Friendly game from the App (Club Group staff or Group creator, Loose Group creator, groupless): no format picker, one Match, three Set shells, caps 4 / 2, App padel
- Member who is not staff or Group creator cannot create Club Group Game; Loose Group member who is not creator cannot create, cancel, or kick; Soft-archive refuses new Club Group Games
- Create Americano (tRPC / crafted client): individual-only, no Matches, players allowed ×4. App does not offer Americano create
- Create Friendly tournament (tRPC / crafted client): zero Matches, organizer cap. App does not offer Friendly tournament create
- Format, public, mode immutable; cap raise/lower rules (tRPC for non–Friendly game; App has no cap-edit on those formats); window edit
- Public register without Group membership; non-public Group Game refuses outsiders including invites
- Groupless non-public: invite-only
- Individual Americano pool (tRPC; App hides pool-register card); individual Friendly register-with-partner; team-only complete Team only; both partners must pass the gate
- open / full / closed; waitlist FIFO unbounded; leave and kick promote; pending Team invite does not occupy cap
- Close and reopen (not cancelled, not archived); window ended still reopenable
- Tournament add Match (tRPC): anytime, optional sides and Court; leave clears slot; Sets remain. App has no Add Match
- Court: Club Group linked Venue only; Loose/groupless live catalog or skip; archived Venue refused. **Amended:** `.scratch/game-create-venue-court/spec.md` — required Venue at create; unlinked Club Group uses the live catalog; after create, Courts follow Game.venueId
- Cancel Match vs cancel Game (Friendly game only-Match = cancel Game)
- Game Lookup + Invite link token rules; team-only Lookup refused; team-only link needs both consents
- Invites never auto-join Group or Community; closed and Soft-archive refuse mint/accept
- Home / pickup / Group home list Games not Matches; groupless public not on Home until in the Game; no format badge on cards or Game home
- Set shells from Friendly game create (and organizer ensure-3 on historical Friendly game Matches); App has no Add Set / Remove Set; score edit refused until both slots filled; games-draw; Set-wins; complete freeze
- Soft-archive existing Club Group Game: visible, join closed, schedule allowed via tRPC, no reopen; App has no Add Match while archived
- Counters stay zero after complete
- Game Invite link signed-out → Clerk, then join if live

Manual check: existing Community, Group, Team, Venue, login, Invites, and Soft-archive flows still work. Route `/public` still redirects to login.

### Modules under that seam

DB Package schema and migration for Game, Match, Game team, pool, waitlist, Sets, Game invites; App tRPC; dashboard create/home/lists; Game Invite link accept page; Home / Group / pickup queries — only as they affect the flows above.

### Prior art

Community/Group/Team Lookup invite and Invite link, Soft-archive refuse patterns, Group delete blocked when Games exist, Home upcoming and Group game lists (TEM-8 / TEM-10), padel-only UI, padel-teams counter deferral. No automated tests.

## Out of Scope

- Americano Match generation and rotating-partner algorithm
- Friendly tournament bracket / later “D” style
- Live or point-by-point scoring; tie-break points
- Updating User, Group, or Team stored counters from completed Matches
- Payment, prices, guests
- Football pickers in App UI
- Game Email invite
- Game invite that auto-admits to a Community or joins a Group
- Fixture as an entity
- Organizer as a named Community role
- Community-direct Games
- Directory of Games
- Uncomplete a completed Match
- Per-Match set-length override (planned N is gone)
- CI, test runner, visual redesign

## Further Notes

Glossary: Root `CONTEXT.md` (Game, Match, Set, Game team, Americano, Friendly tournament, Friendly game, Waitlist; Invite link includes Game; Soft-archive Club Group Game clauses). Architecture: ADR-0008 (Game is the parent event). Courts: ADR-0007 leftover `court_id` → venues is corrected on **Match** to optional Court. Padel-only UI: `.scratch/padel-only-ui/spec.md`. Friendly-only UI: `.scratch/friendly-only-ui/spec.md` is the delta for App format lock and three Set shells on Friendly game create; implementers must not rebuild a format picker, Add Match, or Add Set from older stories. Invites: `.scratch/invite-lookup-and-link/spec.md` token rules. Teams: `.scratch/padel-teams/spec.md` counter updates remain a later slice.

Settled grilling: `.scratch/games-matches/decisions.md`.

**Amended:** Stories 15–16 and Decision 25 (partner required; solo does not occupy a side) are superseded for individual Friendly game and Friendly tournament by `.scratch/individual-game-seats/spec.md` (solo seat-join, left/right Position, 2v2 display). Americano and team-only in this spec are unchanged.

**Amended:** App format picker, Add Match, Add Set, Remove Set, Americano pool-register, non–Friendly-game cap form, and format badges are locked by `.scratch/friendly-only-ui/spec.md`. Friendly game create inserts three Set shells. tRPC stories for Americano, Friendly tournament, add Match, and add Set remain as crafted-client paths.

**Amended:** Stories 32–34 (Court assign keyed off Community Venue link; no link → no Court) are superseded for create and later assign by `.scratch/game-create-venue-court/spec.md` (required Venue on every Game, locked when the Club Group has a Venue link, unlocked live catalog otherwise, later Courts follow Game.venueId). Court on Match stays optional.

## Implementation tickets (Linear)

All labelled `ready-for-agent`. Spec: `.scratch/games-matches/spec.md`.

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-35 Game/Match rename migration + Game lists](https://linear.app/temba-app/issue/TEM-35/gamematch-rename-migration-game-lists) | — |
| 2 | [TEM-36 Friendly game create + register + Game home](https://linear.app/temba-app/issue/TEM-36/friendly-game-create-register-game-home) | TEM-35 |
| 3 | [TEM-37 Waitlist FIFO + open/full/closed + leave](https://linear.app/temba-app/issue/TEM-37/waitlist-fifo-openfullclosed-leave) | TEM-36 |
| 4 | [TEM-38 Organizer kick + reopen + cancel + cap/window edit](https://linear.app/temba-app/issue/TEM-38/organizer-kick-reopen-cancel-capwindow-edit) | TEM-37 |
| 5 | [TEM-39 Americano create + player pool](https://linear.app/temba-app/issue/TEM-39/americano-create-player-pool) | TEM-37 |
| 6 | [TEM-40 Friendly tournament + add Matches + Courts](https://linear.app/temba-app/issue/TEM-40/friendly-tournament-add-matches-courts) | TEM-37 |
| 7 | [TEM-41 Sets + Match complete](https://linear.app/temba-app/issue/TEM-41/sets-match-complete) | TEM-36, TEM-40 |
| 8 | [TEM-42 Game Lookup invite + Invite link](https://linear.app/temba-app/issue/TEM-42/game-lookup-invite-invite-link) | TEM-37 |
| 9 | [TEM-43 Soft-archive Club Group Game rules](https://linear.app/temba-app/issue/TEM-43/soft-archive-club-group-game-rules) | TEM-38, TEM-42 |

Frontier: **TEM-35** only. Do not implement until an implementer / orchestrator is asked to run the tickets in order.
