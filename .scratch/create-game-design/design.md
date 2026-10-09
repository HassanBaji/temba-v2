# Create game flow: design source

Extracted on 2026-10-05 from the Claude Design project "Temba sports community app"
(`https://claude.ai/design/p/fea56e1b-5966-4cbb-981f-15fe74a0c7fc?file=Create+game+flow.dc.html`).
`support.js` is the design tool's generic runtime and carries no design content.

Design intro: "Create game, redesigned. Step one picks the type. A matchmaking game runs on where, when,
level and price; a friendly tournament swaps in teams, format and entry fee, in the same four-step shell."

## Notation

- Colours in the design: `#000000` ink, `#FFFFFF` paper, `#F4F4F4` soft, `#E6E6E6` hairline / disabled fill,
  `#C9C9C9` dashed border and faint labels, `#9A9A9A` muted, `#8E8E8E` muted on ink, `#6E6E6E` secondary,
  `#2E2E2E` dim on ink, `#1C1C1C` icon tile on ink. Map these to `@repo/design-tokens`; no hex in screens.
- HATCH: `repeating-linear-gradient(45deg, paper 0 4–5px, hairline/soft 1px)`, meaning "not yet / locked".
- Fonts: Archivo (variable width/weight) with tabular figures; mono labels are `ui-monospace` 10–11px.
  Display type is `wdth 118 wght 700`, letter-spacing -0.03em. Section titles are 19px `wdth 116 wght 700`.
- Frames are 390 × 844, 16px radius, hairline border. Body padding 24px 22px; sections gap 26px.
- Every screen ends with the app tab bar (Home, Games (active, brand mark), Groups, Communities, Profile).

## Shared shell (all steps)

**Ink header** (`Surface tone="ink"`), padding 22/22/20:
- Row: 40×40 leading icon (step 1: `x` close; steps 2–4: `chevron-left` back), right-aligned mono 10px
  `#8E8E8E` "STEP n OF 4".
- Title, 18px below. Two kinds:
  - Text title: 36px display, line-height 1, two lines (e.g. "What are you / setting up?").
  - Hero summary (steps 3–4): big value 44px display + unit 20px `wght 500` muted + trailing 15px muted,
    baseline-aligned (e.g. "8:00" "PM" "to 9:30 PM"), then a 14px muted context line joined with " / ".
- Subtitle 14px muted, line-height 1.5, 10px below title. Or a 13px muted context row with a 14px icon
  and a `#2E2E2E` "/" separator.
- Progress: 4-column grid, gap 5, 3px bars, radius 2; done/current = paper, upcoming = `#2E2E2E`.

**Section header**: row with title (19px display) and a right note 12px `#9A9A9A` ("Required", "Optional",
"30 minute steps", a computed end time, etc.) or a 13px underlined secondary "Change" link, or a 13px
secondary link with an icon ("calendar" + "Later date"). Locked sections show the title in `#9A9A9A`.

**Chips / segmented buttons**: 10px radius, hairline border, paper; 14px text. Selected = ink fill, ink
border, paper text, `wght 600`, often with a 14px `check` icon. "More"/"Set"/"All n groups" escape chips use
a dashed `#C9C9C9` border, 13–14px `#6E6E6E` text. Quick-pick chips under an input (38px high, 13px) show
the selected one as soft fill with an ink border (not full ink).

**Upcoming steps preview** (steps 1–2 only): below a hairline rule, each later step as a row:
19px muted title + mono 10px `#C9C9C9` "STEP n" + `chevron-down` muted.

**Footer** (above the tab bar, hairline top rule, padding 14/22, gap 10):
- Intermediate steps: left column "Next" (12px muted) over the next step's name (14px `wght 600`); right a
  150×50 ink button "Continue" + `arrow-right`, radius 12.
- Step 1 and the empty step 2: full-width disabled primary (fill `#E6E6E6`, text `#9A9A9A`) + 104px
  "Cancel" (paper, hairline, `#6E6E6E`).
- Final step: full-width ink primary ("Create Game" / "Create tournament") + 104px "Cancel".

**Helper notes** (behind a `showLongHelpers` toggle, default on): row with 14px `info` icon `#9A9A9A`
and 12px `#6E6E6E` text.

## 04a. Step 1 of 4, game type (`#game-type`)

Header: close `x`; title "What are you / setting up?"; subtitle "Both start with a court and a time. The rest
of the form follows your pick."; progress 1/4.

Two large choice cards (radius 14, padding 18/20, gap 14, column):
1. **Matchmaking game** (paper, hairline): 34px icon tile (hairline, radius 8) with `shuffle`; title 17px
   `wght 600`; sub 12px "One match. Temba fills the open seats."; trailing `chevron-right`. Below, a 4-cell
   seat strip (30px high, radius 7): first cell ink, three HATCH. Mono caption "COUNTS FOR YOUR RATING".
