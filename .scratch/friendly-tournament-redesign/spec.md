Status: ready-for-agent

Design: claude.ai design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`, file
`Friendly tournaments flow.dc.html` (screens 07a, 07a-1, 07a-2, 07b, 07d, 08a, 08b).
A local copy of the imported file is at `.scratch/design-import/friendly-tournaments-flow.html`.

Builds on `.scratch/friendly-tournaments/spec.md` (shipped in full as TEM-239–TEM-246, commit
`413abe5`). That spec built the **behaviour** from this same design file; this one builds the
**surface**. Nothing in ADR-0017 or ADR-0018 is reopened.

Extends the chrome precedent set by `.scratch/game-details-redesign/spec.md` (TEM-179–TEM-184) from
individual Friendly games to Friendly tournaments. Scoped to Pool tournaments
(`isPoolTournament(format, poolCount)` — `friendly_tournament` with a non-null `poolCount`).
Americano, team_only Games, and legacy `friendly_tournament` rows with a null `poolCount` keep the
tabbed page unchanged.

**No schema change, no new tRPC procedure, no change to any mutation's inputs or semantics.**

Tickets (Linear, `ready-for-agent`), in dependency order:

| # | Ticket | Blocked by |
|---|--------|-----------|
| 1 | [TEM-247](https://linear.app/temba-app/issue/TEM-247) Pool tournament chrome: tournament home shell and hero | — |
| 2 | [TEM-248](https://linear.app/temba-app/issue/TEM-248) Teams list, seats grid, and Your Rounds before the draw | TEM-247 |
| 3 | [TEM-249](https://linear.app/temba-app/issue/TEM-249) Take a seat in the join sheet | TEM-247 |
| 4 | [TEM-250](https://linear.app/temba-app/issue/TEM-250) Organizer merge-seats drawer and the merge banner | TEM-247 |
| 5 | [TEM-251](https://linear.app/temba-app/issue/TEM-251) Organizer draw drawer | TEM-247 |
| 6 | [TEM-252](https://linear.app/temba-app/issue/TEM-252) The standings state after the draw | TEM-247 |
| 7 | [TEM-253](https://linear.app/temba-app/issue/TEM-253) Redesign the create screen | — |
| 8 | [TEM-254](https://linear.app/temba-app/issue/TEM-254) Preview route and integration verification | 2–7 |

TEM-248 through TEM-252 may run in parallel once TEM-247 lands. TEM-253 may run at any time.

## Problem Statement

The Friendly tournament shipped behaviourally complete and visually unfinished. Every surface it
owns renders inside the *generic* Game chrome that every format falls back to: `GameHomeHeader` plus
a sticky Overview / Players / Results tab bar, with the tournament's own content bolted on as four
`Card variant="outlined"` panels — `TournamentPoolDrawPanel`, `TournamentUndrawnNotice`,
`TournamentHalfTeamsPanel`, `TournamentPoolTablesPanel` — distributed across two of those tabs.

That placement makes the feature's three most important facts unfindable. A player who wants to know
**am I in, and who am I with** has to open the Players tab and read a roster. An organizer whose only
job before the draw is *fix two half teams, then draw* finds one of those jobs under Players and the
other under Overview. And the Pool table — the thing the tournament is read by once it is running —
sits third in a scroll under Overview, below a draw panel that has nothing left to say.

The generic chrome also states the Game's identity weakly. `GameHomeHeader` gives a tournament the
same row of badges a pickup game gets, so a twelve-team, three-Round event opens looking like any
other row in the Games list. The design answers this with a black hero carrying the name, the dates,
the size, and — the part that has no representation at all today — **your team**: the two seat blocks
showing who you are playing with and which Position each of you has, for all the Rounds.

Create has the mirror problem. `/dashboard/games/new-tournament` is a `DashboardShell` + `Card` stack
of nine `Select`s and an `Input`. The two numbers that decide what the organizer is actually making
— Game teams and Pools — are dropdowns indistinguishable from "Who can take a seat", even though
every other control on the form is downstream of them. The sizing consequences the previous spec
worked hard to compute (`formatPoolSizeLine`, `formatMatchesPerTeam`, `oneDayFit`) render as four
unstyled lines of `text-sm` in a bordered box.

## Solution

Give the Pool tournament its own chrome, the way the Friendly game got one, and drive the whole
detail page off one fact it already has: `drawPostedAt`.

**Before the draw** the page is the design's 07a/07a-2 — black hero (name, dates, size, Your team,
status line), an organizer merge banner when two Half teams exist, a numbered **Teams** list where
an open Position is a `Take seat` button, the seats grid, **Your Rounds** with the derived Round
dates, and the detail rows. **After the draw** the same route becomes the design's 07b — Pool tabs,
the Pool table, Your Rounds with real results, and the Round results below. The Overview / Players /
Results tab bar disappears for this format, as it already has for individual Friendly games.

The two organizer jobs become the two screens the design draws for them, rendered as full-height
drawers off the detail page rather than new routes: **07d Merge seats** (two Half team cards, a
preview of the merged Game team, a Swap) and **08b The draw** (the drafted Pools, Post, Draw again).
Both replace a `Card` panel of `Select`s with the shape the design gives the job.

**Taking a seat** (07a-1) stays in `FriendlyGameJoinSheet`, whose tournament branch already exists as
`TournamentSeatList`. It grows the header seat count, an explicit *Start a team on your own* row, the
left/right **Your seat** segment, the detail rows, and the footer that names the Position being
taken.

**Create** (08a) becomes a single full-bleed form screen: X-close and Group eyebrow, a display
heading, steppers for Game teams and Pools with their consequence line underneath, segmented controls
where the choice is binary, the sizing summary as a proper detail-rows card, the one-day fit as its
own callout, and a sticky footer.

Everything the design shows that the product cannot yet honour stays out — see Out of Scope. Every
number, string and rule the design implies already exists as a pure function under
`apps/temba/src/lib/tournament-*.ts` or as a field on `games.byId`; this spec adds no new ones except
the small formatters named in Implementation Decisions.

## Design tokens and primitives (already shipped — cite, don't re-derive)

The design file's palette is the shipped palette, value for value:

| Design | Token |
|---|---|
| `#000000` | `--color-ink` |
| `#FFFFFF` | `--color-paper` |
| `#E6E6E6` | `--color-rule` |
| `#F4F4F4` | `--color-wash` |
| `#8E8E8E` | `--color-dim` |
| `#2E2E2E` | `--color-dimrule` |
| `#1C1C1C` | `--color-raised` |
| `repeating-linear-gradient(45deg, …)` | `.hatch` / `.hatch hatch-on-ink` |
| `font-variation-settings:'wdth' 112..118,'wght' 700` | `font-expanded` (fixed `wdth` 115) |

