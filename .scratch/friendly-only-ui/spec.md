Status: draft

## Problem Statement

The App lets people pick Americano or Friendly tournament when they create a Game, then add Matches and Sets by hand on Game home. Temba should operate as Friendly game only for now: one Match per Game, three Set shells on that Match, no format chooser, and no Set factory on Game home.

Americano and Friendly tournament stay in the domain and in tRPC. Removing those formats from the schema, or teaching create to reject them, would paint the product into a Friendly-game corner.

## Solution

Hide every format-choosing control in the App. Create Game always sends Friendly game. Game home has no Add Match, no Add Set, and no Remove Set. Format badges are hidden. Existing Americano and Friendly tournament rows stay listed and openable.

The one server change: creating a Friendly game inserts three Set shells on its one Match in the same create transaction. tRPC still accepts Americano and Friendly tournament. Crafted clients can still add Matches and Sets. Turning those formats on later is showing the same controls, not a redesign.

Approving this spec approves the Test seams in Testing Decisions. It also approves the surgical edits to the games-matches spec so the two contracts do not fight.

## User Stories

1. As an Owner, Admin, or that Club Group’s creator, I want to create a Game from the App with a name, public flag, individual or team-only, and a window, and without choosing a format, so that the Group gets a Friday-night Friendly game.

2. As that creator, I want that Game stored as Friendly game with caps 4 players or 2 Teams, so that App create never sends Americano or Friendly tournament.

3. As that creator, I want creating the Game to create its one Match and three Set shells in the same transaction, so that Game home already has a three-Set notepad.

4. As a Member who is not Owner, Admin, or that Club Group’s creator, I want creating a Club Group Game to still be refused, so that Club play stays staff-run.

5. As the creator of a Loose Group, I want to create a Game from the App the same way (Friendly game, one Match, three Set shells), so that Loose Group play matches Club Group create.

6. As a Loose Group member who is not the creator, I want creating a Game to still be refused, so that organizer power does not leak.

7. As an authenticated User, I want to create a groupless Game from the App the same way, so that pickup is still a Friendly game with one Match and three Set shells. I become the only organizer.

8. As an authenticated User on Create Game, I want no Format select and no helper text that names Americano or Friendly tournament, so that the product does not offer a format I cannot use.

9. As an authenticated User on Create Game, I want no one-option Friendly game picker, so that I am not asked a question with only one answer.

10. As an authenticated User on Create Game, I want the page to say it is padel only, that a Friendly game creates one Match, that caps are 4 / 2, and whether the Game belongs to a Group or is groupless, so that operational copy matches the lock.

11. As an organizer on Create Game, I still want Individual vs Team-only, so that I can choose seats or complete Teams. Caps stay 4 / 2 either way.

12. As a User of the App, I want Create Game to keep sending padel and to keep having no sport picker, so that padel-only UI stays consistent.

13. As an Owner or Admin of a Soft-archived Community, I want creating a new Club Group Game to still be refused, so that archived clubs do not start new events.

14. As a User browsing Home, pickup, or Group games, I want existing Americano and Friendly tournament Games to stay on those lists, so that hiding create does not hide history.

15. As a User who can see one of those Games, I want to open Game home, so that existing rows stay readable.

16. As an operator, I want no conversion of Americano or Friendly tournament to Friendly game and no deletion of those rows, so that this change is not a data rewrite.

17. As an organizer of an existing Friendly tournament, I want no Add Match form on Game home, so that the App cannot grow a tournament from the dashboard.

18. As an organizer of an existing Americano, I want no pool-register card on Game home, so that the App cannot add people to an Americano pool from that control.

19. As an organizer of an existing Americano or Friendly tournament, I want no cap-edit form on Game home, so that the App does not grow those fields. Friendly game caps stay 4 / 2 with no cap form.

20. As a User on Game home or a Game list card, I want no format badge, so that the App does not label Friendly game / Americano / Friendly tournament.

21. As a User on Game home, I still want registration-mode, registration-status, Public, and sport badges, so that hiding format does not hide the join door or padel.

22. As a caller of create Game tRPC with format Friendly game, I want the one Match to be created with three Set shells in the same transaction, so that every caller — App and crafted client — gets the same notepad.

