Status: ready-for-agent

## Problem Statement

Organizers creating a **Game** cannot say **where** it is played. Create Game has no **Venue** or **Court** fields. **Venue** is required in product (a Game always happens at a place) but the Game row has no Venue. Court lives only on **Match**, and only a **Friendly tournament** organizer can assign one after create. A **Friendly game** Match is created with no Court and Game home has no Court editor. An unlinked **Club Group** cannot pick a Court at all.

Players and organizers need Venue at create (required), optional Court, and later Match Court assign keyed off that Game’s Venue — not the Community’s current **Venue link**.

## Solution

Ship required **Venue** and optional **Court** on Game create in the DB Package and App.

Every Game has exactly one Venue, chosen at create and immutable after. **Club Group** whose Community has a live Venue link: that Venue is default and locked. Club Group with no Venue link, **Loose Group**, and groupless: pick any live Operator Venue. Court is optional. **Friendly game** (the App): one Court Select with None; that Court, if any, is written onto the one Match created with the Game. **Americano** and **Friendly tournament** (tRPC): optional list of Courts recorded on the Game for later Match assignment; still zero Matches at create. App multi-select and the format picker stay later.

After create, **Game.venueId** is the source of truth for assignable Courts. Friendly game Game home gets an organizer Court Select. Community unlink/relink does not rewrite existing Games.

Approving this spec approves the Test seams in Testing Decisions. Glossary edits in root `CONTEXT.md` ship in the same planning commit. This amends games-matches Stories 32–34 and the Court assign bullets. It does not replace `.scratch/games-matches/spec.md` or `.scratch/friendly-only-ui/spec.md`.

## User Stories

1. As an Owner, Admin, or that Club Group’s creator, I want to pick a Venue when I create a Friendly game from the App, so that the Game has a place.

2. As that organizer, I want Venue to be required, so that I cannot create a Game with no place.

3. As that organizer, I want to pick one Court on that Venue or skip Court, so that Court is optional.

4. As that organizer, I want a skipped or chosen Court written onto the one Match created with the Game, so that Friendly game Court is on the Match from the start.

5. As that organizer on a Club Group whose Community has a live Venue link, I want that Venue selected and locked, so that club play stays on the club site.

6. As that organizer on a Club Group with no Venue link, I want a dropdown of live Operator Venues, so that we can still play somewhere before the Community claims a site.

7. As the creator of a Loose Group, I want the same unlocked live Venue dropdown when I create a Game from the App, so that pickup outside a Community still has a place.

8. As an authenticated User creating a groupless Game, I want the same unlocked live Venue dropdown, so that groupless play has a place too.

9. As an authenticated User on Create Game, I want no Format select and no one-option Friendly game picker, so that this slice does not bring back a format chooser. The App already submits Friendly game; keep that.

10. As an organizer on Create Game, I still want Individual vs Team-only, public flag, optional name, and the required window, so that Venue/Court does not replace those fields.

11. As an organizer, I want each Venue option labelled `name — city, country`, so that two sites with the same trade name in different cities are distinguishable.

12. As an organizer changing Venue on the form before submit, I want the Court selection cleared, so that I cannot submit a Court from the previous Venue.

13. As an organizer on a locked Venue, I want no other Venue options, so that I cannot swap the Community’s linked Venue.

14. As an organizer picking a Venue that has zero Courts, I want the Court dropdown empty and skip Court, so that a new site can host a Game before Courts are named.

15. As an organizer on unlocked create with zero live Venues in the catalog, I want create refused with a form error, so that I am not asked to pick a Venue that does not exist.

16. As an organizer of a Club Group whose linked Venue is Soft-archived, I want that Venue locked and shown as Soft-archived, the Court dropdown empty, and create still allowed with skip Court, so that archive does not unlock a different site and does not block creating the Game.

17. As that organizer, I want copy “Venue is this Community’s linked Venue and cannot be changed. Court is optional.” when the linked Venue is live, so that the lock is explained.

18. As that organizer on an unlinked Club Group, I want copy “This Community has no Venue link. Pick a Venue. Court is optional.”

19. As that organizer on a locked Soft-archived Venue, I want copy “This Community’s linked Venue is Soft-archived. You can still create this Game here. Skip Court.”