**Resolved conflicts with the design file**, both following the precedent already settled in
`.scratch/game-details-redesign/spec.md` rather than the canvas:

1. The design's tertiary text is `#9A9A9A`. No such token exists — it was rejected during the Home
   redesign for failing WCAG AA (2.56:1 on wash). Everywhere the design uses `#9A9A9A`, use
   `text-muted-foreground` (`#6E6E6E`). The monospace eyebrows (`ORGANIZER`, `R1`, `01`, `Q1`) use
   `text-eyebrow text-muted-foreground`, not a new mono colour.
2. The design varies `wdth` per element (112 / 116 / 118). Use `font-expanded` as shipped at `wdth`
   115 for every expanded numeral and heading. Do not introduce a variable-width utility.
3. The design's monospace row indices (`ui-monospace`) have no shipped precedent. Render the index as
   `text-eyebrow text-muted-foreground tabular-nums` in the body font, zero-padded (`01`, `12`).
   Do not add a monospace font stack for this.
4. The design's amounts read `100 kr`. The product's currency formatting is
   `formatPricePerPlayerCents`. Take the numbers, never the currency.

**Component precedents to reuse or adapt, not re-invent:**

- **Black hero** — `components/games/friendly-game-details-hero.tsx` (`bg-ink text-paper rounded-xl
  p-[22px]`, `font-expanded text-[38px] leading-none`, `text-dim text-meta` eyebrow). The
  tournament hero is the same object with a different body.
- **Raised seat blocks** — `components/games/friendly-game-seat-blocks.tsx` and
  `components/home/home-seat-row.tsx`'s `HomeSeat` (`bg-raised`, 64px, `hatch hatch-on-ink` for an
  open Position). The hero's "Your team" pair is these, at the design's 64px.
