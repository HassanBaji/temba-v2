# Rating redesign: Group Tier, Temba Level and a reserved Official Rank

Status: draft for the owner's review, 2026-11-11. The owner's eight answers (U1 to U8, section 5.1) are binding. Section 20 lists eleven defaults taken without an answer; each can be overturned before its ticket starts. Decisions are in `decisions.md`; tickets in `tickets.md` and in Linear as TEM-439 to TEM-469 (project "Rankings: Group Elo & Tiers"). `CONTEXT.md` is unchanged; section 4 lists what the tickets will change. ADR-0065 to ADR-0073 are drafts.

Design: the owner's "Temba ratings" overview diagram and "Ratings" prototype, in `.scratch/design/ratings/` (`overview.webp`, `Ratings.html`, and their text in `screens.md`). Screens are cited by id (1a to 5c). Their copy is the source of truth for screens and states; where it conflicts with the glossary, `decisions.md` records the call. The numbers on the screens are illustrative.

Builds on `.scratch/user-ratings/spec.md`, `.scratch/set-level/spec.md`, `.scratch/verified-groups/spec.md` and `.scratch/football/spec.md`. Supersedes `.scratch/profile-and-group-levels/spec.md` for padel Group Levels.

Audited at `d62e6841` on `claude/awesome-einstein-wzl2vk`.

## 1. Problem

Temba has one rating idea, a **Level**, and uses it for three different questions.

- "How good am I?" A Glicko-2 Rating per User and sport, shown as a band letter. It moves only on padel.
- "Where am I in my group?" For padel, a second Glicko-2 Rating per Group (Group Level, ADR-0053), shown with the same letters as the first. Players cannot tell the two apart.
- "What have I won?" Nothing answers this.

Football has none of it. A football Level is the word a player picked at sign-up; no Match moves it, a football Group has no Level column, and Make teams balances on that self-placed word.

The owner wants three ladders that never share a shape, different per sport, each fed by a different kind of Game: **Tier is your group. Level is you. Rank is earned.**

## 2. Discovery: current behaviour

- **Temba Level.** `ratings` and `rating_events` (`packages/db/src/schema/ratings.ts`), one row per User and sport. Glicko-2 in `packages/domain/src/glicko2.ts`; Level 0 to 7 from μ in `level.ts` (`muFromLevel`, ten stored bands of 0.7, `PROVISIONAL_PHI_THRESHOLD = 200`, `RATED_MATCHES_TO_CONFIRM = 5`); display letters in `level-bands.ts`.
- **One writer.** `runMatchCompletionEffect` (`packages/api/src/games/run-match-completion-effect.ts`) calls `applyRatedMatch` (`packages/api/src/ratings/apply-rated-match.ts`), which needs exactly two Users per side, so it can only rate padel doubles. Weight is 1 for a Club Group, 0.5 otherwise. In `rateDoublesMatch` each player faces the mean of the opposing pair; the partner is ignored.
- **Group Level.** `group_ratings`, `group_rating_events`, `group_level_overrides` (`group-ratings.ts`), written by `apply-group-rated-match.ts`, read by `ratings.myGroupLevels`, set by `ratings.setGroupLevel` (Group owner and Appointed Organizers, any sport).
- **Rating scope.** `ratingFlagsAtCreate` (`packages/domain/src/game-rating-scope.ts`) gives only a padel Game on a Group a scope: `temba` on a Verified Group, `group` otherwise. `create-friendly.ts` hard-codes `rated: false` for football and `isPublic: false` for every Friendly game.
- **Football.** Score is one Set; Scorers are in `match_goals`; Football role and position are on `game_players`. No minutes or substitutions are recorded (ADR-0040). `balanceFootballSides` (`football-lineup.ts`) orders players by Level band; it runs on the client from `games.footballBoard`.
- **Confirmation.** `matchResultFullyConfirmed` (`packages/api/src/games/match-result-confirmations.ts`): every seated account holder on padel, one per side on football and drawn tournaments, and an Organizer's confirmation is final (ADR-0044). A Friendly Match has no clock; the ten-minute "score stands" job is for drawn tournaments only.
- **Reversal.** `reportWrongScore` restores before-values only when no seated User has a later Rated Match (`wrong-score-reversal.ts`). A football Group Game cannot be reopened at all, because it has no rating event to reverse.
- **Manual changes.** `level_overrides` with five reasons, written by `applyLevelOverride`. Doors: `ratings.setLevel` (Level setter, shared Group, padel only), `ratings.setLevelAsOperator` (any User, either sport).
- **MVP.** `games.mvp_mode` (`vote`, `organizer`, `none`), settled by the `marks.settle-mvp` job inside the 48-hour Marks window. It never touches a Rating. No 1 to 10 rating of players exists.
- **Standing.** Derived on every read (`packages/api/src/standing/load-group-standing.ts`), 3/1/0, per Group and Season, Rated and Unrated Games alike (ADR-0045).
- **Public Games.** `games.is_public` already opens the join gate to anyone inside the Level range (`userPassesJoinGate` in `packages/api/src/games/access.ts`), and `games.listPublicPickup` already lists them. Only `games.createTournament` can set it, and no screen calls the list since the Public tab was hidden (ADR-0014).
- **Venues.** No stored fact separates a partner Venue from any Venue an Operator listed. `venue_managers` is the per-Venue role precedent (ADR-0025).
- **Clients.** Level faces are view-models in `@repo/domain` (`home-level.ts`, `profile-level.ts`, `player-profile-page.ts`, `group-home-chrome.ts`), rendered twice: mobile `apps/mobile/src/{home,profile,player-profile,groups}`, web `apps/web/src/components/{home,you,players,groups}`. `groupShowsLevel` hides the Level column on football Groups. The console has no rating UI.