20. As an organizer of a Loose Group or groupless Game, I want copy “Pick a Venue. Court is optional.”

21. As a Member who is not Owner, Admin, or that Club Group’s creator, I want creating a Club Group Game to still be refused, so that who may create Games does not change.

22. As an Owner or Admin of a Soft-archived Community, I want creating a new Club Group Game to still be refused, so that archive still blocks new events.

23. As a Loose Group member who is not the creator, I want creating a Game to still be refused.

24. As an organizer, I want picking a Court that does not belong to the selected Venue to be refused, so that mixed-Venue Courts cannot land on one Game.

25. As an organizer on unlocked create, I want a Soft-archived Venue hidden from the dropdown and refused if sent, so that hidden sites are not scheduled except the locked linked case.

26. As a crafted client creating any format, I want `venueId` required, so that tRPC and the App share the same invariant.

27. As a crafted client creating a Friendly game, I want optional `courtId` on the one Match and sending `courtIds` refused, so that Friendly game has no list of Courts on the Game.

28. As a crafted client creating an Americano, I want optional `courtIds` recorded on the Game, `courtId` refused, and still zero Matches, so that Courts are stored for later generation without inventing Matches now.

29. As a crafted client creating a Friendly tournament, I want optional `courtIds` recorded on the Game, `courtId` refused, and still zero Matches, so that I can constrain later Match Courts without adding Matches at create.

30. As a crafted client sending duplicate `courtIds`, I want that create refused, so that the Game does not store the same Court twice.

31. As a crafted client sending an unknown Court, a Court on another Venue, or a Court on a live-required Venue that is Soft-archived, I want create refused.

32. As a crafted client on locked Soft-archived Club Group create, I want non-empty Court fields refused, so that Courts are not assigned on an archived Venue.

33. As a crafted client on locked Club Group create, I want a `venueId` that is not the linked Venue refused, so that the lock is not only UI.

34. As a crafted client on unlocked create, I want a missing or Soft-archived `venueId` refused.

35. As a User who may create that Game, I want a Game-create Venue picker query (not the Community claim catalog), so that a Group creator who is not Owner or Admin can still pick a Venue.

36. As that User, I want the unlocked picker to list live Venues including those with zero Courts, with name, city, country, and Courts, and not to name other Communities, so that this is not a Directory and not a leak of who shares a site.

37. As an organizer of a locked Club Group, I want that picker to return only the linked Venue (including Soft-archived, with Courts empty if archived), so that the dropdown cannot offer another site.

38. As an unauthenticated person, I want that picker refused, so that unauthenticated Venue browse stays out.

39. As an authenticated User who cannot create that Game, I want that picker refused, so that the catalog is not a public Directory.

40. As a viewer of Game home, I want to see the Venue name (and a Soft-archived badge when that Venue is Soft-archived), so that I know where we play.

41. As a viewer of a Match line, I want to still see the Court name or “no Court”, so that Match Court display does not disappear.

42. As a viewer of Home, pickup, or Group Game cards, I want those cards to stay without Venue or Court, so that list cards stay thin.

43. As a viewer who is not an organizer, I want no Court Select, so that only organizers assign Courts.

44. As an organizer of a Friendly game, I want a Court Select on Game home for the one Match: all Courts on this Game’s Venue when that Venue is live, plus None, including after skip-at-create, so that I can set or change Court later.

45. As that organizer, I want changing times or Match slots via `updateMatch` on a Friendly game still refused, so that Friendly game stays one Match created with the Game.

46. As that organizer, I want Add Match on a Friendly game still refused.

47. As that organizer, I want cancelling that Match to still cancel the Game.

48. As an organizer of a Friendly tournament whose Game stored no Courts at create, I want later Match Court assign to offer every Court on Game.venueId (if live) plus None, so that an empty list of Courts on the Game is not a trap.

49. As an organizer of a Friendly tournament whose Game stored one or more Courts at create, I want later Match Court to be one of those Courts or skip, so that create-time Courts constrain later assign.

50. As an organizer of an Americano, I want no Matches and no Match Court UI this slice, and crafted Add Match still refused, so that Americano generation stays later.

51. As an organizer, I want `Game.venueId` immutable after create, so that place does not change under people the way format, public flag, and registration mode do not.

52. As an Owner or Admin who unlinks or relinks the Community Venue after Games exist, I want those Games to keep their Venue, so that history is not rewritten.

