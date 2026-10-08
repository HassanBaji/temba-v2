# Player profile

Status: approved, ready for tickets. The user answered every open question on 2026-10-08; the answers are in section 5.1. Section 11 lists the questions that are still open, none of which blocks ticket 1.

Tickets: drafted in section 13. Not yet in Linear.

Design reference: [design.md](./design.md), screens 09a–09d. Related: [mobile-and-api-server](../mobile-and-api-server/spec.md) (Phase 6, section 4 design system), [level-band-display](../level-band-display/spec.md), [home-recent-form](../home-recent-form/spec.md), [ADR-0009](../../docs/adr/0009-glicko-2-user-ratings.md).

## 1. Problem

A User can see their own Level, Recent form and All time on You (web) and the Profile tab (mobile). They cannot see anyone else's. When a User looks at a Group's members, a Game's Line-up or a Standing, they see names and a Level band, but they cannot find out how that person plays: how many Matches they have played, whether they are on a run, which side they prefer, or how their last Matches went.

The request: any player's name or avatar opens their profile. The profile shows the last 10 Matches, overall stats, Level, win streaks and Preferred Position.

## 2. Discovery findings

### 2.1 What exists

| Need | Existing piece | Fit |
| --- | --- | --- |
| Own Level card | `ratings.me` → `loadRatingsMe(db, {userId})` (`packages/api/src/routers/ratings/me.ts:79`) | Self only. The loader takes a `userId`. Returns Level, band, Provisional (after idle inflation), `progressPercent`, `nextBand`, `ratedMatchCount`. |
| Own stats | `users.profileStats` → `loadProfileStats` (`packages/api/src/routers/users/profileStats.ts:101`) | Self only. Played, won, lost, sets won and lost, `longestWinStreak` (`:22`, count only, no date), most-played partner. Counts every format, Americano included. |
| Own history | `games.listMyMatchHistory` (`packages/api/src/routers/games/listMyMatchHistory.ts`) | Self only. Excludes Americano (`:55`) and shows one row per Friendly game. |
| Completed Matches loader | `loadCompletedMatchesForUser` (`packages/api/src/stats/completed-matches.ts`) | Shared by `profileStats`, `home` and `ratings`. It has no venue, format, Group, Round, Position, image or sport columns. |
| Per-Match rating change | `rating_events.mu_before` / `mu_after`, unique per (User, Match) (`packages/db/src/schema/ratings.ts:78`) | Gives before → after and the delta. The band before the Match is not stored; `games.byId` reconstructs it with `bandWithHysteresis(after, bandFromLevel(before))` (`packages/api/src/routers/games/byId.ts:511`). |
| Level ladder | `packages/domain/src/level.ts` (0–7, ten stored bands 0.7 wide, hysteresis ±0.10), `level-bands.ts` (display D, D+, C, C+, B, B+, A) | Kept (decision 3). |
| Current streak | `streakFromNewestFirst` (`packages/domain/src/home-recent-form.ts:45`) | Counts the newest outcome's run, wins or losses. |
| Win rate | `winRatePercent` (`packages/domain/src/win-rate.ts`) | Won ÷ played; a draw counts as played. |
| Preferred Position | `user.preferred_position` left / right / either / null (`packages/db/src/schema/user.ts:54`); labels in `packages/domain/src/preferred-position.ts` | Declared. A recorded Position per Match is in `game_team_players.position` (`packages/db/src/schema/game-team-players.ts:17`), which is often null. |
| Game access | `canViewGame` (`packages/api/src/games/access.ts:207`) | Decides "Open game". Public Games are viewable by anyone. |
| Mobile primitives | `apps/mobile/src/primitives/`: `Surface`, `Hatch`, `ResultMark` (with `draw`), `FormSlot`, `Avatar`, `Sheet`, `MountFill`, `MountDraw`, `Text`, `Hairline`, `Screen`, `Section`, `ScreenHeader` | All needed primitives exist. |

### 2.2 What is missing

- No procedure returns another User's Level, stats or history.
- No route on either client shows another User.
- No server rule says who may see another User's data.
- No Venue is tied to a User. The "plays at" subtitle must be derived.
- Best streak has no date.
- Nothing computes the share of Matches a User played on each side.

### 2.3 Where players appear today

None of these link anywhere today.

| Surface | Web | Mobile | Identifier in payload |
| --- | --- | --- | --- |
| Group Members tab | `apps/web/src/components/groups/group-members-tab.tsx` | `apps/mobile/src/groups/members-tab.tsx` | `userId` (`groups.byId`) |
| Group Standing tab | `apps/web/src/components/groups/group-standing-tab.tsx` | `apps/mobile/src/groups/standing-tab.tsx` | `userId` |
| Friendly game Line-up | `apps/web/src/components/games/game-lineup-section.tsx`, `friendly-game-seat-blocks.tsx`, `temba/seat.tsx` | `apps/mobile/src/game-details/lineup-card.tsx` | `seat.userId` (`games.byId`) |
| Friendly tournament teams and Half teams | `tournament-teams-section.tsx`, `tournament-half-teams-panel.tsx` | `apps/mobile/src/tournament/tournament-content.tsx`, `predraw-view.tsx` | `userId` |
| Pool tables, Knockout tree | `tournament-pool-tables-panel.tsx`, `tournament-knockout-tree.tsx` | `apps/mobile/src/tournament/standings-view.tsx`, `knockout-tree.tsx` | Game team with two `userId`s |

