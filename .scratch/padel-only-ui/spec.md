Status: ready-for-agent

## Problem Statement

The App already lets people pick football when they create a Community, add Community sports, or create a Club Group or Loose Group. Temba should operate as padel-only for now: Users must not choose a sport, and the product must handle padel structure (court, sets, teams) without pretending Game is sport-agnostic.

Football and other sports will come later. The domain still has Community sports as an allow-list and Groups still have exactly one sport. Removing football from the schema, or collapsing Community sports, would paint the product into a padel-only corner.

## Solution

Hide every sport-choosing control in the App. Create Community, Club Group, and Loose Group always send padel from the UI. Community home has no add/remove Community sports section. Sport badges stay and show the stored sport.

tRPC, Community sports rows, and the padel/football enums stay as they are. Crafted clients can still send football. Turning football on later is showing the same controls, not a redesign.

Approving this spec approves the Test seams in Testing Decisions. It also approves the surgical edits to the Community spec so the two contracts do not fight.

## User Stories

1. As an authenticated User, I want to create a Community Public with a name and type only, so that I become Owner of a listed club without choosing a sport.

2. As an authenticated User, I want that new Community Public to store padel on Community sports, so that Club Groups created from the App have an allow-list sport.

3. As an authenticated User, I want to create a Community Private with a name and type only, so that the club is unlisted and invite-only without choosing a sport.

4. As an authenticated User, I want that new Community Private to store padel on Community sports, so that the club is padel in the App like a Community Public.

5. As an authenticated User on create Community, I want no sport checkboxes, select, or helper text that mentions football, so that the product does not offer a sport I cannot use.

6. As an authenticated User on create Community, I want no one-option padel picker, so that I am not asked a question with only one answer.

7. As a new Owner, I want the Community to exist with zero Groups after create, so that I can set up the club before adding squads.

8. As an Owner or Admin, I want to create a Club Group Public with a name and public type only, so that the squad is padel without choosing a sport.

9. As an Owner or Admin, I want that Club Group Public to store padel, so that the Group’s sport matches what the App offers.

10. As an Owner or Admin, I want to create a Club Group Private with a name and private type only, so that an invite-only squad is padel without choosing a sport.

11. As an Owner or Admin, I want that Club Group Private to store padel, so that private squads follow the same padel lock as public ones.

12. As an Owner or Admin creating a Club Group from the App, I want create to be refused with the existing allow-list error if padel is not on Community sports, so that the App does not silently send football for an API-only football Community.

13. As a Member who is not Owner or Admin, I want creating a Club Group to still be refused, so that staff still control squads inside the club.

14. As an authenticated User, I want to create a Loose Group Public with a name and public type only, so that I can run a padel squad outside any club without choosing a sport.

15. As an authenticated User, I want that Loose Group Public to store padel, so that open-with-link squads are padel in the App.

16. As an authenticated User, I want to create a Loose Group Private with a name and private type only, so that invite-only Loose Groups are padel without choosing a sport.

17. As an authenticated User, I want that Loose Group Private to store padel, so that private Loose Groups follow the same padel lock.

18. As an authenticated User on Loose Group create, I want no Padel/Football select, so that I never pick a sport in v1.

19. As a Group creator, I still want to be added as a Group member when I create a Club Group or Loose Group from the App, so that membership rules do not change.

20. As an Owner or Admin on Community home, I want no add-sport control, so that I cannot add football from the dashboard.

21. As an Owner or Admin on Community home, I want no remove-sport control, so that I cannot change Community sports from the dashboard.

22. As an Owner or Admin, I want Community home to stop telling me I can “add padel or football to the allow-list” or “add football later,” so that operational copy matches the padel-only UI.

23. As a Member who is not Owner or Admin, I want Community sports to remain uneditable in the App, so that staff powers do not leak.

24. As a User browsing the Directory, I want sport badges to still show the stored Community sports, so that a football row (if one exists) stays honest.

25. As a User on the hub, Community home, Group home, or dashboard home, I want sport badges to still show the stored sport, so that hiding pickers does not hide history.

26. As a User, I want layout and auth-shell copy to stay “competitive sports,” so that positioning can stay multi-sport while the door is padel.

27. As a caller of create Community tRPC, I want `sports` to stay a required list of padel and/or football (at least one), so that the create contract does not change.

28. As a crafted client, I want create Community to still accept football, both, or football-only, so that football stays available without a schema migration.

