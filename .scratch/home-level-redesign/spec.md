Status: ready-for-agent

Supersedes `.scratch/redesign/spec.md` §5.1 (Home) and §4.4 (Typography). Does not touch any other section of that spec.

## Problem Statement

Home renders as a stack of identical rounded cards with a photographic hero, emoji as data labels, and progress rings for values that are not out of a whole — `home-stats-card.tsx` renders a ring at 100% fill to say "1 played". Nothing on the page distinguishes what has happened from what has not, so a User with one rated game sees a 0% win rate presented as a headline statistic, and a Provisional Level is presented with the same confidence as a confirmed one.

Separately, the surface has no visual language for absence. An empty seat, an unplayed game, and an unconfirmed Level are all real and all common — most Users are Provisional most of the time — and the current design has no way to say so except by omission.

## Solution

Rebuild Home on today's tRPC payloads plus two small additive fields, around one device: a 45° hairline **hatch** that always means *not yet* — an unfilled seat, an unplayed match slot, a Provisional rating track, the region of the Level chart past the last rated match. Solid black is its opposite: confirmed, filled, done. Black is reserved for what is happening next, and there is exactly one black block on the page.

Components take typed props and hold no data. A dev-only preview route renders both Provisional and confirmed states side by side from a fixture so the hatch device can be checked without seeding a database.

Approving this spec approves the term additions already made to `CONTEXT.md` (**Match result**, **Standing**), ADR-0010 (Archivo), and the deletion list in §9.

---

## 1. Vocabulary

`CONTEXT.md` governs. The design brief's words are not the product's words, and three of them collide:

| Brief says | Product term | Why |
| --- | --- | --- |
| "rating" (the 0.0–7.0 number) | **Level** | **Rating** is the Glicko-2 state (μ, φ, σ) and is never shown raw. Labelling Level as "rating" beside a Rating we deliberately hide is a support thread waiting to happen. |
| "grade" / "grade letter" | **Level band** | D3–A, derived with hysteresis. "Grade" appears nowhere in code or copy. |
| "rating chart" | **Level chart** / Level history | Plots displayed Level from `ratingEvents`. |
| "Player standing" (the whole surface) | *no heading* | **Standing** is a User's position among a Group's Users ("#4 of 13"). The Level / Recent form / All time surface is not a Standing. |

"Player" is permitted in **user-facing copy only** ("Invite a player", "3 of 4 players in"). Identifiers, props and types use **User**.

## 2. Design system

### 2.1 Colour

New tokens in `@theme static`, chosen to avoid collision with existing semantic tokens. `--color-muted` already exists as a *background*; the brief's `muted` is *text*, so the brief's name is not reused.

```
--color-ink       #000000   text, fills (true black)
--color-paper     #FFFFFF   surfaces
--color-rule      #E6E6E6   hairlines and borders
--color-wash      #F4F4F4   page background
--color-dim       #8E8E8E   secondary text on black surfaces
--color-dimrule   #2E2E2E   hairlines on black surfaces
--color-raised    #1C1C1C   raised fills on black surfaces
```

Secondary text on light surfaces uses the **existing** `--muted-foreground`, retuned to `#6E6E6E`.

**`faint` is not defined.** It was specified as `#9A9A9A` for tertiary text and captions, which measures **2.56:1 on `wash`** and **2.81:1 on `paper`** — failing WCAG AA for text (4.5:1) and failing even the large-text bar (3:1). No third grey both passes AA and stays visually distinct from `muted`: `#767676` is 4.13:1 on wash (still failing), and `#6F6F6F` passes at 4.57:1 but is the same grey as `muted` to the eye. Captions and inactive tab labels therefore use `--muted-foreground`; hierarchy comes from size and weight, which a 12px caption against 15px body already carries.

Verified ratios: `muted #6E6E6E` 4.64:1 on wash / 5.10:1 on paper; `dim #8E8E8E` on ink 6.41:1. All pass.