The stable identifier is `user.id` (UUID). `user.username` is optional and synced from Clerk, so it is not used.

## 3. Goals

1. Tapping a player on the entry-point surfaces opens their Player profile, on web and on mobile.
2. The Player profile shows: header, Level card, Streaks, Preferred Position, Overall (All time), Last 10 with the three most recent Matches. It matches 09b, minus the items in section 4.
3. A Last 10 screen lists the ten Matches with All / Won / Lost filters (09c). A row opens a Match sheet (09d) with both Game teams, the Set scores, the profile owner's rating change, and "Open game" when the viewer may open that Game.
4. One server rule decides who may see a Player profile. It is tested, and a refused viewer learns nothing, including whether the User exists.
5. Existing procedures and screens are unchanged. Everything new is additive.

## 4. Non-goals

Deferred, not rejected (decision 2):

- Head-to-head with you (partners and opponents).
- Per-Match rating bars under the Level.
- History privacy setting, and the 09e locked state.
- Mutual Groups and Communities line.
- Usual partners.
- Report and block, and the `⋯` overflow menu.
- "Invite to a game" and "Challenge" buttons. Challenge does not exist (mobile spec section 8).

Also out:

- A "This season" scope. Temba has no Season. Stats are All time only (decision 5).
- Handedness, and forehand or backhand copy (decision 11).
- The design's ten-label ladder with 0.5-wide bands and two-decimal Levels (decision 3).
- Adding the numeric Level to Group member rows. 09a shows "B 4.21"; member rows keep today's `LevelCell` (band, or hatched while Provisional).
- Entry points beyond section 7.6. Not linked: Home seat rows, Games hub cards, match history cards, Community members tab, Lookup invite search results.
- Changing You, the mobile Profile tab, `ratings.me`, `users.profileStats` or `games.listMyMatchHistory`.
- Pagination beyond ten Matches.
- Football. The profile reads padel only.

## 5. Decisions

### 5.1 Answered by the user on 2026-10-08

| # | Question | Decision |
| --- | --- | --- |
| 1 | Which App? | Both, in the same ticket set: profile, Last 10, Match sheet and entry-point links. Web routes by user id (`/dashboard/players/[userId]`). Mobile pushes onto the current tab's stack. |
| 2 | Scope | Core 09a–09d only. Section 4 lists what is out. |
| 3 | Level ladder | Keep today's ladder (ADR-0009, seven display labels, one decimal). Rebuild the "X to next" and "% through band" copy on the existing band tables. |
| 4 | Who may view | Any signed-in User who shares a Group or a Game with the person, and the person themselves. One server rule, tested. |
| 5 | Season | All time only. No toggle. |
| 6 | Preferred Position | The label is the declared `user.preferred_position`. The subtitle is the share of Matches played on that side, counting only Matches with a recorded Position. It is hidden below a minimum sample (D6). |
| 7 | Name subtitle | The most-played Venue over recent Matches (D7). Hidden if there is none. |
| 8 | Americano | Every format counts in the profile's Last 10 and stats. Existing procedures stay unchanged; the difference is recorded in D11. |
| 9 | Rating deltas | One decimal everywhere. |
| 10 | Tapping yourself | Opens the same Player profile. |
| 11 | Handedness | Dropped. |
| 12 | Best streak | The count plus the month it was reached. |

### 5.2 Design decisions

**D1. Visibility rule.** A viewer V may see the Player profile of User P when any of these holds:

- (a) V is P.
- (b) Some Group has a current `group_members` row for both V and P. Club Groups in a Soft-archived Community still count, because Soft-archive keeps history visible to members.
- (c) Some Game has a `game_players` row for both V and P. Any Game counts: past, future or cancelled. Users who left or were kicked have no row, so they no longer share that Game.

Every other case is refused with `NOT_FOUND`, and so is an unknown `userId`. A refused viewer cannot tell "does not exist" from "not shared". `canViewGame` uses the same pattern.

The rule lives in the procedure file as the exported function `mayViewPlayer(db, { viewerId, playerId })`, because one endpoint uses it (`.cursor/rules/api-one-endpoint-per-file.mdc`). It moves to a shared module only if a second endpoint needs it.

Not counted: being waitlisted on the same Game, being an Organizer who is not a Group member and not seated, sharing only a Community, sharing only a Team, and seeing someone on a public Game you have not joined. Section 11 Q1 asks whether Organizers should count.

**D2. One procedure, additive.** Add `users.playerProfile({ userId })` in `packages/api/src/routers/users/playerProfile.ts`, mounted in `users/index.ts`. It returns everything 09b, 09c and 09d need, including the ten Match rows in full detail. The Last 10 screen and the Match sheet read the same cached query, so there is no second endpoint and no extra round trip. It returns numbers, ids and dates, never copy. No existing procedure path or output changes.

Output shape. Field names are indicative; the implementer may rename before the first release:

```text
player:        { id, name, image, isViewer }
venue:         { name } | null                       // D7
rating:        null | { level, levelBand, provisional, ratedMatchCount,
                        ratedMatchesRemaining, levelValue }   // levelValue: continuous Level, for D4 copy
trend:         { levelChange } | null                // D5
streaks:       { current, best, bestReachedAt }      // D8
position:      { declared: "left"|"right"|"either"|null,
                 recordedCount, leftCount, rightCount }       // D6
overall:       { played, won, lost, drawn, setsWon, setsPlayed }   // D9
lastMatches:   Array<{                               // newest first, at most 10
  matchId, gameId, playedAt, outcome: "won"|"lost"|"draw",
  game: { name, format, groupName, roundNumber, knockoutRound, venueName },
  ownerSlot: 1|2,
  slot1: Player[], slot2: Player[],                  // Player = { userId, name, image, levelBand|null, level|null, provisional }
  sets: { slot1GamesWon, slot2GamesWon }[],          // scored Sets only, in order
  rating: { levelBefore, levelAfter, bandBefore, bandAfter, levelChange } | null,
  canOpenGame: boolean                               // canViewGame(viewer, game)
}>
```

**D3. Which Matches count.** A Match counts for P when all of these hold:

- its status is `completed`
- its Game is not cancelled
- its Game's sport is padel
- P sat on one of its two Game teams

This is the Match set `loadCompletedMatchesForUser` uses today, plus the padel filter. Every format counts: Friendly game, Americano, and Friendly tournament Pool and Knockout Matches. Walkovers are `cancelled` Matches, so they never count. Order is newest first by `matches.start_time`, falling back to the Game's list time, then `created_at`. That is the existing `displayTime` rule.

The procedure owns its query. It needs venue, format, Group, Round, Position, image and sport columns that the shared loader does not select. Overall and streaks reuse the pure `summarizeCompletedMatchStats` and `matchOutcome` from `@repo/domain`. The shared loader is not widened, because three callers use it.

**D4. Level card copy on today's ladder.** A new pure function, `playerLevelCardView` in `@repo/domain/player-profile-level`, takes the continuous Level, the stored band, Provisional and the counts.

| State | Badge | Line | Fill |
| --- | --- | --- | --- |
| No Rating | Hatched, "No Level yet" | none | none |
| Provisional | Display band + Level, Provisional mark | Existing `confirmationProgressCaption`: "N of about M rated games to confirm" | Confirmation fraction (existing `confirmationFraction`) |
| Confirmed, below A | Display band + Level | Two lines: "Confirmed, N rated matches" and "0.3 to B+ · 42% through B" | % through the display band |
| Confirmed, A | "A" + Level | "Confirmed, N rated matches" and "Top Level band" | 100% |

- **Display band span.** The span runs from the lower bound of the first stored band that maps to the display label to the upper bound of the last. For example, B covers B3 and B2, which is 4.20–5.60. Both bounds come from the existing `BAND_LOWER_HUNDREDTHS` and `BAND_UPPER_HUNDREDTHS` and the `STORED_TO_DISPLAY` map.
- **"% through"** = (Level − span lower) ÷ span width, clamped to 0–100 and rounded. Hysteresis can keep the stored band while Level sits just outside the span, which is why it is clamped.
- **"X to <next>"** = (lower bound of the next distinct display rung + 0.10 hysteresis) − Level. It is rounded to one decimal, with a minimum of 0.1. This is the Level at which the band actually changes, so the number never reads 0.0 while the label still has not moved. `nextDistinctDisplayRung` gives the rung.
- Level, and every number in the card, shows one decimal (`formatLevel`).
- The Rating is read the way `ratings.me` reads it: the padel row, then `youRatingViewAfterIdle`, so Provisional matches what the owner sees.

**D5. Trend.** The Level card shows "Last 10: +0.2". This is the sum of the D10 deltas over the rated Matches in `lastMatches`. Because each delta is a difference of formatted Levels, the sum equals formatted after-last minus formatted before-first. It is hidden when no Match in the Last 10 is rated. This is the design's trend figure, not the per-Match bars, which are out of scope.

**D6. Preferred Position card.**

- **Label**, from `user.preferred_position`: "Left side", "Right side" or "Either side". These reuse the existing labels in `preferred-position.ts`; the design's "Both sides" becomes the glossary's Either. With no answer, the label is "No preference set".
- **Played side.** Among counted Matches (D3, All time) where P's `game_team_players.position` is not null, count left and right.
- **Subtitle**, shown only when at least **5** such Matches exist. Five matches `RATED_MATCHES_TO_CONFIRM` and keeps one or two Matches from reading as a habit.
  - Declared left or right: "Played left in 72% of matches".
  - Declared Either, or no answer: "Left 55%, right 45% of matches".
- **Court diagram.** Near half split left and right, far half plain paper with a hairline.
  - Declared side: that side filled ink.
  - Either: both sides filled.
  - No answer: near half hatched, meaning "not yet". The far half is not hatched: the design hatches it, but Hatch means "not yet" in the locked design system, and the far half is not that.