- **Action boxes** — `components/groups/group-home-chrome.tsx`'s `ACTION_BOX` (`size-10
  rounded-[10px] border-rule`). The dark variant swaps `border-rule` for `bg-raised`.
- **Segmented control** — the same file's `TAB_SEGMENT` (`data-[state=active]:bg-ink
  data-[state=active]:text-paper`, `border-l first:border-l-0`, `h-11`). Every two- or three-way
  segment in this spec is this control: How long it runs, Who can take a seat, Your seat, Pool tabs.
- **Row lists** — `components/common/row-list.tsx`'s `RowList` / `ListRow` is the Teams list, the
  Sit-with-someone list, the drawn-Pool lists and the Round results.
- **W/L mark** — `components/temba/result-mark.tsx`'s `ResultMark`, already used by
  `TournamentPoolTablesPanel`'s Your Rounds.
- **Sticky footer** — `components/games/friendly-game-cta-bar.tsx` is the shipped bottom action bar;
  the create screen's and the drawers' footers follow its geometry.
- **Drawer** — `components/ui/drawer.tsx`, already used for the join sheet.

**Being replaced, name them explicitly:**

- The `Tabs` / `TabsList` / `TabsContent` structure in `app/dashboard/games/[id]/page.tsx` for Pool
  tournaments only, plus `GameHomeHeader`, `GameOverviewPanel` and `GamePlayersPanel` on that branch.
- `components/games/tournament-undrawn-notice.tsx` — its three lines of copy move into the hero's
  status line and the Your Rounds "Not drawn" trailer. The component is deleted.
- `TournamentPoolDrawPanel`'s `Card` + `Badge` body and its inline button row → 08b drawer.
- `TournamentHalfTeamsPanel`'s two `Select`s → 07d drawer's two cards and a Swap.
- The `DashboardShell title/description` + `Card variant="outlined"` frame on
  `app/dashboard/games/new-tournament/page.tsx`, and its `Select`s for team count, Pool count,
  duration, and who-can-take-a-seat.

## What the design shows that the product already has

Every fact each screen needs is on `games.byId` or derivable from a shipped pure function. This table
is the contract; a ticket that thinks it needs a new endpoint should re-read it.

| Design element | Source |
|---|---|
| Name, dates, Venue, price | `data.name`, `windowStart`, `windowEnd`, `venue`, `pricePerPlayerCents` |
| "12 teams, 3 Pools of 4" | `sizeFriendlyTournament(teamsAllowed, poolCount)` → `poolSizes`, `uneven` |
| "three Rounds" | `sizeFriendlyTournament(...).roundCount` |
| Your team seat blocks | `data.sides` (`{ sideIndex, gameTeamId, left, right }`) + `data.viewerUserId` |
| Teams list, "11 full, 2 with a seat open" | `data.sides` |
| `Take seat` per open Position | `remainingJoinSeatOnSide` + `games.registerSeat` |
| Half teams, merge preview, Swap | `halfTeamsFromSides`, `defaultMergePositions`, `swapMergePositions`, `mergeCompletesTheField`, `halfTeamMergeHint` |
| Seats grid, "19 of 24" | `data.sides` (2 Positions per side) |
| Your Rounds dates before the draw | `fewWeeksRoundStarts(windowStart, windowEnd, roundCount)` / one-day slots at `TOURNAMENT_SLOT_MINUTES` |
| Drafted Pools (08b) | `data.gameTeams[].poolIndex`, `draftPoolsFromGameTeams`, `hasDraftPoolDraw` |
| Pool tabs, table, Your Rounds, Round results | `data.poolTables` (`pools[].rows`, `viewerRounds`, `matches`, `viewerPoolIndex`, `finished`) |
| "Round 2 of 3 played" | `data.poolTables` + `roundCount` |
| Detail rows: Organizer, Group, price, rating | `data.organizer`, `groupName`, `pricePerPlayerCents` |
| "You owe" total | `pricePerPlayerCents` × the viewer's Pool's `matchesPerTeam` |
| Create sizing lines and fit | `sizeFriendlyTournament`, `oneDayFit`, `ONE_DAY_OVERRUN_MESSAGE` |

## User Stories

### The tournament page, before the draw (07a / 07a-2)

1. As a User opening a Pool tournament, I want one scrolling page with no Overview / Players /
   Results tab bar, so that I do not hunt three tabs for the three things this format is about.
2. As a User, I want a black hero carrying the tournament's name, when it starts, where, and how big
   it is, so that it does not open looking like any other Game row.
3. As a User who has a seat, I want my Game team shown in the hero as two seat blocks with each
   occupant's name and Position, so that "who am I playing with, and which side am I" is the first
   thing I see.
4. As a User whose Game team has one Position still open, I want the empty block drawn as an open
   Position rather than left blank, so that I can tell the difference between "nobody yet" and
   "nothing there".
5. As a User without a seat, I want the hero to tell me how many seats are left and that the draw is
   random and happens when they are full, so that I know what joining commits me to.
6. As a User, I want a numbered Teams list showing every Game team in the field, with my own marked,
   so that I can see who is in before I decide.
7. As a User, I want the Teams list to say how many Game teams are full and how many have a Position
   open, so that I can read the state of the field without counting rows.
8. As a User reading a long Teams list, I want the run of full Game teams in the middle collapsed
   behind one expandable row, so that the Game teams I can act on stay on one screen.
9. As a User, I want a Game team with an open Position to carry a `Take seat` action on its own row,
   so that sitting with a specific person is one tap from the list.
10. As a User with a seat, I want a seats grid showing the whole field as filled and open Positions,
    so that "19 of 24" is a picture and not just a number.
11. As a User with a seat, I want my Rounds listed with their dates and Venue before the draw, each
    marked as not yet drawn, so that I know which evenings I am committing to.
12. As a User, I want the detail rows to name the Organizer, the Group, the price, and that it counts
    for rating, so that the page answers the same questions a Friendly game's page does.
13. As a User with a seat, I want to see what I will owe across all my Matches, so that the
    per-Match price means something.
14. As a User in a smaller Pool, I want that total to reflect the Matches I actually play, so that I
    am not quoted someone else's total.
15. As a User with a seat, I want a clear way to leave it, so that I am not trapped by a tap.
16. As a User, I want a closing line saying each Round is an ordinary Match scored and confirmed the
    usual way, so that I do not expect a separate tournament scoring flow.
17. As a User of a cancelled tournament, I want the cancelled banner to keep rendering above
    everything, so that the redesign does not hide it.
18. As a User of a Soft-archived Club Group's tournament, I want the frozen banner to keep
    rendering, so that the redesign does not hide it.

### Taking a seat (07a-1)

19. As a User joining, I want the sheet's header to say how many seats are taken out of how many, so
    that I know how close the field is to full.
20. As a User joining, I want a *Sit with someone* list of the Game teams with a Position open,
    each showing the occupant's name, their Position and their Level, so that I can choose who I
    play with rather than which numbered side I land on.
21. As a User joining, I want an explicit *Start a team on your own* option, so that joining without
    a partner is a stated choice and not the absence of one.
22. As a User joining, I want a left/right **Your seat** segment, with the Position the occupant
    already holds shown as taken, so that I know which side I am committing to.
23. As a User joining a Game team on my own, I want both Positions offered, so that I can take the
    side I actually play.
24. As a User joining, I want my Preferred Position pre-picked when it is free, so that the common
    case is one tap — and still changeable, because it is a default and not a rule.
25. As a User joining, I want the detail rows to state the Rounds, the price, that it counts for
    rating, and that the draw is random, so that I confirm with the facts in front of me.
26. As a User joining, I want the footer button to name the Position I am about to take, so that the
    tap and its consequence match.
27. As a User joining, I want to be told I can leave the seat up until the Pool draw, so that I know
    the commitment is reversible.

### The Organizer, before the draw (07a banner, 07d, 08b)

28. As an Organizer with exactly two Half teams, I want a banner on the tournament page naming both
    Users and saying that merging them fills the field, so that the one thing blocking the draw is
    the most visible thing on the page.
29. As an Organizer, I want that banner's action to open the merge screen directly, so that fixing
    the seats is one tap from being told about it.
30. As an Organizer, I want the merge screen to show the two Half teams side by side as cards, each
    with its occupant and its open Position drawn as open, so that I can see what I am combining.
31. As an Organizer, I want a preview of the merged Game team showing who takes which Position, so
    that I am not guessing what I am about to create.
32. As an Organizer, I want to swap the two Positions in that preview, so that the merged Game team
    matches how they actually play.
33. As an Organizer, I want to dismiss the merge and leave both Positions open, so that the screen is
    a suggestion and not a demand.
34. As an Organizer, I want the merge screen to say the merge takes effect immediately and that
    either User can still leave up until the draw, so that the copy does not imply a message anyone
    was sent.
35. As an Organizer with more than two Half teams, I want to pick which two I am merging, so that the
    screen still works when the field is untidy.
36. As an Organizer, I want a draw screen showing every drafted Pool with its Game teams, its dates
    and its Courts, so that I can read the draw before I commit it.
37. As an Organizer, I want the draw screen to say the draw is random and nobody is seeded, so that
    the fairness claim is made where the draw is made.
38. As an Organizer, I want `Draw again` and `Post the draw` as the screen's footer actions, so that
    re-rolling is as easy as accepting.
39. As an Organizer, I want posting to say what it will do — create every Pool Match and close the
    seats — before I tap it, so that the irreversible step is labelled.
40. As an Organizer after posting, I want the undo action to stay available on the page under the
    conditions it already has, so that the redesign removes no escape hatch.
41. As an Organizer, I want the draw screen's entry point to state how many Game teams are complete
    out of how many are needed, so that I know why I cannot draw yet.

### The tournament page, after the draw (07b)

42. As a User, I want the same route to become the standings once the draw is posted, so that I do
    not have to learn a second place to look.
43. As a User, I want the header to say which Round the tournament has reached, so that I can place
    myself in it without reading the table.
44. As a User, I want a segmented Pool control, with my own Pool selected first, so that my standing
    is the default view.
45. As a User not in any Pool, I want the first Pool selected, so that the control has a sensible
    default for an organizer who does not play.
46. As a User, I want the Pool table to show position, team, played, won, drawn and lost, with my row
    marked, so that the table answers where I stand.
47. As a User, I want a finished Pool's winner marked, so that the tournament visibly ends.
48. As a User, I want the page to state that each Pool has a winner and there is no overall champion,
    so that nobody waits for a final that is not coming.
49. As a User, I want **Your Rounds** listing my Matches with a won/lost mark, the opponent and the
    score, and my next Match marked as still open, so that my own line through the tournament reads
    at a glance.
50. As a User, I want each Round's results listed for the Pool I am looking at, so that I can read
    the Pool as it happened.
51. As a User, I want a row telling me how many Matches the other Pools have played, which moves me
    to them, so that the rest of the tournament is one tap away.
52. As a User whose Match is scheduled but unplayed, I want it shown as open rather than as a
    missing result, so that "not yet" and "nobody entered it" are distinguishable.

### Creating a tournament (08a)

53. As an Organizer, I want the create screen to fill the screen with an X to close and the Group
    named in the header, so that it reads as one task and not as a page inside the dashboard.
54. As an Organizer, I want a display heading that says what I am making in plain words, so that the
    form's purpose is stated before its first field.
55. As an Organizer, I want **Game teams** set with a stepper in steps of 2, showing the number
    large, so that the most consequential input on the form looks like it.
56. As an Organizer, I want a line under the stepper saying how many players that is, in pairs, so
    that I can size it against the people I have.
57. As an Organizer, I want **Pools** set with the same stepper, so that the two numbers that decide
    the shape of the tournament are the two controls that look alike.
58. As an Organizer, I want a line under the Pools stepper naming the Pool sizes it produces, so that
    I see the split before I save.
59. As an Organizer producing uneven Pools, I want that said plainly under the stepper, so that I am
    not surprised some Game teams play one more Match.
60. As an Organizer, I want the Pools stepper's range to follow the Game team count, so that I cannot
    choose a split that does not exist.
61. As an Organizer, I want **How long it runs** as a two-way segment, so that the choice that
    restructures the rest of the form is obvious.
62. As an Organizer running it in one day, I want Day, Start and Finish as three fields on the
    screen, so that laying out the day is one pass.
63. As an Organizer running it over a few weeks, I want one date and start time per Round, so that
    each Round lands on the evening the Group plays.
64. As an Organizer, I want a summary card stating the Pool Matches, the Matches per Game team, the
    Rounds, the length of each Match, the price, that it counts for rating, and that the draw is
    random, so that the whole commitment is in one block.
65. As an Organizer running it in one day, I want a callout saying when the last Match would finish,
    so that I know whether the day works.
66. As an Organizer whose day does not fit, I want the callout to say so and suggest adding a Court
    or taking fewer Game teams, while still letting me save, so that the warning informs rather than
    blocks.
67. As an Organizer, I want **Who can take a seat** as a two-way segment naming my Group, so that the
    choice reads in my own words.
68. As an Organizer, I want a sticky footer with one primary action, so that the long form always
    has its next step in reach.
69. As an Organizer, I want a line under that action saying the tournament appears in Games and that
    I draw once the seats are full, so that I know what happens next.
70. As an Organizer, I want every validation error to keep the behaviour it has today, so that the
    redesign changes the surface and not the rules.
71. As an Organizer who cannot create in a Group, I want the same refusal I get today, so that no
    permission leaks through a new form.

### Honesty about what is not there

72. As a User, I want no copy anywhere saying "then quarters", "Winner of Q1", or naming an overall
    champion, so that the product does not advertise a knockout it cannot run.
73. As a User, I want no copy saying anyone was sent a message or notified, so that the product does
    not claim a delivery channel it does not have.
74. As an Organizer, I want no *Ask them first* action on the merge screen, so that I am not offered
    a door that goes nowhere.
75. As an Organizer, I want no format picker and no qualifier count on create, so that I am not shown
    options the product cannot honour.

### Not regressing what already works

76. As a User of a legacy `friendly_tournament` row with no `poolCount`, I want the existing tabbed
    page unchanged, so that the redesign does not break rows the App never created.
77. As a User of an Americano or a team_only Game, I want my page untouched, so that the blast radius
    is the Pool tournament.
78. As a User of an individual Friendly game, I want the game-details redesign untouched, so that the
    two chromes stay independent.
79. As an Organizer, I want every organizer action I have today — edit, cancel, close registration,
    Level range, invites, kick — still reachable on the redesigned page, so that the redesign
    removes no power.
80. As a maintainer, I want a dev-only preview route exercising every state of this page side by
    side, so that the states cannot drift into separate implementations.

## Implementation Decisions

### The third chrome

`app/dashboard/games/[id]/page.tsx` already branches on `usesFriendlyChrome`. Add a third branch,
`usesPoolTournamentChrome = isPoolTournament(data.format, data.poolCount)`, evaluated beside the
other two. The three are mutually exclusive by construction: `showsFriendlyRoster` is
`friendly_game`-only, so no ordering hazard exists, but assert it in the derivation rather than
relying on branch order.

The page is already ~1400 lines. Do not grow it. The tournament branch renders exactly one new
component, `components/games/tournament-home.tsx`, taking `RouterOutputs["games"]["byId"]` plus the
mutation callbacks it needs, and owning the whole tournament tree. Mutations, dialogs and toasts stay
in `page.tsx` where they are today and are passed down as props — the same shape
`GameLineupSection` and `GameScoreSection` already use.

`tournament-home.tsx` switches on `drawPostedAt`: null → the pre-draw tree (07a/07a-2), set → the
standings tree (07b). One component, one switch, no duplicated hero.

### Endpoint placement

No tRPC change. `api-one-endpoint-per-file.mdc` is not engaged by this spec: no procedure is added,
moved or split. `byId.ts` is not edited.

### New pure modules

All of these are presentation arithmetic, unit-testable without a database, and belong beside the
existing `lib/tournament-*.ts` family:

- `lib/tournament-home.ts` — `tournamentFieldSummary(sides)` → `{ full, halfOpen, seatsTaken,
  seatTotal }`; `tournamentTeamRows(sides, viewerUserId)` → the numbered Teams list with the
  collapsible middle run resolved (`{ head, collapsedCount, tail }`); `tournamentStatusLine(...)` →
  the hero's one-sentence state; `tournamentSizeLine(sizing)` → "12 Game teams, 3 Pools of 4".
  **`tournamentSizeLine` must never emit a knockout clause.**
- `lib/tournament-rounds.ts` (extend) — `tournamentRoundSchedule({ windowStart, windowEnd,
  roundCount })` → one entry per Round with its start, built on the shipped `fewWeeksRoundStarts`
  for a multi-day window and on `TOURNAMENT_SLOT_MINUTES` steps for a one-day window, selected by
  the shipped `isOneDayTournamentWindow`. `roundsPlayedLabel(poolTables, roundCount)` → "Round 2 of
  3 played".
- `lib/tournament-price.ts` — `viewerTournamentTotalCents(pricePerPlayerCents, matchesForViewerPool)`.
  Per user story 14 this takes the viewer's own Pool size, not the maximum.

Copy constants follow the shipped convention (`POOL_DRAW_RANDOM_COPY`, `MERGE_TAKES_EFFECT_COPY`):
every user-visible string that a test asserts lives as an exported constant, not inline JSX.

### Component inventory

New, under `components/games/`:

- `tournament-home.tsx` — the branch owner described above.
- `tournament-hero.tsx` — 07a/07a-2 black hero, including the Your-team seat pair.
- `tournament-teams-section.tsx` — the numbered Teams list with the collapsible middle and the
  per-row `Take seat`.
- `tournament-seats-grid.tsx` — the 2N-cell grid. Hatch is `aria-hidden`; the count is stated in
  adjacent text, per the shipped hatch rule.
- `tournament-your-rounds.tsx` — one component serving both the pre-draw "Not drawn" list and the
  post-draw results list, switched by a prop. Do not write two.
- `tournament-standings-section.tsx` — 07b Pool segment + table + Round results.
- `tournament-merge-drawer.tsx` — 07d.
- `tournament-draw-drawer.tsx` — 08b.
- `tournament-detail-rows.tsx` — the shared label/value card used by 07a, 07a-1, 07a-2 and 08a. One
  component; four screens use it.

Rewritten in place, keeping their names and props where the props still fit:
`tournament-pool-tables-panel.tsx` (its table body moves into the standings section; keep
`PoolRecordTable` as the table, drop its own `Tabs`), `tournament-half-teams-panel.tsx` (becomes the
drawer's body), `tournament-pool-draw-panel.tsx` (becomes the drawer's body).

Deleted: `tournament-undrawn-notice.tsx`.

### The two drawers

07d and 08b are drawn as full screens. They ship as `components/ui/drawer.tsx` drawers opened from
the detail page, not as routes. Rationale: both are organizer-only, both are modal to a single
decision, both return to the page they were opened from, and neither has a URL worth sharing — the
same reasoning that put the join sheet in a drawer. Adding
`/dashboard/games/[id]/draw` and `/dashboard/games/[id]/merge` would add two routes, two loading
states and two `byId` fetches for no reachable benefit.

Each drawer's footer is sticky and carries the design's primary action plus its explanatory line.

### Take a seat (07a-1)

Stays inside `FriendlyGameJoinSheet`. Its existing `TournamentSeatList` grows into the design's
*Sit with someone* list; the `SideColumn` branch for fully-vacant sides is replaced by the single
*Start a team on your own* row, which picks the lowest-numbered fully-vacant `sideIndex`. The
left/right **Your seat** segment is the shipped segmented control, with the occupied Position
rendered `disabled` and labelled taken. `preferredJoinSeat` keeps pre-picking, unchanged.

The footer button's label is derived, not fixed: `Take the ${positionLabel(picked.position)} seat`.

### Create (08a)

`new-tournament/page.tsx` keeps its state, its validation, its `onSubmit` and its
`createTournament.mutate` call **unchanged**. Only the frame and the controls change:

- The `DashboardShell` + `Card` frame becomes a full-bleed form screen with an X to `cancelHref` and
  the selected Group's name as the header's right-hand meta, matching the design's Group eyebrow.
  `CreateAccessGate` in `layout.tsx` is unchanged.
- Game teams and Pools become a shared `components/games/stepper-field.tsx` (− / big value + unit /
  +), bounded by `TOURNAMENT_TEAM_MIN/MAX/STEP` and `poolCountOptions` respectively. The existing
  `onTeamCountChange` clamp of Pool count to `maxPoolCount` is unchanged.
- Duration, who-can-take-a-seat and registration mode become segmented controls. Registration mode
  is **not** in the design; it is shipped behaviour and is kept, labelled "How people join"
  (Individual seats / Complete Teams only). Dropping it would remove a capability, which this spec
  does not do.
- Courts stay a multi-select over the Venue's real Courts. The design's "Courts: 3" is a count; the
  product records `game_courts` rows and `oneDayFit` consumes `courtIds.length`. Render the Courts
  as a wrapping toggle row rather than a checkbox column, and surface the selected count in the
  summary card. **Do not replace real Courts with a number.**
- `formatPoolSizeLine` / `formatMatchesPerTeam` move out of the page into `lib/tournament-sizing.ts`
  as exported formatters so the preview route and tests can call them.
- The summary card is `tournament-detail-rows.tsx`. The one-day fit is its own bordered callout
  above the footer, using the shipped `oneDayFit` and `ONE_DAY_OVERRUN_MESSAGE`. It warns; it never
  disables submit.
- "Each Match: 45 min" comes from `TOURNAMENT_SLOT_MINUTES`. The design's "one set to 6" is not a
  product fact and does not ship.

### Accessibility

- Every hatch element is `aria-hidden`; its meaning is adjacent `sr-only` text. This is the shipped
  rule (`home-recent-form-row.tsx`, `game-seat-grid.tsx`) and the seats grid is its largest use yet
  — the grid is one `aria-hidden` decoration with a single `sr-only` "19 of 24 seats taken", not 24
  labelled cells.
- The Pool segment and Your-seat segment are real tab/radio semantics, not styled divs.
- The collapsible Teams-list middle run is a `button` with `aria-expanded`.
- Every tap target is at least 44px, as the design's own `min-height:44px` rows already imply.
- The Teams list's numbered index is decorative; the row's accessible name is the Game team's name.

### Preview route

Add `app/dashboard/design/tournament/page.tsx`, matching the shipped `design/home` and
`design/game-details` precedent: fixture data only, no network, rendering the states side by side —
pre-draw without a seat, pre-draw seated with a Half team open, organizer with exactly two Half
teams, drafted draw, posted mid-tournament standings, finished standings. This is how user story 80
is met and how a reviewer sees all six states without seeding a database.

## Testing Decisions

### What a good test is

A test that fails when the behaviour is wrong and passes when it is merely restyled. Assert on the
pure functions and on the branch conditions, not on class names, hex values or DOM shape.

### Test seams

**Seam 1 — the pure modules, called directly.** `lib/tournament-home.ts`, the
`lib/tournament-rounds.ts` additions, `lib/tournament-price.ts`, and the formatters moved into
`lib/tournament-sizing.ts`. These carry the arithmetic and the copy, so they carry the tests. This
is the same seam `tournament-sizing.test.ts`, `tournament-half-teams.test.ts` and
`tournament-pool-table.test.ts` already use — extend the family, do not invent a second style.

Required cases, at minimum:

- `tournamentFieldSummary` over an empty field, a full field, a field with one Half team, and a field
  with two Half teams.
- `tournamentTeamRows` at a field small enough not to collapse and one large enough to collapse,
  asserting the viewer's Game team is always in `head` and never inside `collapsedCount`, and that a
  Game team with an open Position is always in `head` or `tail` and never collapsed. **This is the
  rule that makes user story 9 true and is the one worth a test.**
- `tournamentRoundSchedule` for a one-day window and a multi-week window, asserting round count and
  monotonic starts.
- `viewerTournamentTotalCents` for an even field and for a viewer in the smaller of two uneven Pools
  (user story 14).
- `tournamentSizeLine` and `tournamentStatusLine` never contain "quarter", "knockout", "champion",
  "final", "message" or "notified" — asserted directly, because user stories 72–73 are the kind of
  promise that erodes silently.

**Seam 2 — the chrome branch.** `isPoolTournament` / `showsPoolTournamentSeats` already exist and are
already the branch. Add cases proving a legacy `friendly_tournament` with a null `poolCount` does
**not** take the new chrome (user story 76), and that `friendly_game` and `americano` do not either
(user stories 77–78).

**No new server test.** No server code changes. `byId.test.ts`, `poolTables.test.ts`,
`mergeHalfTeams.test.ts`, `drawPools.test.ts` and `postPoolDraw.test.ts` must all still pass
untouched — if a ticket needs to edit one of them, that ticket has changed behaviour and is out of
scope.

**No snapshot tests, no visual regression harness.** The preview route is the visual check.

## Out of Scope

- **Design 07c, the knockout bracket**, and every element that implies it: the Quarters/Semis/Final
  sections, winner-of placeholders, the `A1`/`C2` qualifier tags, "then quarters", and any overall
  champion. Deferred by ADR-0017 and confirmed for this redesign.
- **Design 08c, Make a round** — the Organizer hand-pairing Game teams, the free-teams list, the
  per-Match court/time `Change` links and `Post round 2`. Deferred with the bracket.
- **Design 08a's format picker** (Groups only / Knockout only / Groups then knockout), **Who makes
  the rounds** (all at once / one round at a time), and **Through from each group** (qualifiers).
  Not built, not stubbed, not shown disabled.
- **Notifications.** "Both of them get a message", "Ask them first", and any copy implying delivery.
  The product has no channel.
- **Any schema change, any new or modified tRPC procedure**, any change to a mutation's input,
  authorization, validation or error. This spec is a surface.
- **`games.byId`'s shape.** If a screen appears to need a field that is not there, derive it on the
  client from what is.
- **The individual Friendly game page, Americano, team_only Games, and legacy `friendly_tournament`
  rows with a null `poolCount`.**
- **The Games hub cards and the Home carousel.** ADR-0018's per-Round expansion shipped; its card
  design is not reopened here.
- **Level range on the create form.** Still not surfaced, as `.scratch/friendly-tournaments/spec.md`
  already recorded.
- **A canonical `docs/design/*.md`.** Still not authored; still a reasonable follow-up.
- **Dark mode**, beyond what the shipped tokens already give for free.

## Further Notes

- The design's numbers are placeholders: "100 kr" is BD in the product, "Bromma Autumn Friendly" and
  the player names are fixtures. Take the structure, not the data.
- The design calls a Pool a "Group" throughout (Group A, "3 groups of 4", "Through from each group").
  The product's glossary word is **Pool** — `CONTEXT.md`, ADR-0017 — and "Group" already means
  something else entirely in this product. Every string ships as Pool. This is the single most
  likely copy mistake in this work.
- The design's 07a header reads "Friendly game, three rounds" as an eyebrow. Ship "Friendly
  tournament, N Rounds" — the design's phrasing predates the format's naming.
- The design's 07a-2 says "Jonas draws the groups once they are full". The organizer's name is on
  `byId`; use it, and say Pools.
- 07b's "Top two in each group play the quarters" must be replaced, not merely trimmed. The line's
  job is to tell the reader how the tournament ends; ship "Each Pool has a winner. There is no
  overall champion."