29. As a crafted client, I want add Community sports tRPC to still accept padel or football, so that “add football later” remains an API, not a rewrite.

30. As a crafted client, I want remove Community sports tRPC to still refuse while any Club Group of that sport exists in that Community, so that allow-list integrity stays.

31. As a crafted client, I want Club Group create tRPC to still take one sport that must be on Community sports, including football when it is on the list, so that football Club Groups remain possible without App UI.

32. As a crafted client, I want Loose Group create tRPC to still take padel or football, so that football Loose Groups remain possible without App UI.

33. As a User of the App, I want football Club Groups and Loose Groups to exist only via those tRPC paths, so that the product surface never offers football.

34. As an operator, I want existing football Community sports, Groups, Games, or coaches left readable if they exist, so that this change is not a data rewrite.

35. As an operator, I want no conversion of football to padel and no deletion of football rows, so that history stays honest.

36. As a User, I want Game to keep requiring a court and tracking sets and sets won/lost on teams and players, so that padel structure stays the Game shape.

37. As a User, I want this slice not to add Game create or Game display product, so that padel-only UI does not become a Game feature.

38. As a User, I want pickup listing to stay as it is (no sport filter), so that we do not hide football Games as a side effect of hiding pickers.

39. As a developer, I want `football` to remain on the Group, Game, and coach sport enums, so that turning football on later is not a schema migration.

40. As a developer, I want those three enums left unconsolidated, so that this slice does not become a sport-enum refactor.

41. As a developer, I want no fourth padel/football enum, so that Community sports keeps using the Group sport enum.

42. As a developer, I want the Community sports table kept, with a padel row written on Community create from the App, so that football later is unhiding add-sport, not reintroducing an allow-list.

43. As a User, I want Coach, Court, and coaching-session product left untouched, so that this slice stays on Community and Group sport choosers.

44. As a User, I want Directory, join, invites, Soft-archive, and roles unchanged except for the sport-choosing UI, so that the Community feature does not regress.

45. As an implementer, I want the Community spec and its local tickets that still promise football pickers updated to this lock, so that two contracts do not fight.

## Implementation Decisions

- This is a UI lock in the App. Do not change tRPC Zod schemas, insert logic, or allow-list checks for Community or Group sport writes.

- Create Community in the App has no sport picker. The page always submits `sports: ["padel"]`. Name, type (Community Public or Community Private), and existing create rules stay.

- Club Group Public and Club Group Private create in the App have no sport field. Those forms always submit `sport: "padel"`. If padel is not on Community sports, the existing allow-list error stands. Do not fall back to another sport on the allow-list.

- Loose Group Public and Loose Group Private create in the App have no sport field. Those forms always submit `sport: "padel"`.

- Community home has no add/remove Community sports section and no copy that offers adding football. Sport badges on Community home may still list stored Community sports.

- Keep sport badges on Directory, hub, Community home, Group home, and dashboard home. They render the stored sport, including `football` if a row exists.

- Keep layout and auth-shell “competitive sports” copy. Change only operational helper text that tells the User to choose padel, football, or both, or to add football later.

- `communities.create` still takes `sports` min 1 (`padel` | `football`). Server behavior unchanged. Crafted clients may send football, both, or football-only.

- `addSport` and `removeSport` stay. Remove still refuses while a Club Group of that sport exists. Members still cannot change Community sports through those procedures. Ticket 10’s dashboard UI is out of this slice; the procedures remain.

- Club Group and Loose Group create tRPC still take `sport: padel | football`. Club Group still requires the sport on Community sports.

- Do not migrate data. Do not convert football to padel. Do not delete football rows. This Cloud DB was empty at spec time; production inventory is not a gate. If football rows exist anywhere, they stay readable.

- Do not change the DB Package schema. Keep `football` on the Group sport enum (also used by Community sports), the Game sport enum, and the coach sport enum. Do not add a fourth enum. Do not consolidate the three enums.

- Keep Community sports as the allow-list table. Create Community from the App still inserts a padel Community sports row through the existing create transaction (because the client sends `["padel"]`), not by teaching the server to ignore `sports`.

- Game stays padel-shaped: required court, sets played, sets won/lost on teams and players. Do not generalize Game. Do not ship Game create or Game display. Do not add a football match shape (pitch, goals, halves, 5-a-side vs 11).

- Do not add Coach, Court, or coaching-session product. Pickup listing stays as it is (no sport filter). Writes that do not exist yet (Game create, coach create) inherit this spec’s API rule when they ship: tRPC may still accept football; App UI must not offer it.