**D7. Venue subtitle.** The header subtitle reads "Padel, plays at <Venue>". The Venue is the most frequent one across the **10** most recent counted Matches (the same rows as `lastMatches`). Ties go to the Venue of the more recent Match. It shows only when that Venue holds at least **2** of those Matches; otherwise the subtitle is "Padel". A User with no counted Matches reads "Padel".

**D8. Streaks.** A **Win streak** is consecutive won Matches in D3 order. A loss or a draw ends it. This matches `longestWinStreak` today.

- **Current streak:** the Win streak that ends at the newest counted Match.
  - Copy: "4 wins in a row" with four won `ResultMark`s, capped at 10 marks.
  - When the newest Match is not a win: "No current streak". Losing runs are not shown on another User's profile.
- **Best streak:** the longest Win streak All time, and `bestReachedAt`, the `displayTime` of the Match that completed it.
  - Ties go to the more recent streak.
  - Copy: "7 wins" plus "March 2026" (month and year in `Asia/Bahrain`). When it is the current streak, the copy is the same.
  - None: "—".

The streak calculations go in `@repo/domain/win-streak` (`currentWinStreak`, `bestWinStreak`). `users.profileStats` switches its private `longestWinStreak` to `bestWinStreak(...).count` in the same ticket, so two server callers share one rule. Its existing test proves the output is unchanged.

**D9. Overall.** Heading "Overall", scope label "All time". Four tiles:

| Tile | Value |
| --- | --- |
| Matches | played (draws included) |
| Won | won |
| Win rate | `winRatePercent(won, played)`, "—" when 0 played |
| Sets won | setsWon ÷ setsPlayed, rounded, "—" when 0. A drawn Set counts as played, matching the win-rate rule. setsPlayed counts scored Sets (`setWinsForGames` non-null). |

**D10. Match rows and the Match sheet.**

- **Opponents and partner:** "vs Sofia L & Adam R" and "with Jonas B" (short names via `shortPlayerName`). In an Americano, the partner is that Match's partner.
- **Kind label** (`playerMatchKindLabel` in `@repo/domain/player-profile-matches`):
  - Friendly tournament Pool Match: "<Game name or Friendly tournament>, Round N".
  - Knockout Match: "<Game name or Friendly tournament>, <Knockout round name>". The name comes from the existing Knockout naming in `@repo/domain`.
  - Americano: "Americano".
  - Friendly game in a Group: the Group name.
  - Friendly game without a Group: "Friendly game".
- **Date:** "Thu 2 Oct" in `Asia/Bahrain`.
- **Set scores:** in order, from the owner's side ("6–4  6–3"). On the sheet, each set chip is ink for the team that won it and `wash` for the team that lost it. A drawn Set is `wash` for both.
- **Rating change:**
  - `levelChange` is round(formatLevel(after) − formatLevel(before)) to one decimal, the same as `games.byId`. Copy: "+0.1", "−0.1" or "0.0".
  - Sheet line: "<Name>'s rating  C+ 3.9 → B 4.2". The band before is reconstructed as in `games.byId`.
  - A Match with no rating event for the owner shows no delta and no rating line.
- **Players on the sheet:** each player shows their **current** Level band and Level, or hatched while Provisional, and links to their Player profile.
- **"Open game ›"** shows only when `canOpenGame`. It opens the Game details screen on mobile and `/dashboard/games/[id]` on web.

**D11. Accepted difference from the owner's own screens.** The Player profile counts Americano and padel only, with one row per Match. You and the mobile Profile tab use `games.listMyMatchHistory` for Recent form, which excludes Americano and shows one row per Friendly game. So a User who opens their own Player profile can see a different Last 10 from their own Form card. All time can also differ if legacy football Matches exist. This is accepted (decision 8): existing procedures are not changed.

**D12. Last 10 strip order.** The same order as Home Recent form: newest on the left, labelled "Latest", with the oldest Match's date on the right end. Fewer than ten Matches leave hatched empty slots, as Recent form does. The header reads "7 won, 3 lost", plus ", 1 drawn" when there are draws.

**D13. Last 10 screen filters.** "All 10", "Won 7" and "Lost 3", with counts from the data. When fewer than ten Matches exist, the first chip reads "All N". Draws appear under All only. An empty filter reads "No games here." Filtering happens on the client from the cached query.

**D14. Routes.**

- **Web:** `/dashboard/players/[userId]` and `/dashboard/players/[userId]/matches`. The sheet opens from `?match=<matchId>`, so a recent row on the profile links straight to the open sheet. `dashboard-paths.ts` gains the titles "Player" and "Last 10 games" and the back targets (profile → previous page, matches → profile).
- **Mobile:** each tab stack gets `players/[userId]/index.tsx` and `players/[userId]/matches.tsx`. The tabs are `(home)`, `games`, `groups`, `communities` and `profile`. Each is a one-line re-export of a screen in `apps/mobile/src/player-profile/`. A `playerPath(segments, userId)` helper builds the path inside the current tab, so the tab bar does not switch and Back returns to the entry point. The Match sheet opens from a `match` route param.

**D15. Refused and error states.**

- **`NOT_FOUND`:** "This profile isn't available", with "You can see people you share a Group or a Game with." and a Back button.
- **Network errors:** the existing error pattern on each client.
- **A User with no Matches:** Level card per D4, Streaks "—", Overall zeros with "—" rates, and Last 10 reads "No games yet." with ten hatched slots and no "See all" button.