23. As a caller of that create, I want no `setCount` input and no opt-out, so that planned-N stays out of this product.

24. As a crafted client creating an Americano, I want create to still insert zero Matches and zero Sets, so that Americano stays a pool until a later generation slice.

25. As a crafted client creating a Friendly tournament, I want create to still insert zero Matches, so that the organizer still adds Matches by hand over tRPC.

26. As a crafted client calling add Match, I want that Match to still start with zero Sets, so that add Match does not grow a planned notepad.

27. As a crafted client, I want create Game tRPC to still accept Americano and Friendly tournament, so that those formats stay available without a schema migration.

28. As a User of the App, I want Americano and Friendly tournament to exist only via those tRPC paths (or rows already in the database), so that the product surface never offers those formats.

29. As an organizer or a User on a Match’s Game teams, I want no Add Set button on Game home, so that the App is not a Set factory.

30. As an organizer or a User on a Match’s Game teams, I want no Remove Set button on Game home, so that I cannot take the notepad below three shells with no way to add them back in the App.

31. As an organizer or a User on those Game teams, I still want games-won inputs, Save, and Complete Match, so that scoring and freeze still work.

32. As an organizer on Game home, I want copy not to tell me I can add a Set shell, so that hidden controls are not advertised.

33. As a crafted client, I want add Set and remove Set tRPC to stay, so that Sets remain writable without App UI.

34. As an organizer opening Game home on a historical Friendly game whose Match has fewer than three Sets, I want the App to call add Set until that Match has three shells, so that hiding Add Set does not strand scoring.

35. As a User who is not an organizer, I want opening that Game home not to insert Sets, so that ensure-3 is not a stranger write.

36. As an organizer of a cancelled or completed Match, I want ensure-3 to skip that Match, so that the App does not call add Set when the server would refuse.

37. As an organizer of a Friendly game Match that already has three or more Sets, I want those rows left as they are, so that extras are not deleted and a full notepad is not rewritten.

38. As an organizer of an Americano, I want no ensure-3, so that Americano still has no Sets this slice.

39. As an organizer of a historical Friendly tournament Match with zero Sets, I want no ensure-3 and no Add Set in the App, so that tournament scoring from the App stays stranded until a crafted client adds a shell.

40. As a User, I want no database migration of existing Matches, so that historical Set counts are not rewritten at deploy.

41. As a caller of Game by-id, I want that read not to insert Set shells, so that ensure-3 is not a GET side effect.

42. As an organizer or a User on a Match’s two Game teams, I want to mark the Match completed once at least one Set is scored, even if other shells are still blank, so that three shells are a notepad, not a must-play-three rule.

43. As anyone, I want entering or editing games-won to stay refused until both slots have complete Game teams (two Positions each), so that scoring cannot happen without sides.

44. As an organizer, I still want Set shells to exist before sides exist, so that the three shells created at Friendly game create are legal.

45. As a viewer, I want Set-wins, games-draw, Match draw, and complete-freeze to stay as games-matches shipped them, so that this lock does not invent best-of-3.

46. As a User not on the Match’s Game teams and not an organizer, I want score and complete to still be refused, so that strangers cannot write results.

47. As a User on an individual Friendly game, I still want to pick a vacant Position or register with a partner, so that individual-game-seats does not change.

48. As a User, I want register, Waitlist, leave, kick, close, reopen, cancel, window edit, Lookup invite, and Invite link to stay as they are, so that this slice is not a registration rewrite.

49. As a developer, I want `americano` and `friendly_tournament` to remain on the Game format enum, so that turning those formats on later is not a schema migration.

50. As a developer, I want no planned-N column and no per-Match set-length override, so that games-matches out of scope stays out of scope.

51. As an implementer, I want the games-matches spec stories, UI bullets, and App test seams that still promise a format picker, Add Match, and Add Set in the App updated to this lock, so that two contracts do not fight.

## Implementation Decisions

- This is an App UI lock plus one create-transaction change. Do not change tRPC Zod schemas for format, add Match, add Set, or remove Set. Do not reject Americano or Friendly tournament on create. Do not add a `setCount` input.