- Do not collapse Community sports until multi-sport ships. Do not make Club Groups “just padel” with no allow-list row.

- Glossary: Community sports remains the allow-list of sports a Community offers (padel, football, or both). Each Group still has exactly one sport. Do not invent “Group sports.” Do not rewrite the glossary intro as a padel-only product. No new ADR. ADRs 0004 (optional Community parent) and 0005 (Soft-archive) are untouched.

- Amend the Community spec (stories 1, 2, 18, 20, 31, 32, the add-sport test seam, locked defaults as needed) and local tickets 02, 05, 06, 07, and 10 so they describe padel-only App UI and unchanged tRPC. Publish those edits with this spec.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist, plus the same tRPC writes a crafted client can still make. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): an authenticated User never chooses a sport in the App; Community and Group creates from the App persist padel; Community home cannot change Community sports; tRPC still accepts football; badges still show a stored football sport if one exists.

If you implement this spec, you implement these seams:

- Create Community Public and Community Private with no sport picker; Community sports is padel; creator is Owner
- Club Group Public and Club Group Private create from the App have no sport field; Group sport is padel; Member still cannot create a Club Group
- Club Group create from the App is refused with the existing allow-list error if padel is not on Community sports
- Loose Group Public and Loose Group Private create from the App have no sport field; Group sport is padel
- Community home has no add/remove Community sports controls and no “add football later” copy
- Sport badges still render stored Community sports and Group sport, including `football`
- Layout and auth-shell still say “competitive sports”
- `communities.create` still accepts football, both, or football-only when invoked outside the App form
- `addSport` / `removeSport` still work as today (add OK; remove blocked while a Club Group of that sport exists; Members cannot)
- Club Group and Loose Group create tRPC still accept `sport: football` (Club Group still allow-list checked)
- Directory, join, invites, Soft-archive, and stub Game tRPC still behave as the Community spec; Route `/public` still redirects to login

Manual check: existing home, login, and dashboard Clerk behavior still work.

### Modules under that seam

App create-Community page, Community home, Club Group create forms, Loose Group create page, and sport badges on Directory, hub, Group home, and dashboard home — only as they affect the flows above. tRPC and the DB Package are in the seam as “must not change” for sport writes and schema.

### Prior art

Community spec testing decisions: no runner, one authenticated product seam, manual Clerk and Route `/public` check.

## Out of Scope

- Rejecting `football` on tRPC
- Removing `football` from sport enums
- Consolidating the three sport enums
- Collapsing the Community sports table
- Auto-inserting padel by ignoring `sports` on create Community
- A visible one-option padel picker
- Converting or deleting existing football rows
- Production inventory as a gate
- Game create or Game display
- Generalizing Game (optional court, sport-specific payload)
- Football match shape
- Coach, Court, or coaching-session UI
- Pickup listing sport filter
- Directory city or sport filters
- Changing layout/auth-shell positioning to “padel only”
- Dropping sport badges while there is only one sport
- New sports beyond padel and football
- Reopening optional Community parent, Soft-archive, invites, or roles
- A new ADR
- CI or a test runner

## Further Notes

Glossary: Root CONTEXT.md. Community sports is still the allow-list (padel, football, or both) at the domain layer; this spec only locks the App’s sport-choosing UI. Architecture: docs/adr/0004 and 0005 do not constrain this lock.

The Community spec (`.scratch/community/spec.md`) remains the contract for Community, Groups, invites, and Soft-archive. This spec is the delta for padel-only App UI. Implementers must not rebuild football pickers from the old Community stories.

Locked decisions (not a further grill): UI-only lock; create Community / Club Group / Loose Group App forms always send padel; no sport field and no one-option picker; Community home has no add/remove Community sports UI; tRPC unchanged; enums keep `football`; Community sports table kept; badges kept; plural sports copy kept; Game stays padel-shaped and is not built here; football rows stay readable; production inventory is not a gate.

Tickets (all unblocked, `ready-for-agent`):

- [Create Community is padel-only](https://linear.app/temba-app/issue/TEM-11/create-community-is-padel-only) (TEM-11)
- [Create Loose Group is padel-only](https://linear.app/temba-app/issue/TEM-12/create-loose-group-is-padel-only) (TEM-12)
- [Community home is padel-only](https://linear.app/temba-app/issue/TEM-13/community-home-is-padel-only) (TEM-13)

Do not implement until an implementer is asked to run them. Work the frontier: any of the three can start immediately.