53. As an organizer assigning a Court when the Game’s Venue is Soft-archived, I want new assign refused and skip/clear allowed, with an empty Court list, so that hidden sites are not newly scheduled.

54. As an Operator deleting a named Court, I want that still allowed: Match Court becomes empty; that Court leaves any Game’s recorded Courts, so that this slice does not freeze Operator catalog edits.

55. As an organizer, I want no post-create editor for Game Venue or for the Game’s recorded Courts, so that those are create-time only.

56. As a caller of Game by-id, I want `venueId`, name, city, country, and `archivedAt`, so that Game home can render Venue without a second catalog round-trip.

57. As an organizer calling list Courts for a Game, I want the list keyed off Game.venueId (and the recorded-Courts rule for tournament), not the Community’s current Venue link, so that an unlinked Club Group Game that picked a Venue at create can still assign Courts there.

58. As a developer migrating leftover Games that have no Venue, I want the column NOT NULL with restrict on Venue delete, a backfill from the Club Group’s live Venue link when present, remaining rows assigned a live Venue if one exists, and the migration failed if Games exist and no live Venue exists, so that we do not invent a sentinel Venue.

59. As a User of the App, I want no Directory of Venues, no App Americano or Friendly tournament create, no Americano Match generation, no required Court, and no football picker, so that this slice stays Venue/Court on create plus Friendly Match Court edit.

60. As a reader of CONTEXT.md, I want Game to require a Venue and Court to stay a named surface a Match may point at, so that “club” still means Community and never Venue.

## Implementation Decisions

- Schema, migrations, and kit live in the DB Package. App tRPC and dashboard UI stay in the Temba App. No new Package. Follow existing Drizzle style: uuid PKs, created/updated timestamps. Kit table filter includes the new Game-Court table. Clerk remains the only identity provider. Who may create Games, join gates, registration, Waitlist, invites, Positions, padel-only UI, and Soft-archive of Community stay as shipped.

- **Game.venueId** required, not null, references Venue, **restrict** on Venue delete (Operator still cannot hard-delete a Venue in the venues spec; this keeps the same delete posture). Immutable after create. Unlink/relink of a Community Venue link does not rewrite Game.venueId. Soft-archive of Community or Venue does not rewrite Game.venueId.

- **Game-Court rows** (new join table): `gameId` + `courtId`, unique `(gameId, courtId)`. Used only for Americano and Friendly tournament create. Friendly game create inserts **no** Game-Court rows. Game delete **cascades** these rows. Court delete **cascades** these rows (that Court leaves the Game’s recorded Courts). Do not invent a glossary noun; product copy says Courts on the Game / recorded at create.

- **Match.courtId** stays optional, on-delete **set null**, still the only Court on a contest. Friendly game create sets it from optional `courtId`. Tournament add/update Match still set it. Americano has no Matches this slice.

- **Migration:** add `venue_id` NOT NULL. Backfill existing Games: if the Game’s Group is a Club Group whose Community has a live Venue link, use that Venue; remaining Games: if at least one live Venue exists, assign the first live Venue ordered by name, city, country, id; if leftover Games exist and no live Venue exists, fail the migration. Do not insert a sentinel Venue. App and `games.create` always send `venueId` after this ships.

- **Create tRPC (`games.create`):** `venueId` required on every format.
  - Friendly game: optional `courtId`; sending `courtIds` refused. Insert the one Match as today (including three Set shells as friendly-only-ui already shipped) with `courtId` null or the chosen Court.
  - Americano / Friendly tournament: optional `courtIds`; sending `courtId` refused; still zero Matches; insert Game-Court rows when `courtIds` is non-empty.
  - Duplicate `courtIds` refused. Every `courtId` must exist and belong to `venueId`.
  - **Locked Club Group** (Community has a Venue link, live or Soft-archived): `venueId` must equal that linked Venue; mismatch refused. If that Venue is Soft-archived, `courtId` / `courtIds` must be omitted or empty.
  - **Unlocked** (no Group, Loose Group, or Club Group with no Venue link): `venueId` must be a live (not Soft-archived) Operator Venue; missing or archived refused. Court(s) must belong to that Venue; archived Venue’s Courts refused.

