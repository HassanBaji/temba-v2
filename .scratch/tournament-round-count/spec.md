Status: ready-for-agent

Tickets (Linear, `ready-for-agent`), in dependency order:

| Ticket | Title | Blocked by |
| --- | --- | --- |
| [TEM-263](https://linear.app/temba-app/issue/TEM-263) | Organizer chooses Rounds at tournament create, and the posted draw plays them | None |
| [TEM-264](https://linear.app/temba-app/issue/TEM-264) | Pool table head-to-head counts every meeting | None |
| [TEM-265](https://linear.app/temba-app/issue/TEM-265) | Every tournament surface shows the resolved Round count | TEM-263 |
| [TEM-266](https://linear.app/temba-app/issue/TEM-266) | Change Rounds from Edit Game until the draw is posted | TEM-263 |

TEM-263 and TEM-264 can run in parallel. TEM-265 and TEM-266 can run in parallel after TEM-263.

Amends: `.scratch/friendly-tournaments/spec.md` (Round count derived from the
biggest Pool), `.scratch/friendly-tournament-redesign/spec.md` (create step 3),
`.scratch/create-game-flow/spec.md` (tournament step 3 and review). Amends
ADR-0017 ("one shape — a pure Pool round robin"): the shape stays a Pool round
robin, but the organizer now sets how much of it is played. Record that in a new
ADR (see Implementation Decisions).

## Problem Statement

An organizer creating a Friendly tournament cannot say how many Rounds it runs.
The App computes the count from Game teams and groups (one full round robin in
the biggest group) and every surface recomputes it the same way. That fits a
Group with exactly that much time. It does not fit a Group that only has time
for three Rounds of a five-Round schedule, or a Group that wants everyone to
meet twice. Today the only workaround is to change the number of Game teams or
groups, which changes who plays rather than how much they play.

## Solution

On create step 3, directly under **Groups**, add a **Rounds** stepper. It
starts on the **suggested** count (today's number: one full round robin in the
biggest group) and shows what the choice means: how many Matches each Game team
plays, and whether everyone meets once, not everyone meets, or some or all meet
twice. The organizer can go down to 1 Round or up to twice the suggestion, which
is a second full round robin. Changing Game teams or groups resets Rounds to
the new suggestion.

The organizer can change Rounds from **Edit Game** until the Pool draw is
posted. That includes after an Undo of the draw, and it stays closed after
posting.

An untouched suggestion means "one full round robin of whoever is drawn". If
the drawn field is smaller than planned, the tournament follows the smaller
field's suggestion. A number the organizer actually changed is kept, but is
silently capped at twice the drawn field's suggestion when the draw is posted.

The Pool table counts both meetings when two Game teams meet twice.

## Glossary

- **Pass** (new term, add to `CONTEXT.md`): one full round robin inside a Pool,
  where every Game team in the Pool meets every other once. A Friendly
  tournament plays one Pass by default and at most two. _Avoid_: leg, cycle,
  lap (and never "Round", which is one date-slice of the schedule).
- **Suggested Rounds**: the number of Rounds one Pass takes in the biggest
  Pool. Biggest Pool size − 1 when even, the size itself when odd (the odd size
  adds a bye). This is exactly today's derived Round count.
- **Round**, **Pool**, **Pool draw**, **Pool table**, **Pool record**: unchanged
  meaning. Update the **Friendly tournament** and **Pool** definitions in
  `CONTEXT.md`: "plays a full round robin" becomes "plays a round robin — one
  Pass by default, cut short or played twice by the organizer's Round count".

Shown to users: "Rounds", "Suggested", "Everyone meets once", "Everyone meets
twice". Pools are still shown as *group*.

## User Stories

### Choosing Rounds at create

1. As an Organizer on create step 3, I want a Rounds stepper right under Groups,
   so that I set how much is played next to how the field is split.
2. As an Organizer, I want Rounds to start on the suggested count, so that doing
   nothing gives me today's tournament.
3. As an Organizer, I want the suggested value marked "Suggested", so that I
   know which number the App picked.
4. As an Organizer who changed Rounds, I want a one-tap way back to the
   suggestion, so that I can undo my change without counting.
5. As an Organizer, I want to lower Rounds to 1, so that a short session still
   runs as a tournament.
6. As an Organizer, I want to raise Rounds up to twice the suggestion, so that
   everyone can meet twice.
7. As an Organizer, I want the stepper to stop at 1 and at twice the
   suggestion, so that I cannot pick a count the schedule cannot fill.
8. As an Organizer, I want to see how many Matches each Game team plays at the
   chosen Rounds, so that I can judge value for money and time.
9. As an Organizer with uneven groups or an odd group size, I want the
   Matches-per-team line to show a range when teams play different numbers,
   so that I am not misled.
10. As an Organizer, I want a line saying "Everyone meets once", "Not everyone
    meets", "Everyone meets twice" or "Some meet twice", so that I understand
    the competitive meaning of my pick.
11. As an Organizer who changes Game teams or groups, I want Rounds reset to the
    new suggestion, so that a stale pick never carries over to a different
    field.
12. As an Organizer, I want the group Matches total and "last Match finishes at"
    line to use my chosen Rounds, so that the one-day fit check stays honest.
13. As an Organizer whose chosen Rounds overrun the finish time, I want the
    existing overrun warning, so that I can add a Court, cut Rounds or take
    fewer Game teams.
14. As an Organizer on the review step, I want a Rounds row (e.g. "3 Rounds ·
    suggested" or "5 Rounds"), so that I confirm it before creating.
15. As an Organizer, I want the header preview (Game teams, Matches count) to
    reflect my chosen Rounds, so that it matches the review.

### Changing Rounds before the draw

16. As an Organizer on a Pool tournament whose draw is not posted, I want a
    Rounds section in Edit Game, so that I can adjust once I know who signed up.
17. As an Organizer editing Rounds, I want the same stepper, range, captions and
    reset-to-suggested link as create, so that it behaves the same.
18. As an Organizer with a draft (unposted) draw, I want to still change Rounds,
    so that I can settle length after seeing the groups.
19. As an Organizer after posting the draw, I want the Rounds section hidden,
    so that I cannot change a schedule that already generated Matches.
20. As an Organizer who undid a posted draw, I want Rounds editable again, so
    that undo really returns me to before the draw.
21. As a non-organizer, I want the update refused, so that only the Organizer
    sets the tournament length.
22. As an Organizer of a cancelled tournament, I want the update refused, so
    that dead Games do not change.
23. As a crafted client, I want a count below 1 or above twice the planned
    suggestion refused with a clear message, so that invalid counts are never
    stored.

### Posting the draw

24. As an Organizer who left Rounds on the suggestion, I want the posted
    schedule to be one full round robin of the groups actually drawn, so that a
    smaller field gets its own correct length.
25. As an Organizer who picked fewer Rounds than the suggestion, I want exactly
    that many Rounds generated, each being the next Round of the full round
    robin, so that the Matches that are played are the same ones a full round
    robin would start with.
26. As an Organizer who picked more Rounds than one Pass, I want the second Pass
    to follow the first with the same pairings in the same order, so that
    everyone meets again in a predictable order.
27. As a player in a second-Pass Match, I want the two sides swapped relative to
    the first meeting, so that slot order alternates.
28. As an Organizer whose drawn field is smaller than planned and whose chosen
    Rounds exceed twice the drawn suggestion, I want Rounds silently capped, so
    that posting never fails over a count the field cannot fill.
29. As an Organizer with uneven groups, I want a smaller group to play its full
    Pass and sit out the rest of the biggest group's Pass, then start its second
    Pass alongside the biggest group, so that no pair meets twice before every
    pair has met once.
30. As a player in a smaller group, I want no Match in Rounds where my group
    sits out, so that I am not given phantom fixtures.
31. As an Organizer on a one-day window, I want back-to-back Rounds scheduled
    the same way as today for any Round count, so that times stay on the
    existing slot grid.
32. As an Organizer on a few-weeks window, I want Round start dates spread
    evenly across the window for the chosen count, so that more Rounds do not
    pile up at the end.

### Seeing Rounds everywhere

33. As a User on the join sheet, I want the header's Round count to show the
    tournament's resolved Rounds, so that I know the commitment before joining.
34. As a User on tournament home before the draw, I want the eyebrow ("…, N
    Rounds") and the Your Rounds schedule to use the resolved Rounds, so that
    dates match what will be generated.
35. As a User on tournament home after the draw, I want Round count, "R2 of N"
    labels and "Round X of N played" to come from the posted Matches, so that a
    capped or field-following count is shown truthfully.
36. As an Organizer on the draft draw preview, I want the date lines to reflect
    the count that posting would generate, so that I see the real length before
    posting.
37. As a User on the Games hub and home, I want "R2 of N" unchanged, so that the
    hub keeps reading Round count from posted Matches.
38. As a User of a tournament created before this change, I want everything to
    behave exactly as before, so that no existing Game changes length.

### Pool table with two meetings

39. As a player whose team met another team twice, I want head-to-head to add
    up both meetings, so that the tiebreak reflects the whole series and not
    only the last Match.
40. As a player where two tied teams split their two meetings, I want
    head-to-head treated as level and the tiebreak to move to Set difference, so
    that a split series decides nothing.
41. As a player in a partial round robin, I want tied teams that never met to
    fall straight through to Set difference, so that a missing meeting is not
    read as a loss.

## Implementation Decisions

### Round math (pure, shared)

- **Suggested Rounds** stays today's formula over the biggest Pool. Range is
  `1 … 2 × suggested`.
- **Pass alignment** (leg-aligned): with suggested `S`, Round `r` belongs to
  Pass `k = ceil(r / S)` at position `j = r − (k − 1) × S`. A Pool plays its own
  circle-method Round `j` in Pass `k` only if `j` is no more than its own
  Pass length (size − 1 if even, size if odd). Otherwise it sits out that
  Round. Pass 2 repeats Pass 1's pairings with slot 1 and slot 2 swapped. At
  `r = S` this is byte-for-byte today's schedule.
- **Stored value**: new nullable column `games.round_count`. `null` means
  "follow the field": one Pass of whatever is drawn. A number means the
  Organizer's explicit pick. A value equal to the planned suggestion is
  normalized to `null` on create and on update, so there is no hidden
  difference between "untouched" and "picked the suggestion". Existing rows
  stay `null`, with no backfill. Add a Drizzle migration.
- **Resolve**: one shared resolver takes planned or drawn Pool sizes and the
  stored value, and returns the effective Round count. `null` resolves to
  suggested. An explicit value resolves to `min(value, 2 × suggested)`. The
  sizing result is extended so that the chosen Rounds drive: effective Round
  count, total Pool Matches, and Matches per Game team min/max (counted from the
  generated pairings, not a formula, so odd Pools and partial Passes are right),
  plus a "meets" state (`once` / `partial` / `twice` / `somePartialSecond`).
- Extend the existing sizing and schedule modules. Do not add a new layer.
  Pool Match scheduling takes the effective Round count and emits Rounds
  `1…R`. The one-day and few-weeks time placement is unchanged and is fed `R`.
- One-day fit and the create header Matches count use the chosen-Rounds Pool
  Match total. The overrun stays a warning, as today.

### Create

- `games.createTournament` accepts optional `roundCount` (int, nullable).
  Validate `1 … 2 × suggested` for the planned `teamCount` / `poolCount`, with
  the issue path set to `roundCount`, and normalize a value equal to the
  suggestion to `null`.
- Step 3 gets a Rounds stepper under Groups. It resets to the suggestion on any
  Game teams or groups change, and shows "Suggested" when it equals the
  suggestion, with a "Use suggested (N)" link otherwise. Its caption lines are
  Matches per Game team plus the "meets" line. The review step adds a Rounds
  row. Extract the stepper and its captions into one component, because Edit
  Game reuses it.

### Edit before the draw

- New procedure file `games.updateRoundCount` (one endpoint per file, logic in
  the file). Input is `{ gameId, roundCount: int | null }`. Guards:
  Organizer, not cancelled, Pool tournament, draw not posted (reuse the existing
  "draw not posted" assertion). Validate against planned `teamsAllowed` /
  `poolCount`, normalize the suggestion to `null`, and stamp `updatedAt`.
- Edit Game sheet gets a Rounds section only for a Pool tournament whose draw is
  not posted. It has its own save, like the price and Level range sections.

### Posting the draw

- `postPoolDraw` computes suggested from the **drawn** Pools and resolves the
  effective count with the stored value (clamping silently), then passes it to
  scheduling. `games.round_count` is **not** rewritten on post, so an Undo
  restores the Organizer's original intent.
- `drawPools` and `undoPoolDraw` are unchanged.

### Read surfaces

- `games.byId` exposes `roundCount` (stored, nullable).
- Before the draw: the join sheet, tournament home eyebrow and Your Rounds
  schedule, create review, draft draw preview and game overview panel all use
  the shared resolver (planned field for pre-draw surfaces; draft Pool sizes
  for the draft preview when a draft exists). No surface may call the plain
  full-round-robin count directly anymore.
- After the draw: Round count comes from the posted Matches (highest
  `round_number`), the same rule the hub already uses. Tournament home switches
  to it once `draw_posted_at` is set.

### Pool table

- Head-to-head accumulates across all meetings (win 1, draw 0.5, loss 0,
  summed per opponent), and comparison uses the sums. Teams that never met, or
  that have equal sums, fall through to Set difference as today.

### Docs

- `CONTEXT.md`: add **Pass**, and update **Friendly tournament** and **Pool**
  as described in the Glossary section.
- New ADR, "Organizer chooses the Round count". Record the partial round robin
  trade-off (a Pool table then ranks teams that did not all meet), why Passes
  are capped at two, why `null` means follow the field, and why Pass alignment
  was picked over free cycling for uneven Pools.

## Testing Decisions

Test external behavior only: inputs to outputs of the pure functions, and
procedure results plus persisted rows. Do not test internal helpers or React
state.

- **Pure seam** (extend `tournament-sizing` / `tournament-schedule` tests):
  - suggested and range for even, odd and uneven Pools
  - Matches per team min/max and the meets state for partial, one-Pass,
    partial-second-Pass and two-Pass counts
  - pairings per Round, covering: the first `R` Rounds equal a full schedule's
    first `R`; Pass 2 repeats Pass 1 with slots swapped; a smaller Pool sits
    out the tail of each Pass; `R = S` equals today's output exactly
  - the resolver's `null`, explicit and clamp cases
- **Procedure seam** (follow `createTournament.test.ts`, `postPoolDraw.test.ts`,
  `poolTables.test.ts`):
  - create stores `null` for the suggestion and for an omitted value, stores an
    explicit value, and rejects 0 and `2S + 1`
  - `updateRoundCount` checks permissions, cancelled, posted draw, range and
    normalization
  - `postPoolDraw` checks: null on a shrunk field follows the drawn
    suggestion; an explicit value above `2 × drawn` is clamped; an explicit
    partial value generates exactly that many Rounds; Pass 2 Matches exist with
    swapped slots
  - `poolTables` with two meetings: sum, split series, and never met
- No component tests (agreed).

## Out of Scope

- More than two Passes, or picking Passes per group.
- Choosing which pairings a partial round robin plays (it is always the first
  `R` Rounds of the circle method). Hand-pairing stays deferred per ADR-0017.
- Changing Rounds after the draw is posted, or regenerating a posted schedule.
- Knockout stage and overall champion (still deferred).
- Friendly game and Americano.
- Notifications about a Round change (no delivery channel exists).
- Backfilling `round_count` on existing tournaments.

## Further Notes

- The partial round robin means a Pool table can rank teams that never met.
  That is accepted and is the reason the "Not everyone meets" line exists at
  create.
- The existing Round count on tournament home was computed from the planned
  field even after a shrunk draw. Moving post-draw surfaces to posted Matches
  also fixes that.
- `design/tournament/preview-states` is a design fixture. Update it only where
  its types break.