## 6. Edge cases

| # | Case | Handling |
| --- | --- | --- |
| E1 | Viewer opens their own profile | Allowed (D1a). Same view. `isViewer` lets the header read the name, not "You". |
| E2 | Viewer and P share only a Community | Refused. Community members tab is not an entry point. |
| E3 | Viewer is waitlisted on P's Game | Refused unless (b) or (c) holds. Section 11 Q1. |
| E4 | Viewer previews a Public Group they are not in | Member and Standing rows are not linked (7.6). A direct URL is refused unless another link exists. |
| E5 | Viewer browses a public Game they have not joined | Line-up seats are not linked (7.6). |
| E6 | P left the shared Group, and they never shared a Game | Refused from then on. |
| E7 | P was kicked from the only shared Game | Refused (no `game_players` row). |
| E8 | Soft-archived Community | Club Group membership still counts (D1b). Its Games still list in Last 10. `canOpenGame` follows `canViewGame`. |
| E9 | Match in Last 10 is from a Game the viewer cannot open | Row and sheet show, "Open game" is hidden. Accepted: names, Venue and score of a Match the viewer did not join become visible to anyone allowed to see P. |
| E10 | Draw | Counts as played, shows a draw mark, ends a Win streak, and appears under All only. |
| E11 | Match with Sets but no rating event (legacy, unrated) | Counted, with no delta and no rating line. |
| E12 | P has a Rating but no counted Matches (self-declared) | Level card shows Provisional. Everything else is empty (D15). |
| E13 | Americano Match | Counted. Partner is that Match's partner. Position counts if recorded. |
| E14 | P has no image | Initials avatar (existing `Avatar` / `initials`). |
| E15 | Hysteresis keeps band B3 at Level 4.15 | "% through B" clamps to 0. "X to B+" is measured from the actual change point (D4). |
| E16 | `userId` is not a UUID | Input validation error (zod `uuid()`), same as other procedures. |

## 7. Server and client design

### 7.1 Schema

None. Every field is read from existing tables.

### 7.2 Procedure

`packages/api/src/routers/users/playerProfile.ts` exports:

- `mayViewPlayer`
- `loadPlayerProfile(db, { viewerId, playerId, now? })`
- `playerProfile = protectedProcedure.input(z.object({ userId: z.string().uuid() })).query(...)`, which calls `resolveAppUser` and then the loader

Reads, roughly:

1. The visibility check: two `EXISTS` queries.
2. The user row.
3. The padel Rating.
4. The counted Matches with Game, Venue, Group, Sets, both Game teams' players with Position and image.
5. P's `rating_events` for the ten newest Matches.
6. The current padel Ratings of every player on those ten Matches.
7. `canViewGame` for each distinct Game among the ten.

### 7.3 `@repo/domain` (clients use these, so they qualify)

| Module | Exports |
| --- | --- |
| `player-profile-level.ts` | `playerLevelCardView`, `displayBandSpan` |
| `win-streak.ts` | `currentWinStreak`, `bestWinStreak` (server) |
| `player-profile.ts` | `playerHeaderSubtitle`, `streaksView`, `playedSideView`, `overallView`, `lastTenSummary` |
| `player-profile-matches.ts` | `playerMatchKindLabel`, `playerMatchRowView`, `levelChangeLabel`, `filterLastTen` |
| `player-profile-fixtures.ts` | Shared fixtures for every state in section 6, used by both clients' tests |

The server's Venue choice (D7) and played-side counts (D6) are computed in the procedure file. They have one caller.

### 7.4 Mobile (`apps/mobile/src/player-profile/`)

- **Header** is the screen's single `Surface tone="ink"`: Back, Avatar 64, name, subtitle, and the Level card as a `raised` tile on ink. Every other card is `paper` with a hairline.
- **Motion:** one mount animation, `MountFill` on the Level progress bar. The second allowance is unused. Reduce-motion renders the final state.
- **Primitives:** `ResultMark` for won, lost and draw marks. `FormSlot` / hatched slots for empty Last 10 slots. `Sheet` for 09d. `Text` for all type. Colors, spacing and radii only from `@repo/design-tokens`; the design's `#E6E6E6` and `#F4F4F4` are `rule` and `wash`. No shadows.
- **Touch targets:** at least 44 pt, including every player row and chip.
- **Accessibility:** Hatch is hidden from the screen reader, and text carries the meaning. Rows read like "Won against Sofia L and Adam R, Thursday 2 October, 6–4 6–3, rating up 0.1".
- **Refresh:** pull to refresh. Refetch on foreground (`refetchOnWindowFocus: "always"`, as the Profile tab does).

### 7.5 Web (`apps/web/src/components/players/`)

- Pages under `apps/web/src/app/dashboard/players/[userId]/`.
- Same section order as mobile. The ink header uses the web `Surface` wrapper.
- The sheet uses the existing drawer and dialog pattern of `friendly-game-join-sheet.tsx`.
- Layout follows `/dashboard/you` (`max-w-[1000px]`, 26 px section gap).

### 7.6 Entry points

The viewer's own row links too (decision 10).

