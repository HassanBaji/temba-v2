Status: approved on 2026-10-24 with the defaults in section 2; v1 (slices A, B, C) is ticketed, slice D stays a draft to re-grill after C ships

Tickets: created in Linear as TEM-381 … TEM-388 (the table in section 11 maps each to its id). Blocking edges are native Linear relations. FB-D1 … FB-D4 are not published.

# Football: a second sport on Courts, Groups, Teams and Games

## 1. Problem

The product owner's ask:

> Introduce football as a new sport. Players must be able to (1) create football Games, (2) create football Groups, (3) create football Teams, (4) book football courts (pitches) at a Venue.

Temba is padel-only at the door, multi-sport underneath. The database enums already carry `football` on Game, Group (also Team, Rating, Community sports) and Coach. `.scratch/padel-only-ui/spec.md` hid every sport-choosing control and promised that "turning football on later is showing the same controls, not a redesign". That promise holds for Communities and Groups. It does not hold for the three things a football player then touches:

- **Court** has no sport. A Venue's Courts are one undifferentiated list, so a Customer booking a Venue with four padel Courts and two pitches sees six "courts" and the price grid mixes them.
- **Team** is "a persistent partnership of exactly two Users". A football Team is a squad.
- **Game** is 2v2 all the way down: four seats, Left and right Positions, one Match with Sets, a doubles Glicko-2 step, a padel Level, Preferred Position on the profile. A football Game cannot be a four-seat Game with the word changed.

This spec decides what a football Court, Team and Game are in v1, how they compose with Verified Groups (`.scratch/verified-groups/spec.md`, the most recent merged spec) and Bookings (`.scratch/booking-and-facility-management/spec.md`), and cuts the work into four slices where the first is shippable alone.

## 2. Decisions taken (please confirm)

Each is a recommended default with one line of reasoning. Override any of them before tickets are published.

**Shape of the release**

- **D1. Four slices, in the order A → B → C → D.** A: sport on Court, console editing, Booking by sport. B: football Groups and Teams. C: football Games, friendly-only. D: football results and Ratings. A is independent of the Game shape and gives Venues with pitches something to sell on day one; B is mostly un-hiding; C needs a football Group to exist; D is the deepest cut and benefits from C's usage before it is designed in detail. Section 10 argues this further.
- **D2. v1 = slices A, B and C.** Football Games are **friendly-only in v1**: no Matches, no results, no football Rating, `rated = false` at create. Slice D is specified to decision level in section 5.4 and ticketed as drafts to re-grill, not to publish now. Reason: the four asks are met by A–C; the Match, Set, confirmation, rating and profile pipeline is 2v2-shaped in a dozen places and should be generalised once, against real football Games.

**Court and Booking (slice A)**

