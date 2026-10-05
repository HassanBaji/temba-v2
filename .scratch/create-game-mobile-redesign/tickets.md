# Mobile create flow redesign: tickets

Spec: `.scratch/create-game-mobile-redesign/spec.md`. Design: `.scratch/create-game-design/design.md`.

Not in Linear yet. Implement in numerical order. Every ticket:

- Touches only `apps/mobile/**`. No `@repo/domain`, `@repo/api` or web change unless the ticket says so.
- Keeps `createReducer`, `advance`, `submitRequest` and the submit payloads unchanged.
- Adds or updates its states in `app/gallery-create.tsx` from `@repo/domain/create-game-fixtures`.
- Passes `pnpm exec turbo run typecheck lint test`, with no hex, no `fontFamily`/`fontWeight`, no
  shadows, at most two mount animations, 44 pt targets, and Hatch hidden from the screen reader.
- Puts each new pure helper in a `.ts` file with a Vitest file beside it.

| # | Ticket | Blocked by |
| --- | --- | --- |
| 1 | Step shell: ink header, progress, upcoming steps, pinned footer | none |
| 2 | Type step as choice cards | 1 |
| 3 | Friendly game where step: Group, Venue list, Court grid | 2 |
| 4 | Group and Venue search sheets | 3 |
| 5 | Friendly game when step with time hero and date sheet | 3 |
| 6 | Friendly game Level and price step with review card | 5 |
| 7 | Friendly tournament where and size step | 4 |
| 8 | Friendly tournament format and day step with schedule card | 5, 7 |
| 9 | Friendly tournament entry and review step | 6, 8 |
| 10 | Optional, only if Q3 is answered yes: Group member count | 7 |

---

## 1. Step shell: ink header, progress, upcoming steps, pinned footer

**What to build.** Replace the paper `ScreenHeader` plus small ink `Surface` plus three footer
buttons with the design's shell on every step of both branches. Step content stays as it is today.

- `Screen` gains optional `header` (full-bleed at the top of the scroll content, covering the top
  inset) and `footer` (pinned below the scroll view, hairline top rule, padding 14/22) slots.
  Existing callers are unchanged.
- The `ScreenHeader` nav button reads the surface tone (ink colourway on ink) and takes an optional
  `onNav` that replaces `router.back`.
- `StepShell` in `create-game/`: ink header with nav (close on step 1, back on steps 2–4 calling
  `onBack`), `STEP n OF 4`, text title and subtitle or context row, 4-bar progress (current bar fills
  through `MountFill`), upcoming-steps rows on steps 1–2, footer ("Next" plus next step title plus
  Continue with `ArrowRight`; full-width primary plus Cancel on step 4 and while blocked).
- `StepSection` (title expanded, note or link, locked look) and `HelperNote`, used by later tickets.
- Pure helpers: `continueBlocked(state)` in `create-model.ts`; `create-header.ts` with
  `stepHeader(...)` text titles and subtitles for steps 1–2 and `nextStepTitle(type, step)`.
- Loading, Groups error, no Group, and the `groupCreator` gate render inside the shell.
- Status bar light while the ink header shows.

**Acceptance criteria.**
- [ ] Exactly one `Surface tone="ink"` per create screen; no ink-registry warning in development.
- [ ] Header back on steps 2–4 goes to the previous step; close on step 1 leaves the flow with the
      `/games` fallback. The footer has no Back button.
- [ ] Continue is disabled on step 1 without a type and on step 2 without a Group, enabled otherwise,
      and still shows `advance` errors on press.
- [ ] Step 4 primary reads "Create Game" or "Create tournament", and "Creating…" while pending.
- [ ] Upcoming steps show on steps 1 and 2 only, from `createFlowLaterSteps(type)`.
- [ ] Progress bars are hidden from assistive technology; the title block is a polite live region.
- [ ] Progress fill is skipped under reduce-motion.
- [ ] Other screens using `Screen` and `ScreenHeader` render unchanged.

**Tests.** `continueBlocked`: each step, both branches. `stepHeader`: titles and subtitles for steps
1–2, both branches, with and without a Group. `nextStepTitle`: both branches, steps 1–3. Gallery:
every existing state renders in the new shell.

---

## 2. Type step as choice cards