## 3. Solution in one paragraph

Three ladders. **Group Tier** is football only and lives in a Group that is not Verified: each member holds **Tier points** that move after every Group Game by the result and, if the Group's Organizers turn it on, by a 1 to 10 **Performance rating**; the member's place in the Group gives a **Tier band**, shown as a fish (Shark, Hamour, Kanaad, Safi). Organizers can adjust points with a reason the player sees, and Make teams balances on them. **Temba Level** is one number per player and sport, moved only by Games that count for it: Games on a Verified Group, Challenge Games, and a new **Public Game** at a partner Venue that both sides confirm within 24 hours. Football reads it as **OVR 40 to 99**, moved by the result (40%), Performance ratings (30%), goals (20%) and MVP (10%); padel reads it as **1.0 to 7.0** and now weighs the partner. A **Verifier** at a Venue can calibrate a Level and stamp a Match. Every move and every manual change, with who and why, is in the player's **Rating history**. **Official Rank** is reserved: its slot is on the Ratings screen and its design is a later spec. One Game feeds exactly one ladder, and nothing a Group does can move a Level.

## 4. Glossary additions and edits (to land in `CONTEXT.md` with the tickets)

New terms:

- **Group Tier**: a football Group member's strength inside one Group that is not Verified: Tier points, a place and a Tier band. Moved by that Group's Games and its Organizers. Never moves a Level and is never moved by one.
  _Avoid_: group level, group rating, local level, badge.
- **Tier points**: the number behind a Group Tier. Starts at 1,200, moves once per Match by a result part and a performance part, and an Organizer may adjust it. Carries across Seasons.
  _Avoid_: Elo, group Elo, rating points, Standing points.
- **Tier band**: Shark, Hamour, Kanaad or Safi, shown as a fish. A place, not a threshold: the Shark is #1, Hamour the next 15% of ranked members, Kanaad the next 35%, Safi the rest.
  _Avoid_: badge, rank, Level band, league.