- **D3. Sport lives on the Court, not the Venue.** `courts.sport`, not null, default `padel`, reusing the `group_sport` enum as `ratings`, `teams` and `community_sports` already do (no fourth enum, per padel-only-ui). A Venue "offers" a sport when it has at least one Court of that sport. Reason: pricing rules, Closures and Bookings already hang off the Court; a Venue-level allow-list would be a second source of truth.
- **D4. The glossary term stays Court. Football product copy may say "pitch".** "Pitch" is on the Court avoid-list for code and docs; the UI face for a football Court is "pitch" ("2 pitches", "Pick a pitch"). Reason: nobody books a "football court"; renaming the entity would touch every table.
- **D5. A Venue manager sets a Court's sport in the console; an Operator may do it from the web Venues area.** `venues.addCourt` gains optional `sport` (default padel); new `venues.setCourtSport`. Both authorised by `requireVenueManager` (Operators pass). Reason: ADR-0031 keeps catalog curation on the web Operator page, which already adds and renames Courts; leaving it sport-blind would create padel-by-accident pitches.
- **D6. Changing a Court's sport is allowed at any time and never touches Bookings.** A Booking reserves a Court interval whatever the sport. Reason: the alternative (refuse while upcoming Bookings exist) adds a rule nobody asked for.
- **D7. The Customer picks a sport on the Book tab; the Venues list and the availability grid filter Courts by it.** `bookings.listBookableVenues` and `bookings.venueAvailability` gain optional `sport`; absent means no filter (today's behaviour). The mobile Book tab shows a Padel / Football switch, default Padel, remembered on the device. Reason: a Customer books one sport at a time; mixing pitches and padel Courts in one grid is the bug this slice fixes.
- **D8. A Booking on a football Court cannot create a Booking Game until slice C ships.** `bookings.createGame` refuses with "Football Games arrive in a later release" and `bookings.byId.canCreateGame` is false for it. Reason: today's Booking Game is a four-seat padel Game.

**Groups and Communities (slice B)**

- **D9. Show the hidden controls, do not redesign them.** Loose Group create gets a Padel / Football choice on web and mobile; Club Group create shows the choice only when the Community offers both sports (no one-option picker, as padel-only-ui ruled); Create Community (still staff-only) gets sport checkboxes; Community home gets add and remove sport back for Owner and Admin, with the existing server rules. Reason: this is exactly what padel-only-ui promised.
- **D10. The Public Groups list stops filtering to padel on the server and gets an All / Padel / Football filter on both clients.** `groups.listPublic` gains optional `sport`; absent means all sports. Reason: the server filter at `listPublic.ts:50,55` is a padel lock outside the UI gate; football Loose Group Public must be discoverable.
- **D11. Verified Groups composes unchanged.** A football Group is Verified the same two ways. In v1 verification has no effect on a football Game (D2); from slice D on, football Games on a Verified Group rate like padel ones. Reason: verification is a Group fact, not a sport fact (ADR-0035).

**Teams (slice B)**

- **D12. A Team's size is a sport rule.** New pure module `@repo/domain/team-roster`: `teamRosterRule(sport)` returns `{ min, max, completeAt, pairIsUnique }`. Padel: `{2, 2, 2, true}`. Football: `{2, 25, 5, false}`. A Team is **complete** at `completeAt` members and **full** at `max`. Reason: every padel Team rule ("exactly two", "the open seat", "global pair uniqueness") is this rule with padel's numbers.
- **D13. A football Team is a squad with a creator, no captain role.** The creator keeps the powers the padel creator has (invite while not full, dissolve) and may invite as many people as there are open seats; several unused invites may be live at once; the Team Invite link is allowed. A non-creator member may **leave** (new door `teams.leave`); the creator dissolves. Reason: no new role table; "captain" would be a glossary term with one power.
- **D14. Team link to a Community requires a complete Team (five for football).** Same rule as padel ("only full Teams"), read through `completeAt`. Reason: a Community should not host one-person "squads".
- **D15. Team stats counters stay at zero for football until slice D.** Same as padel Teams at launch.

**Games (slice C)**

- **D16. A football Game is a Friendly game whose registration is a roster, not seats.** `games.format = friendly_game`, `games.sport = football`, `registrationMode = individual`. Players register onto the Game (count against `playersAllowed`), waitlist when full, leave, get kicked, and arrive through Lookup invites and Invite links, through the doors Americano already uses (`games.register` and the shared `admit` module). There are no sides, Positions, seat picker, Match or Sets. Reason: pickup football picks sides on the day; the pool path exists; the seat path is unusable for 5-a-side.
- **D17. Side size and cap.** New nullable column `games.side_size` (football only): 5, 6, 7, 8, 9 or 11, default 5. `playersAllowed` is required for football, between `2 × sideSize` and 40, default `2 × sideSize`. The UI says "5-a-side · 10 players" and offers presets 5 / 7 / 11 plus a stepper for substitutes. Reason: the cap alone cannot say "5-a-side with four subs"; side size is also what slice D needs to shape sides.
- **D18. Football Games come only from football Groups, and from football Court Bookings.** `games.create` takes the sport from the Group (`groups.sport`); the input has no `sport` field. `bookings.createGame` on a football Court creates a football Game with the holder choosing side size and cap. Reason: a Game's sport is its Group's sport today in everything but the insert literal; one source of truth.
- **D19. Venue and Court pickers follow the sport.** For a football Group, `games.listCreateVenues` returns Venues with at least one football Court; a locked (Community-linked) Venue is returned whatever its Courts, with skip Court only when it has none of that sport (same shape as the Soft-archived locked Venue rule). `courtId` must be a Court of the Game's sport. Reason: a padel Court assigned to a football Game is the Court-sport bug in another door.
- **D20. No Level range, no football Level, no Americano or Friendly tournament for football in v1.** `games.create` refuses `levelMinTenths` / `levelMaxTenths` on a football Group; the format step offers Friendly game only; `ratings.setLevel` refuses football Groups ("Football Levels arrive with results"). Reason: there is no football Rating until slice D; a Level setter writing orphan football Ratings would make D's start state inconsistent.
- **D21. `rated = false` on every football Game created before slice D, whatever the Group's verification.** Snapshot semantics (ADR-0035) mean D flips only Games created after it ships. Reason: an Unrated Game writes no rating events and no Standing; it is the only honest value while football has no Rating.
- **D22. Price per player, window, name, Organizer powers, Soft-archive freezes, Game admins and notifications apply unchanged.** Reason: none of them read the 2v2 shape.

**Profile, Home, onboarding (v1)**

- **D23. Player profile, Home Level, Last 10, Preferred Position and the onboarding self-declare stay padel in v1.** `playerProfile.ts:188` already excludes football Games from Last 10. A football Group's Standing shows members with no results and its Level column is empty. Reason: there is nothing to show until D; a sport switch on the profile is D's job.

**Results and Ratings (slice D, draft)**

- **D24. When results arrive, an Organizer sets two sides from the roster, the Game gets its one Match, and the Match's Score is stored as its one Set (goals as "games won").** `matchOutcome` then gives win, loss and draw unchanged, and confirmations, Finished Game, Standing, Last 10 and All time stats work without a second result table. Reason: one Set row is the smallest change that keeps every downstream reader honest; the glossary names it **Score** for football.
- **D25. Football Rating uses the same Glicko-2, generalised from a pair to a roster.** `rate-doubles-match` becomes the n = 2 case of `rate-team-match` (each player versus the mean μ/φ of the opposing roster). Same classic scale, same Level 0–7 face, same bands, same weights by Group kind, same Provisional rule. Reason: ADR-0009 already keys Ratings by sport; only the opponent composite assumes two.

## 3. Glossary (draft edits for `CONTEXT.md`, not applied yet)

New entries:

> **Court sport**:
> The one sport a Court is for: padel or football. A Venue offers a sport when at least one of its Courts has it. Set by a Venue manager or Operator; changing it never changes a Booking. Product copy calls a football Court a pitch; the entity is still a Court.
> _Avoid_: Venue sport, Venue sports (there is no Venue-level list), pitch (as the entity name), field

> **Team roster rule**:
> The size rule a Team follows for its sport: minimum and maximum members, the count at which it is complete, and whether its member pair is unique across Temba. Padel: exactly two, complete at two, pair unique. Football: two to twenty-five, complete at five, pairs not unique.
> _Avoid_: team size (bare), squad size, captain rule

> **Roster registration**:
> A Game admit that occupies a count against players allowed and no Position. Used by Americano before its Matches exist and by every football Game. Waitlist, leave, kick and the Invite doors apply; the seat picker does not.
> _Avoid_: pool registration (a Pool is a tournament stage), open registration (registration is open or closed on every Game), seatless

> **Side size**:
> On a football Game, how many play on each side at once: 5, 6, 7, 8, 9 or 11. Players allowed is at least twice the Side size; the rest are substitutes. Shown as "5-a-side".
> _Avoid_: format (that is Friendly game, Americano or Friendly tournament), team size, a-side (bare)

Slice D adds **Score** (a football Match's goals for each side, stored as the Match's one Set; a Score is never called a Set in copy) and **Side pick** (the Organizer's assignment of registered Users to the two Game teams).

Edits to existing entries:

- **Court**: add "has one Court sport" and "a Match or Booking Court must have the Game's or the Customer's sport".
- **Team**: "A persistent partnership of exactly two Users for one sport" becomes "A persistent roster of Users for one sport, sized by its Team roster rule: a padel Team is exactly two; a football Team is two to twenty-five and complete at five". Keep the Community link rules. "Incomplete" becomes "below complete"; add "full" (at max).
- **Game**: add "A football Game is a Friendly game with Roster registration, a Side size and, until slice D, no Match; it is Unrated". Positions, Game teams and Sets are padel structure.
- **Game team**, **Position**, **Preferred Position**, **Set**, **Partner registration**: add "padel" to the first sentence where they say "a Game"; they do not exist on a football Game in v1.
- **Public Groups list**: "live Public padel Groups" becomes "live Public Groups of any sport, filterable by sport".
- **Unrated Game**: add "and every football Game created before football results ship".
- **Player profile**, **Last 10**: unchanged in v1; slice D makes them sport-switched.
- **Booking Game**: add "A Booking on a football Court creates a football Game (slice C); until then it creates none".

ADR candidates (drafted in section 13, written when the owning ticket lands):

- `docs/adr/0037-sport-lives-on-the-court.md` (slice A).
- `docs/adr/0038-team-size-is-a-sport-rule.md` (slice B).
- `docs/adr/0039-a-football-game-is-a-roster-with-sides-picked-later.md` (slice C, extended by D with the Score-as-one-Set decision).

## 4. Current state (discovery)

### 4.1 Where padel is enforced today

The padel-only lock is in three layers, not one. The UI gate is the smallest.

**(A) UI gate, the padel-only-ui lock.** Create Community, Club Group, Loose Group and Team forms submit `"padel"` with no picker, on web and mobile; Community home has no add or remove sport. Specs: `.scratch/padel-only-ui/spec.md` (TEM-11, 12, 13), `.scratch/padel-teams/spec.md` story 30. Verified by the sweep in section 4.5.

**(B) Server-side padel literals and filters** (these fight the feature; the UI gate does not):

| Where | What | Slice |
| --- | --- | --- |
| `packages/api/src/games/create-friendly.ts:106`, `routers/games/create.ts:213`, `routers/games/createTournament.ts:279` | Game inserts write `sport: GameSportEnum.PADEL` whatever the Group's sport | C |
| `packages/api/src/routers/groups/listPublic.ts:50,55` | Public Groups list filters `groups.sport = padel` | B |
| `packages/api/src/routers/users/onboardingState.ts:56,69`, `completeOnboarding.ts:58`, `routers/ratings/me.ts:30-106`, `routers/users/playerProfile.ts:263-518` | Level, self-declare and profile read the padel Rating only | D |
| `packages/api/src/routers/users/playerProfile.ts:188` | Last 10 skips football Games explicitly | D |
| `packages/api/src/ratings/apply-rated-match.ts:52` | `ratingSportFromGame` maps anything but football to padel | fine |
| `packages/api/src/games/user-allowed-by-level-range.ts:37`, `routers/games/byId.ts:418` | Level range reads the Rating for the Game's sport (already sport-aware) | fine |

**(C) Padel structure not tied to the sport string:**

| Where | Assumption | Slice |
| --- | --- | --- |
| `packages/api/src/games/access.ts:25-26` | `FRIENDLY_PLAYERS_ALLOWED = 4`, `FRIENDLY_TEAMS_ALLOWED = 2`, written by every Friendly game create | C |
| `packages/api/src/games/seats.ts:66-71` `isIndividualSeatGame` | true for every individual Friendly game or tournament; the shared `admit` module (`games/admit.ts:146`) and every seat door key on it | C (the one hinge) |
| `packages/api/src/routers/games/register.ts:23` | the roster door refuses anything but Americano | C |
| `packages/api/src/games/create-friendly.ts:~115` | create inserts one Match with Set shells (`FRIENDLY_SET_SHELL_COUNT`) | C |
| `packages/api/src/routers/games/create.ts:89-109` | Americano and tournament caps are multiples of 4 | untouched (no football tournament) |
| `packages/db/src/schema/game-team-players.ts` | `position` enum left/right, unique per Game team | D (null for football) |
| `packages/api/src/games/both-slotted-teams-complete.ts`, `completeMatch.ts:57` | "complete Game team" means two Positions | D |
| `packages/domain/src/rate-doubles-match.ts` | `Pair<T>` on both slots | D |
| `packages/domain/src/tournament-sizing.ts:341` | `playerCount = teamCount × 2` | untouched |
| `packages/api/src/teams/helpers/require-incomplete-team-creator.ts:31` | `memberRows.length >= 2` means full | B |
| `packages/api/src/teams/helpers/unordered-pair-is-reserved.ts`, `unused-invite-for-team.ts` | global pair uniqueness; one unused invite | B |
| `packages/db/src/schema/user.ts:22-54` | Preferred Position is a User field with no sport | D (shown for padel only) |
| `apps/mobile/src/auth/onboarding-questionnaire.tsx:240` | "Place yourself on the padel ladder once" | D |

**(E) Already multi-sport, no change needed:** `ratings` and `rating_events` keyed by sport (ADR-0009); `community_sports` allow-list and `addSport` / `removeSport` doors; `groups.sport`, `teams.sport` with `sportSchema` from `@repo/validators/sport` (`SPORTS = ["padel", "football"]`, parity-tested against `GroupSportEnum` in `packages/api/src/sport-parity.test.ts`); Group byId reads Levels for `group.sport`; `ratings.setLevel` keys on `group.sport`; sport badges on hub, Community home, Group home, Home.

### 4.2 Court and Booking

- `courts` (`packages/db/src/schema/courts.ts`): id, venueId, name, unique name per Venue. No sport.
- Bookings reference a Court; the price comes from Pricing rules that may be per Court (`venue_pricing_rules.court_id`) or Venue-wide. Opening hours are per Venue. Closures may be per Court. So football pitches can already be priced and closed on their own; only discovery and the grid are blind.
- `bookings.listBookableVenues` (`routers/bookings/listBookableVenues.ts`) counts all Courts and takes the Venue's lowest hourly rate. `bookings.venueAvailability` returns every Court with slots. `loadVenueSlotContext` (`packages/api/src/bookings/availability.ts`) is the one read behind availability, create and move.
- The mobile Book tab (`apps/mobile/src/booking/venues-screen.tsx`, `venue-screen.tsx`, `slot-grid.ts`) lists Venues by city, then a day, a length, a start time, then a Court. Copy says "N courts".
- Court editing: console Courts & pricing tab (`apps/console/src/components/courts/courts-tab.tsx`: add, rename, delete) and the web Operator Venue page (`apps/web/src/app/dashboard/venues/[id]/page.tsx:119-210`: the same three doors). Doors: `venues.addCourt`, `renameCourt`, `deleteCourt`, all `requireVenueManager`.
- `bookings.createGame` (ADR-0029) creates a four-seat padel Friendly game through `createFriendlyGame`; `bookings.byId` returns `canCreateGame`.
- The Booking spec lists "Multi-sport pricing. Venues are padel in the shipped UI; the schema does not block football" as a non-goal, so nothing there contradicts D3.

### 4.3 Groups, Communities, Teams

- Group create doors (`groups.createLoosePublic` etc.) take `sport: padel | football`; Club Group create checks the Community allow-list (`groups/helpers/create-club-group.ts:46-57`). Verified Groups T4 removes the `groupCreator` gate from Group create; this spec assumes that has landed (TEM-378).
- `communities.create` takes `sports` (min 1); `addSport`, `removeSport` exist and `removeSport` refuses while a Club Group or linked Team of that sport exists.
- Teams: `teams.create` takes `sport` through `sportSchema`; size, pair uniqueness and the one-open-seat rule live in `packages/api/src/teams/helpers/`; `team_invite_links` exist (added after the padel-teams spec, which excluded them). Dissolve is either member; there is no leave.
- Domain copy is padel: `packages/domain/src/teams.ts:14` ("Start an unattached padel partnership"), `community.ts:106` ("A padel Group inside this Community").

### 4.4 Games

- `games.create` input (`routers/games/create.ts:39-80`): format, registration mode, caps, window, Venue, Court or Courts, price, Level range. No sport. Friendly game ignores `playersAllowed` and writes 4.
- Registration paths: seat doors (`registerSeat`, `registerWithPartner`, `moveSeat`, Lookup invite and Invite link accept with a Position) for individual Friendly games and tournaments; roster door `games.register` for Americano; `registerTeam` for team-only. All go through `games/admit.ts`, which asks `isIndividualSeatGame` whether a seat is required.
- `games.byId` returns sides, Positions and Match slots; web and mobile Game details render the 2v2 (`apps/mobile/src/game-details/lineup-card.tsx`, `figure-pair.tsx`, `apps/web/.../games/[id]`).
- Game cards and hub rows use `gameOccupancy(registered, playersAllowed)`, which is cap-agnostic.
- Standing (`standing/load-group-standing.ts`) and stats (`stats/completed-matches.ts`) read completed Matches; a Game with no Match contributes nothing, which is the right v1 result for football.
- Migrations: newest is `0058`; Verified Groups adds two more before this spec's first migration. Use the next free number.

### 4.5 Sweep of hard-coded sport

A full sweep of `packages/api/src`, `packages/domain/src`, `packages/validators/src`, `packages/db/src/schema`, `apps/web/src`, `apps/console/src` and `apps/mobile/src` found:

- One shared sport list, `SPORTS` in `@repo/domain/sport`, and `sportSchema` in `@repo/validators/sport`. Every DB sport enum already contains `football`. No enum or column migration is needed for the sport value itself. `GameSportEnum` spells its member `Football` where the other two spell `FOOTBALL`; `sport-parity.test.ts` checks `SPORTS` against `GroupSportEnum` only.
- No named flag (`PADEL_ONLY`, `defaultSport`, `allowedSports`) exists. The padel-only-ui lock is literal `sport: "padel"` / `sports: ["padel"]` in seven client create calls and the removed add/remove sport section. No web or mobile test asserts the lock, so nothing breaks when the pickers return.
- `apps/console/src` has no sport hit at all.
- Four copies of the padel→"Padel" label map: `packages/domain/src/group-home-chrome.ts:6-16`, `group-invite-share-message.ts:1-11`, `home-standing.ts:17-33`, `apps/web/src/components/temba/sport-badge.tsx:3-12`. Two screens print the raw sport string (`apps/web/src/components/communities/community-teams-tab.tsx:29-31`, `apps/mobile/src/communities/community-home-view.tsx:179`). FB-B1 should add one `sportLabel` in `@repo/domain/sport` and point the copies at it.

Section 14 lists every hit that fights the feature, by slice.

## 5. Behaviour

### 5.1 Slice A: a Court has a sport; Customers book by sport

1. Every Court has a Court sport, padel by default. Existing Courts are padel after the migration.
2. A Venue manager (console) or an Operator (web Venues area) sets the sport when adding a Court and may change it later from the Court row. The Courts list groups or badges Courts by sport.
3. `bookings.listBookableVenues({ sport })` returns Venues that accept Bookings and have at least one Court of that sport with a covering Pricing rule; `courtCount` counts that sport's Courts; `fromHourlyRateFils` is the lowest rate among rules that apply to those Courts (Venue-wide rules count). Without `sport`, today's answer.
4. `bookings.venueAvailability({ venueId, day, sport })` returns only Courts of that sport. Without `sport`, every Court.
5. `bookings.create` is unchanged: the Customer names a Court. The slot evaluation already checks the Court belongs to the Venue.
6. The mobile Book tab shows a Padel / Football switch above the Venues list. The choice is a per-device convenience, default Padel. Venue cards, the Venue page, the Court step and the checkout say "pitch" for football. A Venue with Courts of both sports appears under both.
7. `bookings.byId`, `listMine`, `listForVenue`, the console Schedule and Bookings list carry `court.sport`; console rows show it as a badge.
8. `bookings.createGame` on a football Court is refused (D8); `canCreateGame` is false; the mobile booked screen hides the CTA and says football Games are coming.
9. Nothing changes for Games in this slice: Game create still lists every Court on the Venue (the sport filter arrives in C).

### 5.2 Slice B: football Groups and Teams

10. Loose Group create (web, mobile) shows a Padel / Football choice; default Padel; the chosen sport is submitted. Copy loses "padel" where it names the sport.
11. Club Group create shows the choice only when the Community offers both sports; with one sport it submits that sport silently.
12. Create Community (staff-only, per Verified Groups Q6) shows sport checkboxes, at least one.
13. Community home shows Community sports with add and remove for Owner and Admin, calling the existing doors; remove shows the existing refusal when a Club Group or linked Team of that sport exists.
14. `groups.listPublic({ sport? })` returns Public Groups of every sport when `sport` is absent. Web and mobile Public Groups list get an All / Padel / Football filter; rows keep their sport badge.
15. Create Team (web, mobile) shows the Padel / Football choice. The server applies the Team roster rule:
    - padel: unchanged.
    - football: the creator may send Lookup invites, Email invites and mint an Invite link while members < 25; several unused invites may be live, at most `max − members` in total; accept is refused when the Team is full; pair uniqueness is not checked.
16. `teams.leave` (new): a member who is not the creator leaves a football Team; refused on a padel Team ("Dissolve the Team instead"); refused while the linked Community is Soft-archived (existing freeze); the Team may drop below complete, which does not unlink it.
17. `teams.requestLink` requires complete (`completeAt`), so a football Team needs five members. `communities.approveTeamLink` admits every member missing a Community membership, as today.
18. Team home shows the roster (count "7 of 25", "complete" at five), invites, Invite link, Leave for members, Dissolve for the creator, and zero counters. `teams.byId` gains `roster: { min, max, completeAt, count, complete, full }` and `viewerCanLeave`.
19. Padel Teams are unchanged in behaviour; the padel numbers now come from the rule.

### 5.3 Slice C: football Games, friendly-only

20. On a football Group, Create Game offers Friendly game only. The flow is: Group → Where (Venue and pitch, filtered by sport) → When → Size and price (Side size preset 5 / 7 / 11 with a stepper, Players allowed stepper from `2 × sideSize` to 40, Price per player). No Level range, no Who-can-take-a-seat (stays private, as `games.create` stores today).
21. `games.create` on a football Group: `sport` from the Group, `format = friendly_game`, `registrationMode = individual`, `sideSize` required, `playersAllowed` required within bounds, `teamsAllowed = null`, `rated = false`, Level range refused, no Match inserted, Court must be a football Court on the Venue, locked Venue rule per D19.
22. Registration is Roster registration: `games.register` accepts football Friendly games; `registerSeat`, `registerWithPartner`, `moveSeat` and the seat variants of invite accept refuse them with "This Game has no seats; register as yourself"; `admit` does not require a seat; full → waitlist; leave and kick free a count and promote the first waitlisted User.
23. Game details (web, mobile) for a football Game: hero with "5-a-side · 7/10", Venue and pitch, window, price; a roster list instead of the 2v2 lineup; Organizer card with cancel, kick, edit window and price; join or leave, waitlist position; invite doors. No Match card, no Score, no Rating impact; an "Unrated" line as Verified Groups T8 shows.
24. Game cards, hub rows and Home carousel show a sport badge or icon and the cap-agnostic occupancy.
25. `bookings.createGame` on a football Court: the holder picks Side size and Players allowed; the Game is a football Booking Game (groupless, Unrated, private), otherwise per ADR-0029.
26. A football Group's home: Standing lists members with no results; Games tab lists its Games; the Level column is empty and Set Level is absent (D20).
27. Americano and Friendly tournament stay padel-only in the format step and are refused on a football Group by `games.create` and `games.createTournament`.

### 5.4 Slice D: football results and Ratings (draft, re-grill before ticketing)

28. **Side pick.** An Organizer assigns registered Users to side 1 and side 2 (any split; equal sizes recommended, substitutes may sit on either side) once registration is closed or the window has started. This creates two Game teams with `sideIndex` 1 and 2 and `game_team_players` rows with `position = null`, and the Game's one Match with both slots. Sides may be edited until the Score is entered.
29. **Score.** Anyone on the Match or an Organizer enters goals for each side (0–99). It is stored as the Match's one Set (`setNumber = 1`, goals as games won); `matchOutcome` yields win, loss or draw. Confirmation (ADR-0011) applies; the Match completes when every rostered User on the two sides confirms, or an Organizer forces it.
30. **Rating.** When the Game rates (a Verified Group, Games created after D), `applyRatedMatch` uses `rateTeamMatch` (roster versus the opposing roster's mean μ/φ), writing one rating event per User with the existing weights. Football Rating rows start at the classic defaults; a football self-declare is offered the first time a User joins a football Group or Game.
31. **Faces.** Player profile and Home get a Padel / Football switch for Level, Win streaks, All time and Last 10; the padel exclusion at `playerProfile.ts:188` is removed; Preferred Position stays padel-only. Football Game Level range becomes allowed; `ratings.setLevel` accepts football Groups.
32. **Teams.** Team-only registration of a football Team onto a football Game and Team counters are a candidate for D or a later slice.

**Delivered from the "Football games flow" design (ADR-0040).** Rules 28 and 29 shipped with these changes; rules 30 to 32 did not, so football Games stay Unrated.

- Joining takes a Football role (keeper or outfield, two keepers a Game) and a Preferred football position (DEF, MID, FWD), both changeable until the Score is in.
- The Organizer publishes two Football sides by Level (keepers split, then a snake draft) or by hand, each in a Bib colour; sides may differ by one. Publishing creates the one Match; publishing again replaces the sides until the Score is in.
- The Score is the Match's one Set, 0 to 99 a side, entered from kick-off. Agreement needs one confirmer from each side, not every rostered User (rule 29 said every User).
- Scorers are optional and stored in `match_goals`; this is the schema change rule D24 said it would not need.
- There is no bench: substitutes register as players up to players allowed, and the teams are made from everyone registered.
- Web and mobile: the Games list gets an All / Padel / Football filter and football sections, and Game details, the join sheet, Make teams and Score follow the design. The shared view models are `@repo/domain/football-board` and `football-hub`; `/dashboard/design/football` previews the web pieces in development.

## 6. Data model (`@repo/db`)

```text
-- Slice A (migration MA, next free number)
courts.sport  group_sport not null default 'padel'
  index courts_venue_id_sport_idx on (venue_id, sport)

-- Slice C (migration MC)
games.side_size  integer null
  check games_side_size_check: side_size is null or side_size in (5,6,7,8,9,11)
  check games_football_side_size_check: sport <> 'football' or side_size is not null
```

Design notes:

- `group_sport` is reused for `courts.sport`, as for `ratings`, `teams` and `community_sports`. The three existing sport enums stay unconsolidated (padel-only-ui).
- Slice B needs no schema change: the Team roster rule is pure code over `team_members`; `team_invite_links`, `team_member_invites` and `team_email_invites` already exist.
- Slice D needs no schema change under D24: `game_team_players.position` is already nullable and `match_sets` holds the Score. If the owner rejects Score-as-one-Set, D adds `matches.slot1_goals` / `slot2_goals` and a second outcome reader.
- No data backfill beyond the column defaults. Existing Games keep `sport = padel`; existing Courts become padel.

## 7. Server (`@repo/api`), one endpoint per file

Shared code is extracted only where two or more doors use it.

**New shared rules**

- `@repo/domain/game-shape`: `isRosterRegistrationGame(game)` (Americano, or football Friendly game), `FOOTBALL_SIDE_SIZES`, `footballPlayersAllowedBounds(sideSize)`, `sideSizeLabel`. Used by `games/seats.ts` (`isIndividualSeatGame` becomes `individual && (friendly_game || friendly_tournament) && !isRosterRegistrationGame`), `games.register`, `games.create`, `bookings.createGame`, and by both clients to choose the roster view.
- `@repo/domain/team-roster`: `teamRosterRule(sport)`, `teamIsComplete(count, sport)`, `teamIsFull(count, sport)`, `openInviteBudget(count, unused, sport)`. Used by the Team doors and both clients.
- `#src/venues/helpers/court-sport.ts` (if two doors need it): `requireCourtOfSport(database, courtId, venueId, sport)`. Used by `games.create` (through `assert-game-create-venue-and-court.ts`) and `bookings.createGame`.

**Doors**

| Door | File | Change | Slice |
| --- | --- | --- | --- |
| `venues.addCourt` | `routers/venues/addCourt.ts` | input gains `sport?: sportSchema` (default padel); output gains `sport` | A |
| `venues.setCourtSport` (new) | `routers/venues/setCourtSport.ts` | `{ id, sport }`, `requireVenueManager` on the Court's Venue | A |
| `venues.byId`, `managedById`, `list`, `listManaged` | existing | Court rows gain `sport` | A |
| `bookings.listBookableVenues` | existing | input `sport?`; rule 3 | A |
| `bookings.venueAvailability` | existing | input `sport?`; rule 4 | A |
| `bookings.byId`, `listMine`, `listForVenue`, `listCustomers` | existing | `court.sport` in outputs; `canCreateGame` false on a football Court | A |
| `bookings.createGame` | existing | refuse football Court (A); create a football Game with `sideSize`, `playersAllowed` (C) | A, C |
| `groups.listPublic` | existing | input `sport?`; drop the padel filter | B |
| `teams.create`, `inviteInApp`, `inviteEmail`, `createInviteLink`, `acceptInAppInvite`, `acceptInviteLink`, `acceptEmailInvite`, `requestLink` | existing | read `teamRosterRule(team.sport)` instead of 2; pair uniqueness only when `pairIsUnique` | B |
| `teams.leave` (new) | `routers/teams/leave.ts` | rule 16 | B |
| `teams.byId`, `teams.mine` | existing | `roster`, `viewerCanLeave` | B |
| `games.create` | existing | input gains `sideSize?`; sport from Group; rules 21 and 27 | C |
| `games.createTournament` | existing | refuse a football Group | C |
| `games.listCreateVenues` | existing | filter by the Group's sport; Court rows gain `sport` | C |
| `games.listCourts` | existing | only Courts of the Game's sport | C |
| `games.register` | existing | accept `isRosterRegistrationGame` | C |
| `games.registerSeat`, `registerWithPartner`, `moveSeat`, `acceptLookupInvite`, `acceptInviteLink` | existing | refuse a seat on a roster Game with one message; invite accept on a roster Game admits without a Position | C |
| `games.byId` | existing | output gains `sport` (already), `sideSize`, `roster: { users, count, cap }` for roster Games | C |
| `games.listMyGames`, `listPublicPickup`, hub rows, Home carousel | existing | rows carry `sport` | C |
| `ratings.setLevel` | existing | refuse a football Group until D | C |
| `games.updateCaps` | existing | football: `playersAllowed` within bounds, not below registered | C |

All changes are additive: new optional inputs, new output fields, new procedures. No procedure path is renamed. `apps/api` is untouched.

## 8. Clients

### `@repo/domain`
- New: `game-shape`, `team-roster`, `court-sport-copy` (pitch / court faces, "N pitches"), `football-size-copy` ("5-a-side · 10 players").
- Edit: `teams.ts:14` and `community.ts:106` copy; `create-game-draft`, `create-game-flow`, `create-game-submit` gain a football branch (`sideSize`, `playersAllowed`, no Level range, no type step); `game-card`, `hub-game-row` carry sport; `booking-copy` for pitch words; `groups-list` filter model.
- Unit tests beside each.

### `apps/console` (slice A)
- Courts & pricing → Courts tab: sport in the add form, a sport control on each row (segmented or select), rows badged by sport. Pricing tab: Court picker shows the sport. Schedule and Bookings: Court badge.

### `apps/web`
- A: Operator Venue page Court section gains the sport select and a change action.
- B: Loose Group, Club Group, Community create pickers; Community home sports section; Teams create picker, Team home roster; Public Groups filter.
- C: Create Game football branch; Game details roster view; cards.

### `apps/mobile`
- A: Book tab sport switch (remembered in AsyncStorage, try/catch, default Padel), pitch copy, booked screen CTA rule.
- B: Group create and Team create pickers; Team home roster, Leave; Groups discover filter.
- C: Create flow football branch (Type step skipped, Size and price step), Game details roster view, Booking Game screen football fields, cards.
- Design system rules hold: black and white, tokens, `Text` primitive, hairlines. A sport is shown with a small glyph plus a word, never a colour.

## 9. Tests

Procedures through their exported functions on PGlite; pure rules with Vitest beside them.

Slice A:
- `addCourt` defaults to padel and accepts football; `setCourtSport` requires a manager and is idempotent.
- `listBookableVenues({ sport: "football" })` omits a Venue with padel Courts only, counts only pitches, and prices from rules that apply to them; without `sport` the result equals today's.
- `venueAvailability` filters Courts by sport; a Booking create on a pitch still evaluates the same Slot rules.
- `createGame` refused on a football Court; `byId.canCreateGame` false.
- Console and mobile models: Court badge, pitch copy, switch persistence (unit).

Slice B:
- `listPublic` returns both sports without `sport` and one with it.
- `teamRosterRule` table test; football create, five invites live, sixth refused at budget, accept refused at full, pair not unique for football, unique for padel.
- `teams.leave`: member leaves; creator refused; padel refused; archived Community refused; dropping below complete keeps the link.
- `requestLink` refused below five members on football.
- Client form models: picker shown only with two Community sports.

Slice C:
- `games.create` on a football Group: sport football, `rated` false on a Verified Group, no Match, `sideSize` default, cap bounds, Level range refused, padel Court refused, locked Venue with no pitch allows skip Court only.
- `register` admits, waitlists at cap, leave promotes; `registerSeat` refused; Invite link accept admits without a Position.
- `listCreateVenues` filters by Group sport.
- `bookings.createGame` on a pitch creates a football Game.
- `setLevel` refused on a football Group.
- Standing and stats loaders return zeros for a Group whose Games have no Matches (regression guard).
- Seed (`packages/api/scripts/seed.ts`): a Venue with two pitches and a Court rule, a football Loose Group Public with one football Game, a football Team of six.

Padel lock tests to retire or flip in B (list in section 14): tests that assert "no sport picker" or "always padel" become "picker present, default padel".

## 10. Slicing and order

Proposed order A → B → C → D, each slice shippable alone.

- **A first.** It touches no Game code, is one column plus filters, and gives a Venue with pitches a working booking funnel through the console and the Book tab. It is also the only slice with revenue attached.
- **B second.** It is mostly un-hiding, plus one pure rule for Teams. It does not depend on A: a football Group at a Venue with no pitch is fine, since Games are not yet possible.
- **C third.** Football Games need a football Group (D18) and a pitch picker (D19), so C depends on B and benefits from A. Within C, the server ticket goes first; web and mobile can land in either order.
- **D last.** It is the generalisation of results and ratings; doing it before C means designing the Score, the Side pick and the roster rating without a single football Game to look at.

Against this order: a product owner who wants a football Game demo before Venues are onboarded could run B → C → A, since C only needs a pitch at a Venue, and the Operator can create that from the web without A if `addCourt` ships first. The cost is a Book tab that mixes pitches into the padel grid for the duration. The recommendation stays A → B → C.

## 11. Tickets

Every ticket passes `pnpm exec turbo run typecheck lint test`. Vertical slices; blockers first.

| Id | Title | Scope | Blocked by |
| --- | --- | --- | --- |
| **FB-A1** ([TEM-381](https://linear.app/temba-app/issue/TEM-381)) | A Court has a sport; managers and Operators set it (server, console, web Operator page) | Migration MA; `addCourt.sport`; `venues.setCourtSport`; `sport` on Venue and Court outputs; console Courts tab control and badges; web Operator Court select; `CONTEXT.md` Court sport; ADR-0037; tests; seed pitches | — |
| **FB-A2** ([TEM-384](https://linear.app/temba-app/issue/TEM-384)) | Customers book a pitch by sport on mobile | `listBookableVenues.sport`, `venueAvailability.sport`; `court.sport` on Booking outputs; `createGame` refusal and `canCreateGame`; mobile Book tab switch, pitch copy, booked screen; console Schedule and Bookings badges; tests | FB-A1 (TEM-381) |
| **FB-B1** ([TEM-382](https://linear.app/temba-app/issue/TEM-382)) | Sport returns to Group and Community creation, and the Public Groups list (web, mobile, server) | Loose and Club Group pickers; Create Community checkboxes; Community home add and remove sport; `listPublic.sport` and client filters; copy; retire padel-lock tests; mark `.scratch/padel-only-ui/spec.md` superseded; glossary edit for Public Groups list | TEM-378 (sequencing: same create screens) |
| **FB-B2** ([TEM-383](https://linear.app/temba-app/issue/TEM-383)) | A football Team is a squad (server and domain) | `team-roster` rule; the five Team-side "two" checks (section 14) read it, the six Game-side checks are left at two and named; invite budget; pair uniqueness padel-only; `teams.leave`; `byId.roster`, `mine.incomplete` from the rule; `CONTEXT.md` Team and Team roster rule; ADR-0038; tests; seed Team | — |
| **FB-B3** ([TEM-385](https://linear.app/temba-app/issue/TEM-385)) | Create and run a football Team on web and mobile | Create Team picker; Team home roster, several invites, Leave, Dissolve; copy | FB-B2 (TEM-383) |
| **FB-C1** ([TEM-386](https://linear.app/temba-app/issue/TEM-386)) | A football Game is a roster, friendly-only (server and domain) | Migration MC; `game-shape`; `games.create` football branch; sport from Group; `rated` false; Level range refused; `listCreateVenues` and `listCourts` by sport; `register` widened, seat doors refuse; `byId.roster`; `bookings.createGame` football; `setLevel` refusal; `createTournament` refusal; hub rows sport; `CONTEXT.md` Roster registration, Side size, Game; ADR-0039; tests; seed Game | FB-A1 (TEM-381), FB-B1 (TEM-382) |
| **FB-C2** ([TEM-387](https://linear.app/temba-app/issue/TEM-387)) | Create and join a football Game on mobile | Create flow football branch; Game details roster view; Booking Game screen football fields; cards and Home carousel badge | FB-C1 (TEM-386) |
| **FB-C3** ([TEM-388](https://linear.app/temba-app/issue/TEM-388)) | Create and join a football Game on the web | Same as C2 for `apps/web` | FB-C1 (TEM-386) |
| **FB-D1** (draft) | Organizer picks sides and records the Score; football Games rate on Verified Groups (server and domain) | Side pick door; Match and Score as one Set (goals 0–99, so `scoreSet` and `friendly-game-results` bounds become sport-aware); confirmations over a roster; `rateTeamMatch` and `apply-rated-match` over rosters; `rated` from verification; remove the Last 10 exclusion; Standing `totalPointsWon` as goal difference stated; `setLevel` and Level range allowed; glossary Score and Side pick | FB-C1 |
| **FB-D2** (draft) | Sides and Score on mobile and web | Side pick sheet; Score entry; confirmation; Finished Game card | FB-D1 |
| **FB-D3** (draft) | Profile and Home switch between padel and football | Sport switch on Player profile, You, Home Level and Recent form; Preferred Position padel-only | FB-D1 |
| **FB-D4** (draft) | Football self-declare on first contact | Self-declare sheet when joining a first football Group or Game; `ratings.selfDeclare` already takes `sport` | FB-D1 |

Counts: A 2, B 3, C 3, D 4 (draft). A1, A2, B1, B2, B3, C1, C2 and C3 are published as TEM-381 … TEM-388; D1–D4 are held until C has shipped and section 5.4 has been re-grilled.

Suggested sequence: A1 → A2 and B1, B2 in parallel → B3 → C1 → C2 and C3 in parallel. Frontier at publish time: TEM-381 (A1), TEM-383 (B2), and TEM-382 (B1) once TEM-378 is done.

## 12. Open questions (recommended default in bold; every default was accepted by the product owner on 2026-10-24)

Questions that materially change the work:

- **Q1. Is football friendly-only in v1 (D2)?** **Yes; D is a follow-up.** If no, D1–D3 join v1 and the ticket count rises to 11; the rating generalisation then gates the release.
- **Q2. Score as the Match's one Set (D24) or goal columns on Match?** **One Set.** Goal columns need a second outcome reader in Standing, stats, Last 10, confirmations and the rating step.
- **Q3. Football Team bounds (D12): 2–25, complete at 5?** **Yes.** Alternatives: complete at 2 (any pair can link to a Community) or a max of 15. Only the numbers change.
- **Q4. May a football Team member leave (D13)?** **Yes, non-creators.** If no, football Teams dissolve-only like padel and `teams.leave` is dropped.
- **Q5. Side sizes 5, 6, 7, 8, 9, 11 and a cap of 40 (D17)?** **Yes.** A free integer 3–11 is the alternative; it only changes the validator and the stepper.
- **Q6. Should Game create on a football Group offer Americano or a tournament?** **No in v1.** A football round-robin is a different product.
- **Q7. "Pitch" in copy (D4)?** **Yes, for football Courts only.** If no, copy says "court" for both and `court-sport-copy` is a one-liner.
- **Q8. Default sport on the Book tab and on Group and Team create?** **Padel, remembered per device on the Book tab; no memory on create forms.**
- **Q9. Should the Games hub and the Home carousel gain a sport filter?** **No; badges only.** A filter is a small later ticket.
- **Q10. Should a football Booking Game be allowed in slice A by creating a seatless Game early?** **No.** It would ship half of C1 inside A2.
- **Q11. Should Operators be able to set Court sport from the web (D5)?** **Yes.** If no, A1 loses the web half and Operators use the console.
- **Q12. Should Verified Groups' auto-verification and Operator verification apply to football Groups identically (D11)?** **Yes.** Nothing in the Verified Groups spec is sport-aware.
- **Q13. When D ships, do football Games created under v1 stay Unrated?** **Yes (snapshot semantics).** A backfill would be a reversal of a product promise shown on the Game.
- **Q14. Coach and coaching sessions?** **Untouched.** Not asked for; leftover tables.

## 13. ADR drafts

**0037 Sport lives on the Court.** A Court has one sport; a Venue offers the sports its Courts have. Bookings, Pricing rules and Closures already attach to a Court, so the sport sits beside them and discovery filters Courts, not Venues. Rejected: a Venue sports allow-list (two truths, and a Venue with both sports would need per-Court data anyway); a sport on the Booking (it is the Court's property, not the reservation's).

**0038 Team size is a sport rule.** A Team's minimum, maximum, completion count and pair-uniqueness come from `teamRosterRule(sport)` in `@repo/domain`. Padel is `{2, 2, 2, unique}`, which reproduces every existing rule; football is `{2, 25, 5, not unique}`. Rejected: a second `squads` table (duplicates invites, links, Community rules and stats for one dimension); a `max_members` column per Team (a product rule, not per-row data).

**0039 A football Game is a roster with sides picked later.** A football Game registers Users against a cap with no Position (Roster registration, the Americano path), carries a Side size, and in v1 has no Match and is Unrated. When results ship, an Organizer picks two sides, the Game gets its one Match, and the Score is that Match's one Set so that win, loss, draw, confirmation, Standing, Last 10 and the rating step are unchanged readers. Rejected: a four-seat Game with larger sides (Positions have no meaning past two); a separate `football_games` table (every Game door would fork); goal columns on Match (a second outcome reader everywhere).

## 14. What in the codebase fights this feature

Grouped by the slice that must resolve it. Line numbers are at the time of writing.

### Server (`@repo/api`)

Slice A
- Nothing fights it; `courts` has no sport and every Court read is a plain select. `loadVenueSlotContext` (`bookings/availability.ts:49-52`) and `listBookableVenues` (`:58-62`) need the sport in their Court select.

Slice B
- `routers/groups/listPublic.ts:50,55`: server-side `sport = padel` filter.
- Team "exactly two" in nine places, all to read `teamRosterRule`: `teams/helpers/require-incomplete-team-creator.ts:31`, `routers/teams/acceptInAppInvite.ts:72-75`, `acceptInviteLink.ts:51-54`, `teams/mine.ts:71` (`incomplete: members.length < 2`), `packages/domain/src/community.ts:444` (`openSeats`). The Game-side checks (`games/admit.ts:238`, `routers/games/registerTeam.ts:66`, `games/promote-waitlist.ts:22`, `games/invites.ts:262`, `games/user-allowed-by-level-range.ts:147`, `routers/games/byId.ts:312`) stay at two until football Teams register on Games (slice D or later); B2 leaves them alone but names them.
- `teams/helpers/unordered-pair-is-reserved.ts`, `unused-invite-for-team.ts`, `kill-team-open-seat-doors.ts`: the pair and the one-open-seat rule.
- No `teams.leave` door; dissolve is the only exit.
- `apps/web/src/app/dashboard/groups/page.tsx:141-148`: a disabled "Football · coming soon" button and "Pick a sport" copy to replace with the real choice.

Slice C
- `games/create-friendly.ts:101-106`, `routers/games/create.ts:194-213`, `createTournament.ts:279`: `sport: PADEL` and `playersAllowed = 4` literals; none reads `group.sport`.
- `games/seats.ts:66`: `isIndividualSeatGame` is the hinge every seat door and `admit.ts:146` share; it must learn roster Games.
- `routers/games/register.ts:23`: Americano-only.
- `games/create-friendly.ts:32,54,140-147`: one Match plus three Set shells on every Friendly game create.
- `routers/games/updateCaps.ts:35-37,45,65`: "Friendly game caps are fixed at 4 players / 2 Teams"; football needs the cap editable within bounds.
- Cap fallbacks of 4 and 2 in `games/admit.ts:174,257`, `games/seats.ts:465`, `home/carousel-games.ts:70,75`, `games/access.ts:370,375`: not hit when `playersAllowed` is always set on football, but the C1 test should prove it.
- `games/assert-game-create-venue-and-court.ts`, `games/assert-court-assignable.ts`, `routers/games/listCreateVenues.ts`, `listCourts.ts`: Court checks that do not know sport.
- `routers/ratings/setLevel.ts:70`: keys on `group.sport`, so it would happily write a football Rating today.
- `packages/domain/src/game-card.ts:142-144`: join routes to `register` for Americano and `registerSeat` otherwise; must route by `isRosterRegistrationGame`.
- `packages/domain/src/create-game-flow.ts:88,784-796`: "4 open seats", "a Game team of two".
- `apps/mobile/src/create-game/booking-game-model.ts:19,49-51,64`: `BOOKING_GAME_PLAYERS = 4`, price split across four seats, "4 open seats"; `details-step.tsx:3`, `where-step.tsx:156`; web `games/new/friendly-game-steps.tsx:28,540`, `components/games/game-edit-dialog.tsx:326`.
- `sport-parity.test.ts` should also pin `GameSportEnum` once Game inserts read the Group's sport.

Slice D
- `games/both-slotted-teams-complete.ts:16`, `routers/games/completeMatch.ts:57`: complete means two Positions.
- `packages/domain/src/rate-doubles-match.ts:14-106`, `ratings/apply-rated-match.ts:47-68` (`SlotUsers = [string, string]`, `twoUserIds`): doubles only.
- `routers/games/scoreSet.ts:41-49,125-134`, `packages/domain/src/friendly-game-results.ts:1-2`: games per Set clamped 0–7; a Score needs 0–99.
- `standing/group-standing.ts:56-65` adds games as `totalPointsWon`; under D24 goals would feed it, which is acceptable (goal difference) but must be a stated decision.
- `routers/users/playerProfile.ts:117,188,251-263,335,502-518`, `routers/ratings/me.ts:22-121`, `routers/users/onboardingState.ts:21-69`, `completeOnboarding.ts:16,58`: padel Rating reads, the Last 10 football exclusion, and onboarding that cannot complete without a padel Rating.
- `packages/db/src/schema/user.ts:54`, `routers/users/setPreferredPosition.ts`, `packages/domain/src/preferred-position.ts`, `preferred-seat.ts`, `player-profile.ts:46-154`: Preferred Position without sport, and the profile court-side graphic.
- Copy: `packages/domain/src/player-profile.ts:71` ("Padel, plays at"), `profile-all-time.ts:44` ("Playing padel since"), `friendly-game-score.ts:114` ("Confirmed by all four players"), web `home-level-block.tsx:59,161`, `profile-level-card.tsx:47`, `declare-level-dialog.tsx:91`, mobile `home/level-card.tsx:44`, `profile/level-card.tsx:21`, `auth/onboarding-questionnaire.tsx:240`.

### Clients and domain

Slice A
- `apps/mobile/src/booking/venues-model.ts:78` `courtCountLabel`, `venue-screen.tsx` Court copy; console `courts-tab.tsx` has no sport; web `venues/[id]/page.tsx:119-210` has no sport.

Slice B
- The padel-only-ui lock files (TEM-11, 12, 13) and `.scratch/padel-teams` story 30: web `groups/new/page.tsx`, `communities/new/page.tsx`, `communities/[id]` home, `teams/new/page.tsx`; mobile `groups/group-create-view.tsx`, `communities/community-create-view.tsx`, `community-home-view.tsx`, `teams/create-team-view.tsx`.
- `packages/domain/src/teams.ts:14`, `community.ts:106`: padel copy.

Slice C
- `packages/domain/src/create-game-*.ts`: no sport branch; `game-side-label.ts`, `match-slots.ts`, `home-seats.ts` assume sides of two.
- Mobile `game-details/lineup-card.tsx`, `figure-pair.tsx`, `games/seat-chips.tsx`, `seat-picker-sheet.tsx`; web Game details lineup: 2v2 only.

Slice D
- Mobile `auth/onboarding-questionnaire.tsx:240` ("padel ladder"); `player-profile/position-card.tsx`; `home/level-card.tsx`; web You and Player profile pages.

### Tests that pin the padel lock

No web or mobile test asserts "no picker" or "always padel", so the UI half of the lock has nothing to flip. Server tests that pin padel-only reads:

| Test | Pins | Flips in |
| --- | --- | --- |
| `packages/api/src/routers/groups/listPublic.test.ts:163` | a football Public Group is left out | FB-B1 (expect it included; add the `sport` filter case) |
| `packages/api/src/routers/ratings/me.test.ts:166-181` | football rating events are ignored | FB-D3 |
| `packages/api/src/routers/users/playerProfile.test.ts:594` | "counts every padel format and leaves out football" | FB-D1 |
| `packages/api/src/routers/users/completeOnboarding.test.ts`, `onboardingState.test.ts` | onboarding needs the padel Rating | FB-D4 |
| `packages/api/src/sport-parity.test.ts` | `SPORTS` equals `GroupSportEnum` | FB-C1 extends it to `GameSportEnum` |
| `packages/api/src/routers/teams/*.test.ts` | "This Team is full" at two, pair reserved | FB-B2 keeps them green through the padel row of the rule table |

Fixture data that names padel (seed Venues "Padel Central", domain `*-fixtures.ts`, `booking.test-support.ts:56`) is not a lock and stays.

## 15. Non-goals

- A Venue-level sport allow-list, per-sport Opening hours, or per-sport Booking settings.
- Renaming Court to Pitch anywhere but product copy.
- Football Americano, Friendly tournament, leagues or fixtures.
- Positions, formations or roles on a football side.
- A captain role, Team roles, or Team transfers.
- Football Rating, Level, Level range, self-declare, Preferred Position, Last 10 or profile switch in v1 (slice D).
- Consolidating the three sport enums or adding a fourth.
- Coach and coaching-session product.
- Sport filters on the Games hub, Home carousel or Directory (Q9).
- Changing padel behaviour anywhere, including padel Team rules.
- Push, universal links or anything in Phase 7.

## 16. Risks

- **The hinge.** `isIndividualSeatGame` is read by every seat door through `admit`. C1 must change it in one place with a table test over `{format, registrationMode, sport}`; a miss leaves a football Game with a seat picker or a padel Game without one.
- **Snapshot drift.** Football Games are Unrated in v1 and rated from D on Verified Groups. Game details must say "Unrated" clearly (Verified Groups T8) so the change in D is not read as a bug.
- **Booking funnel regression.** A2's optional `sport` must leave today's responses byte-identical when absent; the tests in section 9 assert it.
- **Padel Team regression.** B2 rewrites the pair rules through a table; the padel row of that table must reproduce every current test in `routers/teams/*.test.ts`.
- **Copy sprawl.** "Court" versus "pitch" is decided once in `@repo/domain/court-sport-copy`; screens that hard-code "court" will drift.
- **Verified Groups timing.** B1 assumes TEM-378 has removed the `groupCreator` gate on Group create; if it has not, B1's pickers sit behind that gate and still work.
- **Mobile unreleased.** All API changes are additive regardless, so a later release order does not matter.