- Create Game in the App has no Format field and no one-option picker. The page always submits format Friendly game. Name, public flag, Individual vs Team-only, required window, and existing create authorization stay. Do not send Americano or tournament caps from the App.

- Create Game copy is padel only, Friendly game, one Match, caps 4 / 2, and Group vs groupless. Strip copy that names Americano or Friendly tournament or that says format cannot change because a format control exists.

- **Friendly game create (all callers).** When create Game inserts a Friendly game, it already inserts the one Match in the same transaction. That transaction now also inserts three Set shells on that Match (games-won blank). Every caller gets this: App and crafted tRPC. No opt-out.

- Americano create still inserts zero Matches and zero Sets. Friendly tournament create still inserts zero Matches. Add Match still inserts a Match with zero Sets.

- Game home in the App has no Add Match form, including on existing Friendly tournament rows and on Soft-archived Club Group Games. Add Match tRPC stays.

- Game home in the App has no Americano pool-register card. Individual Americano register tRPC stays.

- Game home in the App has no cap-edit form on Americano or Friendly tournament. Friendly game still shows that caps stay 4 / 2. Cap-update tRPC stays.

- Game home in the App has no Add Set and no Remove Set on any Match. Score inputs, Save, and Complete Match stay. Add Set and remove Set tRPC stay.

- Empty-Sets and scoring-frozen helper text must not tell the User to add a shell.

- Hide the format badge on Game home and on Game list cards (Home, pickup, Group games), including existing Americano and Friendly tournament rows. Do not hide registration-mode, registration-status, Public, or sport badges. Stored format is unchanged.

- **Historical ensure-3 (App only).** When an organizer opens Game home on a Friendly game, for each Match that is not cancelled and not completed and that has fewer than three Sets, the App calls add Set until that Match has three shells. Do not run this for non-organizers. Do not run this on Americano. Do not run this on Friendly tournament Matches. Do not run this on GET/by-id on the server. Do not migrate existing rows. Do not delete Sets when a Match already has three or more.

- Complete Match, who may score, freeze until both sides have two Positions, shells before sides, games-draw, and complete after at least one scored Set stay as games-matches / individual-game-seats shipped them. Do not require all three Sets scored. Do not invent best-of-3.

- Do not change the DB Package schema. Keep Friendly game, Americano, and Friendly tournament on the format enum. Do not add planned-N.

- Do not migrate data. Production inventory is not a gate. Existing Americano, Friendly tournament, and Friendly game rows stay readable. Lists still show those Games.

- Padel-only UI stays: App still sends padel; no sport picker. Individual-game-seats stays: Positions, seat grid, partner-register. Registration, Waitlist, invites, Soft-archive join freeze, and counters-at-zero stay.

- Glossary unchanged. Friendly game remains the format with exactly one Match created with the Game. Do not invent “Friendly match” as a format. No new ADR. ADR-0008 (Game is the parent event) is untouched.

- Amend the games-matches spec so App stories, the UI bullet, Match/Set create bullets, and App test seams describe Friendly-only App UI, three Set shells on Friendly game create, hidden Add Match / Add Set / Remove Set / format badge, and unchanged tRPC. Publish those edits with this spec. tRPC stories for Americano, Friendly tournament, add Match, and add Set remain as crafted-client paths.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist, plus the same tRPC writes a crafted client can still make. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): an authenticated User never chooses a Game format in the App; Create Game from the App persists a Friendly game with one Match and three Set shells; Game home cannot add or remove Sets or add a Match; format badges are absent; historical Friendly game Matches with fewer than three Sets grow to three when an organizer opens Game home; tRPC still accepts Americano, Friendly tournament, add Match, add Set, and remove Set; existing non–Friendly-game rows stay listed and openable.

If you implement this spec, you implement these seams:

- Create Game from the App (Club Group, Loose Group, groupless) has no Format select and no one-option picker; always Friendly game; one Match; three Set shells; caps 4 / 2; App padel; Individual vs Team-only still offered
- Create Game copy does not name Americano or Friendly tournament
- Member who is not staff or Group creator still cannot create a Club Group Game; Soft-archive still refuses new Club Group Games
- Game home has no Add Match, no Add Set, no Remove Set; score, Save, and Complete Match still work under existing who-may-score rules
- Complete Match still works after at least one scored Set with other shells blank
- Format badge absent on Game home and on Home / pickup / Group Game cards; registration-mode, status, Public, and sport badges remain
- Existing Americano and Friendly tournament Games still appear on those lists and still open; App hides pool-register, Add Match, and cap-edit on those rows
- Organizer opening a historical Friendly game Match with 0–2 Sets results in three shells; 4+ unchanged; cancelled and completed Matches skipped; non-organizer view does not insert Sets
- No ensure-3 on Americano or Friendly tournament; a 0-Set tournament Match has no Add Set in the App
- Crafted `games.create` with Friendly game still inserts one Match and three Set shells; no `setCount` field
- Crafted `games.create` still accepts Americano (zero Matches) and Friendly tournament (zero Matches)
- Crafted add Match still inserts a Match with zero Sets; add Set / remove Set still work
- Registration, Waitlist, invites, individual-game-seats, padel-only UI, and Soft-archive join freeze still behave as their specs
- Route `/public` still redirects to login

Manual check: existing Community, Group, Team, Venue, login, Invites, and Home Clerk behavior still work.

### Modules under that seam

App Create Game, Game home (Matches / Sets / organizer chrome), and Game list cards — only as they affect the flows above. Create Game tRPC is in the seam for Friendly game Set shells. Other Game tRPC and the DB Package schema are in the seam as “must not change” except that Friendly game create inserts three Set shells.

### Prior art

Padel-only-ui testing decisions: no runner, one authenticated product seam, crafted-client tRPC still accepts the hidden option, badges (here: format badges hidden; other typed labels kept). Games-matches testing decisions: signed-in App flows and persisted data; no CI.

## Out of Scope

- Rejecting Americano or Friendly tournament on tRPC
- Removing those values from the format enum
- A visible one-option Friendly game picker
- Planned-N / per-Match set-length / `setCount` on create
- Best-of-3 or requiring all three Sets scored before Complete Match
- Changing add Match to insert Set shells
- Teaching Americano create to insert Matches or Sets
- Database migration of existing Set counts
- Deleting extra Sets (4+)
- Server ensure-3 on GET / by-id
- Ensure-3 on Americano or Friendly tournament
- Hiding Americano or Friendly tournament Games from Home, pickup, or Group lists
- Rewriting existing rows to Friendly game
- Locking registration mode to Individual or Team-only
- Changing individual-game-seats, Positions, or partner-register
- Changing padel-only UI
- Americano Match generation
- Friendly tournament bracket
- Updating User, Group, or Team stored counters
- Visual redesign
- A new ADR
- Glossary edits
- CI or a test runner

## Further Notes

Glossary: Root CONTEXT.md. Friendly game is still the format with exactly one Match created with the Game. Americano and Friendly tournament remain formats at the domain layer; this spec locks the App’s format-choosing UI and starts a Friendly game Match with three Set shells. Architecture: ADR-0008 does not constrain this lock.

The games-matches spec (`.scratch/games-matches/spec.md`) remains the contract for Game, Match, Set, registration, Waitlist, and Game invites. Individual-game-seats (`.scratch/individual-game-seats/spec.md`) remains the contract for Positions and solo seat-join. Padel-only-ui (`.scratch/padel-only-ui/spec.md`) remains the contract for sport choosers. This spec is the delta for Friendly-only App UI plus three Set shells on Friendly game create. Implementers must not rebuild a format picker, Add Match, or Add Set from the old games-matches stories.

Locked decisions (not a further grill): App create always Friendly game, no format field, no one-option picker; strip Americano / Friendly tournament create copy; keep Individual vs Team-only and caps 4 / 2; existing other-format rows stay listed and openable; hide Add Match, Americano pool-register, non–Friendly-game cap form, Add Set, Remove Set, and format badges; Friendly game `games.create` inserts three Set shells for all callers with no opt-out; add Match still zero Sets; historical Friendly game organizer ensure-3 via add Set; no migration; no ensure-on-get; no ensure-3 on tournament; Complete Match and scoring rules unchanged; tRPC still accepts hidden formats and Set writes; amend games-matches; no new ADR.

Do not create Linear tickets until this spec is approved. Do not implement until an implementer is asked to run those tickets.