- **Tier adjustment**: an Organizer's manual change to a member's Tier points, with a required reason and an optional note, shown to the player at once. Ends a Provisional tier.
  _Avoid_: override (that is a Level's), penalty, reset.
- **Performance rating**: a 1 to 10 score one seated account holder gives another after a football Match; 6 is an ordinary game. Never to yourself; hidden until the Rating window closes.
  _Avoid_: player rating (bare), Mark, score, vote (that is the MVP's).
- **Rating window**: the 24 hours after a football Match completes in which Performance ratings are given. The Tier points or Level move is written when it closes.
  _Avoid_: voting period, Marks window.
- **Rating settings**: a tier Group's choice of who gives Performance ratings (Off, Organizer rates, Everyone rates), how much they count (20, 30 or 50%) and whether an Organizer counts double. Set by the Group's Organizers; applies from the next Game.
  _Avoid_: group rules, scoring settings.
- **OVR**: the football face of a Level, 40 to 99, shown as a whole number.
  _Avoid_: overall (in copy), football rating.
- **Public Game**: a Friendly game with no Group at a partner Venue that anyone inside its Game Level range may join. Counts for Temba Level once one player from each side confirms within 24 hours.
  _Avoid_: open game, pickup, verified game.
- **Partner Venue**: a Venue an Operator marked as a partner (`venues.partner_at`). Only a partner Venue hosts Public Games.
  _Avoid_: verified venue, published venue, club.
- **Verifier**: a User an Operator granted on one Venue as club staff, referee or coach. May calibrate a Level and stamp a Match there.
  _Avoid_: admin, Level setter, coach (the unused `coach` tables), referee as a role name.
- **Verifier stamp**: a Verifier's mark on a Match at their Venue. A final confirmation by a neutral party, shown as "Stamped by". Optional.
  _Avoid_: verified match, approval.
- **Match dispute**: a seated player's claim that a Match that counted for Temba Level is wrong. An Operator upholds or dismisses it.
  _Avoid_: report a wrong score (that is the Organizer's door), appeal.
- **Rating history**: the list of everything that moved a User's Level or Group Tier, newest first. Manual changes carry who and why.
  _Avoid_: activity, audit log, feed.
- **Official Rank** (reserved): what a football Team or a padel player has won in official tournaments and divisions. A later spec; only its slot on the Ratings screen exists.
  _Avoid_: Standing, Level, ranking (for a Standing).

Edited terms:

- **Level**: add "product copy says Temba Level; the padel face is 1.0 to 7.0, the football face is OVR".
- **Rating**: add "a football Rating moves by the OVR step, and its φ only carries Provisional".
- **Provisional**: per ladder. A Level is Provisional by φ (football: until five counting Matches). A Group Tier is Provisional for five Group Games or until an Organizer adjusts it.
- **Level override**: adds the Verifier ("calibrated" in copy), a required reason and an optional note.
- **Rating scope**: `group` now means "moves Tier points" (football on a Group that is not Verified). Copy: "Counts for group tier".
- **Rated Match**, **Unrated Game**, **Game**, **Friendly game**, **Booking Game**, **Challenge Game**: football can count; a Public Game is the third groupless kind; a padel Game on a Group that is not Verified is Unrated.
- **Verified Group**: drop "count for a Group Level only".
- **Match result confirmation**: add the Public Game rule and the Verifier stamp.
- **Scorer**: drop "not a rating input".
- **MVP**, **Marks window**: the MVP closes with the Rating window when the Match has one.
- **Standing**: "never a Level, a Level band, a Rating or a Group Tier".
- **Organizer**, **Group approver**: add the Tier adjustment and Rating settings doors.
- **Group Level**, **Group Level override**: marked retired.
- **Football self-placement**: states the OVR each choice starts at.
- **Team Level**: a football Team shows the OVR mean.

Avoid-list edits: under Giver group, "tier" becomes "tier (that is a Group Tier)". Under Rating, Level, Level band and Standing, "rank" becomes "rank (reserved for Official Rank)". "Elo", "admin", "division" and "man of the match" stay avoided. Copy may say "verified match" for a Match that counts for Temba Level; the entity stays Rated Match.

## 5. Decisions

### 5.1 Answered by the owner (2026-11-11)

| # | Answer |
| --- | --- |
| U1 | This step delivers the spec, ADRs and tickets. No product code. |
| U2 | Padel Group Level is retired. Padel Groups keep only Standing; old rows stay for history. |
| U3 | No new Group role. The design's "admin" is the Group owner and every Appointed Organizer. |
| U4 | Official Rank is a later phase with its own spec. Only its slot is reserved. |
| U5 | A football Game on a Verified Group moves the Temba Level only. Verified Groups have no Group Tier. |
| U6 | Tier points carry across Seasons. Standing is what restarts. |
| U7 | Public Games at a partner Venue are in scope, with both sides confirming within 24 hours and an optional Verifier stamp. |
| U8 | Tickets are published to Linear when the spec is written. |

### 5.2 Design decisions

D1 to D30 are in `decisions.md`, each marked "ADR: yes/no".

## 6. Actors

- **Player**: a seated User. Gives Performance ratings, confirms scores, reads their Rating history, may dispute a counted Match.
- **Organizer**: the Group owner or an Appointed Organizer (`mayOrganizeGroupGames`). Adjusts Tier points, sets Rating settings, rates in Organizer mode, sees the ratings summary.
- **Public Game creator**: any User. The Game's Organizer for edits; their score confirmation is not final.
- **Verifier**: per Venue, granted by an Operator.
- **Level setter**: unchanged (Clerk flag, shared Group, padel only).
- **Operator**: marks partner Venues, grants Verifiers, sets any Level, decides disputes.

## 7. Domain model and schema

Migrations start at `0095`. Names follow the existing schema files.

### 7.1 Which ladder a Game feeds

Fixed at create, as today (ADR-0035). `games.rated` keeps meaning "moves the Temba Level". `games.group_rated` now means "moves Tier points".

| Game | Padel | Football |
| --- | --- | --- |
| On a Group that is not Verified | Unrated | `group`: Tier points |
| On a Verified Group | `temba` | `temba` (OVR) |
| Public Game | `temba` | `temba` (OVR) |
| Challenge Game | `temba` (as today) | `temba` (OVR) |
| Booking Game, any other groupless Game | Unrated | Unrated |

The creator's Rated or Unrated choice stays and is offered on football too. A **tier Group** is a football Group that is not Verified (`groupHasTier`). If a tier Group becomes Verified, its new Games count for Temba Level, its Tier points stop moving and stay in Rating history, and Members switches from fish to OVR.

### 7.2 Group Tier

```text
tier_band        enum: safi | kanaad | hamour | shark
tier_event_kind  enum: game | adjustment | band_change

group_tier_points            unique (group_id, user_id)
  group_id, user_id          on delete cascade
  points          integer not null default 1200
  games_counted   integer not null default 0
  confirmed_at    timestamp null     -- set by a Tier adjustment
  band            tier_band null     -- stored only to detect a change
  created_at, updated_at

group_tier_events            unique (user_id, match_id) where kind = 'game'
  group_id, user_id, kind, match_id null
  result_delta, performance_delta, delta, points_before, points_after   integer
  rating_hundredths, usual_hundredths   integer null
  expected_score  double precision null
  band_before, band_after  tier_band null
  place_after, ranked_count  integer null
  set_by_user_id null, reason level_override_reason null, note varchar(140) null
  created_at
```

A row is created by a member's first tier Game or first Tier adjustment. Leaving or being removed from the Group deletes the points row and keeps the events.

### 7.3 Performance ratings

```text
performance_rating_mode  enum: off | organizer | everyone

groups  + performance_rating_mode     not null default 'off'
        + performance_weight_percent  integer not null default 30   -- 20, 30 or 50
        + organizer_counts_double     boolean not null default false

performance_ratings          unique (match_id, rater_user_id, ratee_user_id)
  value smallint (1..10), rater <> ratee, created_at, updated_at

match_rating_windows         one per Match; settings snapshot at completion
  match_id pk, closes_at, settled_at null, suspended_at null
  mode, weight_percent, organizer_counts_double, counts_for_level boolean

performance_rating_results   unique (match_id, user_id)
  rating_hundredths, ballots_counted, game_average_hundredths
```

### 7.4 Temba Level

- `rating_events` gains nullable `result_part`, `performance_part`, `goals_part`, `mvp_part` (double precision, in OVR points). Padel rows leave them null.
- `level_overrides` gains `note varchar(280) null` and `set_by_role` enum (`level_setter | operator | verifier`), backfilled from `group_id` (null is operator).
- No change to `ratings`. OVR is a face of the stored μ, so no row is rewritten.

### 7.5 Public Games, Verifier, disputes

```text
venues   + partner_at timestamp null, partner_by uuid null
matches  + stood_unconfirmed_at timestamp null   -- completed without the other side; never rates

venue_verifier_kind  enum: club_staff | referee | coach
venue_verifiers          unique (venue_id, user_id)
  kind, granted_by_user_id, created_at
match_verifier_stamps    match_id pk, verifier_user_id, venue_id, created_at
match_dispute_status     enum: open | upheld | dismissed | superseded
match_disputes           match_id, raised_by_user_id, note varchar(280),
                         status, decided_by_user_id null, decided_at null, created_at
```

### 7.6 Retired, kept in place

`group_ratings`, `group_rating_events` and `group_level_overrides` stop being written and are kept. `merge-into-account.ts` keeps moving them and gains every new table that carries a `user_id`.

## 8. Algorithms and constants

All constants are starting values, fitted to roughly reproduce the prototype's own numbers, and tunable without a schema change. Pure modules in `packages/domain/src`, each with a Vitest file beside it.

### 8.1 Tier points (`tier-points.ts`)

| Constant | Value |
| --- | --- |
| `TIER_POINTS_START` | 1200 |
| `TIER_K` / `TIER_K_PROVISIONAL` | 32 / 48 |
| `TIER_SCALE` | 400 |
| `TIER_PROVISIONAL_GAMES` | 5 |
| `TIER_ADJUST_MAX_STEP` | 400 |

- Expected score `E = 1 / (1 + 10^((oppMean − ownMean) / 400))`, on the mean Tier points of each Football side. A player with no row counts as their start hint.
- Result part: `round((1 − w) × K × (S − E))`, S is 1, 0.5 or 0. No goal-margin multiplier.
- Performance part: `round(w × K × P)`, `P = clamp((rating − usual) − gameShift, −1, 1)`, where `gameShift` is the Match's mean of `rating − usual`. A generous rating day therefore nets to about zero.
- `w` is the Group's weight (0.2, 0.3 or 0.5). It is 0 when the mode is Off, when the player has no settled rating, and for the rating Organizer in Organizer mode.
- Check against screen 4c: K 32 and w 0.3 give +12 for a win at E 0.46 and +6 for 7.4 against a usual 6.8.
- `tierStartHint({ ovr, groupMedianPoints, groupMedianOvr })`: the Group's median points plus 10 per OVR point of difference, clamped to the Group's range. Shown as a chip in the adjust sheet; never written without an Organizer.

### 8.2 Tier bands (`tier-bands.ts`)

- Ranked members are those out of Provisional, ordered by points, then games counted, then earlier join.
- `rest = ranked − 1`. Shark is place 1; Hamour is the next `round(0.15 × rest)`; Kanaad the next `round(0.35 × rest)`; Safi the others. With 11 ranked this gives the prototype's 1, 2, 4, 4.
- `TIER_MIN_RANKED = 4`: with fewer ranked members, rows show place and points and no fish.
- `tierTable(members)` returns place, band, Provisional, games of five and points to the next band. `tierAdjustPreview(table, userId, newPoints)` returns the new place and band and who moves the other way; it runs on the client, so screen 2d needs no preview procedure.

### 8.3 Performance ratings (`performance-rating.ts`)

- `RATING_WINDOW_HOURS = 24` from Match completion. In Organizer mode the window closes when the Organizer submits, or after 24 hours with no performance part.
- `settlePerformanceRatings(ballots, raterWeights)`: at least `MIN_BALLOTS = 3` in Everyone mode, or the player has no performance part. Highest and lowest are dropped from five ballots up. Weighted mean; an Organizer counts twice when the setting is on.
- Outlier rater: a mean distance above 2.0 from the settled ratings, in this Match and the rater's previous two, halves that rater's weight. Computed from stored ballots; nobody is ever shown who.
- `usualRating(past) = (3 × 6.0 + sum of the last 10) / (3 + n)`: per Group for the tier, across counting Matches for OVR.
- On a Game that counts for Temba Level, the mode is always Everyone and the weight is OVR's fixed 30%.

### 8.4 Football OVR (`football-ovr.ts`)

- Face: `ovrFromLevel(level) = 40 + 59 × level / 7`, shown as a whole number. The existing bands apply unchanged (5.9 OVR each: C+ is 69.5 to 75.4), so `progressToNextBand` gives "Next band B−, N% of the way".
- Seeds, with no backfill: Beginner 43, Casual 61, Competitive 72, Pro 78.
- Step per counting Match, written once when the Rating window closes: `ΔOVR = K × gameWeight × (0.4 × result + 0.3 × ratings + 0.2 × goals + 0.1 × mvp)`. `OVR_K = 3`, 6 while Provisional. `gameWeight` is today's 1 for a Club Group and 0.5 otherwise, and 1 for a Public Game.

| Part | Score, in −1 to 1 |
| --- | --- |
| Result | `S − E`, E from the two sides' mean OVR on a scale of 20 |
| Player ratings | the same `P` as the tier, "usual" over the player's counting football Matches |
| Goals | own named goals against the Match's mean per player, minus the side's goals conceded against half the Match total, weighted by Football role: keeper 1.0, defender 0.75, midfield 0.4, forward 0.2 |
| MVP | +1 for an MVP decided by vote, `−1 / (n − 1)` for each other player |

- Each part sums to zero across the Match, so the population mean cannot drift. A missing part counts 0 and is not redistributed. OVR is clamped to 40 to 99.
- Check against screen 5a: an even win gives +0.6 from the result part.
- Provisional is count-based and stored in φ so every reader keeps working: `footballPhiAfterMatches(n)` is 150 from five counting Matches and `350 − 30n` before. Idle inflation does not apply to a football Rating.

### 8.5 Padel (`rate-doubles-match.ts`, `level.ts`)

- Partner weighting: each player's opponent becomes `oppMean − DOUBLES_PARTNER_WEIGHT × (partnerMu − ownMu) / 2`, default 1, so both partners share the pair-against-pair expectation and each still moves by their own φ. New Matches only; nothing is replayed.
- Face: `formatPadelLevel(level, decimals)` shows `max(1.0, level)`, two decimals on the Ratings screen and hero, one in dense lists. Stored values, bands and Game Level ranges are unchanged.

## 9. State machines

**Rating window** (per football Match with ratings): `open` at completion; `suspended` while a wrong score is being corrected (ballots kept); back to `open` for a fresh 24 hours at the next completion; `settled` when the job `rating-window.settle` runs at `closes_at`, or on read if the job is late. Settling writes the results, then the tier events or the Level events, then Notifications. A Match with no window (a tier Group in Off mode, any padel Match) writes its move at completion.

**Public Game Match**: `pending` until a score is entered; the enterer is confirmed and a 24-hour job `match.confirm-window` starts. A confirmation from the other side, or a Verifier stamp, completes it and it counts. If the clock runs out it completes with `stood_unconfirmed_at` set: it appears in Match history and never moves a Level. A changed score clears confirmations and restarts the clock.

**Match dispute**: `open` (a seated player, within 7 days of completion, one open dispute per Match) to `upheld` (the Operator's decision runs the wrong-score reversal and the Match returns to `pending`), `dismissed`, or `superseded` (an Organizer reported the wrong score first, so the result it was raised against is gone; the player is told and may dispute the corrected result).

## 10. Permissions

| Action | Who |
| --- | --- |
| Adjust a member's Tier points | An Organizer of the Group, never their own |
| Read a member's Points and history | That member, or an Organizer of the Group |
| Change Rating settings | An Organizer of a tier Group |
| Give Performance ratings | A seated account holder of the Match, in the Group's mode; never to themselves |
| See the ratings summary (4d) | An Organizer of the Game; never who gave what |
| Create a Public Game | Any User, at a partner Venue |
| Confirm a Public Game's score | One seated account holder per side; the creator's confirmation is not final |
| Mark a Venue as a partner, grant a Verifier | Operator |
| Calibrate a Level | A Verifier, for a User who played at that Venue or belongs to one of its Club Groups; never their own |
| Stamp a Match | A Verifier of the Match's Venue who is not seated in it |
| Set a Level | Level setter and Operator, as today |
| Dispute a Match | A seated player of a Match that counted for Temba Level |
| Decide a dispute | Operator |
| Edit an Official Rank | Nobody |

## 11. API

One endpoint per file, additive only, no renamed paths.

New procedures:

- `groups.adjustTierPoints`, `groups.tierHistory`, `groups.ratingSettings`, `groups.updateRatingSettings`, `groups.myStandings`
- `games.performanceRatingSheet`, `games.submitPerformanceRatings`, `games.performanceRatingResult`, `games.performanceRatingSummary`
- `games.stampMatch`, `games.disputeMatchResult`, `games.listDisputesForOperator`, `games.decideDispute`
- `ratings.myGroupTiers`, `ratings.history`, `ratings.setLevelAsVerifier`
- `venues.setPartner`, `venues.addVerifier`, `venues.removeVerifier`, `venues.listVerifiers`

Additive fields:

- `groups.byId`: `hasTier`, `members[].tier`, `tierSummary`, `ratingSettingsLine`
- `games.footballBoard`: `players[].balanceStrength`, `players[].tier`, `players[].ovr`
- `games.byId`: `ratingWindow`, `levelImpact.parts`, `matches[].stamp`, `matches[].stoodUnconfirmed`, `confirmWindow`
- `games.create`: honours `isPublic` for a groupless Friendly game at a partner Venue
- `ratings.me`: `face`, `ovr`, `changeOverLast`
- `ratings.setLevelAsOperator`, `ratings.setLevel`: optional `ovr` (Operator only) and `note`
- `users.playerProfile`: `viewerMayCalibrate`

Unchanged path, changed behaviour: `ratings.setGroupLevel` refuses with `PRECONDITION_FAILED`. `ratings.myGroupLevels` stays and loses its callers. `games.listPublicPickup` gets callers again.

Server modules: `packages/api/src/ratings/apply-tier-match.ts`, `apply-football-level-match.ts`, `settle-rating-window.ts`; jobs `rating-window.settle` and `match.confirm-window` in `packages/api/src/jobs/`.

## 12. Clients

Both Apps render the same `@repo/domain` view-models. The console is untouched; Operator pages are on the web App.

| Screen | Where | View-model |
| --- | --- | --- |
| 1a, 1b Ratings | new screen opened from the You page hero: mobile `profile/`, web `components/you/` | `ratings-screen.ts` (new) |
| 1c Rating history | from the Ratings screen | `rating-history.ts` (new) |
| 2a Standing | `groups/standing-tab.tsx`, `group-standing-tab.tsx` | `season-standing.ts` (footnote only) |
| 2b Members | `groups/members-tab.tsx`, `group-members-tab.tsx` | `tier-bands.ts`, `group-members-table.ts` |
| 2c, 2d Manage, Adjust | `groups/member-sheet.tsx` and a new sheet; web `MemberActionsMenu` and a dialog | `tier-bands.ts` |
| 2e Points and history | new screen from the member sheet | `rating-history.ts` |
| 3a, 3b Rating settings | `groups/group-menu-sheet.tsx`, `group-home-overflow-menu.tsx` and a new screen | `group-rating-settings.ts` (new) |
| 4a to 4d Rate the game | `game-details/` on both Apps | `performance-rating.ts` |
| 5a What moved your OVR | `game-details/rating-impact-card.tsx`, `game-rating-impact-block.tsx` | `game-rating-impact.ts` |
| 5b, 5c Official Rank | reserved slot only | none |
| Public tab | Games hub on both Apps | `games-hub-tab.ts`, `hub-game-row.ts` |

Mobile design rules hold: black and white, roles from `useColors()`, hairlines. A Provisional tier is a `Hatch` slot; a Provisional Level keeps its hatched track; the reserved Official Rank slot is hatched ("not yet"). The Level ring and number are the one ink `Surface` on the Ratings screen. The four fish are monochrome glyphs kept as path data in `@repo/design-tokens`, taken from the prototype.

## 13. Notifications

New types: `tier_points_adjusted` (who and the reason), `tier_band_changed` (once per player per write), `performance_ratings_open`, `performance_ratings_closed`, `match_dispute_raised` (to Operators), `match_dispute_decided`. Reused: `level_set` for a Verifier calibration, `match_score_to_confirm` for a Public Game's other side.

## 14. i18n

Every string in `en/` and `ar/`. New catalog file `rating.ts` (tier, bands, adjust, history, settings, performance, OVR parts, Public Game, Verifier, dispute), with surface-only strings in the existing `mobile-*` and `web-*` files. Counts go through `plural()`. Fish names in Arabic are proposed as قرش، هامور، كنعد، صافي for the owner to confirm. Copy says "organizer" for the design's "admin" and "MVP" for "man of the match".

## 15. Migration of existing behaviour

- `ratingFlagsAtCreate` follows the table in 7.1. `create-friendly.ts` stops hard-coding `rated: false` on football and `isPublic: false`.
- One data migration sets `group_rated = false` on padel Games with no completed Match, so upcoming Games stop reading "Counts for group rating". Completed padel Games keep their rows and label.
- `applyRatedMatch` stops calling `applyGroupRatedMatch`. Reversing an old padel Match still restores its Group Level rows.
- Wrong-score reversal: padel is unchanged. Tier and OVR events are additive, so reversal subtracts the event's delta, deletes it and recomputes bands and φ; it is never blocked by a later Match. This also lets an Organizer reopen a football Group Game, which is impossible today.
- A football Group Level an Organizer set earlier feeds `tierStartHint` and is not copied. Tier points start the day RR-1 ships; nothing is replayed.
- Football Level range: allowed on Games that count for Temba Level, stored in tenths as today and shown in OVR.
- The Mobile App is not released (Phase 7 not started), so every change above lands before the additive-only rule starts to bite; they are additive anyway.

## 16. Testing

- Pure modules: unit tests beside each. Property tests that the tier result part and every OVR part sum to zero across a Match; band counts for 4 to 30 ranked members; the prototype's worked numbers as fixtures.
- Procedures: through the plain exported function on PGlite (`@repo/db/testing`), extending `group-rated-match.test-support.ts`. Reversal tests for a tier event, an OVR event and a suspended window.
- Seed: a tier Group "Thursday Football" matching screens 2a to 2e, a Verified football Group, a partner Venue with a Public Game, a Verifier.

## 17. Documentation the tickets will change

`CONTEXT.md` (section 4) and ADR-0065 to ADR-0073, each landing with its first ticket. `tickets.md` has the table.

## 18. Non-goals

- Official Rank: official tournaments, ranking points, football divisions, Temba seasons, promotion and relegation.
- A Group admin role, a per-Group Level for padel, or fish on padel or on Verified Groups.
- Replaying past Matches into any ladder.
- Minutes played, substitutions or goal times.
- A Verifier stamp that changes a Match's weight.
- Cross-Group or Temba-wide leaderboards of Level or tier.
- Console changes, Android-specific work, push notifications.

## 19. Risks

- **R1 Inflation.** The tier result part is not exactly zero-sum when sides differ in size or mix Provisional K, and adjustments add points. Mitigation: property tests, the adjust clamp, and bands being places, which makes absolute drift harmless.
- **R2 Small Groups.** One adjustment can change several fish in a Group of six. Mitigation: `TIER_MIN_RANKED`, one Notification per player per write.
- **R3 Collusion and retaliation.** A side can rate itself up; in Organizer mode one person decides up to half of everyone's move. Mitigation: trimming, hiding, the outlier weight, and the fact that tier Groups cannot move a Level.
- **R4 A Level on thin confirmation.** On a Verified Group a football Level can move on one Organizer's confirmation (ADR-0044). Mitigation: disputes, and the stricter rule on Public and Challenge Games.
- **R5 Scorer gaming.** Any player can rewrite Scorers without re-confirmation today. RR-14 makes a changed Scorer list clear confirmations before goals feed OVR.
- **R6 Two rating models in one table.** Padel is Glicko-2, football is additive. A reader that assumes φ or σ semantics for football would be wrong; the football writer owns φ.
- **R7 Strangers in Public Games.** No-shows and sandbagging. Mitigation: the Level range gate that already exists, and Provisional players' larger K.
- **R8 Vocabulary.** "tier", "rank" and "verified" are on Avoid lists today; until section 4 lands, agents will revert the copy. The glossary edit is in the first ticket of each phase.

## 20. Open questions, with the default taken

Each default is in force unless the owner says otherwise.

1. **Padel on a Group that is not Verified is Unrated.** Follows from U2.
2. **A Verified football Group shows OVR where a tier Group shows fish**, and a tier Group that becomes Verified freezes its Tier points.
3. **A football Challenge Game counts for Temba Level**, with one confirmation from each Team.
4. **Public Game rules**: any User creates one; a partner Venue is an Operator-set fact; one player per side confirms within 24 hours, otherwise the score stands and moves nothing; it counts at weight 1.
5. **Verifier**: a per-Venue role an Operator grants. The stamp is a final confirmation and changes no weight. Level setter stays.
6. **The padel floor of 1.0 is display only.**
7. **Goals without minutes**: own named goals, and the side's whole-Match goals conceded by Football role.
8. **One clock**: moves land when the 24-hour Rating window closes and the MVP vote closes with it on those Matches. Marks stay at 48 hours.
9. **Small Groups**: fish appear once four members are out of Provisional.
10. **Vocabulary**: "organizer" for "admin", "tier points" for "group Elo", "MVP" for "man of the match"; the Arabic fish names in section 14.
11. **Starting constants** as in section 8.

## Comments
