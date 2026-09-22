Status: ready-for-agent

Design: claude.ai design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`, file
`Create game flow.dc.html` (screens 04a–04e, 05a, 05b, 05d). A local copy of the imported file is at
`.scratch/design-import/create-game-flow.html`. Screen 05c (Rounds format) is **out of scope**.

Decisions: `.scratch/create-game-flow/decisions.md`

Supersedes the create surfaces from `.scratch/friendly-tournament-redesign/spec.md` (TEM-253) and
the create field layout from `.scratch/tournament-allow-registering-alone/spec.md` (TEM-256, shipped
in `ad7ec1c`). ADR-0017 stays closed: this is still a Pool round robin with no format picker.

Tickets (Linear, `ready-for-agent`), in dependency order:

| # | Ticket | Blocked by |
|---|--------|-----------|
| 1 | [TEM-259](https://linear.app/temba-app/issue/TEM-259) Create flow shell, type step, and Friendly game path | — |
| 2 | [TEM-260](https://linear.app/temba-app/issue/TEM-260) Store Game length on Friendly tournaments | — |
| 3 | [TEM-261](https://linear.app/temba-app/issue/TEM-261) Friendly tournament path in the create flow | TEM-259, TEM-260 |
| 4 | [TEM-262](https://linear.app/temba-app/issue/TEM-262) Show Pools as "groups" across the App | TEM-261 |

TEM-259 and TEM-260 may run in parallel.

## Problem Statement

Organizers have two separate create pages. `/dashboard/games/new` is one long form of dropdowns
(Group, Venue, Court, Level min, Level max, day, start, finish) for a Friendly game.
`/dashboard/games/new-tournament` is another long form for a Friendly tournament. Group home offers
two separate entry points. Every future format would need a third page and a third button.

The dropdowns hide choices that fit on screen, so the Organizer opens nine sheets to fill one form.
The page also never shows the Organizer what they are building. They read inputs, not the Game.

## Solution

One create flow at `/dashboard/games/new` with four steps.

- **Step 1 picks the Game type:** Friendly game or Friendly tournament. That pick decides what steps
  2–4 contain. Each future format adds a card here and its own branch for steps 2–4.
- **Choices are chips, not dropdowns:** Group, Venue, Court, day, start time, duration, Level range,
  price presets, Game length.
- **A black header previews the Game being built** (time, day, Venue, Court for a Friendly game;
  Game teams, Pool Match count, day, Venue, Courts for a tournament). It uses the same type as Game
  home.
- **Future steps collapse** into labelled rows under the current step (for example "When · STEP 3").

`/dashboard/games/new-tournament` redirects into the flow with the tournament branch preselected.
Group home collapses to one **Create** action.

Friendly tournaments gain a stored **Game length**. The Organizer picks 20, 30, or 45 minutes, or
types a custom value. The schedule and Game home use it instead of the fixed 45 minutes.

Friendly tournaments become **one-day only**. The "A few weeks" option goes away.

In every UI surface, a tournament's **Pools** are labelled **groups**. Code, schema, and the
CONTEXT.md term stay `Pool`.

## User Stories

### Starting create

1. As an Organizer, I want one Create action on Group home and the Games hub, so that I don't choose
   between two buttons before I know what the form asks.
2. As an Organizer, I want step 1 to show a Friendly game card and a Friendly tournament card, each
   with a one-line description and a "Counts for your rating" line, so that I pick the right type.
3. As an Organizer who opens create from a Group, I want that Group preselected in step 2, so that I
   don't pick it again.
4. As an Organizer with an old `/dashboard/games/new-tournament` link, I want to land in the flow on
   the tournament branch, so that bookmarks keep working.
5. As an Organizer with no eligible Group, I want the existing "Create a Group first" empty state
   before step 1.

### Friendly game

6. As an Organizer, I want Group as chips (the first few Groups, plus "All N groups" to open the full
   list), so that the common case is one tap.
7. As an Organizer, I want Venue as cards showing Court count and city, and Court as chips starting
   with "None", so that I see the options without opening a dropdown.
8. As an Organizer in a Club Group whose Community has a Venue link, I want the Venue locked with the
   existing copy.
9. As an Organizer, I want day chips (today plus the next four days, plus "Later date" for a date
   picker), start-time chips in 30-minute steps (only upcoming times for today, plus "More"), and
   duration chips 60 / 90 / 120 min plus "Set" for a custom finish, so that I set the window in
   three taps.
10. As an Organizer, I want Level range as two rows of Level band chips (minimum, maximum), defaulting
    to "Open to anyone", so that I set a range without two dropdowns.
11. As an Organizer, I want a Price per player input with suggestion chips (Free, 3.500, 4.250,
    4.500, 5.250, 6.000, 6.500, 7.000, 7.500 BD) that fill the input and stay editable.
12. As an Organizer, I want a review block before Create (Group, Venue and Court, and "4 open seats")
    so that I read the result before committing.

### Friendly tournament

13. As an Organizer, I want step 2 to hold Group, Venue, Courts (the Venue's named Courts as
    multi-select chips), and Game teams (a stepper, 4–32, even numbers).
14. As an Organizer, I want step 3 to hold the groups count (stepper with "3 groups of 4, 3 games
    each"), day, start time, finish time, and Game length (20 / 30 / 45 min chips plus a custom
    value).
15. As an Organizer, I want a schedule line under step 3 ("18 Pool Matches, last Match finishes at
    3:00 PM") that warns me when the schedule runs past my finish time, so that I size the day before
    I create.
16. As an Organizer, I want step 4 to hold Name, Who can enter (Anyone / Set a Level range), Price per
    player (same suggestions, with "X BD a Game team of two"), Who can take a seat, How people join,
    and a review (Group, Venue, format "3 groups", Courts, Game length, Counts for rating).
17. As an Organizer, I want the tournament name prefilled from the day (for example "Friendly
    tournament · Fri, Sep 25") and editable, so that naming is not a blocker.
18. As an Organizer, I don't want to be offered a multi-week tournament. Friendly tournaments are one
    day.

### Across the flow

19. As an Organizer, I want Continue to check only the current step, show errors on its fields, and
    focus the first invalid field.
20. As an Organizer whose final Create fails on a field from an earlier step, I want to be taken back
    to that step with the field error shown.
21. As an Organizer, I want browser Back to go to the previous step, and Cancel to leave the flow.
22. As a player on a tournament's Game home, draw, or tables, I want Pools called "groups".

## Behaviour

### Route and step state

- One route: `/dashboard/games/new`. Query params: `groupId` (optional, existing behaviour), `type`
  (`friendly_game` | `friendly_tournament`), and `step` (`1`–`4`).
- `type` present and `step` absent → open step 2 of that branch.
- `/dashboard/games/new-tournament?…` → server redirect to `/dashboard/games/new?type=friendly_tournament&…`,
  keeping `groupId`. Delete the old tournament page and layout (keep a redirect-only page).
- Moving between steps pushes a history entry (`router.push` with the new `step`), so browser Back
  walks back through the steps.
- Form state lives in the page component and is not persisted. On reload, keep `type` and `groupId`.
  If the requested step's prerequisites are missing, open the first incomplete step.
- Changing type in step 1 after filling later steps keeps the shared fields (Group, Venue, day, start
  time, price, Level range) and drops the branch-only fields.
- `titleFromPath` keeps "Create Game" for `/dashboard/games/new`. Drop the `new-tournament` branch.

### Step content

| Step | Friendly game | Friendly tournament |
|------|---------------|---------------------|
| 1 | Type (shared) | Type (shared) |
| 2 · Where | Group, Venue, Court (optional, single) | Group, Venue, Courts (optional, multi), Game teams |
| 3 · When | Day, start, duration/finish | Groups count, day, start, finish, Game length, schedule line |
| 4 · Level and price | Level range, Price per player, review, **Create Game** | Name, Who can enter, Price per player, Who can take a seat, How people join, review, **Create tournament** |

Required: Group, Venue, day, start, finish (both branches); Game teams, groups count, Game length,
and Name (tournament). Everything else is optional, with today's defaults.

### Rules unchanged

All server rules stay as they are: Group eligibility (`listCreateGroups`), Venue lock and catalog
(`listCreateVenues`), Court belongs to Venue, the window rules (30-minute steps, not in the past), the
Level range must not be inverted, the price cap, tournament sizing (`sizeFriendlyTournament`),
`isPublic`, `allowSoloRegister`, and "create does not seat the Organizer". The Friendly game still
calls `games.create` and the tournament still calls `games.createTournament`, with the same payloads
plus `matchMinutes` for tournaments.

### Game length (Friendly tournament)

- New nullable column `games.match_minutes` (integer). Friendly tournaments created from now on always
  store a value. A null value means 45 (legacy rows). Other formats leave it null.
- `createTournament` input: `matchMinutes`, integer, 10–120, a multiple of 5, required.
- Every consumer of `TOURNAMENT_SLOT_MINUTES` takes the Game's minutes instead: the one-day fit, the
  schedule builder in `lib/tournament-schedule.ts`, round starts in `lib/tournament-rounds.ts`, and
  the Game home "Each Match" row. The constant stays only as the null fallback.
- Game length cannot be changed after create in this slice.

### One-day only

- The create flow offers a single day with start and finish.
- `createTournament` refuses a window longer than 24 hours (`path: ["windowEnd"]`). This check does
  not depend on timezone. Existing multi-week rows keep rendering through the few-weeks helpers.

### Copy

- Use glossary terms: **Friendly game** (not "Matchmaking game"), **Price per player** (not "entry
  fee"), **Game teams** (not "teams").
- Exception: a tournament's **Pools** are labelled **groups** in every UI string. Code identifiers,
  tRPC names, schema, and the CONTEXT.md term stay `Pool`. CONTEXT.md records the display label.
  Wherever "groups" appears near the tournament's Group, the Group is shown by its name.
- Rating: both type cards say **"Counts for your rating"**. The tournament review says "Counts for
  rating: Yes". The design's "Friendly, no rating change" is **not** used.
- Friendly game review seats: "4 open seats" (create does not seat the Organizer).

### Layout

- Mobile-first, following the design frames: step label ("STEP 2 OF 4"), step title, content, then
  collapsed rows for future steps, then primary CTA and Cancel. Keep the App bottom nav as shown in
  the design.
- CTA label: "Continue" on steps 1–3, and "Create Game" / "Create tournament" on step 4.
- Touch targets are at least 44px. Chip groups are `radiogroup` (single select) or button groups with
  `aria-pressed` (Courts multi-select). The header preview is `aria-live="polite"`.
- Venue card secondary line: `{n} Courts · {city}`.

## Implementation Decisions

- Build the flow as one client page under `app/dashboard/games/new/` with small co-located step
  components. Each branch is a component pair (`FriendlyGameSteps`, `FriendlyTournamentSteps`) behind
  a type registry listing each type's card copy and its steps 2–4. A new format adds one registry
  entry and one steps component.
- Reuse `GameVenueSelect` logic (copy, lock, empty catalog), `StepperField`, `parseRequiredGameWindow`,
  `upcomingGameWindowTimeSlots`, `parseOptionalPricePerPlayerCents`, `parseLevelBandSelectTenths`,
  `sizeFriendlyTournament`, `oneDayFit`, and the `form-mutation-error` helpers. Replace dropdown
  rendering with chips. Do not fork the parsing.
- Map server field paths to steps (for example `groupId`/`venueId`/`courtId`/`courtIds`/`teamCount` →
  2, `window*`/`poolCount`/`matchMinutes` → 3, everything else → 4). `focusFormFailure` runs after
  the step changes.
- No new tRPC procedure. `createTournament.ts` gains `matchMinutes` and the one-day check in place
  (one endpoint per file).
- Migration: add the column only, with no backfill.

## Testing Decisions

- `createTournament.test.ts`: stores `matchMinutes`, rejects values outside 10–120 or not a multiple
  of 5, rejects a missing value, and rejects a window longer than 24 hours.
- Unit tests for schedule and round helpers with 20, 30, and 45 minutes, and with the null fallback.
- Unit tests for step routing: server field path → step, and the first incomplete step from state.
- Existing tests for `lib/dashboard-paths` and `home-no-games` are updated for the single route.
- Manual check at 375px and desktop for both branches, including a locked Venue, the empty catalog,
  an invalid `groupId`, a server error that jumps back to step 2, and the `/new-tournament` redirect.

## Non-goals

- Rounds format (05c), Knockout only, and Groups then knockout. No format picker ships.
- Making Friendly tournaments unrated.
- Venue distance, "usually X BD" Venue price, Group member counts, and a "Sign up closes" date.
- Seating the Organizer at create.
- Editing Game length after create.
- Multi-week Friendly tournaments.
- Changing Americano or legacy `team_only` rows.
- Renaming `Pool` in code, schema, tRPC, or the glossary term.

## Risks

- **"groups" vs Group.** The display label collides with the Group entity. Mitigation: always show
  the tournament's Group by its name and write "groups" in lowercase after a count ("3 groups").
- **Hard-coded slot minutes** are spread across the server (draw, post, seat lists, hub) and the
  client. Ticket 2 must replace every `TOURNAMENT_SLOT_MINUTES` read with the Game's value, or
  schedules will disagree between surfaces.
- **One-day check** could reject a tournament that legitimately crosses midnight. That is accepted,
  because the limit is 24 hours, not the calendar day.