**What to build.** Screen 04a. A new `ChoiceCard` primitive in `apps/mobile/src/primitives/`: a
pressable card or row, paper with hairline, ink when `selected`, providing tone context to its
children without registering as an ink `Surface`; props `selected`, `role`, `title`, `description`,
`leading`, `trailing` (`check` | `chevron`), `layout` (`card` | `row`), `children`. `TypeCards` render
`CREATE_GAME_TYPE_CARDS` as two `ChoiceCard`s with icon tile (`Shuffle`, `Trophy`), a four-cell
hatched seat strip, a 4×2 mini bracket, and the `card.rating` caption in mono. Header title "What are
you / setting up?" with the subtitle from the spec.

**Acceptance criteria.**
- [ ] With no type, both cards are paper and Continue is disabled. Tapping one selects it in ink with
      `Check`, enables Continue, and updates the upcoming steps.
- [ ] Copy comes from `CREATE_GAME_TYPE_CARDS` unchanged: "Friendly game", "Counts for your rating".
- [ ] The seat strip shows four hatched cells. Illustrations are hidden from assistive technology.
- [ ] Cards are a radio group with selected state announced.
- [ ] No ink-registry warning with a card selected.

**Tests.** Gallery: type with none selected and with each selected. No new pure logic beyond
ticket 1.

---

## 3. Friendly game where step: Group, Venue list, Court grid

**What to build.** Screens 04b and 04c without the sheets.

- `ChipGrid` and `ChoiceChip` in `chips.tsx`: columns, `dashed`, `soft` selection, leading icon,
  `Check` on selected, single and multi select. `ChipRow` callers move to it.
- `GroupField`: `visibleCreateGroups` chips plus a dashed "All {n} groups" chip (inert until ticket
  4, hidden when not needed); after a pick, one selected chip and a "Change" link.
- `VenueField`: hatched locked panel before a Group; skeleton rows while loading; picker error;
  empty catalog; locked Venue row plus `createVenueCopy`; unlocked search field button (inert until
  ticket 4) plus a bordered `ChoiceCard` row list from `visibleCreateGroups(venues, venueId)` with
  `venueCardMeta`.
- Court grid: 5 columns, "None", `visibleCreateCourts`, dashed "More"; hatched placeholders before a
  Venue; helper "Leave on None to settle the Court at the Venue."
- Header: title "Friendly / game"; subtitle before a Group; context row "{Group} / {n} Venues" or
  "{Group} / Linked Venue" after (extend `stepHeader`).

**Acceptance criteria.**
- [ ] Picking a Group collapses the chips; "Change" shows them again without clearing the Group.
- [ ] Locked, unlocked, archived-link and empty-catalog pickers behave as today (`linkedVenueId`
      auto-select, Continue blocked on empty catalog).
- [ ] The selected Venue row is ink with `Check`; rows truncate long names with the full name as the
      accessibility label.
- [ ] Distance, usual price and access tags do not appear.
- [ ] `groupId` route param pre-selection and the "You cannot create a Game in that Group." refusal
      still work.

**Tests.** `stepHeader` context row cases (no Group, unlocked, locked). Gallery: where empty, where
picked unlocked, locked, archived link, empty catalog, server error on step 2.

---

## 4. Group and Venue search sheets

**What to build.** The Venue search sheet and the "All {n} groups" sheet.

- Extend `Sheet`: optional `action` in the title row, a tall mode with a scrolling body, and
  `keyboardShouldPersistTaps`. Existing callers unchanged.
- `VenueSheet`: title "Find a Venue", "Cancel"; autofocused search input with ink hairline,
  placeholder "Venue name or area", "Clear" while non-empty; label "ALL VENUES" or
  "{n} RESULT(S)"; rows name plus `venueCardMeta`, filtered by `venueMatchesQuery`; empty state
  "No Venues match “{query}”."; picking dispatches `setVenue` and closes.
- `GroupSheet`: same shape over `groupLabel`, title "All {n} groups".
- Wire the search field button and the dashed Group chip from ticket 3.
- Pure helper `venueSheetLabel(query, count)` in `venue-sheet.ts`.

