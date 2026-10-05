Status: draft, open questions at the end

# Mobile create flow: match the create-game design

Design: `.scratch/create-game-design/design.md`, extracted 2026-10-05 from Claude Design project
`fea56e1b-5966-4cbb-981f-15fe74a0c7fc`, file `Create game flow.dc.html` (04a–04e, 05a–05d, Venue search sheet).

Related: `.scratch/create-game-flow/spec.md` and `decisions.md` (the web pass on the same design,
settled 2026-09-22), ADR-0017, ADR-0019, ADR-0020, `.scratch/mobile-screen-header/spec.md`,
`.scratch/mobile-and-api-server/spec.md` section 4 (locked design system) and Phase 6 flow 7.

Tickets: `tickets.md` in this folder. They are not in Linear yet.

## Problem

The mobile create flow (`apps/mobile/src/create-game/`, route `app/(app)/games/new.tsx`) already
covers both branches end to end: type, where, when, level and price for a Friendly game, and where
and size, format and day, entry and review for a Friendly tournament. It calls the same procedures
as the web App and uses the same `@repo/domain` rules. What it does not do is look like the design:

- A paper `ScreenHeader` with a close button sits above a small ink `Surface` holding
  "STEP n OF 4 · title", a title and a progress bar. The design puts the nav button inside a
  full-bleed ink header, with a two-line title or a time hero.
- Every choice is a stack of full-width `Button`s ("Pick Friendly game", venue buttons with
  "name · meta" labels). The design uses choice cards, chip grids, dashed escape chips, bordered
  venue lists and a search sheet.
- Back, Continue and Cancel are three full-width buttons at the end of the scroll. The design has a
  pinned footer ("Next / When" plus a Continue button) and moves Back into the header.
- No upcoming-steps preview, no section notes ("Required", "Optional", computed end time), no
  stepper rows, no money input, no review card styling, no schedule summary card.

The web App already ships this design (`apps/web/src/app/dashboard/games/new/`), with the product
decisions recorded in `.scratch/create-game-flow/decisions.md`. The mobile App should reach the same
place, using the mobile primitives and tokens.

## Goals

1. Each of the nine design screens is matched on mobile wherever the product supports it, in the
   design's structure: ink header with nav inside, sections with notes, chips and cards, pinned footer.
2. Behaviour, payloads and validation stay what they are today. Both branches still call
   `games.create` and `games.createTournament` with the same inputs.
3. Every design element the product cannot back is either replaced with true copy or dropped, as
   listed in "Design elements the product cannot back".
4. The locked design system holds: tokens only, `Text` for all type, hairlines, one ink `Surface`
   per screen, `Hatch` for "not yet", at most two mount animations.

## Non-goals

- Any tRPC change. No procedure, input or output changes in this plan (see Q3 for the one optional
  additive field).
- Any change to the web App or to shared `@repo/domain` copy (`CREATE_GAME_TYPE_CARDS`,
  `CREATE_FLOW_PRICE_CHIPS`, `CREATE_FLOW_MATCH_MINUTE_CHIPS`, `TOURNAMENT_SHAPE_OPTIONS`).
- A fourth "Rounds" format (05c). Tournament shapes stay Groups only, Knockout only, Groups then
  knockout (ADR-0020). The Round count stepper (ADR-0019) stays.
- Making Friendly tournaments unrated, seating the Organizer at create, a sign-up close date.
- Venue distance, typical Venue price, "Open to group" / "Request access" tags, location permission.
- A draft that survives an app restart, a "Discard this Game?" confirmation, and intercepting the iOS
  edge-swipe. Today's behaviour is kept.
- Changing the shared `Section` primitive's title style on other screens.
- Venue administration (stays web only).

## Current implementation (what stays)

| Concern | Where | Kept as is |
| --- | --- | --- |
| Route and params | `app/(app)/games/new.tsx` (`groupId`, `type`) | Yes |
| State | `create-model.ts`: `createReducer`, `advance`, `submitRequest`, `serverFailure` | Yes. New pure helpers are added beside it. |
| Rules | `@repo/domain/create-game-flow`, `create-game-draft`, `create-game-submit`, `tournament-sizing`, `tournament-knockout`, `tournament-schedule`, `game-window`, `level-range`, `price-per-player` | Yes, called, not changed |
| Data | `games.listCreateGroups`, `games.listCreateVenues` (`locked`, `groupKind`, `venues[].courts`, `recentCourtIds`) | Yes |
| Submit | `games.create`, `games.createTournament`; server field errors jump to the owning step | Yes |
| Access gate | `groupCreator` metadata check, empty Group list, load and error states | Yes, restyled |
| Gallery | `app/gallery-create.tsx` with `@repo/domain/create-game-fixtures` | Extended per ticket |

