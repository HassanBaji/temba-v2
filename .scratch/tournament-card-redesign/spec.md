Status: ready-for-agent

Design: claude.ai design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`, file
`Friendly tournaments flow.dc.html`, section **Turn 1 / Friendly tournament card**
(`#tournament-card`, directions `#1a` and `#1b`). A local copy of the imported file is at
`.scratch/design-import/friendly-tournaments-flow.html` (refreshed for this spec).

Builds on `.scratch/friendly-tournament-redesign/spec.md` (tournament detail surface) and
`.scratch/tournament-round-count/spec.md` (resolved Round count). Does not reopen ADR-0017,
ADR-0018 or ADR-0019: a drawn tournament still expands into one hub row per Pool Match the
viewer sits on. This spec restyles those rows. It does not collapse them.

**No schema change. No new tRPC procedure. No mutation changes.** The work adds read-only fields
to the shared hub row (`HubListRow`) that `games.listMyGames`, `users.home` (carousel) and
`groups.byId` already return.

Tickets (Linear, `ready-for-agent`), in dependency order:

| # | Ticket | Blocked by |
|---|--------|-----------|
| 1 | [TEM-268](https://linear.app/temba-app/issue/TEM-268) Tournament card before the draw: Games list and Group games tab | — |
| 2 | [TEM-269](https://linear.app/temba-app/issue/TEM-269) Your-tournament Match card in My Games after the draw | TEM-268 |
| 3 | [TEM-270](https://linear.app/temba-app/issue/TEM-270) Home next game shows the your-tournament Match card | TEM-269 |

## Problem Statement

A Pool tournament renders in lists as the generic `GameSummaryCard`, the same card as a
four-seat Friendly game. Before the draw that card:

- leads with a single kickoff time (`48px` clock) that a multi-week event does not have;
- counts open **player** seats (`gameOccupancy(registeredUserCount, playersAllowed)`) when
  the tournament is sold in **teams**;
- shows "Friendly tournament" as a meta cell and offers only **Details** (from
  `gameSummaryPrimaryAction`, which returns `view` for a tournament unless it is waitlisted),
  so nobody can join from the list.

After the draw, each Pool Match row (ADR-0018) is a Friendly game card with an "R2 of 3" label.
It does not say which tournament the Match belongs to, where the viewer stands in their group,
or how the last Round went. Home's next-game hero has the same gap.

The design answers this with a tournament card: it names the tournament instead of a time slot,
shows teams as pairs instead of four seats, and uses stacked edges to show that one card stands
for several games.

## Decisions (settled with the user)

1. **Layout comes from 1b, styling from 1a.** Use direction 1b's layout (stacked card, teams
   first, date range, price and a single primary action in the footer). Replace 1b's trophy-tile
   header row with 1a's black header band. The front card gets 1a's ink border.
2. **Three surfaces:** the Games list and Group games tab before the draw, per-Match rows in
   My Games after the draw, and the Home next-game hero when the next game is a Pool Match.
3. **Extend payloads** so the card matches the design: team pairs with occupants, the viewer's
   group and position, and their last result.
4. **Price copy stays "per player".** The design's "per round" is not adopted.
5. **The band does not say "No rating change".** Planner deviation from the design: Pool Matches
   are rated (`completeMatch` → `applyRatedMatch` has no format exclusion), so that label would
   be false. The band's right-hand label shows the Round count instead (see below). Flag this to
   design.
6. **No knockout copy.** "then quarters" and "top two go through" describe a bracket that does
   not exist (CONTEXT: bracket is a later slice). Leave them out.
7. **No "X and Y are going" social line.** It is not in the agreed layout, and there is no
   friends concept to choose which names to show.

## Current behaviour (unchanged unless listed under Required changes)

- `server/games/helpers/hub-list.ts`: `toHubListRow` builds one row per Game.
  `expandDrawnTournamentHubRows` replaces a posted Pool tournament's row with one row per open
  Pool Match the viewer sits on. `sidesFromRow` returns `[]` for anything that is not an
  individual Friendly game. `sidesFromMatch` gives the two Game teams of a Match.
- `server/games/list-my-games.ts` (My Games), `server/home/carousel-games.ts` (Home carousel)
  and `server/api/routers/groups/byId.ts` (Group games tab, `toHubListRow` only) all consume
  `HubListRow`.
- `components/games/game-summary-card.tsx` renders every hub row. `app/dashboard/games/page.tsx`
  and `components/groups/group-games-tab.tsx` render it.
- `components/home/home-next-game.tsx` renders the first carousel game. Phases are
  `upcoming | ongoing | needs_results`.
- `components/games/friendly-game-join-sheet.tsx` already supports Pool tournaments (take a seat,
  alone or with a partner, and allow-alone rules). It needs every team as `sides`.
- `server/games/pool-table.ts` → `computePoolTables` (pure) gives Pool rows with positions,
  `viewerPoolIndex` and `viewerRounds` (per-Round outcome and `scoreLabel`).
- `lib/tournament-sizing.ts` → `resolveRoundCount` / `resolvePlannedRoundCount`, and
  `lib/tournament-rounds.ts` → `poolRoundLabel`, `tournamentRoundSchedule`, `isPoolTournament`.
- Legacy `friendly_tournament` rows with a null `poolCount`, Americano and Friendly games keep
  `GameSummaryCard` exactly as today.

## The card

A new component family in `components/games/` (suggested: `tournament-summary-card.tsx`) with
two variants that share the chrome. `GameSummaryCard` is not extended with more branches.
Callers choose the component by `isPoolTournament(format, poolCount)`: `poolCount` must be on
the hub row.

### Shared chrome (all variants)

- **Stacked edges:** a wrapper with `padding-bottom: 12px`. Two absolutely positioned layers sit
  behind the front card, both 60px tall with a rule border and radius equal to the card's
  (16px in lists, 14px on Home):
  - back layer: inset 18px left and right, bottom 0, wash background (`#FAFAFA`);
  - middle layer: inset 9px left and right, bottom 6px, paper background.
  Decorative only (`aria-hidden`).
- **Front card:** 1px ink border, radius 16px (list) / 14px (Home), `overflow: hidden`, paper
  background. The whole card links to `/dashboard/games/{id}` using the existing overlay-link
  pattern from `GameSummaryCard`. Interactive controls sit above the overlay.
- **Band:** ink background, paper text, `12px 18px` padding (20px on Home). Left: lucide `trophy`
  (14px) plus a mono uppercase label (11px, `0.04em` tracking). Right: a mono uppercase meta
  label (10px, dim colour `#8E8E8E`).
- **Footer:** wash background, top rule, `14px 18px` padding. Left: a status line. Right: one
  action (min-height 44px, radius 11px).
- **Team pair:** two 32px (list) / 36px (Home) rounded-square avatars overlapping by 8px. It
  uses `UserAvatar` with initials. The viewer's team is solid ink with paper text. Other teams
  have a rule border on paper. An empty Position (half team) is a hatched square (`hatch`).

### Variant A: tournament card (before the draw, or no open Match for the viewer)

Used when the row is a Pool tournament and `matchId == null`.

| Slot | Content |
|---|---|
| Band left | `FRIENDLY TOURNAMENT` |
| Band right | `{n} ROUNDS` from the resolved Round count (`resolvePlannedRoundCount(teamsAllowed, poolCount, roundCount)` before the draw, the posted count after). Omitted when null. |
| Top row | Left: `Starts {formatGameCardDay(windowStart)}` in muted text. Right: open flag (existing `OpenFlag` style), `{k} open` where k = `teamsAllowed − fullTeams`, and a half team counts as open. Hidden after the draw and when registration is closed. Cancelled uses the existing `GameStatusBadge`. |
| Title | Game name (`font-expanded`, 32px, `-0.035em`, `leading-none`). Falls back to the venue name, then "Untitled Game". |
| Date line (15px) | Multi-day window: `Thu 25 Sep to Sat 11 Oct`. One-day window: `Thu 25 Sep, 6:00 PM – 10:00 PM`. Missing `windowEnd`: `From Thu 25 Sep`. |
| Sub line (13px, muted) | `{venue name}, level {formatLevelRangeLabel}`. Level omitted when null. |
| Rule | |
| Teams row | Left: `{registeredTeamCount} of {teamsAllowed} teams in`. After the draw: `{teamCount} teams, {poolCount} groups` (`1 group` singular). |
| Pairs | Up to 4 team pairs: the viewer's team first, then by `sideIndex`. Then `+{remaining}` in muted text when there are more. Only teams with at least one occupant are shown. With no teams yet: `No teams yet` in muted text. |
| Footer left | `{formatPricePerPlayerCents} per player` (price bold 17px, label muted 13px). `Free` has no "per player". Omitted when null. |
| Footer action | See the table below. |

Footer action (Variant A):

| Viewer state | Action |
|---|---|
| Can register (`canRegister`, draw not posted) | Solid **Join tournament**. Opens `FriendlyGameJoinSheet` with the tournament's teams as `sides`, the same props the detail page passes (format, registrationMode, allowSoloRegister via `canRegister`/sides, windowStart, venue, level). Seat pick → `games.registerSeat`. Partner path → the sheet's existing partner flow. The pending label is `Joining…`. |
| Can waitlist | Solid **Join waitlist** (existing `onJoinWaitlist`). |
| Viewer is in with an open partner Position | Solid **Invite a partner** (link to the Game). |
| Otherwise (in, waitlisted, closed, full, drawn, cancelled) | Outline **View tournament** (link). |

A viewer who is in sees their own pair first, in ink. No separate "You're in" badge is added.

### Variant B: your-tournament Match card (a Pool Match row, `matchId != null`)

Used for per-Match rows in My Games and for the Home next-game hero.

| Slot | Content |
|---|---|
| Band left | `YOUR TOURNAMENT` |
| Band right | `R{roundNumber} OF {roundCount}` (uppercase `poolRoundLabel`). |
| Top row | Left: tournament name (14px, semibold) with `Round {n}, group {A}` below it (12px, muted). Right: countdown (`formatHomeCountdown`), or `Playing now` / `Add results` from the Home phase when the row carries one. |
| Kickoff | `formatHomeKickoff`: time 46px `font-expanded`, meridiem 19px dim, then a day word (`Tonight` / `Tomorrow` / `Thu 2 Oct`) at 15px. |
| Venue line | `{venue}, {courtName}`, with the court omitted when null. |
| Rule | |
| Matchup | Two columns split by `vs`. Each column has a 36px team pair and a name line below it: `You and {partner first name + initial}` for the viewer's team (semibold), `{A} and {B}` for opponents (muted, right-aligned). The name of a vacant Position is never shown after the draw. |
| Rule | |
| Standing line (13px, muted) | Once the viewer's team has played: `{ordinal} in group {A}` from `computePoolTables` (e.g. `2nd in group A`). Before that: `Group {A}, {size} teams`. |
| Footer left | Last settled Round for the viewer: `Won R1, 6-3 6-4` / `Lost R1, 4-6 3-6` / `Drew R1` / `R1 cancelled`. Omitted when there is none. Scores are shown from the viewer's side (`viewerRounds[].sets`). |
| Footer action | `needs_results` (Home, `canAddResults`): solid **Add results**. Otherwise: outline **View tournament**. Both link to the Game. |

## Required changes

### Hub row payload (`server/games/helpers/hub-list.ts`, `server/games/utils`)

Add to `hubListColumns`: `roundCount`. Add to `hubListWith.teams`: `poolIndex`. Add to
`hubListWith.matches`: its `sets` (`slot1GamesWon`, `slot2GamesWon`, with set order).

Add to `HubListRow` (null for rows that are not Pool tournaments):

```ts
poolCount: number | null;
tournament: {
  roundCount: number | null;          // resolved: planned before the draw, posted after
  drawPosted: boolean;
  teams: {                            // every Game team with ≥1 occupant
    gameTeamId: string;
    sideIndex: number;
    isViewerTeam: boolean;
    left: HubListSideOccupant | null;
    right: HubListSideOccupant | null;
  }[];
  joinSides: HubListSide[];           // every sideIndex 1..teamsAllowed, for the join sheet
} | null;
poolMatch: {                          // only on expanded Pool Match rows
  poolLabel: string;                  // "A"
  poolSize: number;
  viewerPosition: number | null;      // null until the viewer's team has played
  lastResult: {
    roundNumber: number;
    outcome: "won" | "lost" | "draw" | "cancelled";
    viewerSets: { viewer: number; opponent: number }[];
  } | null;
} | null;
```

- Build `tournament` in `toHubListRow`, so Group home gets it too. Occupant rules are the same
  as `occupantFromLink`.
- Build `poolMatch` in `expandDrawnTournamentHubRows` by calling `computePoolTables` once per
  Game. Do not recompute standings in the card. Round count after the draw stays
  `poolRoundCount(row)` (as today).
- `sides` keeps today's meaning for every format (`homeNextGameSeats` and `offersPartnerJoin`
  depend on it).
- This lives in the existing shared hub-list helper, not in a new service layer
  (`.cursor/rules/api-one-endpoint-per-file.mdc`).

### Callers

- `app/dashboard/games/page.tsx`: render the tournament card for Pool tournament rows (Variant A
  or B by `matchId`). Everything else stays on `GameSummaryCard`. The skeleton is unchanged.
- `components/groups/group-games-tab.tsx`: same switch, Variant A only (Group home never
  expands).
- `app/dashboard/page.tsx`: when `nextGame.matchId` is set and the row is a Pool tournament,
  render Variant B in place of `HomeNextGame`, passing `phase` and `canAddResults`. "Coming up"
  rows are unchanged.
- `gameSummaryPrimaryAction`: a Pool tournament with `canRegister` and no posted draw returns
  `join` (today it returns `view`). Americano and legacy tournaments are unchanged.

### Preview

Add Variant A (open, in with a half team, full, drawn) and Variant B (upcoming with no result
yet, won R1, needs results) to the existing `/dashboard/design/tournament` preview route
(`preview-states.tsx`).

## Edge cases

- **Half teams:** count as open in `{k} open` and draw as a pair with one hatched square.
- **Viewer's team is a half team:** Variant A footer shows **Invite a partner**.
- **More than 4 teams:** show 4 pairs plus `+N`, where N counts teams, not players.
- **Long tournament or venue names:** the title wraps (max 2 lines, then ellipsis). The sub line
  truncates.
- **Organizer who is not playing, after the draw:** there are no Match rows, so the list shows
  Variant A in its drawn state.
- **Viewer's remaining Matches are all settled:** expansion falls back to the single row, so
  Variant A in its drawn state.
- **Cancelled Round** (cancelled Match) as last result: `R{n} cancelled`.
- **Level range filter:** `applyViewerLevelRangeToHubRows` already clears `canRegister`, so
  **View tournament** shows.
- **Soft-archived Community:** `joinFrozen` → `view` (unchanged rule).
- **Narrow screens (320px):** the footer's price and action must not wrap into each other. The
  action keeps `flex:none` and the price truncates.

## Acceptance (feature level)

- A Pool tournament before the draw looks like direction 1b with 1a's band in My Games and in
  the Group games tab, and a player can join it from the list without opening the Game.
- After the draw, each of the viewer's Pool Match rows in My Games and the Home next-game hero
  show the your-tournament Match card with Round, opponents, group standing and last result.
- Friendly games, Americano and legacy tournaments look exactly as before.
- No "no rating change", "per round" or knockout copy appears anywhere.
- `pnpm exec turbo run typecheck` and the app's tests pass. New server fields are covered by
  tests next to the existing hub-list / carousel tests.

## Non-goals

- Collapsing per-Match rows back into one tournament row (ADR-0018 stands).
- Any change to the tournament detail page, join sheet internals, create flow or Home "Coming
  up" rows.
- A social "X and Y are going" line, or a friends concept.
- Knockout or bracket copy.
- Per-Round pricing.
- Public pickup lists.

## Risks

- **Hub row weight:** adding team occupants and sets to `queryHubGames` increases payload for
  every list. Tournaments are few, but sets are loaded for all formats. The implementer may scope
  the sets relation to what `computePoolTables` needs. They must not add per-row queries (no N+1).
- **Join sheet parity:** hub occupants carry no Level band, so seat level labels in the sheet
  will be missing when it is opened from the list. This is acceptable for v1, and the detail page
  is unchanged.
- **Design deviation (band label):** confirm the `{n} ROUNDS` label with design.

## Comments