| Surface | Linked when | Target |
| --- | --- | --- |
| Group Members tab | The viewer is a Group member (`groups.byId` `membership` non-null) | Each member row |
| Group Standing tab | Same | Each row |
| Friendly game Line-up | The viewer holds a seat on the Game, or is a member of the Game's Group | Each occupied seat (avatar and name). Empty seats keep their join behaviour. |
| Friendly tournament teams and Half teams lists | Same | Each player name |
| Pool tables and Knockout tree | Same | Tapping a Game team cell opens a small sheet listing its two players, each linking to their profile (ticket 6) |
| Match sheet (09d) | Always, since the viewer can already see P | Each player row |

Where the client cannot know, the server rule still decides, and D15 handles a refusal.

## 8. Domain docs

### 8.1 Proposed `CONTEXT.md` additions (applied in ticket 1)

**Player profile**:
A read-only page about one User: their padel Level, Win streaks, Preferred Position, All time stats and Last 10. Visible to that User and to every User who shares a Group or a Game with them. Distinct from You, which is the signed-in User's own page with settings.
_Avoid_: public profile, player card, user page

**Last 10**:
A User's ten most recent completed padel Matches, across every Game format. Newest first. Walkovers are not Matches with a result and never appear.
_Avoid_: recent games, history (when you mean this fixed window), Recent form (that is Home's strip, which excludes Americano)

**Win streak**:
Consecutive won Matches in time order. A loss or a draw ends it. The current Win streak ends at the newest Match; the best is the longest ever.
_Avoid_: form, run, streak (bare, when a losing run is meant)

**Played side**:
The share of a User's Matches with a recorded Position that they played on the left or on the right. Derived, never declared. Distinct from Preferred Position.
_Avoid_: Preferred Position (that is declared), backhand side, forehand side

Also add "Both sides" to the _Avoid_ list of **Preferred Position**.

### 8.2 ADR

None needed. The visibility rule is a product rule recorded here and in the glossary. If report and block or a privacy setting later widen it, that spec writes the ADR.

## 9. Testing

- **`mayViewPlayer`** (PGlite):
  - self
  - shared Group
  - shared Club Group in a Soft-archived Community
  - shared Game, current and cancelled
  - only a Community
  - only a Team
  - waitlisted only
  - left the Group
  - kicked from the Game
  - unknown id
  - non-member viewer of a public Game
- **`loadPlayerProfile`** (PGlite):
  - refused returns `NOT_FOUND` for both unknown and unshared
  - all formats counted, including Americano
  - cancelled Game and Walkover excluded
  - football excluded
  - ordering and the ten-row cap
  - draw handling
  - rating delta and before/after band
  - unrated Match
  - Venue rule (D7) with tie and below-minimum cases
  - played-side counts ignoring null Positions
  - streaks with `bestReachedAt` and tie
  - `canOpenGame` true and false
  - other players' current Level
- **`profileStats`:** its existing test stays green after the switch to `bestWinStreak`.
- **Domain unit tests:** every row of the D4 table, including hysteresis at a boundary and the A band. D6 with 4 and 5 recorded Matches. D8, D9, D10 labels per format. D12 and D13 counts. Fixtures cover section 6.
- **Clients:** the mobile model tests (`*-model.test.ts` pattern) and the web lib tests for the path helpers and the "linked when" rules in 7.6.
- **Manual:** an iPhone pass and a side-by-side against web at 390 px (Phase 6 verify step).

## 10. Risks

- **Query cost.** One request reads all counted Matches for P to compute All time and streaks, plus up to ten `canViewGame` checks. That is fine at today's sizes, and `profileStats` already does the same full read. If it grows, cap the streak scan or cache later.
- **Different numbers on two self screens (D11).** A User may ask why their Player profile and You disagree. Mitigation: it only happens with Americano or legacy football Matches, and copy names the section "Last 10", not "Recent form".
- **Visibility leaks through history (E9).** Anyone allowed to see P sees P's opponents, partners, Venues and scores, including from private Groups the viewer is not in. This follows decision 4. The deferred privacy setting addresses it.
- **The You card already mixes two spans.** Its "N% of the way to B+" uses progress through the stored band but names the next display rung. The Player profile uses the display band span (D4). The two cards may show different percentages for the same Level. Section 11 Q3 suggests aligning You later.
- **Expo Router per-tab routes.** Ten thin route files and a segment-based path helper. Risk of a wrong tab on deep pushes. The `playerPath` helper is unit-tested.
- **Additive-only API.** The mobile App is not released yet, so field names can still change before Phase 7. After release, `playerProfile` output can only grow.

## 11. Open questions

None blocks ticket 1.

1. **Should Organizers count as sharing a Game?** Recommend yes later: an Organizer of a Club Group Game who is a Community Admin, but not a Group member and not seated, sees the Line-up and cannot open the profiles. Kept strict (D1) until the user says otherwise.
2. **Should the Pool tables and Knockout tree link (ticket 6)?** Recommend yes, with the two-player sheet. Ticket 6 can be dropped without affecting 1–5.
3. **Should You switch to the display-band-span copy from D4?** Recommend yes, as a separate follow-up, so both cards agree.

## 12. Domain doc changes shipping with this spec

- `CONTEXT.md`: the terms in 8.1. Not applied yet; ticket 1 applies them.
- No ADR.

## 13. Tickets (draft, not yet in Linear)

Implement in order. Ticket 1 blocks all others. Tickets 2 and 3 depend on 1. Ticket 4 depends on 3. Tickets 5 and 6 depend on 1. Ticket 6 depends on 5's link rule. No ticket changes the schema. Each ticket ships both clients.

| # | Title | Blocked by |
| --- | --- | --- |
| 1 | Open a Group member's Player profile with header, Level card and Overall | none |
| 2 | Streaks and Preferred Position on the Player profile | 1 |
| 3 | Last 10 strip and the three most recent Matches on the Player profile | 1 |
| 4 | Last 10 screen with filters and the Match sheet | 3 |
| 5 | Open Player profiles from Group Standing and Game Line-ups | 1 |
| 6 | Open Player profiles from Pool tables and the Knockout tree | 5 |

### Ticket 1: Open a Group member's Player profile with header, Level card and Overall

**What to build.**
- `users.playerProfile` with `mayViewPlayer` (D1), the counted-Match query (D3), and these fields: `player`, `venue` (D7), `rating` (D4), `overall` (D9).
- Domain: `player-profile-level.ts` (D4), and `player-profile.ts` with `playerHeaderSubtitle` and `overallView`, plus fixtures.
- Mobile: the screen with the ink header, Level card (`MountFill`) and Overall. Per-tab routes and `playerPath` (D14). The refused, empty and error states (D15). Member rows on the Members tab link (7.6).
- Web: `/dashboard/players/[userId]` with the same sections and states, `dashboard-paths.ts` titles and back targets, and member rows linking.
- The `CONTEXT.md` additions (8.1).

**Acceptance criteria.**
- A Group member taps any member row, including their own, on web or mobile and lands on that User's Player profile in the same tab stack. Back returns to the Members tab.
- A non-member previewing a Public Group sees unlinked rows.
- The header shows avatar, name and "Padel, plays at <Venue>" per D7, or "Padel".
- The Level card renders every D4 state from fixtures and live data, with one-decimal numbers, "X to <next>" and "% through <band>" per D4. Provisional matches what the owner sees on You.
- Overall shows Matches, Won, Win rate and Sets won per D9, All time, Americano included, football and Walkovers excluded.
- `NOT_FOUND` for an unshared or unknown User renders the D15 refused state on both clients. The `mayViewPlayer` cases in section 9 pass.
- Mobile uses one ink Surface and one mount animation, which is skipped under reduce-motion. It has no raw colors or shadows, 44 pt targets, and the lint config passes.
- `users.profileStats`, `ratings.me` and `games.listMyMatchHistory` outputs are unchanged.
- `pnpm exec turbo run typecheck lint test` passes.

**Files.**
- `packages/api/src/routers/users/playerProfile.ts`, `playerProfile.test.ts`, `index.ts`
- `packages/domain/src/player-profile-level.ts`, `player-profile.ts`, `player-profile-fixtures.ts` (+ tests)
- `apps/mobile/src/player-profile/*` (screen, view, model, header, level card, overall card, `player-path.ts`)
- `apps/mobile/app/(app)/{(home),games,groups,communities,profile}/players/[userId]/index.tsx`
- `apps/mobile/src/groups/members-tab.tsx`, `group-home-screen.tsx`
- `apps/web/src/app/dashboard/players/[userId]/page.tsx`
- `apps/web/src/components/players/*`
- `apps/web/src/components/groups/group-members-tab.tsx`
- `apps/web/src/lib/dashboard-paths.ts` (+ test)
- `CONTEXT.md`

### Ticket 2: Streaks and Preferred Position on the Player profile

**What to build.**
- `@repo/domain/win-streak` (D8), with `users.profileStats` switched to `bestWinStreak`.
- `playerProfile` gains `streaks` and `position` (D6, D8).
- Domain: `streaksView` and `playedSideView`.
- The Streaks card and the Preferred Position card with the court diagram, on both clients.

**Acceptance criteria.**
- Current streak reads "N wins in a row" with N won marks, at most 10, or "No current streak" when the newest Match is a loss or a draw.
- Best streak reads "N wins" and the month and year it was reached in `Asia/Bahrain`, or "—". Ties pick the more recent streak.
- The Preferred Position label follows the declared value, including "Either side" and "No preference set".
- The played-side subtitle appears only with at least 5 Matches with a recorded Position, and its wording follows D6.
- The court diagram fills the declared side, both sides for Either, and hatches the near half when unset. The far half is never hatched.
- The `users.profileStats` test passes unchanged.

**Files.**
- `packages/domain/src/win-streak.ts` (+ test), `player-profile.ts` (+ test), `player-profile-fixtures.ts`
- `packages/api/src/routers/users/playerProfile.ts` (+ test), `profileStats.ts`
- `apps/mobile/src/player-profile/` (streaks card, position card)
- `apps/web/src/components/players/` (same)

### Ticket 3: Last 10 strip and the three most recent Matches on the Player profile

**What to build.**
- `playerProfile` gains `lastMatches` (D2, D10) with rating deltas, kind fields, players with current Levels, and `canOpenGame`, plus `trend` (D5).
- Domain: `player-profile-matches.ts` with `playerMatchKindLabel`, `playerMatchRowView`, `levelChangeLabel` and `lastTenSummary`.
- On both clients: the "Last 10 games" heading with the record, the ten-mark strip (D12), the three most recent rows, the trend on the Level card, and "See all N games ›" linking to the Last 10 screen. Until ticket 4 lands, the screen can be a stub route.

**Acceptance criteria.**
- The strip shows up to ten marks, newest left, using won, lost and draw marks, with hatched empty slots and the end labels per D12.
- The record line counts won, lost and drawn correctly.
- The three rows show opponents, date, kind label per D10 for every format (Friendly game in a Group, Friendly game, Pool Round, Knockout round, Americano), Set scores from the owner's side, and a one-decimal delta. Unrated Matches show no delta.
- The trend shows per D5, and is hidden when no Match is rated.
- A User with no Matches sees "No games yet." and no "See all" button.

**Files.**
- `packages/api/src/routers/users/playerProfile.ts` (+ test)
- `packages/domain/src/player-profile-matches.ts` (+ test), fixtures
- `apps/mobile/src/player-profile/` (last-ten card, match row)
- `apps/web/src/components/players/` (same)

### Ticket 4: Last 10 screen with filters and the Match sheet

**What to build.**
- Domain: `filterLastTen`.
- The Last 10 screen (09c) on both clients: web `/dashboard/players/[userId]/matches`, and the mobile per-tab `players/[userId]/matches.tsx` routes. Filter chips (D13), rows with partner and Venue, and the selected row tinted `wash`.
- The Match sheet (09d): kind title, date and Venue, a Won / Lost / Draw badge, both Game teams with avatar, name and current Level, Set chips, the rating line, and "Open game ›" when `canOpenGame`.
- Player rows in the sheet link to Player profiles.
- Profile rows from ticket 3 open this screen with that Match's sheet open (`?match=` on web, the `match` param on mobile).

**Acceptance criteria.**
- The chips show live counts. Draws appear under All only. An empty filter reads "No games here."
- Tapping a row opens the sheet. Closing it keeps the filter and scroll position.
- "Open game" is shown only when `canViewGame` would allow it, and opens the Game details screen (mobile) or `/dashboard/games/[id]` (web).
- The rating line shows before → after with bands and a one-decimal delta, and is absent for unrated Matches.
- Tapping a player in the sheet opens their Player profile. If refused, the D15 state shows.
- The mobile sheet uses the `Sheet` primitive with a scrim and a hairline, with no shadow. The web sheet follows the existing drawer pattern.

**Files.**
- `packages/domain/src/player-profile-matches.ts` (+ test)
- `apps/mobile/src/player-profile/` (matches screen, match sheet)
- `apps/mobile/app/(app)/{(home),games,groups,communities,profile}/players/[userId]/matches.tsx`
- `apps/web/src/app/dashboard/players/[userId]/matches/page.tsx`
- `apps/web/src/components/players/`
- `apps/web/src/lib/dashboard-paths.ts`

### Ticket 5: Open Player profiles from Group Standing and Game Line-ups

**What to build.**
- Links per 7.6 on both clients: Group Standing rows, Friendly game Line-up seats, and Friendly tournament teams and Half teams lists.
- The "linked when" rule as a small pure client helper per App, with tests.

**Acceptance criteria.**
- A Group member taps a Standing row and lands on that User's Player profile.
- A seated player or Group member taps an occupied seat or a tournament player name and lands on that User's Player profile.
- A viewer who is neither (public browser, waitlisted, Organizer outside the Group) sees no links.
- Empty seats, the seat picker, Kick and Organizer actions behave exactly as before.

**Files.**
- `apps/mobile/src/groups/standing-tab.tsx`
- `apps/mobile/src/game-details/lineup-card.tsx`, `details-screen.tsx`
- `apps/mobile/src/tournament/tournament-content.tsx`, `predraw-view.tsx`
- `apps/web/src/components/groups/group-standing-tab.tsx`
- `apps/web/src/components/games/game-lineup-section.tsx`, `friendly-game-seat-blocks.tsx`, `tournament-teams-section.tsx`, `tournament-half-teams-panel.tsx`
- `apps/web/src/components/temba/seat.tsx`

### Ticket 6: Open Player profiles from Pool tables and the Knockout tree

**What to build.**
- On both clients, tapping a Game team cell in a Pool table or the Knockout tree opens a small sheet listing that Game team's players. Each player links to their Player profile. It follows the same "linked when" rule as ticket 5.

**Acceptance criteria.**
- The sheet lists both players with avatar and name. Tapping one opens their profile in the current tab stack.
- Bye and empty cells are not tappable.
- Existing Organizer actions on the tree (Walkover, draw) are unchanged.
- Targets are at least 44 pt.

**Files.**
- `apps/mobile/src/tournament/standings-view.tsx`, `knockout-tree.tsx`
- `apps/web/src/components/games/tournament-pool-tables-panel.tsx`, `tournament-knockout-tree.tsx`

## Comments

_None yet._
