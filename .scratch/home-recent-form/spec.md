# Recent form on Home

Status: ready-for-agent

Tickets (Linear, `ready-for-agent`): [TEM-154](https://linear.app/temba-app/issue/TEM-154/open-games-hub-history-from-a-tab-query) Open Games hub History from a tab query → [TEM-155](https://linear.app/temba-app/issue/TEM-155/show-recent-form-of-the-last-10-friendly-games-on-home) Show Recent form of the last 10 Friendly games on Home.

## Problem Statement

A signed-in User opening Home sees all-time overall stats (played / won / win rate from completed Matches) and a Level sparkline, but not how they have been performing lately. After a Friendly game leaves the carousel (once its Match is completed), the result disappears from Home. Games hub History lists those past Friendly games, yet Home has no glanceable last-10 form, streak, or comparison to the previous 10.

## Solution

Add a **Recent form** card on Home that recreates the attached design mock: dark rounded card; title **Recent form** with subtitle **Last 10 games**; top-right **View all >** pill; ten vertical capsule bars (W/L/D) on the left; a vertical divider; **Current streak** and **Win rate (last 10)** with a trend vs the previous 10 on the right.

The card is the signed-in User’s own form only. It is a Home view of the same past **Friendly game** Games already listed on Games hub History (viewer sat on a completed Match slot). It does not replace **Your overall stats**, the Level card, the Home carousel, or Match History. **View all** opens Games hub on the History tab.

Approving this spec approves the Test seams in Testing Decisions.

## User Stories

1. As a signed-in User on Home, I want a **Recent form** card after **Your level** and before **Your overall stats**, so that recent results sit between identity and career totals.

2. As a User scanning Home, I want the card to match the mock: dark rounded surface, title **Recent form**, subtitle **Last 10 games**, and a top-right **View all >** pill, so that the surface is recognizable.

3. As a User with at least one qualifying past Friendly game, I want that card to appear, so that I can see recent form as soon as I have a result.

4. As a User with no qualifying past Friendly games, I want the card hidden, so that Home does not show an empty form chart.

5. As a User who has only played Friendly tournament or Americano, I want Recent form hidden (unless I also have qualifying Friendly games), so that deferred formats do not invent bars.

6. As a User with 1–9 qualifying Friendly games, I want that many bars only (no padded empty tracks), so that missing results are not implied.

7. As a User with 10 or more qualifying Friendly games, I want exactly the most recent 10 as bars, so that the mock’s last-10 window holds.

8. As a User reading the bars left to right, I want oldest on the left and newest on the right, so that the story reads toward now and the rightmost bar is the latest result.

9. As a User, I want each bar labelled **W**, **L**, or **D** from my Match slot via existing Match outcome rules, so that a Draw is visible instead of being forced into a win or loss.

10. As a User, I want a win bar filled green from the bottom of a semi-transparent track, a loss bar filled red the same way, and a draw bar with a muted/neutral fill (or empty track) and a **D** label, so that colour matches the mock without pretending a Draw is W or L.

11. As a User, I want bar height to reflect the magnitude of the Set games-won differential on that Friendly game’s result Match (sum of absolute games-won differences across scored Sets, capped so a two-set 6–0 / 6–0 is full height), so that fills are real rather than decorative fake variance.

12. As a User whose latest qualifying results are three wins, I want **Current streak** to read **3 Wins** in green with a flame icon, so that a hot streak matches the mock’s streak treatment.

13. As a User whose latest qualifying results are two losses, I want **Current streak** to read **2 Losses** in red with no flame, so that a losing streak is honest.

14. As a User whose most recent qualifying result is a Draw, I want **Current streak** to read **No streak** in muted type with no flame, so that a Draw breaks both win and loss streaks.

15. As a User with a one-game streak, I want singular copy (**1 Win** / **1 Loss**), so that the label is grammatical.

16. As a User, I want streak counted from the most recent qualifying Friendly game walking backward until the outcome changes (or a Draw is hit), so that streak always agrees with the rightmost bars.

17. As a User, I want **Win rate (last 10)** as a rounded percentage of wins in the current window (Draws count as played, not won), so that the rate uses the same played-not-won rule as Home overall stats.

18. As a User with fewer than 10 qualifying Friendly games, I still want a win rate over those games under the **Win rate (last 10)** label, so that chrome stays as the mock while the number is honest.

19. As a User with 20 or more qualifying Friendly games, I want a trend next to the rate: green **↑ N%** if the current-10 rate is higher than the previous-10 rate, red **↓ N%** if lower, muted **0%** if equal, so that comparison is percentage points (70% vs 50% is **↑ 20%**), not a relative percent.

20. As a User with fewer than 20 qualifying Friendly games, I want the trend chip hidden, so that we do not compare against a missing previous 10.

21. As a User tapping **View all >**, I want to land on Games hub with the **History** tab selected (`/dashboard/games?tab=history`), so that the full Friendly game list is one tap away.

22. As a User opening Games hub with no tab query, I want **My Games** still selected by default, so that View all does not change the usual hub landing.

23. As a User opening `/dashboard/games?tab=history` (or `public`), I want that tab selected, so that View all and shared links work.

24. As a User switching hub tabs, I want the URL tab query to stay in sync, so that Back/refresh keeps the tab I am on.

25. As a User, I want **View all** to stay a quiet pill on the dark card (chevron, not Volt Lime), so that Create Game remains the page’s brand action if one is present.

26. As a User, I want the bars display-only this slice (not links), so that the chart stays a summary and Game Results stay behind History / View all.

27. As a User using a screen reader, I want the chart labelled with the sequence of results (W/L/D) and the streak and win-rate text, so that form is not colour-only.

28. As a User while History is loading, I want a skeleton for this card only (same idea as the Level card), so that a slow History query does not block overall stats.

29. As a User when History fails, I want an ErrorState on this card with retry, so that overall stats and Level can still render.

30. As a User who only waitlisted, registered without a Match slot, or organized without sitting a Match, I want those Games absent from form, so that inclusion matches Match History.

31. As a User on a cancelled Game, I want it absent from form, so that cancel is not a result.

32. As a User on a Friendly game that is still live, I want it absent from form even if a Match is already completed, so that form stays past-tense like History.

33. As a User on a Soft-archived Club Group Friendly game I sat on, I want it in form when History would list it, so that Soft-archive does not erase past play.

34. As a User, I want **Your overall stats** unchanged (all-time completed Matches, all formats, Draws played not won), so that Recent form is additive.

35. As a User, I want **Your games** carousel and **Your level** unchanged, so that live Games and Level stay their own surfaces.

36. As a User, I want Games hub History cards and empty copy unchanged, so that Home form does not restyle History.

37. As a User, I want this card to show only my form, never an opponent’s or a Community/Group/Team leaderboard, so that Home stays first-person.

38. As a User of the padel-only App, I want no sport picker or sport chip on this card, so that we do not invent a filter History does not have. Qualifying Friendly games of any stored sport are included; App create remains padel.

39. As a UI author, I want form props typed from `RouterOutputs` of the existing History list door, so that we do not invent a parallel DTO.

40. As a developer, I want no new tRPC procedure and no twin `server/<domain>/<verb>.ts` for this card, so that inclusion stays in the History door and Home does not fork it.

41. As a developer, I want bar height, streak, win rate, and trend derived by a pure function from History rows, so that those rules are testable without a second inclusion query.

42. As a developer, I want Games hub to honor `?tab=` the way Game home honors `?tab=results`, so that View all does not require a new route.

43. As a User on a narrow screen, I want bars still left of the divider and stats still to the right when they fit, and stats wrapping under the bars only if the row would overflow, so that we do not ship a different mock.

## Assumptions / Decisions

Locked from existing Home stats, Match History, sports brand, and the mock (no live grill round; recommended answers locked):

1. **Unit of “game”.** Last 10 **Friendly game** Games the viewer sat on via a completed Match slot — the same list unit as Match History. Friendly game has exactly one Match, so this is also last 10 qualifying Matches of that format. Do not mix Home overall-stats “completed Matches of every format” into the 10.

2. **Formats.** Friendly game only, aligned with History. Friendly tournament and Americano are out (many Matches per Game would distort last-10 and streak).

3. **Draws.** Bars show **D** (muted/neutral, not green/red). A Draw is played, not won (same as Home overall stats). A Draw **breaks** win and loss streaks. Draw is in the win-rate denominator, not the numerator.

4. **Bar height.** Real metric: sum of `|slot1GamesWon − slot2GamesWon|` across scored Sets on the History card’s Match, divided by cap **18** (three 6–0 Sets), clamped to 0–1. Do not invent decorative heights. A Draw (differential 0) is an empty or near-empty muted track with **D**. Do not normalize against the max in the current 10 (that would resize older bars when a blowout appears).

5. **Bar order.** Oldest left, newest right. The mock’s “3 Wins” vs rightmost **L** is illustrative and is **not** product behavior. Streak always matches walking backward from the rightmost bar.

6. **Current streak.** Consecutive identical W or L outcomes from the most recent qualifying Friendly game. Copy: `N Win(s)` / `N Loss(es)`. Flame icon only on a win streak of ≥1. Loss streak is red, no flame. Most recent Draw or no results in the window: **No streak**, muted, no flame.

7. **Win rate vs previous 10.** Current window = most recent `min(10, n)` History rows. Previous window = the next older 10. Rate = `round(100 * wins / windowLength)` with Draws as not-wins. Trend is **percentage points**. Show **↑** / **↓** / muted **0%** only when `n ≥ 20`. If `n < 20`, hide the trend (there is no full previous 10). If `n = 0`, the card is hidden.

8. **View all.** Destination is Games hub History. History is already shipped. Always show the pill when the card is visible. Hide the whole card (and thus the pill) when History is empty. Hub must honor `?tab=history`.

9. **Empty / partial.** 0 qualifying Games → hide card. 1–9 → that many bars, no padded tracks. Loading → card-local skeleton. Error → card-local ErrorState + retry. Page-level Home skeleton/error stays tied to `users.home` only.

10. **Relationship to HomeStatsCard.** Additive. Do not replace overall stats. Placement: carousel (if any) → **Your level** → **Recent form** → **Your overall stats**. Title lives on the card (no duplicate Section heading).

11. **Sport.** No sport filter or chip. Same as History. Padel-only App create is unchanged.

12. **Inclusion.** Identical to Match History: Friendly game; not cancelled; not live (`!isGameLive`); viewer sat on ≥1 completed Match with a real outcome (`won` / `lost` / `draw`, skip `none`); Soft-archived Club Group Games included. Waitlist-only, registered-but-unslotted, Organizer-only → out.

13. **Clicking a bar.** Display-only this slice. Navigation is **View all** → History → Game Results.

14. **Who sees it.** Signed-in User’s own Home only.

Defaults locked from existing patterns:

- Outcome mapping stays `matchOutcome` + viewer slot (already on History rows).
- Sort key stays History’s newest-first list; the card reverses the current window for left-to-right oldest-first bars.
- No schema migration.
- No new charting library: CSS capsule bars.
- Dark card chrome follows You Level / Group standing (`bg-primary text-primary-foreground`), not a new Card variant unless one already exists and fits.
- Win/loss chroma is success green / destructive red as in the mock, not Volt Lime (lime stays the scarce action accent). This is an explicit exception to sports-brand “success unused on App surfaces” because form needs two outcome colours and lime cannot mean both win and Create Game.
- **View all** is not `variant="brand"`.
- Do not clone Home carousel modules under `api/routers/`.
- Do not import a router procedure file from `server/home` or RSC.

## Implementation Decisions

- **Surface:** New Home card beside the existing Level and overall-stats cards. Recreate the mock layout (header, 10 capsule bars, divider, streak + win rate). Do not invent a different composition.

- **Data door:** Reuse the existing protected History query. Home already nests `ratings.me` inside the Level card; nest History inside this card the same way. **Do not** extend `users.home` with a second copy of History inclusion. **Do not** add `users.recentForm`. **Do not** add a twin domain-verb file. Justification: inclusion is already the History door’s rule; a Home-only procedure would fork it; `users.home` remains all-time completed-Match stats plus carousel/standing.

- **Payload:** `RouterOutputs` of the History list. Derive bars, streak, rates, and trend in a pure function colocated with the card (or in the same Home components area). One-caller helper stays next to the card. Do not extract a shared History module unless a second *server* host needs the list; the client query is the shared door.

- **Derivation (conceptual):** History rows are newest first. Current window = first 10. Previous window = next 10. Bars = current window reversed (oldest left). Each bar: outcome, fill ratio from Set games-won differential / 18, Game id unused for navigation this slice. Streak = run of `won` or `lost` from index 0 of the newest-first current window. Win rate and trend as in Assumptions.

- **View all / hub tab:** Link to `/dashboard/games?tab=history`. Games hub reads `tab` on load (`history` | `public` | default `my-games`) and keeps the query in sync when the User changes tabs. Follow the existing Game-home `?tab=results` idea. Do not add a new Match History route.

- **Unchanged doors:** `users.home` stats formulas, carousel helper, ratings sparkline, History list inclusion, Group home History.

- **Invalidation:** Completing a Match already invalidates History. No new cache protocol. Do not require Home to invalidate a new procedure.

- **Schema:** none.

## Testing Decisions

### What a good test is

Assert external behavior: which History rows become which bars, streak copy, win rate, and trend; that hub `?tab=history` selects History; that Home overall stats and carousel do not change. Do not assert Tailwind class strings. Do not add tests whose only purpose is file placement.

### Test seams

Highest seam: signed-in User with past Friendly games sees Recent form on Home that agrees with History; empty History hides the card; View all opens History.

If you implement this spec, you implement these seams:

1. **Inclusion (via History, not a second query):** seated completed past Friendly game → in; waitlisted / unslotted / Organizer-only / live / cancelled / tournament / Americano → out; Soft-archive still in. Do not re-test the History door’s PGLite suite unless you change that door. Assert the Home card consumes History rows rather than `users.home` totals.

2. **Windowing:** 0 rows → no card; 3 rows → 3 bars oldest-left; 10+ → 10 bars from the most recent 10; 15 rows → trend hidden; 20+ → trend vs previous 10.

3. **Outcome / height:** win green **W**, loss red **L**, draw **D** muted; fill ratio uses Set games-won differential / 18; equal-height fake variance is a fail.

4. **Streak:** newest three wins → **3 Wins** + flame; newest two losses → **2 Losses** no flame; newest Draw → **No streak**; Draw in the middle breaks the run.

5. **Win rate:** 7 wins in 10 → **70%**; Draws in the 10 reduce the rate (played, not won); rounding matches overall-stats style (`round`).

6. **Trend:** 7/10 vs previous 5/10 → **↑ 20%** (points); equal rates → muted **0%**; `n < 20` → no trend.

7. **Hub:** `/dashboard/games` defaults to My Games; `?tab=history` opens History; `?tab=public` opens Public; tab changes update the query.

8. **Unchanged:** Home overall stats still all-time completed Matches; carousel still live/needs-results; History cards unchanged.

### Prior art

- History PGLite inclusion and outcome mapping on the History list door
- Home overall stats: completed Matches, `matchOutcome`, Draws played not won
- Home Level card: nested query, local skeleton/ErrorState
- Game home `?tab=results` query helper
- You Level dark card (`bg-primary text-primary-foreground`)
- Sports brand: View all / See all not Volt Lime; no charting library

## Out of Scope

- Replacing or restyling Home overall stats
- Changing Home carousel or Level sparkline
- Friendly tournament / Americano form (including within-Game rank)
- Pagination, sport filters, Community / Group / Team form
- Opponent or public form
- Click-through from a bar to Game Results
- New tRPC procedure or twin `server/<domain>/<verb>.ts`
- Schema / migrations
- Charting libraries
- Push/email after Complete Match
- Changing Match History inclusion or History card layout
- Football pickers or mixing Home overall-stats formats into the 10

## Further Notes

- Domain vocabulary: **User**, **Home**, **Game**, **Match**, **Set**, **Friendly game**, **Friendly tournament**, **Americano**, **Game admit**, **Rated Match**, **Soft-archive**. Do not say “player” for User or “match” for Game. Empty History copy may still say “match history”; form still lists Friendly **Games**.
- Glossary: **Home** added to `CONTEXT.md` as the signed-in User’s landing dashboard. **Recent form** is card chrome, not a glossary entity.
- ADR-0008 (Game parent / Match child) stands. No new ADR: additive Home surface, reversible, inclusion copied from History rather than a new domain split.
- Design mock used in planning: dark card, Recent form / Last 10 games / View all >, capsule W/L bars, divider, Current streak + flame, Win rate + trend. Mock numbers are illustrative.
- Sports brand: dark ranking card is allowed (You Level, Group standing). Home career stats stay light. Outcome green/red is locked from the mock; Volt Lime is not the win fill.
- Risk: History is unbounded; Home will load the same full list as the History tab. Acceptable this slice; a later limit on that door can shrink both.
- Risk: Users who only play Friendly tournament / Americano see overall stats but no Recent form. Intentional until a follow-on spec defines multi-Match form.
- Risk: Games hub tab state is currently React state with no URL. View all is incomplete until ticket 1 lands.

## Implementation tickets

Published to Linear. Frontier is [TEM-154](https://linear.app/temba-app/issue/TEM-154/open-games-hub-history-from-a-tab-query).

1. [TEM-154](https://linear.app/temba-app/issue/TEM-154/open-games-hub-history-from-a-tab-query) Open Games hub History from a tab query — unblocked.
2. [TEM-155](https://linear.app/temba-app/issue/TEM-155/show-recent-form-of-the-last-10-friendly-games-on-home) Show Recent form of the last 10 Friendly games on Home — blocked by TEM-154.