Friendly tournament creation already exists on mobile and is in Phase 6 scope (flow 7, "Create a
Game and a Friendly tournament"). Nothing here touches Venue administration.

## Decisions carried over from the web pass

From `.scratch/create-game-flow/decisions.md`, updated for ADR-0020:

1. Format picker shows the three Tournament shapes. Rounds (05c) as its own format is out.
2. Friendly tournaments are rated. Both type cards say "Counts for your rating". The tournament review
   shows `COUNTS_FOR_RATING_LABEL` / `COUNTS_FOR_RATING_YES`.
3. Tournament create keeps Name, Who can take a seat (`isPublic`) and How people join
   (`allowSoloRegister`). The design drops them; mobile keeps them, restyled (see 05d).
4. One-day only. Game length chips 20 / 30 / 45 plus a custom value (10–120, steps of 5).
5. Courts are named Courts (multi-select for tournaments), never a count.
6. Create does not seat the Organizer. Review shows "4 open seats".
7. Glossary copy: Friendly game (not "Matchmaking game"), Price per player (not "entry fee"),
   Game teams (not "teams"), Match / Matches (not "games" for contests). Pools read "groups".
8. Manual tournament finish time is kept, with the overrun warning (see Q5).
9. Venue distance and usual price, Group member count and "Sign up closes" are dropped (see Q3).
10. Price suggestions are the shared `CREATE_FLOW_PRICE_CHIPS` (see Q4).
11. Level range uses all seven assignable bands D, D+, C, C+, B, B+, A.

## Design tokens

Design hex values map to `@repo/design-tokens` only. No hex in screens (lint enforced).

| Design | Role | Token |
| --- | --- | --- |
| `#000000` | ink | `colors.ink` |
| `#FFFFFF` | paper | `colors.paper` |
| `#F4F4F4` | soft fill (search field, soft-selected quick pick) | `colors.wash` |
| `#E6E6E6` | hairline, disabled fill | `colors.rule`; disabled buttons use the existing `Button disabled` (opacity) |
| `#C9C9C9` | dashed border | `colors.inputBorder` |
| `#C9C9C9`, `#9A9A9A` | faint and muted text ("STEP n", locked titles, notes) | `tone="muted"` (`colors.muted`). Faint is deliberately absent from the tokens for contrast. |
| `#6E6E6E` | secondary text | `tone="muted"` |
| `#8E8E8E` | muted on ink | `tone="muted"` inside an ink tone (`colors.dim`) |
| `#2E2E2E` | upcoming progress bar, "/" separator on ink | `colors.dimrule` |
| `#1C1C1C` | icon tile on ink | `colors.raised` |
| `#D6D6D6` | sheet grabber | `colors.rule` |
| scrim 0.45 | sheet scrim | the existing `Sheet` scrim |

Type: Archivo width 112–118 at weight 700 maps to `Text width="expanded"` (the 115/700 instance).
Sizes map to the nearest existing token, and no type token is added:

| Design | Token |
| --- | --- |
| 36 display title | `display` expanded |
| 44 hero value | `hero` expanded (48); `display` if a long value wraps at 375 pt |
| 19–22 section title, sheet title | `title` expanded |
| 20 unit, 17 card title | `title` / `lead`, weight medium or semibold |
| 15–16 body, row names, day numbers | `body` (`lead` expanded for day numbers and stepper values) |
| 13–14 meta, chips, context row | `meta` or `body` |
| 10–12 mono labels and captions | `eyebrow` with `mono uppercase` |

Radii: chips and time cells `md` (10), inputs and steppers `lg` (12), cards and lists `card` (14),
seat strip `sm`, mini bracket `slot`. Spacing: gutter `surface` (22), section gap `section` (26).

## Design system conflicts and resolutions

| Conflict | Resolution |
| --- | --- |
| 04a shows the Friendly tournament card on ink, with the ink header above it. The rule is one ink `Surface` per screen, and nothing is selected yet. | The header is the screen's one `Surface tone="ink"`. A type card is ink only when it is the selected choice, like a selected chip or venue row. It is a new `ChoiceCard` control, not a `Surface`, so it does not register with the ink registry. It provides the ink tone context to its children so `Text` and `Hatch` pick ink colours. With no type chosen both cards are paper. See Q1. |
| Archivo width axis 112, 116, 118 and weights 500/600 at those widths | Only `width="expanded"` (115, bold) exists. Expanded text is always bold. Medium and semibold text uses the normal width. |
| Dashed borders on escape chips ("All 9 groups", "More", "Set") | A dashed hairline is still a hairline. Allowed for escape chips only, colour `inputBorder`, matching the web `ChoiceChip dashed`. |
| Ink borders (search input, stepper rows, money input, schedule card) | Hairline width in `colors.ink`, as `TextField` already does for focus and error. No shadows. |
| Disabled primary with `#E6E6E6` fill | The existing `Button disabled` state. No new disabled colourway. |
| 10 px mono labels | `eyebrow` (12) mono. No 10 px token. |
| Seat strip on the Friendly game card: first cell ink, three hatched | Create does not seat the Organizer. All four cells are `Hatch` ("not yet"). |
| Helper notes behind a `showLongHelpers` toggle | Design-tool setting. Helpers always show. |
| Mount animations | At most one: the current progress bar fills through `MountFill` on step change, skipped under reduce-motion. Sheets use the platform presentation. |

## Shell (all steps)

### Layout

- **Header.** One full-bleed `Surface tone="ink"` at the top of the scroll content. It covers the
  safe-area top, has no outer radius at the top edge, and scrolls with content (mobile-screen-header
  decision 4). Inside, padding 22:
  - Row: 40 pt nav button on the left (step 1 `X`, steps 2–4 `ChevronLeft`) in the ink colourway
    (raised or dimrule border, paper icon). On the right, `STEP n OF 4` as `eyebrow mono uppercase muted`.
  - Title, 18 below the row. Either a text title (`display` expanded, two lines, `accessibilityRole="header"`)
    or a hero summary (see steps 3 and 4).
  - Subtitle (`body muted`) or a context row (`meta muted`, optional 16 pt icon, parts separated by
    a "/" in `dimrule`).
  - Progress: 4 equal bars, gap 5, 3 high. Done and current bars are paper, upcoming bars are
    `dimrule`. Hidden from assistive technology.
  - The title block is `accessibilityLiveRegion="polite"`.
- **Body.** Sections, gap 26. Each section has a header row: title (`title` expanded, `muted` when
  locked) and, on the right, a note (`meta muted`: "Required", "Optional", "30 minute steps", a
  computed clock) or a text link ("Change", "Later date" with a `Calendar` icon). Links have a 44 pt
  hit area.
- **Upcoming steps** (steps 1 and 2 only). Below a hairline: each later step from
  `createFlowLaterSteps(type)` as a row with title (`title` expanded, muted), `STEP n`
  (`eyebrow mono`, muted) and a `ChevronDown`. Not pressable. Step 1 with no type shows the Friendly
  game steps, as `createFlowLaterSteps(null)` does.
- **Footer.** Pinned below the scroll view, above the tab bar, on paper with a hairline top rule,
  padding 14 / 22, gap 10.
  - Steps 1–3: left column "Next" (`eyebrow muted`) over the next step's title (`meta semibold`);
    right a Continue button (`lg`, ink, `ArrowRight` icon).
  - Step 1 before a type is picked, and step 2 before a Group is picked: full-width disabled Continue
    plus a Cancel button (outline).
  - Step 4: full-width "Create Game" or "Create tournament" (pending shows "Creating…") plus Cancel.
- **Errors.** `FormErrorSummary` sits directly under the header. Field errors stay under their section.

### Behaviour

- Header back on steps 2–4 goes to the previous step (today's `onBack`). Close on step 1 leaves the
  flow (`router.back`, fallback `/games`). The footer has no Back button any more.
- Continue keeps today's `advance` validation. It is disabled only when the current step has an empty
  required choice: step 1 without a type, step 2 without a Group. Otherwise it is enabled and shows
  field errors on press, as today. This is one pure function, `continueBlocked(state)`, in
  `create-model.ts`.
- Pull to refresh and refetch on foreground stay.
- The status bar is light while the ink header is on screen.
- Loading, Groups error, no Group to create in, and the `groupCreator` gate render inside the same
  shell (header with close, no progress), not as bare surfaces.

## Per-screen behaviour and data sources

Legend for data: **(a)** available now, **(b)** needs an additive API change, **(c)** dropped or
replaced. "Client" means computed on the device from `@repo/domain`.

### 04a. Step 1, type

Header: close; title "What are you / setting up?"; subtitle "Both start with a Venue and a time.
The rest of the form follows your pick." (design said "a court"; a Court is optional).

Two `ChoiceCard`s in a radio group, from `CREATE_GAME_TYPE_CARDS`:

| Element | Source | Class |
| --- | --- | --- |
| Title "Friendly game" / "Friendly tournament" | `card.title` (design: "Matchmaking game") | (a), glossary |
| Sub line | `card.description` | (a) |
| Icon tile `Shuffle` / `Trophy` | static; tile is hairline on paper, `raised` on ink | (a) |
| Seat strip, 4 cells | decoration, all `Hatch` | (a), changed |
| Mini bracket 4×2 | decoration: two solid, two `Hatch`, four outline cells | (a) |
| Caption | `card.rating` "Counts for your rating" (design: "FRIENDLY, NO RATING CHANGE") | (a), design copy is false |
| Trailing `ChevronRight` | static | (a) |

Tapping a card selects it (`selectType`) and enables Continue. Upcoming steps preview follows the
selection. Illustrations are hidden from assistive technology.

### 04b / 04c. Friendly game, step 2, where

Header: back; title "Friendly / game". Before a Group: subtitle "Start with the Group. Venue rules
depend on it." (design said "levels and prices follow from it", which is not true). After a Group:
context row `Users` icon, "{Group name} / {n} Venues" (`picker.venues.length`; locked picker:
"{Group name} / Linked Venue").

**Group** (note "Required"):
- Before a pick: chips from `visibleCreateGroups(groups, groupId)` plus, when there are more than
  `VISIBLE_GROUP_CHIP_COUNT`, a dashed chip with `Search` icon "All {n} groups" that opens the Group
  sheet (search by `groupLabel`, pick closes the sheet).
- After a pick: one selected ink chip with `Check`, and a "Change" link in the section header that
  shows the chips again. Collapsed state is local UI state.

**Venue**:
- No Group: title muted, a hatched panel (radius `card`) with `Lock` icon and "Pick a Group first.
  Venue rules depend on the Group." (existing copy).
- Loading: two skeleton rows. Error: picker message. Empty catalog: "No Venues are available yet."
  and Continue stays blocked (today's rule).
- Locked (`picker.locked`): one non-pressable row with the Venue, plus `createVenueCopy` below.
- Unlocked (note "Required"): a search field button (46 high, `wash` fill, hairline, `Search` icon,
  "Search all Venues") that opens the Venue sheet; then a bordered list of
  `visibleCreateGroups(venues, venueId)` (3 plus the selected one) as `ChoiceCard` rows, separated by
  hairlines. Row: name (`body`), meta `venueCardMeta(courts, city)`. Selected row is ink with
  `Check`. `createVenueCopy` shows below as helper text.

| Design meta | Class |
| --- | --- |
| "4 courts" | (a) `venue.courts.length`, via `venueCardMeta` |
| "6 min away" | (c) needs device location, a new permission, Venue coordinates in the output and travel time. Show the city instead. |
| "usually 2.000 BD" | (c) no aggregate exists. Would be (b) as an additive `listCreateVenues` field. Dropped. |
| "3 venues open to this group" | (c) no per-Group Venue access exists. Replaced by the Venue count. |

**Court** (note "Optional"): a 5-column grid: "None", then `visibleCreateCourts(...)`, then a dashed
"More" cell when the Venue has more Courts. Courts show their names, one line. Selected is ink.
Helper: "Leave on None to settle the Court at the Venue." Before a Venue: hatched placeholder cells.

**Upcoming steps**: When, Level and price.

### Venue search sheet

Opened from the search field. Uses the extended `Sheet` (tall, scrolling body, header action).

| Element | Source | Class |
| --- | --- | --- |
| Title "Find a Venue", "Cancel" text button | static | (a) |
| Search input, ink hairline border, autofocus, "Venue name or area", "Clear" while non-empty | `venueMatchesQuery(venue, query)` (name and city) | (a) |
| Label with no query | "ALL VENUES" (design: "NEARBY VENUES") | (c), no location |
| Label with a query | "{n} RESULT(S)" | (a) |
| Rows: name, meta | `venueCardMeta` | (a) |
| Tags "Open to group" / "Request access" | no such concept | (c) |
| Empty | "No Venues match “{query}”." | (a) |

Picking a row dispatches `setVenue`, closes the sheet and clears the query.

### 04d. Friendly game, step 3, when

Header: back; hero from `friendlyGameKickoff` and `formatHomeKickoff`: value "8:00", unit "PM",
trailing "to 9:30 PM". Before a start time the hero reads "Pick a time" in the title style. Context
row: day label / Venue name / Court name (`friendlyGamePreviewLine` parts, rendered with "/").

- **Day** (link "Later date" with `Calendar`): 5-column day cells from
  `createFlowDayOptions(now, 5)`. Each cell: weekday (`eyebrow`, "Today" via `createDayChipLabel`)
  over the date number (`lead` expanded). Selected is ink. A day chosen beyond the five replaces the
  link text with its label (web parity) and shows as selected there. "Later date" opens a month-grid
  sheet starting at `earliestCreateDay(now)` (see Q6).
- **Start time** (note "30 minute steps"): 4-column grid of `previewStartSlots(upcomingGameWindowTimeSlots(day, now), ...)`
  labelled with `formatTimeSlotLabel`, plus a dashed "More" cell that expands the list.
- **Duration** (note: computed finish `formatTimeSlotLabel(finishTime)`): 60 / 90 / 120 from
  `CREATE_FLOW_DURATIONS`, plus a dashed "Set" that reveals the finish-time grid (today's custom).
- Helper with `Info` icon, under a hairline: "Day, start time, and finish time are required. Pick
  today or a later day. Times are in 30-minute intervals; for today, only upcoming times are listed."

All values (a). Rules unchanged (`selectStartSlot`, `reconcileWindowForDay`, `validateFriendlyGameWhen`).

### 04e. Friendly game, step 4, Level and price

Header: same hero and context as 04d.

- **Level range** (note "Optional"): two 7-column rows, "Minimum" and "Maximum", over
  `ASSIGNABLE_DISPLAY_LEVEL_BANDS`, cells disabled by `isLevelBoundDisabled`; tapping the selected
  band clears it (web parity). Below: "Minimum **C** / Maximum **B**" (unset shows "Any") and an
  "Open to anyone" text link that dispatches `openLevelRange`. Helper: "Users without a Level must
  request to play when a range is set." The design's single six-cell strip is not used (Q2).
- **Price per player** (note "Optional"): a money row, 56 high, ink hairline, value `figure`
  expanded with "BD" unit, `decimal-pad`, `accessibilityLabel="Price per player in BD"`, bound to
  `draft.pricePerPlayer` and validated by `parseOptionalPricePerPlayerFils` through today's submit.
  Quick picks: `CREATE_FLOW_PRICE_CHIPS` in a 4-column grid, 38 high; the matching one
  (`priceChipIsSelected`) is soft-selected (`wash` fill, ink hairline). Helper: "Zero means free.
  Temba does not collect payment."
- **Review card** (hairline, radius `card`, rows separated by hairlines, label muted left, value
  right): Group, Venue ("{Venue}, {Court}" when a Court is set), Seats `CREATE_FLOW_OPEN_SEATS_LABEL`
  (design "3 open, you take one" is false).

### 05a. Friendly tournament, step 2, where and size

Header: back; title "Friendly / tournament"; context row `Trophy` "Counts for your rating / 4 to 32
Game teams" (design: "Friendly, no rating change / 3 or more teams", both false; the minimum is
`TOURNAMENT_TEAM_MIN` = 4).

- **Group**: as 04c. The "28 members" pill is (c) by default; (b) if Q3 is answered yes.
- **Venue**: as 04c. "holds a full day booking" meta is (c).
- **Courts in use** (note "Sets the schedule"): multi-select chips of named Courts
  (`toggleCourt`), 4-column, with the same visible-plus-"More" rule. Not a count (decision 5).
- **Game teams** (note "Pairs, two seats each"): stepper row, 56 high, ink hairline, 40 pt minus and
  plus buttons, value (`h2` expanded) with unit "Game teams". Range `TOURNAMENT_TEAM_MIN` to
  `TOURNAMENT_TEAM_MAX`, step `TOURNAMENT_TEAM_STEP`, through `setTeamCount`. Helper
  `playersInPairsLine(teamCount)`.

### 05b. Friendly tournament, step 3, format and day

Header: back; hero "{teamCount}" unit "Game teams" trailing "{n} Matches", where n is pool Matches
(`plan.rounds.poolMatches`) plus Knockout Matches (sum of `knockoutTree` or `poolKnockoutTree`
`matchesPerRound`). Context: day label / Venue / `courtCountValue(courtIds.length)`.

- **Format** (note "Required"): `TOURNAMENT_SHAPE_OPTIONS` as full-width `ChoiceCard`s (title and
  description), selected ink with `Check`.
- **Stepper cards**, side by side, hairline, radius `lg`, 32 pt buttons:
  - "Groups" (pool shapes): `poolCount` from 1 to `maxPoolCount(teamCount)`; note
    `friendlyTournamentGroupsLine(sizing)` and the uneven-groups line when uneven.
  - "Into knockout" (Groups then knockout): `qualifiersPerPool` within `qualifiersRange`; note
    `qualifiersConsequenceLine(poolKnockoutTree)`.
  - Knockout only shows no stepper cards; a note from `knockoutOnlyReviewValue(knockoutTree)`.
- **Rounds** (pool shapes, ADR-0019): stepper row like Game teams, range `roundCountRange`, unit
  "Rounds", note `formatRoundMatchesPerTeam` plus `ROUND_MEETS_COPY`, "Use suggested (n)" link when
  off the suggestion. The design's 05c copy "Temba draws each round from the standings" is false
  (Rounds are a fixed circle-method schedule) and is not used. Its "Max 11" is also not used: the
  maximum is two Passes.
- **Day**, **Start time**: as 04d.
- **Finish**: today's finish-time grid, restyled (decision 8, Q5).
- **Game length** (note: last Match finish clock when the schedule computes): chips from
  `CREATE_FLOW_MATCH_MINUTE_CHIPS` plus a dashed "Set" that reveals the custom minutes field
  ("10 to 120 minutes, in steps of 5").
- **Schedule card** (ink hairline, radius `card`): title "{n} Matches, {start} to {last finish}"
  (`lead` expanded); detail "{pool} group Matches and {k} knockout Matches. {c} Courts, {m} minutes a
  Match, {s} slots back to back." from `oneDayFit` (`slotCount`, `lastFinish`) on the plan's Round
  Matches. With no Courts: "Pick Courts in use to see the schedule." When it overruns the window, add
  `ONE_DAY_OVERRUN_MESSAGE`. All client (a).

### 05c. Rounds format

Not built as a format (non-goal). Its useful parts are covered by Groups only with "Groups" at 1 and
the Rounds stepper row. Quick picks under the Rounds stepper (3, 4, 5, 11) are not added.

### 05d. Friendly tournament, step 4, entry and review

Header: back; hero as 05b; context: day label / "{start} to {finish}" / Courts count.

- **Who can enter** (note "Optional"): two segmented cells "Anyone" and "Set a Level range"; the
  range rows of 04e appear under the second. The design note "A friendly tournament does not change
  anyone's Level, so mixed levels are fine" is false and is replaced by the 04e helper.
- **Price per player** (design "Entry fee per player"): as 04e. Helper: `gameTeamOfTwoCopy` line,
  then "Zero means free. Temba does not collect payment."
- **Name** (kept, decision 3): `TextField`, default `friendlyTournamentDefaultName(day)`.
- **Who can take a seat** (kept): two segmented cells, Group name / `ANYONE_WITH_THE_LINK_LABEL`.
- **How people join** (kept): two segmented cells, `ALONE_OR_WITH_A_PARTNER_LABEL` /
  `WITH_A_PARTNER_ONLY_LABEL`.
- **Review card**: Group; Venue; Format (`friendlyTournamentFormatLabel` or Knockout only); Knockout
  (`knockoutOnlyReviewValue` / `groupsThenKnockoutReviewValue`) when present; Rounds
  (`reviewRoundsValue`) for pool shapes; Courts; Game length;
  `COUNTS_FOR_RATING_LABEL` / `COUNTS_FOR_RATING_YES`. Design rows "Sign up closes" (c) and
  "Rating: Friendly, no change" (false) are not used.

## Components

### Shared primitives (`apps/mobile/src/primitives`)

| Primitive | Change | Why shared |
| --- | --- | --- |
| `Screen` | New optional `header` slot rendered full-bleed at the top of the scroll content, covering the top inset; new optional `footer` slot pinned below the scroll view with a hairline rule. Existing callers unchanged. | Any flow screen with an ink hero or a sticky action bar |
| `ScreenHeader` / nav button | Nav button reads the surface tone and uses the ink colourway on ink. Optional `onNav` overrides `router.back`. | Game details' deferred ink hero needs the same |
| `Sheet` | Optional `action` in the title row, optional tall mode with a scrolling body, `keyboardShouldPersistTaps`. Existing callers unchanged. | Group sheet, Venue sheet, date sheet, other pickers |
| `ChoiceCard` (new) | Pressable card or row, paper with hairline, or ink when `selected`. Provides tone context to children without registering as an ink `Surface`. Props: `selected`, `role` (radio or checkbox), `title`, `description`, `leading`, `trailing` (`check` or `chevron`), `layout` (`card` or `row`), `children`. | Type cards, Venue rows, format options, sheet rows |

### Create-flow components (`apps/mobile/src/create-game`)

| Component | Replaces or extends |
| --- | --- |
| `StepShell` (header content, progress, upcoming steps, footer content) | `Header` and `Progress` in `create-view.tsx`, the footer buttons |
| `StepSection` (title expanded, note or link, locked) | `Section` uses in the steps. Local so other screens do not change. |
| `ChoiceChip` and `ChipGrid` in `chips.tsx` (columns, `dashed`, `soft` selection, icon, multi-select) | `ChipRow` |
| `StepperRow` and `StepperCard` in `chips.tsx` | `Stepper` |
| `MoneyField` | Price `TextField` |
| `ReviewCard` | `ReviewRow` list |
| `GroupField`, `GroupSheet` | Group `ChipRow` |
| `VenueField`, `VenueSheet` | Venue `Button` list and inline search |
| `DayStrip`, `DateSheet`, `TimeGrid` | Day and start `ChipRow`s, "More times" |
| `LevelRangeField` | `LevelRange` |
| `TypeCards` (with `SeatStrip`, `MiniBracket`) | `TypeStep` |
| `ScheduleCard` | Schedule `Surface` |
| `HelperNote` (`Info` icon + `meta muted`) | plain hint `Text` |

Reused unchanged: `Text`, `Hatch`, `Hairline`, `Button`, `TextField`, `Skeleton`, `Toast`,
`MountFill`, `FormErrorSummary`, `FieldError`.

### Pure helpers (Vitest beside them)

Kept in `apps/mobile/src/create-game/` because only the mobile App uses them. They move to
`@repo/domain` only if the web App adopts them.

- `create-model.ts`: `continueBlocked(state)`.
- `create-header.ts`: `stepHeader(state, context)` returning the title or hero parts and context
  parts per step and branch; `kickoffHero(day, start, finish)` (value, unit, trailing);
  `nextStepTitle(type, step)`.
- `create-summary.ts`: `tournamentMatchTotals(plan)` (pool, knockout, total);
  `tournamentScheduleSummary({ plan, day, startTime, finishTime, matchMinutes, courtCount, now })`
  (title, detail, overruns, or a "pick Courts" state); `levelRangeSummary(min, max)`.
- `venue-sheet.ts`: `venueSheetLabel(query, count)`.
- `create-days.ts`: `visibleDayOptions(now, selectedDay)`; `monthGrid(month, earliestDay)` for the
  date sheet.

## API

No procedure changes. All inputs and outputs used today are enough for every (a) element above.

| Design element | Class | If wanted later |
| --- | --- | --- |
| Group member count ("28 members") | (c) | (b) additive `memberCount: number` on `games.listCreateGroups`, as `groups.listPublic` already computes. Test through `listCreateGroups(database, args)` on PGlite. |
| Venue travel time ("6 min away"), "Nearby venues" | (c) | (b) `latitude`/`longitude` on `listCreateVenues` venues, plus `expo-location` and a routing source. Needs its own spec. |
| Typical price ("usually 2.000 BD") | (c) | (b) additive aggregate on `listCreateVenues`. Needs a definition of "usual". |
| "Open to group" / "Request access" tags, "3 venues open to this group" | (c) | Not a product concept. Venue link requests are a Community flow. |
| "Sign up closes" date | (c) | Needs a schema field and admit enforcement. Product change. |
| Match counts, schedule, end clock, Game team price | (a) | Client, from `@repo/domain` |

## Testing

- Vitest beside every pure helper listed above, using `bahrainDate` and
  `@repo/domain/create-game-fixtures`. Cover: both branches, each step, locked and unlocked pickers,
  no Courts, an overrunning schedule, Knockout only, Groups then knockout with Byes, a day beyond the
  five-day strip, a month grid that starts mid-month, and the 0 / null price.
- `create-model.test.ts` gains `continueBlocked` cases. Existing tests stay green unchanged.
- No procedure changes, so no PGlite tests. If Q3 is answered yes, `listCreateGroups.test.ts` covers
  `memberCount`.
- Gallery (`app/gallery-create.tsx`): states for type (none and selected), where empty, where picked
  (unlocked, locked, empty catalog), Venue sheet open with and without a query and with no results,
  when, Level and price, tournament where, each Tournament shape on format and day, schedule overrun,
  no Courts, entry and review, server error on step 2.
- Gate: `pnpm exec turbo run typecheck lint test`. Mobile lint must pass (no hex, no fonts, no shadows).
- Manual: iPhone pass per step at 375 and 390 pt, VoiceOver labels and radio states, reduce-motion,
  pull to refresh, keyboard over the pinned footer on step 4.

## Risks

- **Pinned footer and keyboard.** The money and name fields sit above a pinned footer. The keyboard
  can hide the footer or the field. Mitigation: `automaticallyAdjustKeyboardInsets` stays on the
  scroll view, and the footer is part of a keyboard-avoiding container on iOS.
- **Full-bleed header and overscroll.** Pull to refresh reveals paper above the ink header. Accepted.
- **Ink registry.** `ChoiceCard` must not register. A dev warning from a second ink `Surface` means
  the card was built on `Surface`.
- **Long names.** Group, Venue and Court names in chips and cells truncate to one line with the full
  name as the accessibility label.
- **Hero size.** `hero` (48) is larger than the design's 44. "12:30 PM to 11:30 PM" must fit at
  375 pt or fall back to `display`.
- **Edge swipe.** iOS edge-swipe leaves the whole flow from any step, as today.

## Open questions

Each has a recommendation. None blocks tickets 1–3.

- **Q1. Selected type card on ink.** Is a selected `ChoiceCard` in ink acceptable next to the ink
  header, given the rule "one ink Surface per screen"? *Recommendation: yes. Selection in ink is
  already how chips and Venue rows read. It is not a `Surface` and does not register. Nothing is ink
  before a pick. Alternative: selected cards stay paper with a 2 pt ink border.*
- **Q2. Level range control.** The design shows one six-cell strip with a highlighted range. *
  Recommendation: keep two seven-cell rows (Minimum, Maximum), restyled, with the design's summary
  line and "Open to anyone". One strip cannot express a one-sided range ("C and up" with no maximum),
  and it would drop D+.*
- **Q3. Group member count.** Add the "28 members" pill through an additive `memberCount` on
  `games.listCreateGroups`? *Recommendation: no, consistent with web decision 11. It is cheap if
  wanted; it would be ticket 10.*
- **Q4. Price quick picks.** The design shows four (Free, 1.500, 2.000, 2.500; tournament Free,
  4.000, 6.000, 8.000). *Recommendation: keep the shared nine `CREATE_FLOW_PRICE_CHIPS` in the
  design's 4-column geometry, for web parity. Changing the set should change both Apps.*
- **Q5. Tournament finish time.** The design has no Finish section and shows the end clock computed
  from the schedule. *Recommendation: keep the manual Finish (web decision 10) and show the computed
  last-Match clock as the Game length note and in the schedule card. Deriving `windowEnd` from the
  schedule would change behaviour on one App only and fails when no Courts are picked.*
- **Q6. "Later date" picker.** *Recommendation: a month-grid sheet built from tokens and chips, with
  no new dependency and no upper limit, like the web calendar. Alternative:
  `@react-native-community/datetimepicker`, which brings the iOS system accent colour.*
- **Q7. Copy.** The plan uses glossary copy and true statements where the design differs: "Friendly
  game", "Game teams", "Matches", "Price per player", "Counts for your rating", "4 open seats",
  "4 to 32 Game teams", "ALL VENUES". *Recommendation: accept. Say so if any design wording should
  win, and whether it then changes on web too.*

## Comments