Light only. No `.dark` variants — the hatch is tuned for light surfaces and `ThemeProvider` runs `enableSystem={false}` with `defaultTheme="light"`.

The TEM-72 gate greps for hardcoded hex in class strings. Every value above resolves through a token; `bg-[#F4F4F4]` and its kind must not appear.

### 2.2 Type

Archivo replaces Geist as `--font-sans`, app-wide. See ADR-0010.

```ts
export const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],          // wght is included by default and is REJECTED if listed here
  variable: "--font-sans",
});
```

`font-feature-settings: "tnum" 1` on `body`, globally. Expanded settings (`wdth` 112–118, `wght` 700, letter-spacing −0.03em) apply to hero numerals and Level bands only, as a utility.

Scale: hero Level band 88px, hero time 56px, record 52px, stat totals 34px, big figures 22–26px, body 15–16px, secondary 13–14px, captions 12–12.5px.

### 2.3 Layout and the hatch

22px padding inside surfaces, 26px between major sections, 14–16px radius on surfaces, 5–10px on small elements. Related blocks share one bordered surface separated by 1px hairlines. Borders, never shadows.

One reusable hatch utility, both variants:

```css
/* light */ repeating-linear-gradient(45deg, #DCDCDC 0 1px, transparent 1px 5px); inset 0 0 0 1px var(--color-rule)
/* black */ repeating-linear-gradient(45deg, #333 0 1px, transparent 1px 5px); inset 0 0 0 1px var(--color-dimrule)
```

Hatch is decoration and is always `aria-hidden`; meaning is carried by text (§8).

## 3. Page structure

Mobile-first. At `lg` the page renders a centred 420px column **inside the existing `AppShell`** — the `AppRail` stays. Desktop users do not lose navigation to a phone mockup.

Section headings (`Section` titles like "Your level") are removed from Home; the brief's in-surface label rows replace them.

### 3.1 Header

Avatar (circle, ink, white initial), name at 20px, one line of real state beneath, and a 40px rounded-square notification button with a hairline border and an ink dot when unread.

The state line shows **"Two invites waiting"** when pending invites exist, otherwise the booked-game count ("Two games booked"), otherwise nothing. Both facts come from `users.home` in a single query (§7) — the line must not rewrite itself after mount.

The existing invites `Card` at the bottom of Home is deleted; the dot plus the state line replace it.

### 3.2 Next game — the only black block

Black surface, white text, 16px radius, no photograph.

`carouselGames` phase-orders `needs_results` → `ongoing` → `upcoming`, so the game in this block is frequently **not** in the future. The top row and the primary action are phase-aware:

| phase | top-right | primary action |
| --- | --- | --- |
| `upcoming` | live countdown, recomputed every 30s ("in 5h 42m"; minutes under an hour) | "Invite a player" with an open seat, else "View game" |
| `ongoing` | "Playing now" | "View game" |
| `needs_results` | "Add results" | "Add results" |

This is three primary actions, not the brief's two — a deliberate expansion, because a game needing results is the most urgent thing on Home and is exactly what the one black block is for.

Time as one object: "9:00" at 56px expanded with "PM tonight" trailing at 20px in `dim`. Never split across a separator. Court and format underneath, secondary.

**Seat row.** Four equal seats in a flex row, 52px tall, initial over first name. Filled seats use `--color-raised`; the open seat is hatched with a "+". Above: "3 of 4 players in" left, "One spot open" right.

Props take a **flat `seats: Seat[]`** with an optional `sideLabel` per seat, flattened from `sides: [{ left, right }]` at the call site. The component never sees padel's 2×2. Any count renders; past six seats labels truncate to initials.

Note as a known property, not a defect: `--color-raised` is 1.23:1 against ink and the hatch lines about 1.6:1, so filled-versus-open is carried by the initial-and-name versus the "+", not by the fill. §8 covers the non-visual equivalent.