**Acceptance criteria.**
- [ ] Opening the sheet focuses the search input; the scrim and "Cancel" close it and clear the query.
- [ ] Picking a Venue outside the visible three makes it the selected row in the list.
- [ ] Not shown for a locked picker.
- [ ] Other `Sheet` callers render unchanged.

**Tests.** `venueSheetLabel`: empty query, whitespace query, one result, many, zero. Gallery: sheet
open with no query, with a query, with no results.

---

## 5. Friendly game when step with time hero and date sheet

**What to build.** Screen 04d.

- Hero header: `kickoffHero(day, start, finish)` returning value ("8:00"), unit ("PM") and trailing
  ("to 9:30 PM"), or a placeholder before a start time; context parts day / Venue / Court.
- `DayStrip`: five cells from `createFlowDayOptions(now, 5)` (weekday or "Today" over date number);
  "Later date" link; a later day replaces the link text with its label.
- `DateSheet`: month grid from `monthGrid(month, earliestDay)`, previous and next month, days before
  `earliestCreateDay(now)` disabled. No new dependency (Q6). `visibleDayOptions` and `monthGrid` live
  in `create-days.ts`.
- `TimeGrid`: 4 columns, `previewStartSlots` plus a dashed "More".
- Duration chips 60 / 90 / 120 plus dashed "Set" revealing the finish grid; section note shows the
  finish clock.
- `HelperNote` with the window rules.

**Acceptance criteria.**
- [ ] Day, start and finish behave as today (`setDay`, `setStart`, `setDuration`, `setFinish`), including
      today's past-slot filtering and the start-slot reconcile on day change.
- [ ] A day picked in the sheet is selected, shown in the link, and kept when returning to the step.
- [ ] Hero reads "{time} {meridiem} to {end}" once a start and finish exist.
- [ ] Field errors for `windowStart` and `windowEnd` show under Day, Start time and Duration as today.

**Tests.** `kickoffHero`: AM, PM, crossing noon, no finish, invalid input. `visibleDayOptions`:
selected inside and beyond the strip. `monthGrid`: month starting on each weekday, leap February,
disabled days before the earliest day. Gallery: when step empty and filled, custom finish open.

---

## 6. Friendly game Level and price step with review card

**What to build.** Screen 04e.

- `LevelRangeField`: Minimum and Maximum rows over the seven bands (`isLevelBoundDisabled`, tap
  selected to clear), summary "Minimum {x} / Maximum {y}" via `levelRangeSummary`, "Open to anyone"
  link, helper (Q2).
- `MoneyField`: 56 high, ink hairline, expanded value, "BD" unit, `decimal-pad`, label for screen
  readers; quick picks `CREATE_FLOW_PRICE_CHIPS` in 4 columns with soft selection; helper "Zero means
  free. Temba does not collect payment." (Q4).
- `ReviewCard`: Group; Venue (", {Court}" when set); Seats `CREATE_FLOW_OPEN_SEATS_LABEL`.
- Hero and context as ticket 5.

**Acceptance criteria.**
- [ ] Level and price dispatch the same actions as today; an inverted range and a bad price show the
      same errors on submit.
- [ ] Typing a value that equals a chip selects that chip.
- [ ] Create sends the same `games.create` payload as before for the same draft.
- [ ] A server error jumps to the owning step and shows the message.

**Tests.** `levelRangeSummary`: both unset, min only, max only, both. Existing `submitRequest` tests
stay green. Gallery: Level and price empty, filled with range and price, server error.

---

## 7. Friendly tournament where and size step

**What to build.** Screen 05a, reusing tickets 3 and 4.

- Header title "Friendly / tournament"; context row `Trophy` "Counts for your rating / 4 to 32 Game
  teams" (from `TOURNAMENT_TEAM_MIN` and `TOURNAMENT_TEAM_MAX`).
- Group and Venue fields as the Friendly game.
- "Courts in use" (note "Sets the schedule"): multi-select chips of named Courts with `toggleCourt`,
  4 columns, visible-plus-"More".
- `StepperRow` (56 high, ink hairline, 40 pt minus and plus, expanded value with unit) for Game teams;
  helper `playersInPairsLine`.