2. **Friendly tournament** (shown on ink, as the selected/featured card): icon tile `#1C1C1C` with `trophy`;
   title "Friendly tournament"; sub "Several teams, groups and a bracket."; a 4×2 mini bracket grid (14px rows,
   radius 5): two paper cells, two HATCH cells with paper border, four outline cells `#2E2E2E`. Mono caption
   "FRIENDLY, NO RATING CHANGE".

Then the upcoming-steps preview: "Where STEP 2", "When STEP 3", "Level and price STEP 4".
Footer: disabled "Continue" + "Cancel".

## 04b. Matchmaking, step 2 of 4, where, nothing picked (`#where-empty`)

Header: back; title "Matchmaking / game"; subtitle "Start with the group. Venues, levels and prices follow from
it."; progress 2/4.

- **Group** (Required): wrap of chips "Tuesday Crew", "Karbabad Padel", "Friday Doubles" and a dashed escape
  chip with `search` icon "All 9 groups" (count = number of the user's groups).
- **Venue** (title muted, locked): HATCH panel, radius 14, padding 18, `lock` icon + 13px "Pick a Group first.
  Venue rules depend on the Group."
- **Court** (title muted, "Optional"): 5-column grid of HATCH placeholders, 44px high, radius 10.
- Upcoming steps preview: "When STEP 3", "Level and price STEP 4".

Footer: disabled "Create Game" + "Cancel".

## 04c. Matchmaking, step 2 of 4, venue picked (`#where-picked`)

Header: back; title "Matchmaking / game"; context row `users` icon "Tuesday Crew / 3 venues open to this group";
progress 2/4.

- **Group** with "Change" link: single selected ink chip with check "Tuesday Crew".
- **Venue** (Required):
  - Search field button, 46px, radius 12, soft fill, hairline (ink border on press), `search` icon, "Search all
    venues". Opens the venue sheet.
  - A bordered list (radius 14) of venues open to the group; rows padding 16/18 separated by hairlines. Row =
    name 16px + meta 12px. Selected row is ink with name `wght 600`, meta muted, trailing `check`.
    Examples: "Karbabad Courts — 4 courts / 6 min away / usually 2.000 BD" (selected),
    "Janabiyah Padel Park — 6 courts / 14 min away", "Riffa Club — 2 courts / 21 min away".
- **Court** (Optional): 5-column grid, 44px: "None", "1", "2" (selected ink), "3", "4". Note 12px muted "Leave on
  None to settle the court at the venue."

Footer: "Next / Day and time" + "Continue →".

**Venue search sheet** (overlay inside the frame): scrim `rgba(0,0,0,0.45)` (tap closes); bottom sheet paper,
top radius 20, 640px tall; 36×4 grabber `#D6D6D6`; header row "Find a venue" (22px display) + "Cancel" text
button; search input 46px, ink border, radius 12, `search` icon, placeholder "Venue name or area", autofocused,
"Clear" text button while a query exists; mono 10px label "NEARBY VENUES" with no query, otherwise
"n RESULT(S)"; result rows (hairline bottom) name 16px + meta 12px, trailing 11px tag "Open to group" (ink) or
"Request access" (`#9A9A9A`); empty state 14px "No venues match “query”." Picking a row closes the sheet.
Sample meta: "4 courts / 6 min away / Karbabad".

## 04d. Matchmaking, step 3 of 4, day and time (`#when`)

Header: back; hero "8:00" "PM" "to 9:30 PM"; context "Tue, Sep 22 / Karbabad Courts / Court 2"; progress 3/4.

- **Day** with a "Later date" link (`calendar` icon): 5-column day chips (radius 10, column): weekday 11px
  muted ("Today" for today) over date 16px `wdth 112 wght 700`. Selected = ink (weekday `#8E8E8E`).
  Shows Today 20, Mon 21, Tue 22 (selected), Wed 23, Thu 24.
- **Start time** ("30 minute steps"): 4-column grid, 42px chips: 6:30, 7:00, 7:30, 8:00 (selected), 8:30, 9:00,
  9:30, then a dashed "More".
- **Duration** (right note shows the computed end time "9:30 PM"): 60 min, 90 min (selected), 120 min, dashed
  "Set".
- Helper (hairline top rule): "Day, start time, and finish time are required. Pick today or a later day. Times
  are in 30-minute intervals; for today, only upcoming times are listed."

Footer: "Next / Level and price" + "Continue →".

## 04e. Matchmaking, step 4 of 4, level and price (`#level-price`)

Header: back; same hero and context as 04d; progress 4/4.

- **Level range** (Optional): 6-column grid, 46px cells, radius 10: D, C, C+, B, B+, A. Cells inside the range
  are ink (`wght 600`); outside are hairline with `#9A9A9A` text. Under it a row: "Minimum **C** / Maximum **B**"
  (13px, values ink `wght 600`) and a 13px underlined text button "Open to anyone". Helper: "Users without a
  Level must request to play when a range is set."
- **Price per player** (Optional): 56px input row, ink border, radius 12; value 22px `wdth 112 wght 700`
  ("2.000"), trailing unit "BD" 14px secondary. Quick picks (4-column, 38px): Free, 1.500, 2.000 (selected,
  soft + ink border), 2.500. Helper: "Zero means free. Temba does not collect payment."
- Review card (hairline, radius 14), label/value rows 14px separated by hairlines: Group "Tuesday Crew";
  Venue "Karbabad Courts, Court 2"; Seats "3 open, you take one".

Footer: ink "Create Game" + "Cancel".

## 05a. Tournament, step 2 of 4, where and size (`#t-where`)

Header: back; title "Friendly / tournament"; context `trophy` "Friendly, no rating change / 3 or more teams";
progress 2/4.

- **Group** with "Change": selected ink chip "Karbabad Padel" + a passive hairline pill 13px "28 members".
- **Venue** (Required): bordered list; selected ink row "Janabiyah Padel Park — 6 courts / holds a full day
  booking"; "Karbabad Courts — 4 courts / 6 min away".
- **Courts in use** ("Sets the schedule"): 4-column, 44px chips: 2, 3 (selected), 4, 6.
- **Teams** ("Pairs, two seats each"): stepper row 56px, ink border, radius 12: 40×40 hairline `minus` button,
  centred value "12" 24px display + "teams" 14px secondary, `plus` button. Note: "24 players in pairs. Teams can
  also sign up and pair themselves."

Footer: "Next / Format and day" + "Continue →".

## 05b. Tournament, step 3 of 4, format and day (`#t-format`)

Header: back; hero "12" "teams" "23 games"; context "Fri, Sep 25 / Janabiyah Padel Park / 3 courts"; progress 3/4.

- **Format** (Required): vertical list of full-width option buttons (radius 12, 15px): "Groups only",
  "Knockout only", "Rounds" (with sub "One group, a set number of games each"), "Groups, then knockout"
  (selected ink with check).
- Two side-by-side stepper cards (hairline, radius 12): "Groups" 3 (− / +, 32px buttons radius 8, value 20px
  display), note "3 groups of 4, 3 games each"; "Into knockout" 2, note "6 teams, quarters onward, 2 byes".
- **Day** + "Later date": Tue 22, Wed 23, Thu 24, Fri 25 (selected), Sat 26.
- **Start time** ("30 minute steps"): 9:00 (selected), 9:30, 10:00, 10:30, 4:00, 4:30, 5:00, dashed "More".
- **Game length** (note shows computed end "3:00 PM"): 30 min, 45 min (selected), 60 min, dashed "Set".
- Schedule summary card (ink border, radius 14): 17px display "23 games, 9:00 AM to 3:00 PM"; 12px secondary
  "18 group games and 5 knockout games. 3 courts, 45 minutes a game, 8 slots back to back."

Footer: "Next / Level and entry fee" + "Continue →".

## 05c. Tournament, step 3 of 4, rounds format (`#t-rounds`)

Same as 05b with "Rounds" selected (ink, check, sub in `#8E8E8E`); hero "12 teams 24 games".

- Instead of the group/knockout steppers: **Rounds** ("Max 11"): stepper row 56px, ink border, value "4" +
  "rounds". Note: "Every team plays 4 games. Temba draws each round from the standings, so teams do not all meet
  each other. 11 rounds would be everyone plays everyone." Quick picks: 3, 4 (selected soft + ink border), 5, 11.
- Day, Start time, Game length as 05b.
- Summary card: "24 games, 9:00 AM to 3:00 PM"; "4 rounds of 6 games, 3 courts, 8 slots back to back. One table at
  the end, ranked on wins then games won."

## 05d. Tournament, step 4 of 4, entry and review (`#t-entry`)

Header: back; hero "12 teams 23 games"; context "Fri, Sep 25 / 9:00 AM to 3:00 PM / 3 courts"; progress 4/4.

- **Who can enter** (Optional): 2-column, 44px: "Anyone" (selected ink), "Set a level range". Note: "A friendly
  tournament does not change anyone's Level, so mixed levels are fine."
- **Entry fee per player** (Optional): 56px input "6.000" + "BD"; quick picks Free, 4.000, 6.000 (selected),
  8.000. Helper: "12.000 BD a team of two. Zero means free. Temba does not collect payment."
- Review card: Group "Karbabad Padel"; Venue "Janabiyah Padel Park"; Format "3 groups, then quarters"; Sign up
  closes "Thu, Sep 24"; Rating "Friendly, no change".

Footer: ink "Create tournament" + "Cancel".