- **Game-create Venue picker** (new query on the games router, not `communities.searchLiveVenues`): any User who may create that Game (same authorization as create). Unauthenticated refused. Unlocked: live Venues including zero Courts; fields name, city, country, Courts (id, name); do not return other Communities or lat/lng. Locked Club Group: that linked Venue only, including Soft-archived; if archived, Courts array empty. Not a Directory page.

- **Assignable Courts after create:** `listAssignableCourts` / `assertCourtAssignable` key off **Game.venueId**, not the Community’s current Venue link. If Game.venueId’s Venue is Soft-archived: empty list; new assign refused; skip/clear allowed.
  - Friendly game: all Courts on Game.venueId (when live) plus None. Create-time Court is only initial Match.courtId, not a one-item list of Courts on the Game.
  - Friendly tournament: if the Game has one or more Game-Court rows, list/assign those Courts or skip; if zero Game-Court rows, all Courts on Game.venueId (when live) plus None.
  - Americano: no Match Court UI; crafted `addMatch` stays refused (`format !== "friendly_tournament"`).

- **Friendly `updateMatch`:** allow when the Game is Friendly game, the Match is not cancelled, the Game is not cancelled, and the only field changing is `courtId` (including null). Refuse changing start/end/duration or slots on Friendly game. Add Match still refused on Friendly game. Cancel Match still cancels the Game.

- **UI:** Create Game: existing shadcn Select for Venue (required) and Court (optional, None). No new library. Locked Venue: Select disabled or single option, not editable. Do not add a Format select. Do not add multi-select Courts (later, with the format picker). Game home: show Venue name and Soft-archived badge; organizer Court Select on Friendly game as well as Friendly tournament (tournament rules above). Non-organizers see Venue and Match Court name only. Home / pickup / Group cards unchanged (no Venue, no Court). Copy as stories 17–20. Reuse dashboard primitives. No visual redesign.

- **Authorization (product):**
  - Create with Venue/Court: same people who may create the Game today.
  - Picker: same people.
  - list Courts / Friendly Court edit / tournament Match Court: organizers, as today.
  - Community claim catalog stays Owner/Admin of a live Community. Do not reuse it for Game create.

- **ADR:** This is the Game-create slice ADR-0007 deferred. Game now has `venueId`; Match still points at Court, not Venue; coach and coaching-session FKs stay on Venue. No new ADR. Do not retarget Match at Venue.

- **friendly-only-ui:** Create Game already has no Format select and already inserts three Set shells. This spec must not add a Format select back. It does not hide Add Match / Add Set / Remove Set / format badges / Americano pool-register / cap-edit (those remain on `.scratch/friendly-only-ui/spec.md`). Live Game home may still show a tournament Court Select; this spec adds the Friendly game Court Select and does not require hiding tournament Add Match in this slice.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist, plus the same tRPC writes a crafted client can still make. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): an organizer can create a Friendly game from the App with a required Venue and optional Court (locked to the Community’s Venue link when the Club Group has one; otherwise any live Venue), that Court is stored on the one Match, Game home shows the Venue and lets organizers change Match Court among Courts on that Game’s Venue — without a Directory of Venues, without requiring Court, without an App format picker, without Americano Match generation, and without a post-create Venue editor. Crafted clients can create Americano and Friendly tournament with required `venueId` and optional `courtIds` on the Game.

If you implement this spec, you implement these seams:

- Create Game App: no Format select; always Friendly game; Venue required Select (`name — city, country`); optional one Court with None; changing Venue clears Court
- Club Group with live Venue link: Venue default and locked; Court optional
- Club Group with no Venue link: unlocked live catalog; Court optional
- Loose Group and groupless: unlocked live catalog; Court optional
- Unlocked create with zero live Venues: refused
- Locked Soft-archived linked Venue: create allowed, Court empty, skip only, no other Venue
- Venue with zero Courts: selectable; skip Court
- Court must belong to the selected Venue; mixed-Venue refused
- Friendly game create writes optional Court onto the one Match; no Game-Court rows
- Game home shows Venue name (and Soft-archived badge); Match lines keep Court name; list cards have no Venue/Court
- Friendly game organizer Court Select: all Courts on Game.venueId (live) plus None; `updateMatch` Court including None; times/slots/Add Match still refused on Friendly game
- `listCourts` / assign keyed off Game.venueId, not Community current Venue link; unlink/relink does not rewrite Game.venueId
- Soft-archived Game Venue: empty Court list; new assign refused; skip/clear allowed
- Crafted create: `venueId` required; Friendly `courtId` optional, `courtIds` refused; Americano/tournament `courtIds` optional, `courtId` refused, zero Matches
- Duplicate / wrong-Venue / archived (unlocked) Court or Venue refused; locked archived Club Group: Court fields empty
- Empty recorded Courts on tournament: later Match Court = any Court on Game.venueId; non-empty: Match Court in that set or skip
- Crafted Add Match on Americano still refused
- Operator Court delete still allowed; Match Court set null; Game-Court rows for that Court gone
- Picker is not the Community claim catalog; does not list other Communities; unauthenticated refused
- Who may create Games, Soft-archive of Community (no new Club Group Games), padel-only UI, Individual vs Team-only, window, registration, Waitlist, invites, Positions, and Route `/public` still behave as their specs

Manual check: existing Community, Group, Team, Venue catalog, Venue link, login, Invites, Home, and Soft-archive flows still work.

### Modules under that seam

DB Package Game.venueId and Game-Court table; Game create tRPC and picker; App Create Game Venue/Court fields; Game by-id Venue payload; Game home Venue display and Friendly Court Select; list/assert assignable Courts keyed off Game.venueId — only as they affect the flows above.

### Prior art

Games-matches Court assign on Match (tournament-only Select, `listAssignableCourts` today keyed off Community Venue link). Venues spec: Operator catalog, Community Venue link, claim catalog is not a Directory. Friendly-only-ui: App create is Friendly game, no Format select. Community home Venue block. No automated tests.

## Out of Scope

- App format picker; Americano / Friendly tournament create UI; multi-select Court UI
- Americano Match generation
- Requiring Court
- Directory of Venues; unauthenticated Venue browse
- Reusing the Community Owner/Admin claim catalog as the Game-create picker
- Post-create Game Venue editor or Game-Court editor
- Changing who may create Games
- Operator catalog create/edit/Soft-archive/unarchive; Community Venue link request/approve/unlink
- Coach / coaching-session foreign keys (stay on Venue)
- Retargeting Match.courtId at Venue
- Restricting Operator Court delete
- Venue/Court on Home, pickup, or Group Game cards
- Three Set shells, hiding Add Match / Add Set / Remove Set / format badges / Americano pool-register / cap-edit (friendly-only-ui)
- Football pickers
- Hard-delete of Venue
- Visual redesign; CI; test runner
- A new ADR

## Further Notes

Glossary: apply the Language patch in root `CONTEXT.md` in the same planning commit (Game requires a Venue; Court remains the Match surface; Soft-archive of Venue includes unlocked Game create). Architecture: ADR-0007’s deferred Game-create slice; ADR-0008 unchanged (Game is the parent; Match holds optional Court).

Settled grilling: `.scratch/game-create-venue-court/decisions.md`.

**Amends** `.scratch/games-matches/spec.md` Stories 32–34 and Court assign bullets: Club Group with no Venue link may pick any live Venue at create; after create, Courts follow Game.venueId; Venue is required; Court stays optional. **Amends** `.scratch/venues/spec.md` Stories 59–60 (Game create was deferred; this is that slice). Does not replace those specs.

Create Game on current `dev` already has no Format select (friendly-only-ui). Implementers add Venue/Court and must not reintroduce a Format select.

## Implementation tickets (Linear)

All labelled `ready-for-agent`. Spec: `.scratch/game-create-venue-court/spec.md`.

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-91 Friendly game create: required Venue, optional Court](https://linear.app/temba-app/issue/TEM-91/friendly-game-create-required-venue-optional-court) | — |
| 2 | [TEM-92 Friendly Game home Court editor follows Game Venue](https://linear.app/temba-app/issue/TEM-92/friendly-game-home-court-editor-follows-game-venue) | TEM-91 |
| 3 | [TEM-93 Americano and Friendly tournament Courts on the Game](https://linear.app/temba-app/issue/TEM-93/americano-and-friendly-tournament-courts-on-the-game) | TEM-91, TEM-92 |

Frontier: **TEM-91** only. Do not implement until an implementer / orchestrator is asked to run the tickets in order.