Secondary "Details" is a ghost button with a `dimrule` border. No chevrons appended to button text.

### 3.3 Coming up

**Not "Later this week".** A week window does not exist server-side, and "this week" empties out on Sunday evening and hides a Saturday game on Monday morning. "Coming up" carries the same information with no cliff.

One white bordered surface, hairline-separated rows: 44px date column (day number over weekday abbreviation), venue and time centre, seat indicator right as small vertical bars — solid for taken, hatched for open.

### 3.4 Level

One white bordered surface, three hairline-separated blocks, each opening with a `muted` label row: plain label left, context right.

**Level band** at 88px expanded left. Vertical hairline, then two stacked figures: the numeric **Level** with the word "Level", and the change with a small arrow glyph and its window.

The change window is **derived from available history**, not fixed at two — `history` holds up to 15 events and the label is shown, so "last 6 matches" must be true. Early Users see a more volatile figure; that is correct.

**Level chart**, 58px. The split between plotted and hatched is **derived**, not the brief's fixed 42%:

```
plottedFraction = played / (played + ratedMatchesRemaining), clamped to 0.25–0.75
```

A fixed fraction would give a User with 1 rated match and one with 8 identical geometry, which makes the chart a picture of a chart. The clamp is a deliberate floor — unclamped, 1-of-9 leaves a plotted region too small to read.

Provisional: real points as dots in the plotted region, then a dashed grey line into a hatched region marked "Not yet confirmed". Confirmed: solid path across the full width, one filled dot at the end. Path draws once on mount via `stroke-dashoffset`.

**Progress track**, 8px. Hatched background while Provisional, flat `wash` once confirmed. Ink fill, width animates in on mount. Caption: "16% of the way to C1" left, "4 games to go" right.

**At band A** (`nextBand === null`, `progressPercent === 100`): the track and its caption are **removed entirely**, replaced by the single line "Top Level band". A full track that can never move is decoration pretending to be data.

**Closing note**, hairline-topped, with a small hatch swatch:

- Provisional: "**Provisional level.** Hatched means unconfirmed — play about 4 more rated games and your level confirms."
- Confirmed: solid ink swatch, "**Level confirmed.** Your rating now moves with every rated game you play."

"About", and "confirms" rather than "locks in", are load-bearing. `ratedMatchesRemainingToConfirm` is a linear estimate in φ floored at 1, and per ADR-0009 idle periods every 30 days inflate φ — so the number **can rise** after a User plays. This is a copy fix, not a model fix: we stop promising what the model cannot deliver.

### 3.5 Recent form

**Match result** includes draws (equal Set wins, scored 0.5 by Glicko-2), so the row has **three** states, not two.

Record at 52px expanded as "6–3–1" (won–lost–drawn) when draws exist, "6–3" when none. Status line beneath: an invitation while slots are unfilled ("Nine slots left to fill"), and once full, the existing **streak** copy from `home-recent-form.ts` ("On a 3 games Win streak"). Right: win rate, shown as an em dash plus "win rate after 3 games" until three games exist, then the percentage. The three-game gate is an invented product rule, recorded here as such.

Ten equal slots, 38px tall, 5px radius:

- **Win** — solid ink, white "W"
- **Loss** — paper, 1.5px ink border, ink "L"
- **Draw** — paper, 1.5px ink border, ink "D", with a hairline diagonal split
- **Not played** — hatched, empty

No red or green; the letter and fill carry it, which also keeps it readable for colourblind Users. Legend beneath: "Most recent" left, "Oldest" right.

`fillRatio` (bar heights) is dropped from `home-recent-form.ts` — slots are uniform height by design.

### 3.6 All time

Three figures — **Played / Won / Lost** — in a flex row divided by vertical hairlines, numerals at 34px expanded, sentence-case labels beneath. No rings, no donuts, no emoji.

Requires a new `gamesLost` on `users.home` (§7). Drawn Matches are played but neither won nor lost, so **the three do not sum, and that is correct**. This replaces the documented "Games played / Games won / Sets won" trio; update that comment in `users/home.ts`.

