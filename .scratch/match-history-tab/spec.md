# Match History tab on Games hub

Status: ready-for-agent

Tickets (Linear, `ready-for-agent`): [TEM-149](https://linear.app/temba-app/issue/TEM-149/list-the-signed-in-users-friendly-game-match-history) List the signed-in User's Friendly game Match History → [TEM-150](https://linear.app/temba-app/issue/TEM-150/games-hub-history-tab-and-friendly-game-result-cards) Games hub History tab and Friendly game result cards.

## Problem Statement

A signed-in User opening Games sees only live lists (**My Games** and **Public**). After they finish play and Complete Match, those Friendly games disappear from the hub with no place to scan past results — date, Venue, opponents, set scores, and whether they won. Group home History lists past Games without scores or WON/LOST. Home stats count completed Matches but do not show a result card.

## Solution

Add a third Games hub tab, **History**, after **My Games** and **Public**. It lists past **Friendly game** Games the signed-in User sat on via a completed Match slot: one row per Game, newest first. Each row is a result card (design reference: dark row with date/time, Game name, Venue, format label, two teams of avatars with “vs”, set scores, WON/LOST/DRAW from the viewer’s perspective, chevron). Tapping the row opens Game home on the Results tab.

Friendly tournament and Americano History (including within-Game rank) are deferred. No pagination this slice. No new Match detail route. Do not overload the live `GameSummaryCard`.

Approving this spec approves the Test seams in Testing Decisions.

## User Stories

1. As a signed-in User on Games, I want a third tab labelled **History** after **My Games** and **Public**, so that past results sit next to live lists.

2. As a signed-in User opening Games, I want **My Games** still selected by default, so that my live schedule stays first.

3. As a User who completed a Friendly game Match I sat on, I want that Game on History once the Game is no longer live, so that finished play has a home on the hub.

4. As a User who only waitlisted or registered without sitting on a Match slot, I want that Game absent from History, so that History means Matches I contested.

5. As an Organizer who did not sit on a Match slot, I want that Game absent from History, so that organizing alone does not invent play history.

6. As a User on a Friendly game that is still live (`isGameLive`), I want it absent from History even if a Match is already completed, so that History stays past-tense.

7. As a User on a cancelled Game, I want it absent from History, so that cancel is not treated as a result.

8. As a User on a Soft-archived Club Group Friendly game I played, I want it on History when inclusion rules pass, so that Soft-archive does not erase past play.

9. As a User who played only Friendly tournament or Americano Games, I want History empty this slice (aside from any Friendly games), so that deferred formats do not ship half-built rank cards.

10. As a User viewing History when I have no qualifying Games, I want an empty state titled **No match history yet** with description **Completed Games you played in show up here.**, so that I know what will appear.

11. As a User with several History rows, I want the full list newest first with no pagination, so that recent play is at the top (same unbounded style as hub live lists).

12. As a User scanning a History card, I want the **Game name** as the primary title (fallback Venue name, then “Untitled Game”), so that the event label matches the design reference.

13. As a User, I want the Venue name under the title with a pin icon, so that place is visible without Venue-led hub card layout.

14. As a User, I want a people-icon line labelled **Friendly game** (existing format label), so that format is clear without inventing “Community Match”.

15. As a User, I want the left column to show the date stacked above the time from the **latest completed Match I sat on** (Match `startTime`), falling back to the Game window start / list time when Match start is null, so that the card reflects when I last played that event.

16. As a User, I want two teams of avatar circles with **vs** between them from that latest completed Match’s slot1 and slot2 Game teams (left/right Positions within each team), so that opponents are visible at a glance.

17. As a User, I want set scores from that Match shown as games-won pairs for scored Sets (both sides non-null), in Set order (e.g. `6 - 2`, `6 - 3`), so that the result is readable without opening the Game.

18. As a User, I want a **WON** (success/green), **LOST** (destructive/red), or **DRAW** (neutral) badge from my Match slot via existing Match outcome rules, so that my perspective is immediate.

19. As a User tapping the History card or chevron, I want to open `/dashboard/games/{gameId}?tab=results`, so that Sets and Match detail stay on Game home Results.

20. As a User, I want History tab count behavior consistent with other hub tabs (secondary badge when the list length is non-zero), so that chrome stays familiar.

21. As a User on My Games or Public, I want those tabs and `GameSummaryCard` join behavior unchanged, so that History is additive.

22. As a User on Group home History, I want that list unchanged (still past/cancelled Games without scores), so that Group History and hub Match History stay separate products this slice.

23. As a developer, I want a new protected list procedure on the Games router with its logic in that procedure file (one endpoint per file; `index.ts` only composes), so that we do not add a twin `server/games/<verb>.ts` shell.

24. As a UI author, I want History card props typed from `RouterOutputs` of that list door, so that we do not invent a parallel domain DTO dump.

25. As a developer, I want a **new** History card component (not optional props on `GameSummaryCard`), so that live join cards and result cards do not share one overloaded surface.

## Assumptions / Decisions

Locked from grilling (Rounds 1–2):

- List unit: one row per past **Game** (not per Match).
- Played in: viewer sat on a Match slot (`userIsOnMatchSlots` / Home stats sense).
- Formats this slice: **Friendly game only**. Friendly tournament deferred entirely. Americano future-only after Match generation + completed Matches.
- Friendly game outcome badge: WON / LOST / DRAW from viewer slot via `matchOutcome`.
- Inclusion: non-cancelled Game; Game not live (`!isGameLive`); viewer sat on ≥1 completed Match; Soft-archived Club Groups included.
- Tab: third tab **History** (Q7 answered ambiguously as `q`; locked as option 1).
- Navigation: Game home Results tab.
- Type line: existing Game format labels.
- Date/time base: latest completed Match the viewer sat on; else Game window / list time.
- Title hierarchy: Game name primary; Venue secondary.
- Pagination: none; full list newest first.
- Empty copy: as story 10.
- Component: new History card.

Defaults locked without further grilling (existing patterns):

- Sort key: same timestamp used for the card’s date/time (latest completed Match start for the viewer, with window/list fallback), descending.
- Avatar order: Match slot1 left of **vs**, slot2 right; within a team, left then right Position.
- Set score display: only Sets with both `slot1GamesWon` and `slot2GamesWon` non-null; omit empty shells.
- DRAW badge uses a neutral/secondary treatment (not success/destructive).
- Friendly game normally has one Match; if multiple completed Matches exist that the viewer sat on, the card’s teams, scores, outcome, and time all come from the **latest** of those Matches.
- No viewer-specific avatar ring required this slice.
- No schema migration.
- Reuse shared glossary modules: Soft-archive consult only as already reflected in `isGameLive` / visibility; `matchOutcome`; Match slot membership checks; do not reimplement rating or Group Standing as History rank.

## Implementation Decisions

- **Surface:** Games hub Tabs gain value `history` after `my-games` and `public`. Default remains `my-games`. Create Game chrome unchanged.

- **New tRPC door:** Protected query on the Games router, e.g. `games.listMyMatchHistory`, in its own file under `api/routers/<domain>/` with validation (none beyond auth), authorization (signed-in User), inclusion rules, database reads, and response shaping in that file. Compose it from `games/index.ts` only. **Do not** add a twin `server/games/list-my-match-history.ts` that the procedure only forwards to. Export a db-taking function from the procedure file for PGLite tests (same pattern as other colocated door tests).

- **Inclusion filter (all must hold):**
  1. `format === friendly_game`
  2. `cancelledAt` is null
  3. `!isGameLive(game, now)` (existing shared helper — do not fork the live predicate)
  4. Viewer is on at least one Match with `status === completed` via a Game team in slot1 or slot2
  5. Soft-archived Club Group Games are not excluded

- **Row payload (conceptual):** Game id; name; format; Venue `{ name }` (and city only if already cheap/consistent — Venue name is enough for the pin line); display timestamp; Match id used for the card; slot1/slot2 members `{ id, name, image }` ordered by Position; scored Sets `{ slot1GamesWon, slot2GamesWon }[]`; viewer outcome `"won" | "lost" | "draw"` derived from viewer slot + `matchOutcome`. Prefer `RouterOutputs` on the client.

- **Outcome mapping:** Determine viewer slot (1 or 2) from Game team membership on that Match (same exclusivity idea as Home stats `userSlotOnMatch`). Map `matchOutcome.result` to won/lost/draw; do not list rows whose completed Match has outcome `none` (Complete Match already requires a scored result — treat `none` as absent/skip if it appears).

- **UI:** New History card component under the Games components area. Layout follows the attached design reference: date/time column; title + Venue + format meta; avatars vs avatars; set scores + outcome badge; chevron. Entire row navigates to Results. Loading skeletons and ErrorState retry should match other hub tabs’ patterns. EmptyState per story 10; optional control to switch to My Games or Public is nice-to-have, not required.

- **Invalidation:** Completing a Match (and related Game home mutations that already invalidate hub lists) should also invalidate the History query so a newly past Friendly game appears after refresh/navigation without a special cache protocol.

- **Unchanged:** `listMyGames`, `listPublicPickup`, `GameSummaryCard`, Group home upcoming/history, Home carousel/stats, ratings, schema.

## Testing Decisions

### What a good test is

Assert external behavior of the list door: which Games appear, in which order, with which outcome and Match-derived fields. Do not assert CSS, Tailwind class strings, or router file layout beyond “the procedure is callable.” Prefer PGLite tests against the db-taking function colocated in the procedure file. UI can be verified manually on the hub.

### Test seams

Highest seam: signed-in User receives History rows for past Friendly games they sat on, with correct outcome and navigation target; deferred formats and non-players stay out; live hub lists unchanged.

If you implement this spec, you implement these seams:

1. **Audience:** seated on completed Match → in; waitlisted-only → out; registered but never slotted on the completed Match → out; Organizer-only → out.
2. **Live vs past:** Friendly game still `isGameLive` → out; after it is not live and Match completed → in.
3. **Cancel / Soft-archive:** cancelled Game → out; Soft-archived Club Group Friendly game that otherwise qualifies → in.
4. **Formats:** Friendly tournament / Americano → out this slice even if completed Matches exist.
5. **Outcome:** viewer on slot1 win → WON; loss → LOST; equal Set-wins → DRAW; set scores only from scored Sets; timestamp from latest completed Match the viewer sat on.
6. **Sort:** newer display timestamp first.
7. **Hub chrome:** History tab present; empty copy as specified; card opens Results tab; My Games / Public behavior unchanged.

### Prior art

- Home completed-Match stats selection in `users.home` (slot membership + `matchOutcome`, exclude cancelled Games)
- `isGameLive` / hub list filters in home upcoming helpers
- Games hub tabs page patterns (Tabs, EmptyState, ErrorState, skeletons)
- PGLite door tests colocated with games procedures / hub-list tests
- `AvatarStack` / `UserAvatar` on Teams and Game cards

## Out of Scope

- Friendly tournament History rows and within-Game rank (1st, 2nd, …)
- Americano History (no Matches this product slice; rank deferred with Match generation)
- Pagination / infinite scroll
- New Match detail route
- Overloading `GameSummaryCard` with history props
- Changing Group home History to show scores
- Changing Home stats labels or formulas
- Schema / migrations
- Push/email after Complete Match
- Filters, search, or sport chips on History
- Within-Game ranking algorithms
- Twin `server/<domain>/<verb>.ts` files or new service/repository layers for this door

## Further Notes

- Domain vocabulary: **Game**, **Match**, **Set**, **Game team**, **Friendly game**, **Friendly tournament**, **Americano**, **Soft-archive**, **Organizer**. Avoid “Community Match” as a product label. History tab copy may say “match history” in empty state; list unit remains Game.
- Glossary tension (pre-existing): Home UI says “Games played” for completed Match counts. This feature’s empty state follows the same user-facing “Games you played in” phrasing while the door filters on Match slots. Do not rename Home stats in this slice.
- ADR-0008 (Game parent / Match child) stands. No new ADR: additive list surface, reversible, no surprising domain split.
- Design reference image used in planning: row cards with date/time, title, Venue pin, format people-line, avatar teams vs, set scores, WON/LOST, chevron.
- Risk: Friendly tournament players may expect History; empty for those formats is intentional until a follow-on spec defines rank.
- Risk: `listMyGames` today still uses a twin under `server/games/`; new History work must not copy that layout — follow `api-one-endpoint-per-file`.

## Implementation tickets

Published to Linear. Frontier is [TEM-149](https://linear.app/temba-app/issue/TEM-149/list-the-signed-in-users-friendly-game-match-history).

1. [TEM-149](https://linear.app/temba-app/issue/TEM-149/list-the-signed-in-users-friendly-game-match-history) List the signed-in User's Friendly game Match History — unblocked.
2. [TEM-150](https://linear.app/temba-app/issue/TEM-150/games-hub-history-tab-and-friendly-game-result-cards) Games hub History tab and Friendly game result cards — blocked by TEM-149.