**Acceptance criteria.**
- [ ] Game teams step by 2 within 4–32; minus and plus disable at the ends and have labels.
- [ ] Changing Game teams still re-clamps groups and qualifiers (`applyTeamCountChange`).
- [ ] Courts are announced as a multi-select with each Court's selected state.
- [ ] No member count pill, no "full day booking" meta.

**Tests.** `stepHeader` tournament step 2 context. Gallery: tournament where empty, picked with Courts,
locked picker with archived Venue (no Courts).

---

## 8. Friendly tournament format and day step with schedule card

**What to build.** Screens 05b (and the parts of 05c that apply).

- Hero: "{teamCount}" "Game teams" "{n} Matches"; context day / Venue / Courts count.
- Format: `TOURNAMENT_SHAPE_OPTIONS` as `ChoiceCard`s with `Check`.
- `StepperCard`s: "Groups" (1 to `maxPoolCount`), note `friendlyTournamentGroupsLine` and the uneven
  line; "Into knockout" (`qualifiersRange`), note `qualifiersConsequenceLine`. Knockout only shows the
  Knockout note instead.
- Rounds `StepperRow` (pool shapes) over `roundCountRange`, note `formatRoundMatchesPerTeam` plus
  `ROUND_MEETS_COPY`, "Use suggested (n)" link.
- Day, Start time from ticket 5; Finish grid restyled (Q5); Game length chips
  `CREATE_FLOW_MATCH_MINUTE_CHIPS` plus dashed "Set" revealing the custom minutes field; note shows the
  last-Match clock.
- `ScheduleCard` from `tournamentScheduleSummary(...)`.
- Pure helpers in `create-summary.ts`: `tournamentMatchTotals(plan)`, `tournamentScheduleSummary(...)`.

**Acceptance criteria.**
- [ ] All three shapes work; switching shape keeps today's reducer behaviour.
- [ ] The schedule card shows "{n} Matches, {start} to {last finish}" and the detail line; with no
      Courts it asks for Courts; on overrun it adds `ONE_DAY_OVERRUN_MESSAGE`.
- [ ] Hero Match total equals the schedule card total.
- [ ] Validation for `poolCount`, `roundCount`, `qualifiersPerPool`, `matchMinutes` and the window
      shows under the right section as today.
- [ ] No "draws each round from the standings" copy; Rounds maximum is two Passes.

**Tests.** `tournamentMatchTotals`: Groups only, Knockout only with Byes, Groups then knockout, a
custom Round count. `tournamentScheduleSummary`: fits, overruns, no Courts, invalid minutes, missing
start. Gallery: each shape, uneven groups, overrun, no Courts.

---

## 9. Friendly tournament entry and review step

**What to build.** Screen 05d.

- Hero as ticket 8; context day / "{start} to {finish}" / Courts count.
- "Who can enter": two segmented cells, "Anyone" and "Set a Level range", revealing
  `LevelRangeField`; helper from 04e.
- Price per player with `MoneyField`; helper `gameTeamOfTwoCopy` then "Zero means free. Temba does
  not collect payment."
- Name (`TextField`), Who can take a seat, How people join, as segmented cells (kept fields).
- `ReviewCard`: Group, Venue, Format, Knockout, Rounds, Courts, Game length, Counts for rating.

**Acceptance criteria.**
- [ ] Create sends the same `games.createTournament` payload as before for the same draft.
- [ ] No "Sign up closes" row and no "no rating change" copy anywhere in the flow.
- [ ] Name validation errors show under Name; a server error jumps to the owning step.

**Tests.** Existing `submitRequest` tournament tests stay green. Gallery: entry empty, filled with
range, Knockout only review, Groups then knockout review, server error.

---

## 10. Optional: Group member count on the tournament Group chip

Only if Q3 is answered yes.

**What to build.** Additive `memberCount: number` on `games.listCreateGroups` output
(`packages/api/src/routers/games/listCreateGroups.ts`, logic in that file, counted like
`groups.listPublic`), and a passive pill "{n} members" (`member-count-label` if it fits) next to the
selected Group chip on tournament step 2.

**Acceptance criteria.**
- [ ] The procedure path and existing fields are unchanged; the field is additive.
- [ ] The web App compiles unchanged.

**Tests.** `listCreateGroups.test.ts` through the exported `listCreateGroups(database, args)` on
PGlite: counts members, zero-member Group, Club and Loose Groups.