### 3.7 Standing

The approved §5.1 Standing rows are **retained**, not deleted, as a fourth surface below the Level surface, in the same hairline-separated row idiom: Group name, sport, "#4 of 13" with the position expanded and tabular. Removing an approved section as a side effect of a visual redesign is not in scope for this work.

### 3.8 Tab bar

**Five** tabs, unchanged: Home, Games, Groups, Communities, You. The brief's four-tab bar drops two live surfaces for a `ranking` route that does not exist; its actual contribution is the styling, which transfers intact.

Fixed bottom, paper, hairline top border, Lucide icons at 21px, 11.5px labels, ink when active and `muted-foreground` otherwise (see §2.1 — not `faint`). Respects `env(safe-area-inset-bottom)`. Five slots still fit at 360px.

## 4. States

Each block owns its empty state; there is no separate whole-page empty variant.

- **No games** — the black block is replaced by a white bordered "No games booked" surface with a browse/create action. The black block cannot survive an empty state without breaking its own meaning.
- **No Rating** (`rating: null`, `canSelfDeclare: true`) — the Level block becomes the declare prompt hosting the existing `DeclareLevelDialog`. It is the one block that cannot be hatched: there is no Level to be provisional about yet.
- **No games played** — Recent form renders ten hatched slots and "0–0"; All time renders three zeros. This is the honest picture of a new User and makes the page feel like something to fill in.
- **Loading** — skeletons matching final geometry.
- **Error** — existing `ErrorState` with retry.

## 5. Motion

Exactly two mount animations: the progress-track fill (width) and the Level chart path draw (`stroke-dashoffset`). Everything else moves only on tap. No entrance animations on sections, no hover transitions on cards.

Reduced motion needs **no new code** — the existing global block in `globals.css` already forces `animation-duration: 0.01ms` and restricts `transition-property` to `opacity`, which neutralises both. Verified, not assumed.

## 6. Sport

Components take sport-neutral props (`sportLabel`, `seats[]`, `formatLabel`); the page continues to pass padel. `ratings.me` stays hardcoded to `GroupSportEnum.PADEL`. The brief's constraint is on the **component API**, and this satisfies it fully.

Threading sport end-to-end is a separate feature — multi-sport Home needs its own decisions about what a User with both padel and football Ratings sees at the top of the page — and is explicitly out of scope.

## 7. Server changes

Two additive fields on `users.home`, both small and both beside existing logic:

1. **`gamesLost`** — completed Matches the User sat on where the Match result was a loss. Drawn Matches excluded, mirroring the existing `gamesWon` branch in `summarizeCompletedMatchStats`. Update the label comment at the top of `users/home.ts`.
2. **`pendingInviteCount`** — folds the three client queries in `usePendingInviteCount` into the Home payload, so the header resolves from one query and its state line does not rewrite itself after mount.

No schema change. No change to `ratings.me`.

## 8. Accessibility

The hatch is a `background-image` and is therefore silent. Following the `game-seat-grid` precedent (decoration `aria-hidden`, meaning in text):

- Every hatch element is `aria-hidden`.
- Each of the ten form slots carries `sr-only` text — "Not played", "Won", "Lost", "Drawn".
- The open seat announces "Open seat"; filled seats announce the User's name.
- The Level chart is a single `role="img"` with a label such as "Level over 6 rated matches; not yet confirmed", with its hatched region `aria-hidden`.

Per-element text, not reliance on the visible captions ("Nine slots left to fill", "One spot open") — those are spatially separated from what they describe, so a User tabbing the slot row would hear ten identical things and have to recall a caption from earlier.

Visible keyboard focus on every button, row and tab. Tabular figures throughout; the countdown must not reflow on tick.

## 9. Deletions

All five are imported **only** by `/dashboard/page.tsx` (the hero card only via the carousel), and `ProgressRing` has exactly one consumer:

- `components/home/home-rating-card.tsx`
- `components/home/home-recent-form-card.tsx`
- `components/home/home-stats-card.tsx`
- `components/games/upcoming-games-carousel.tsx`
- `components/games/upcoming-game-hero-card.tsx`
- `components/common/progress-ring.tsx`

`components/home/home-recent-form.ts` is **kept and trimmed** — `deriveRecentForm` and `streakFromNewestFirst` survive, `fillRatio` goes. Its existing test moves with it.

## 10. Code structure and testing

Following the established repo pattern — pure functions in `src/lib/` with colocated `*.test.ts`, components render only:

- `lib/home-level-chart.ts` — split ratio and point geometry. Cases: zero rated matches, one point, clamp floor and ceiling, `ratedMatchesRemaining` rising after idle inflation.
- `lib/home-countdown.ts` — format thresholds, the sub-hour switch, and non-future starts.
- `components/home/home-recent-form.ts` — extended for the three-state slots and the three-game win-rate gate.
- Server: a test for `gamesLost` alongside the existing `users.home` coverage, including a drawn Match counting as played but neither won nor lost.

## 11. Preview route and fixture

- Fixture: `src/fixtures/home.ts` — the only place with data.
- Route: `/dashboard/design/home`, rendering Provisional and confirmed side by side, plus the empty states.
- **Excluded from production** — 404s outside development. A fixture-fed page reachable in production eventually produces a bug report about fake Levels.

## 12. QA gate

Produce a gate record in the TEM-72 style:

- Grep evidence: no hardcoded hex in class strings; no `faint`-equivalent grey used for text.
- Contrast figures for `muted` on paper and wash, and `dim` on ink (§2.1).
- Screenshots at 360 / 390 / 430 / 768 / 1024 / 1440, plus the preview route in both Level states.

## 13. Ticket slicing

Published as **TEM-165–TEM-172**, with native Linear `blocks` relations and the `ready-for-agent` label. The slicing below revises what this spec originally proposed: the server-fields ticket dissolved into its two consumers (making both vertical rather than a single API-only slice), the preview route moved early so every later ticket has a demo surface, and Recent form split from All time.

| # | Ticket | Blocked by |
| --- | --- | --- |
| TEM-165 | Typographic and colour foundation | — |
| TEM-166 | Dev-only Home preview route and fixture | 165 |
| TEM-167 | Header with state line and notification dot (carries `pendingInviteCount`) | 165, 166 |
| TEM-168 | Next game black block and Coming up rows | 165, 166 |
| TEM-169 | Level block with provisional chart and progress | 165, 166 |
| TEM-170 | Recent form row, four slot states | 165, 166 |
| TEM-171 | All time figures and retained Standing rows (carries `gamesLost`) | 165, 166 |
| TEM-172 | Visual and accessibility QA gate | 167–171 |

TEM-167 through TEM-171 are drawn as parallel because their code is independent, but each edits `/dashboard/page.tsx`, so whichever lands first establishes the page skeleton the rest slot into. Run them sequentially with a fresh `implementer` per ticket.

1. **Foundation** — Archivo swap, `tnum`, colour tokens, hatch utility. App-wide blast radius, reviewable and revertable on its own, screenshot-gated across existing routes. Ships ahead of everything else.
2. **`users.home` additive fields** — `gamesLost`, `pendingInviteCount`, label comment, tests.
3. **Header, Next game, Coming up** — including the phase-aware black block and the flat seat row.
4. **Level block** — band, Level, derived change window, chart, progress track, top-band variant, closing note.
5. **Recent form, All time, Standing rows** — three-state slots, Played/Won/Lost, retained Standing.
6. **Preview route and fixture**, then the QA gate record.

## Comments

Decisions in this spec were settled across seven rounds of grilling on 2026-09-07. Where the design brief and the codebase disagreed, the resolution and its reasoning are inline above rather than in this section.
