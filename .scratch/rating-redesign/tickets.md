# Rating redesign: implementation tickets

Status: draft 2026-11-11 (Linear ids in the table at the end). Spec: `.scratch/rating-redesign/spec.md`. Decisions: `decisions.md`. Screens: `.scratch/design/ratings/screens.md`, cited by id.

Every ticket is a vertical slice: schema, procedure files, domain, both Apps (web and mobile), i18n in `en/` and `ar/`, tests, seed where it helps a hand walk. Each ships green on `pnpm exec turbo run typecheck lint test`. Binding rules for every ticket: one endpoint per file (`.cursor/rules/api-one-endpoint-per-file.mdc`), no thin assemblers, additive API, no renamed procedure paths, every string from `@repo/i18n`, `@repo/domain` stays pure, a new migration per schema change, mobile follows the locked design rules (black and white, `Hatch` means "not yet", one ink `Surface` per screen). Copy says "organizer" where the design says "admin", and "MVP" where it says "man of the match" (decisions D1, D2). Constants are in spec section 8 and are tunable.

Phases, each shipping something a player can see:

| Phase | Ships | Tickets |
| --- | --- | --- |
| A | Football Group Tier | RR-1 to RR-6 |
| B | Performance ratings | RR-7 to RR-11 |
| C | Football Temba Level (OVR) | RR-12 to RR-17 |
| D | Padel Level face, partner, Group Level retired | RR-18 to RR-20 |
| E | Public Games at a partner Venue | RR-21 to RR-24 |
| F | Verifier and disputes | RR-25 to RR-27 |
| G | Ratings screen and Rating history | RR-28 to RR-31 |

Order and blocking:

```text
RR-1 ─▶ RR-2 ─▶ RR-8 ─▶ RR-9 ─▶ RR-10 ─▶ RR-11
 │       │               └────▶ RR-14
 ├─▶ RR-3 ─▶ RR-4 ─▶ RR-29 ─▶ RR-30
 ├─▶ RR-5 ─▶ RR-17
 ├─▶ RR-6
 ├─▶ RR-7 ─▶ RR-8
 └─▶ RR-20 ─▶ RR-28 ─▶ RR-31

RR-12 ─▶ RR-13 ─▶ RR-14, RR-15, RR-24, RR-27     (RR-13 also needs RR-2)
 ├─▶ RR-16 ─▶ RR-25 ─▶ RR-26                     (RR-29 also needs RR-16)
 ├─▶ RR-17
 └─▶ RR-28                                       (RR-28 also needs RR-18)

RR-18        RR-19        RR-21 ─▶ RR-22 ─▶ RR-23 ─▶ RR-24
```

---

# Phase A: football Group Tier

## RR-1. A football Game on a Group that is not Verified moves Tier points, and Members shows fish and points

**Outcome.** After a football Group Game completes in a Group that is not Verified, each player's Tier points move on the result, and the Members tab shows fish, points, the Shark card and Provisional rows (screen 2b) on both Apps.

**What to build**
- Migration: enums `tier_band`, `tier_event_kind`; tables `group_tier_points`, `group_tier_events` (spec 7.2). Add both to `merge-into-account.ts`.
- `@repo/domain/tier-points` (`tierMatchDeltas`, `tierExpectedScore`, constants) and `@repo/domain/tier-bands` (`tierTable`, `tierAdjustPreview`, `TIER_MIN_RANKED`), with a property test that the result part sums to zero for equal sides and the band counts for 4 to 30 ranked members.
- `ratingFlagsAtCreate`: football on a Group that is not Verified gives `groupRated: true`; `create-friendly.ts` stops hard-coding `rated: false` for football; the create flow offers the Rated or Unrated choice on football. `groupHasTier` in `@repo/domain`.
- `packages/api/src/ratings/apply-tier-match.ts`: called from `applyRatedMatch` for a football Match with `group_rated`; locks rows in user-id order; writes one `game` event per player (result part only, `w = 0`) and `band_change` events; idempotent per User and Match.
- `groups.byId`: `hasTier`, `members[].tier` (band, place, points, provisional, gamesOfFive; points hidden from other members while Provisional), `tierSummary` (the Shark, ranked and provisional counts).
- Members tab on both Apps for a tier Group: fish glyph, points column, Shark card, hatched Provisional slot, the 2b footnote. Fish glyph path data in `@repo/design-tokens`, taken from the prototype.
- i18n: new catalog `rating.ts` (tier, band names, provisional) in en and ar. Rating scope label "Counts for group tier".
- Seed: a tier Group "Thursday Football" with 13 members matching 2b.
- Docs: `CONTEXT.md` Group Tier, Tier points, Tier band, Provisional, Rating scope, Standing; Avoid-list edits for "tier". ADR-0065, 0066, 0067 land as written.

**Acceptance criteria**
- A completed football Match on a Group that is not Verified writes one tier event per seated account holder and Unclaimed player, with `points_after = points_before + delta`, and no `rating_events` row.
- Completing the same Match twice writes nothing the second time.
- A member with fewer than five counted games and no adjustment has no band and is not counted when places are cut; with 11 ranked members the bands are 1 Shark, 2 Hamour, 4 Kanaad, 4 Safi; with 3 ranked there are no fish.
- A football Game on a Verified Group, a padel Game and an Unrated football Game write no tier event.
- A football Group that is Verified shows no tier on Members.

**Dependencies.** None.

**Files.** `packages/db/src/schema/group-tiers.ts` (new), `packages/domain/src/tier-points.ts`, `tier-bands.ts` (new, +tests), `packages/domain/src/game-rating-scope.ts`, `packages/api/src/ratings/apply-tier-match.ts` (new, +test), `apply-rated-match.ts`, `packages/api/src/games/create-friendly.ts`, `packages/api/src/routers/groups/byId.ts`, `packages/api/src/unclaimed-players/merge-into-account.ts`, `apps/mobile/src/groups/members-tab.tsx`, `apps/web/src/components/groups/group-members-tab.tsx`, `packages/i18n/src/messages/{en,ar}/rating.ts` (new), `packages/api/scripts/seed.ts`.

## RR-2. An Organizer can report a wrong score on a football Group Game, and the tier move is undone

**Outcome.** "Report a wrong score" works on a football Group Game: the Match reopens and every Tier points move from it is taken back.

**What to build**
- `wrongScoreReversalEligibility`: a completed football Match with tier events is eligible, and is never blocked by later Matches.
- `reportWrongScore`: for tier events, subtract each delta, delete the events, recompute bands for the Group and write `band_change` events. A later Tier adjustment is left alone.
- Both Apps: the existing wrong-score action appears on a football Group Game.

**Acceptance criteria**
- After a reversal each player's points equal their points before the Match plus everything that happened after it.
- A reversal with three later tier Games for the same players succeeds.
- Padel reversal behaves exactly as before (existing tests pass unchanged).
- Bands are recomputed and a player whose fish changed gets one `band_change` event.

**Dependencies.** RR-1.

**Files.** `packages/api/src/games/wrong-score-reversal.ts`, `packages/api/src/routers/games/reportWrongScore.ts` (+test), `packages/api/src/ratings/apply-tier-match.ts`.

## RR-3. An Organizer adjusts a member's Tier points with a reason the player sees

**Outcome.** Screens 2c and 2d: from Members, Manage, a player, an Organizer moves their Tier points, sees the new place and fish live and who moves the other way, picks a reason and saves; the player is told at once.

**What to build**
- `groups.adjustTierPoints({ groupId, userId, points, reason, note? })`: `mayOrganizeGroupGames`, never yourself, a tier Group only, at most 400 from the current points, reason from `level_override_reason`, note up to 140. Writes an `adjustment` event, sets `confirmed_at`, recomputes bands.
- Notification `tier_points_adjusted` naming the Organizer and the reason; `tier_band_changed` once per affected player.
- Adjust sheet on both Apps using `tierAdjustPreview` on the client: steps of 10 and 50, "into Hamour" and "into Safi" jumps, the live place and band, the sentence about who moves, five reason chips, optional note. "Adjust rating" row in the member menu (2c).
- i18n in `rating.ts` and the notification catalog.
- Docs: `CONTEXT.md` Tier adjustment, Organizer, Group approver. ADR-0073 lands as written (tier half).

**Acceptance criteria**
- A member who is not an Organizer is refused; an Organizer adjusting themselves is refused; a missing reason is refused.
- Adjusting a Provisional member makes them ranked.
- Moving a Kanaad above the second Hamour makes them Hamour and the passed player Kanaad, and both get one Notification.
- The preview's place and band equal what the server stores.

**Dependencies.** RR-1.

**Files.** `packages/api/src/routers/groups/adjustTierPoints.ts` (new, +test), `packages/db/src/schema/notifications.ts`, `apps/mobile/src/groups/member-sheet.tsx` and a new adjust sheet, `apps/web/src/components/groups/group-members-tab.tsx` and a new dialog.

## RR-4. Points and history shows what moved a member's Tier points

**Outcome.** Screen 2e: a member, and any Organizer of the Group, sees the member's last moves game by game, manual changes included, with who and why.

**What to build**
- `groups.tierHistory({ groupId, userId, cursor? })`: the member themself or an Organizer.
- `@repo/domain/rating-history`: the entry union and the tier rows' copy ("Won 5–3, rated 8.1", "Result +10, performance +9", "Set by an organizer").
- Screen on both Apps: header with band, place, points and points to the next band; "What moved it" list. "Points and history" row in the member menu.
- Removing or leaving a Group deletes the points row and keeps the events.

**Acceptance criteria**
- A member cannot read another member's history; an Organizer can.
- An adjustment row shows the Organizer's name, the reason and the note.
- After removal and re-joining, the member starts with no points row and their old events are still listed.

**Dependencies.** RR-3.

**Files.** `packages/api/src/routers/groups/tierHistory.ts` (new, +test), `packages/domain/src/rating-history.ts` (new, +test), `packages/api/src/routers/groups/removePlayer.ts`, `leave.ts`, new screens under `apps/mobile/src/groups/` and `apps/web/src/components/groups/`.

## RR-5. Make teams balances on Tier points, with the Temba Level as the hint

**Outcome.** In a tier Group, "Make teams" balances the two Football sides on Tier points, and each side header shows its mean.

**What to build**
- `BalanceCandidate` gains `strength: number | null`; `balanceFootballSides` orders by it, falling back to `levelBand` when null. `footballBalanceStrength({ tierPoints, tierProvisional, ovrHint })`.
- `tierStartHint` in `tier-points.ts`; shown as a chip in the adjust sheet ("Suggested from Temba Level").
- `games.footballBoard`: `players[].balanceStrength`, `players[].tier`.
- Make teams on both Apps: fish beside each player in a tier Group, side mean in the header.

**Acceptance criteria**
- With eight ranked members the two sides' mean points differ by less than a random split's on a fixed fixture; keepers are still dealt first.
- A Provisional member is placed by the hint, not by 1,200.
- A groupless football Game and a Verified Group still balance (by Level band until RR-17).
- The parity test `football-lineup-parity.test.ts` passes.

**Dependencies.** RR-1.

**Files.** `packages/domain/src/football-lineup.ts`, `football-board.ts`, `tier-points.ts`, `packages/api/src/routers/games/footballBoard.ts`, `apps/mobile/src/football/`, `apps/web/src/components/games/football-make-teams.tsx`.

## RR-6. Standing says it is the season and points to Members

**Outcome.** Screen 2a: the Standing tab of a tier Group carries the footnote that it counts this Season's games and that the tier is on Members; members see a read-only line saying how ratings work in the Group.

**What to build**
- `groups.byId`: `ratingSettingsLine` (for now always "Results only").
- Standing tab footnote and link to Members on both Apps; no fish and no Tier points on Standing.
- i18n in `group.ts` / `rating.ts`.

**Acceptance criteria**
- The footnote shows only on a tier Group.
- Standing rows are unchanged for padel and for Verified football Groups.

**Dependencies.** RR-1.

**Files.** `apps/mobile/src/groups/standing-tab.tsx`, `apps/web/src/components/groups/group-standing-tab.tsx`, `packages/api/src/routers/groups/byId.ts`.

---

# Phase B: Performance ratings

## RR-7. Organizers choose a tier Group's Rating settings

**Outcome.** Screens 3a and 3b: a "Rating settings" row in the Group's menu opens a screen where an Organizer picks Off, Organizer rates or Everyone rates, the weight, and "an organizer's rating counts double".

**What to build**
- Migration: enum `performance_rating_mode`; `groups.performance_rating_mode`, `performance_weight_percent`, `organizer_counts_double`.
- `@repo/domain/group-rating-settings` (weights 20, 30, 50; summary line copy).
- `groups.ratingSettings` (Organizers get the settings; members get the summary line) and `groups.updateRatingSettings` (Organizers, tier Group only).
- Screen on both Apps; the row shows the current summary. The Standing line from RR-6 reads the real settings.
- Docs: `CONTEXT.md` Rating settings.

**Acceptance criteria**
- A member is refused on update; a Verified Group and a padel Group are refused.
- A weight other than 20, 30 or 50 is refused.
- Changing settings does not change any Match already completed.

**Dependencies.** RR-1.

**Files.** `packages/db/src/schema/groups.ts`, `packages/domain/src/group-rating-settings.ts` (new, +test), `packages/api/src/routers/groups/ratingSettings.ts`, `updateRatingSettings.ts` (new, +tests), `apps/mobile/src/groups/group-menu-sheet.tsx`, `apps/web/src/components/groups/group-home-overflow-menu.tsx`, new settings screens.

## RR-8. The Organizer rates everyone after a game, and it moves Tier points

**Outcome.** Screen 4a: in Organizer mode the Organizer scores each player 1 to 10 and stars the MVP; on submit everyone's Tier points move by the result and by how they played.

**What to build**
- Migration: `performance_ratings`, `match_rating_windows`, `performance_rating_results` (spec 7.3). Add the user-bearing tables to `merge-into-account.ts`.
- `@repo/domain/performance-rating`: `settlePerformanceRatings`, `usualRating`, window rules.
- At Match completion in a tier Group whose mode is not Off: create the window with a settings snapshot and do not write the tier move yet.
- `games.performanceRatingSheet` and `games.submitPerformanceRatings` (batch upsert). In Organizer mode only an Organizer of the Game may rate; the submit closes the window.
- `packages/api/src/ratings/settle-rating-window.ts`: settles results, then calls `apply-tier-match` with the performance part. Job `rating-window.settle` at `closes_at`, plus a read-time settle when the job is late (the `marks.settle-mvp` pattern). After 24 hours with no submit, the move is the result alone.
- The star sets the MVP through the existing `marks.setMvp`.
- A wrong-score report suspends an open window and keeps the ballots (extends RR-2).
- Notification `performance_ratings_open` to the Organizer.
- Screen 4a on both Apps, in Game details.
- Docs: `CONTEXT.md` Performance rating, Rating window. ADR-0068 lands as written.

**Acceptance criteria**
- With weight 30, a win at expected score 0.46 with a rating of 7.4 against a usual of 6.8 gives result +12 and performance +6.
- The Organizer who rated has `performance_delta = 0`.
- An unrated player moves on the result alone.
- In Off mode nothing changes from RR-1: the move is written at completion and no window exists.
- A rating of 0 or 11, and a rating of yourself, are refused.

**Dependencies.** RR-7, RR-2.

**Files.** `packages/db/src/schema/performance-ratings.ts` (new), `packages/domain/src/performance-rating.ts` (new, +test), `packages/api/src/ratings/settle-rating-window.ts` (new, +test), `packages/api/src/jobs/specs.ts`, `packages/api/src/jobs/handlers/rating-window.settle.ts` (new), `packages/api/src/routers/games/performanceRatingSheet.ts`, `submitPerformanceRatings.ts` (new), `apps/mobile/src/game-details/`, `apps/web/src/components/games/`.

## RR-9. Everyone rates teammates and opponents, hidden for 24 hours

**Outcome.** Screen 4b: in Everyone mode each player rates their teammates and, if they want, opponents; nobody sees who gave what; the window closes after 24 hours.

**What to build**
- Everyone mode in `submitPerformanceRatings`: any seated account holder, editable until the window closes.
- Settle rules: at least three ballots, highest and lowest dropped from five, an Organizer counts double when the setting is on.
- `performanceRatingSheet` returns the caller's own ratings, the closing time and "N of M have rated", never anyone else's values.
- Notification `performance_ratings_open` to every seated account holder.
- Screen 4b on both Apps.

**Acceptance criteria**
- A player with two ballots has no performance part; with five ballots the highest and lowest are ignored.
- With the double setting on, an Organizer's 9 among 6, 6, 7 gives a higher result than with it off.
- A blank rating is not counted as a ballot.
- No procedure returns another player's ballot to a player or an Organizer.

**Dependencies.** RR-8.

**Files.** `packages/api/src/routers/games/submitPerformanceRatings.ts` (+test), `packages/domain/src/performance-rating.ts`, Game details on both Apps.

## RR-10. When the Rating window closes, a player sees their rating and what it did

**Outcome.** Screen 4c: the player's settled rating, how many ratings it came from, the game's average, the result part and the performance part, the new points, place and fish, and the MVP.

**What to build**
- `games.performanceRatingResult({ gameId })` for the caller, once settled.
- Notification `performance_ratings_closed` with the rating and the points move.
- The card on both Apps in Game details, with the fish track and "A group game. It moved your tier points here and nothing else."

**Acceptance criteria**
- Before the window settles the procedure returns the closing time and no rating.
- The two parts shown add up to the stored delta.
- A player with no performance part sees the result part and the reason.

**Dependencies.** RR-9.

**Files.** `packages/api/src/routers/games/performanceRatingResult.ts` (new, +test), `apps/mobile/src/game-details/`, `apps/web/src/components/games/`.

## RR-11. The Organizer sees the summary, and an outlier rater counts for less

**Outcome.** Screen 4d: after the window closes an Organizer sees each player's rating and points move, who changed tier, and whether one rater counted for less, without names.

**What to build**
- Outlier weight in `settlePerformanceRatings`: a mean distance above 2.0 from the settled ratings, in this Match and the rater's previous two, halves the rater's weight.
- `games.performanceRatingSummary({ gameId })`: Organizers of the Game only.
- Screen 4d on both Apps, with the link to Members.

**Acceptance criteria**
- A rater who gave 1s where everyone else gave 6 to 8, three games running, has weight 0.5 in the third.
- The summary says "one rater counted for less" and exposes no rater id.
- A member who is not an Organizer is refused.

**Dependencies.** RR-10.

**Files.** `packages/domain/src/performance-rating.ts`, `packages/api/src/routers/games/performanceRatingSummary.ts` (new, +test), `packages/api/src/ratings/settle-rating-window.ts`.

---

# Phase C: football Temba Level

## RR-12. A football Level reads as OVR everywhere

**Outcome.** Every place that shows a football Level shows OVR 40 to 99 with its band: Home, the You page, Player profile, Team Level, the Operator's Player Levels page, onboarding.

**What to build**
- `@repo/domain/football-ovr`: `ovrFromLevel`, `levelFromOvr`, `ovrFromMu`, `muFromOvr`, `formatOvr`.
- `ratings.me`: `face`, `ovr`. View-models (`home-level.ts`, `profile-level.ts`, `player-profile-page.ts`, `player-profile-football.ts`, `team-level.ts`) take the sport and return the OVR face on football.
- Football hero on both Apps: the ring is the Level, not the win rate; the placement word stays as a caption while no Match has counted.
- i18n: OVR copy in `rating.ts`; football self-placement copy states the starting OVR.
- Docs: `CONTEXT.md` OVR, Level, Football self-placement, Team Level.

**Acceptance criteria**
- A self-placed Beginner, Casual, Competitive and Pro read 43, 61, 72 and 78.
- An OVR of 74 shows band C+ and progress towards B−.
- No padel surface changes.
- No row in `ratings` is written by this ticket.

**Dependencies.** None.

**Files.** `packages/domain/src/football-ovr.ts` (new, +test), `home-level.ts`, `profile-level.ts`, `player-profile-page.ts`, `team-level.ts`, `packages/api/src/routers/ratings/me.ts`, `apps/mobile/src/profile/football-tab.tsx`, `apps/web/src/components/you/football-tab.tsx`, `apps/web/src/app/dashboard/operator/levels/page.tsx`.

## RR-13. A football Game on a Verified Group counts for Temba Level

**Outcome.** A football Game on a Verified Group is tagged "Counts for Temba Level", and when its Match completes each player's OVR moves on the result.

**What to build**
- `ratingFlagsAtCreate`: football on a Verified Group gives `rated: true`. Scope tag and create-flow copy.
- Migration: `rating_events.result_part`, `performance_part`, `goals_part`, `mvp_part`.
- `rateFootballMatch` in `football-ovr.ts` (result part only in this ticket) and `footballPhiAfterMatches`.
- `packages/api/src/ratings/apply-football-level-match.ts`: called from `applyRatedMatch` for a football Match with `rated`; locks rows in user-id order; one event per User and Match; sets φ from the count; skips idle inflation for football.
- Reversal: subtract the event, delete it, recompute φ (the RR-2 rule).
- Football Game Level range: allowed on a Game that counts for Temba Level, shown in OVR.
- Rating impact card on both Apps shows the OVR move.
- Docs: `CONTEXT.md` Rated Match, Unrated Game, Game, Rating, Provisional. ADR-0069 lands as written.

**Acceptance criteria**
- An even win moves a confirmed player by +0.6 OVR at weight 1; the result part sums to zero across the Match.
- A player is Provisional until their fifth counting Match and confirmed after it.
- No tier event is written for this Match, and a tier Group's Match writes no `rating_events` row.
- A reversal with later counting Matches in place returns each player's OVR to what it would have been without this Match.
- A football Game whose creator chose Unrated moves nothing.

**Dependencies.** RR-12, RR-2.

**Files.** `packages/domain/src/football-ovr.ts`, `game-rating-scope.ts`, `game-rating-impact.ts`, `idle.ts`, `packages/db/src/schema/ratings.ts`, `packages/api/src/ratings/apply-football-level-match.ts` (new, +test), `apply-rated-match.ts`, `packages/api/src/games/wrong-score-reversal.ts`, `packages/api/src/routers/games/create.ts`.

## RR-14. Performance ratings, goals and MVP move OVR

**Outcome.** Screen 5a: on a Game that counts for Temba Level everyone can rate, and when the 24-hour window closes OVR moves by four parts, shown as "What moved your OVR".

**What to build**
- A counting football Match always opens a Rating window in Everyone mode; the OVR event is now written when the window settles, with all four parts.
- `rateFootballMatch`: ratings, goals (own named goals; the side's goals conceded by Football role) and MVP parts, each zero-sum.
- The MVP vote closes with the Rating window on these Matches; only an MVP decided by vote counts.
- `saveFootballScore`: a changed Scorer list clears Match result confirmations.
- `games.byId`: `levelImpact.parts`, `ratingWindow`. The card on both Apps with the four rows and the "keeping ratings honest" line.
- Docs: `CONTEXT.md` Scorer, MVP, Marks window.

**Acceptance criteria**
- Each of the four parts sums to zero across the Match's players (property test).
- A Match with no MVP, or an MVP picked by an Organizer, has `mvp_part = 0` for everyone.
- A keeper on a side that conceded more than half the goals loses more from the goals part than a forward on the same side.
- Changing who scored after both sides confirmed returns the Match to pending.
- The shown parts add up to the stored OVR move.

**Dependencies.** RR-13, RR-9.

**Files.** `packages/domain/src/football-ovr.ts`, `packages/api/src/ratings/settle-rating-window.ts`, `apply-football-level-match.ts`, `packages/api/src/marks/settle-mvp.ts`, `packages/api/src/routers/games/saveFootballScore.ts`, `byId.ts`, `apps/mobile/src/game-details/rating-impact-card.tsx`, `apps/web/src/components/games/game-rating-impact-block.tsx`.

## RR-15. A football Challenge Game counts for Temba Level

**Outcome.** A football Challenge Game is tagged "Counts for Temba Level" and moves both squads' OVR once one player from each Team confirms.

**What to build**
- `confirmProposal`: `rated: true` for football.
- On a Challenge Game the Level effect needs a confirmation from each Team; a confirmation by someone who acts for only one Team is not final for the other.
- Challenge detail and Game details copy on both Apps.
- Docs: `CONTEXT.md` Challenge Game.

**Acceptance criteria**
- A football Challenge Game created after this ticket has `rated = true`; older ones are unchanged.
- The Match does not complete on one Team's confirmation alone.
- Padel Challenge Games behave as before.

**Dependencies.** RR-13.

**Files.** `packages/api/src/routers/challenges/confirmProposal.ts` (+test), `packages/api/src/games/match-result-confirmations.ts`, `packages/domain/src/challenge-game-details.ts`.

## RR-16. An Operator sets a football Level in OVR, with a reason and a note

**Outcome.** On Player Levels an Operator sets a football player's OVR directly, must pick a reason, may add a note, and the player sees who and why.

**What to build**
- Migration: `level_overrides.note`, `set_by_role` (enum, backfilled).
- `applyLevelOverride` takes a continuous Level. `ratings.setLevelAsOperator`: optional `ovr` and `note`; reason required on new overrides. `ratings.setLevel`: optional `note`; reason required.
- Operator page and the Level setter form on both Apps: OVR slider on football, reason chips required, note field.
- `level_set` Notification copy carries the reason and note.
- Docs: `CONTEXT.md` Level override. ADR-0073 lands (Level half).

**Acceptance criteria**
- Setting OVR 71 stores a μ that reads back as 71.
- A save with no reason is refused on both doors.
- Existing overrides read "no reason given" and keep working.
- `set_by_role` is `operator` for rows with no Group and `level_setter` otherwise after the backfill.

**Dependencies.** RR-12.

**Files.** `packages/db/src/schema/level-overrides.ts`, `packages/api/src/ratings/apply-level-override.ts`, `packages/api/src/routers/ratings/setLevelAsOperator.ts`, `setLevel.ts` (+tests), `apps/web/src/app/dashboard/operator/levels/page.tsx`, `apps/web/src/components/groups/set-level-form.tsx`, `apps/mobile/src/groups/set-level-screen.tsx`.

## RR-17. A Verified football Group shows OVR on Members and balances Make teams on it

**Outcome.** In a Verified football Group, Members has an OVR column with band and Provisional hatch, and Make teams balances on OVR.

**What to build**
- `groupShowsLevel` returns true for a Verified football Group; `levelCellView` gives the OVR face.
- `games.footballBoard`: `players[].ovr`; `balanceStrength` is OVR in a Verified Group and in a groupless football Game.
- Members and Make teams on both Apps.

**Acceptance criteria**
- A Verified football Group shows OVR and no fish; a tier Group shows fish and no OVR.
- Sorting Members by level orders by OVR.
- Balancing in a Verified Group uses OVR for every player.

**Dependencies.** RR-12, RR-5.

**Files.** `packages/domain/src/group-home-chrome.ts`, `group-members-table.ts`, `football-lineup.ts`, `packages/api/src/routers/games/footballBoard.ts`, `apps/mobile/src/groups/level-cell.tsx`, `apps/web/src/components/temba/level-cell.tsx`.

---

# Phase D: padel

## RR-18. A padel Level reads 1.0 to 7.0 with two decimals

**Outcome.** The padel Level hero and Home card show a number from 1.00 to 7.00 with its band; dense lists keep one decimal.

**What to build**
- `formatPadelLevel(level, decimals)` in `level.ts`, flooring the display at 1.0.
- View-models and both Apps' padel hero, Home Level card and Player profile.
- Docs: `CONTEXT.md` Level. ADR-0070 lands (face half).

**Acceptance criteria**
- A stored Level of 0.35 shows 1.00; 3.449 shows 3.45.
- Game Level range and Level wanted comparisons are unchanged (existing tests pass).
- No football surface changes.

**Dependencies.** None.

**Files.** `packages/domain/src/level.ts`, `home-level.ts`, `profile-level.ts`, `player-profile-level.ts`, `apps/mobile/src/profile/level-hero.tsx`, `apps/web/src/components/you/level-hero.tsx`.

## RR-19. A padel Rated Match weighs the partner

**Outcome.** A padel player's Level moves by the pair's chances against the other pair, not by their own Level against the other pair.

**What to build**
- `rateDoublesMatch`: the partner term with `DOUBLES_PARTNER_WEIGHT = 1` (spec 8.5).
- `game-rating-impact.ts` preview follows the formula.
- Tests: with equal partners the result equals today's; a weak player beside a strong partner gains less for a win than today.
- Docs: ADR-0070 (formula half).

**Acceptance criteria**
- Four players of equal μ move exactly as before this ticket.
- For a pair of μ 1300 and 1700 beating two 1500s, the 1300 player gains less than before and the 1700 player more.
- Existing rating events are untouched.

**Dependencies.** None.

**Files.** `packages/domain/src/rate-doubles-match.ts` (+test), `game-rating-impact.ts`, `packages/api/src/ratings/apply-rated-match.test.ts`.

## RR-20. A padel Group keeps only a Standing

**Outcome.** Padel Groups no longer have a Group Level: no scope chips, no "Levels by group", no "Set group level". A padel Game on a Group that is not Verified reads "Unrated". The Ratings area shows "In your groups" with won, lost and place (screen 1b).

**What to build**
- `ratingFlagsAtCreate`: padel never sets `groupRated`. `applyRatedMatch` stops calling `applyGroupRatedMatch`.
- Migration: `group_rated = false` on padel Games with no completed Match.
- `ratings.setGroupLevel` refuses with `PRECONDITION_FAILED`; `groups.byId` returns `groupLevel: null`; `ratings.myGroupLevels` is left as it is.
- `groups.myStandings({ sport })`: place, member count, won, drawn, lost for the current Season of each of the caller's Groups.
- Remove the Group Level UI on both Apps: scope chips on the You page, the group levels card, the set-group-level screen and dialog, the member-sheet action.
- Docs: `CONTEXT.md` Group Level and Group Level override marked retired; Verified Group; Rating scope.

**Acceptance criteria**
- A padel Match on a Group that is not Verified writes no `group_rating_events` row and no `rating_events` row, and still counts in the Standing.
- A padel Match on a Verified Group moves the Temba Level as before.
- Reporting a wrong score on a padel Match completed before this ticket still restores its Group Level rows.
- No screen shows a Group Level.

**Dependencies.** RR-1.

**Files.** `packages/domain/src/game-rating-scope.ts`, `packages/api/src/ratings/apply-rated-match.ts`, `packages/api/src/routers/ratings/setGroupLevel.ts`, `packages/api/src/routers/groups/myStandings.ts` (new, +test), `apps/web/src/components/you/padel-tab.tsx`, `group-levels-card.tsx`, `apps/web/src/components/groups/set-group-level-dialog.tsx`, `apps/mobile/src/profile/profile-screen.tsx`, `apps/mobile/src/groups/set-group-level-screen.tsx`.

---

# Phase E: Public Games

## RR-21. An Operator marks a Venue as a partner Venue

**Outcome.** On a Venue's page an Operator turns "Partner venue" on or off, and the Venue shows the mark.

**What to build**
- Migration: `venues.partner_at`, `partner_by`.
- `venues.setPartner({ venueId, partner })`: Operator only. `venues.byId` and `venues.list` return `isPartner`.
- The switch on the web Venue page; the mark on Venue rows on both Apps.
- Docs: `CONTEXT.md` Partner Venue.

**Acceptance criteria**
- A Venue manager and a plain User are refused.
- An archived Venue cannot be made a partner.

**Dependencies.** None.

**Files.** `packages/db/src/schema/venues.ts`, `packages/api/src/routers/venues/setPartner.ts` (new, +test), `byId.ts`, `list.ts`, `apps/web/src/app/dashboard/venues/[id]/page.tsx`.

## RR-22. A player creates a public padel Game at a partner Venue, and anyone in range joins from the Public tab

**Outcome.** Create Game offers "Public game" at a partner Venue with no Group; the Games hub has a Public tab listing Public Games the player may join; joining alone or with a partner works.

**What to build**
- `games.create`: a groupless Friendly game with `isPublic: true` is allowed at a partner Venue, padel in this ticket; `createFriendlyGame` passes `isPublic` through.
- Create flow on both Apps: the Public choice, Level range encouraged, Venue list limited to partner Venues.
- `GamesHubTab` gains `public`; both hubs call `games.listPublicPickup` again. Empty state.
- The Game is not yet tagged as counting for Temba Level (RR-23).
- Docs: `CONTEXT.md` Public Game, Game, Friendly game. ADR-0071 lands as written.

**Acceptance criteria**
- A Public Game at a Venue that is not a partner is refused.
- A User outside the Level range does not see a join action and is refused on the server; a User inside it joins with no Group.
- Public Games on the viewer's own seats are not listed under Public.
- A private groupless Game is still creator-only.

**Dependencies.** RR-21.

**Files.** `packages/api/src/routers/games/create.ts`, `packages/api/src/games/create-friendly.ts`, `packages/domain/src/games-hub-tab.ts`, `create-game-flow.ts`, `create-game-submit.ts`, `apps/web/src/app/dashboard/games/page.tsx`, `apps/mobile/src/games/games-screen.tsx`, `apps/mobile/src/create-game/details-step.tsx`.

## RR-23. A Public Game counts for Temba Level when both sides confirm within 24 hours

**Outcome.** A Public Game is tagged "Counts for Temba Level". After a score is entered the other side has 24 hours to confirm; if they do, Levels move; if not, the score stands and moves nothing.

**What to build**
- `ratingFlagsAtCreate`: a Public Game gives `rated: true`; weight 1 in `applyRatedMatch`.
- Migration: `matches.stood_unconfirmed_at`.
- Confirmation on a Public Game: one account holder from each side; the creator's confirmation is not final.
- Job `match.confirm-window`, scheduled at score entry with `mode: "replace"`; on expiry the Match completes with `stood_unconfirmed_at` and the completion effect skips rating. Reuses the `match_score_to_confirm` Notification.
- `games.byId`: `confirmWindow`, `matches[].stoodUnconfirmed`. Game details on both Apps: the countdown, and "Not confirmed in time. It did not count."

**Acceptance criteria**
- The creator entering and confirming a score alone does not complete the Match.
- A confirmation from the other side inside 24 hours completes it and writes rating events at weight 1.
- After 24 hours the Match is completed, in Match history, with no rating event.
- A changed score clears confirmations and restarts the 24 hours.

**Dependencies.** RR-22.

**Files.** `packages/domain/src/game-rating-scope.ts`, `packages/api/src/games/match-result-confirmations.ts`, `run-match-completion-effect.ts`, `packages/api/src/jobs/specs.ts`, `packages/api/src/jobs/handlers/match.confirm-window.ts` (new, +test), `packages/api/src/routers/games/confirmMatchResult.ts`, `packages/db/src/schema/matches.ts`.

## RR-24. Football Public Games

**Outcome.** A football player creates a Public Game at a partner Venue with an OVR range; strangers join, sides are made, and the result moves OVR once one player from each side confirms.

**What to build**
- `games.create`: football Public Games; the Level range in OVR; side size as today.
- The Public tab lists football Public Games when the sport is football.
- The RR-23 confirmation rule and clock apply; the RR-14 Rating window opens at completion.

**Acceptance criteria**
- A football Public Game counts for Temba Level and writes no tier event.
- A player with no football Rating is outside any set range and is told why.
- An unconfirmed football Public Game opens no Rating window.

**Dependencies.** RR-23, RR-13.

**Files.** `packages/api/src/routers/games/create.ts`, `packages/api/src/games/create-friendly.ts`, `packages/api/src/games/user-allowed-by-level-range.ts`, create flow and hub on both Apps.

---

# Phase F: Verifier and disputes

## RR-25. A Verifier calibrates a Level, and the player sees who and why

**Outcome.** An Operator grants a User as a Verifier of a Venue (club staff, referee or coach). From a Player profile the Verifier sets that player's Level with a reason and a note; the player's history says "Level calibrated by a verifier".

**What to build**
- Migration: enum `venue_verifier_kind`, table `venue_verifiers`.
- `venues.addVerifier`, `venues.removeVerifier`, `venues.listVerifiers`: Operator only. A Verifiers list on the web Venue page.
- `ratings.setLevelAsVerifier({ userId, sport, levelTenths | ovr, reason, note? })`: the target played a Game at the Venue or belongs to one of its Club Groups; never yourself; writes a Level override with `set_by_role = 'verifier'`.
- `users.playerProfile`: `viewerMayCalibrate`. A "Calibrate level" action on Player profile on both Apps, reusing the set-level form.
- Docs: `CONTEXT.md` Verifier, Level override. ADR-0072 lands as written.

**Acceptance criteria**
- A Verifier of Venue A cannot calibrate a player who never played there.
- A Verifier cannot calibrate themselves; a removed Verifier is refused.
- The player gets the `level_set` Notification naming the Verifier and the Venue.
- Both sports work; football takes OVR.

**Dependencies.** RR-16.

**Files.** `packages/db/src/schema/venue-verifiers.ts` (new), `packages/api/src/routers/venues/addVerifier.ts`, `removeVerifier.ts`, `listVerifiers.ts` (new), `packages/api/src/routers/ratings/setLevelAsVerifier.ts` (new, +test), `packages/api/src/routers/users/playerProfile.ts`, `apps/web/src/app/dashboard/venues/[id]/page.tsx`.

## RR-26. A Verifier stamps a Match at their Venue

**Outcome.** A Verifier opens a Game at their Venue and stamps a Match's score; the Match completes at once and shows "Stamped by".

**What to build**
- Migration: `match_verifier_stamps`.
- `games.stampMatch({ matchId })`: a Verifier of the Game's Venue who is not seated in the Match; needs an entered score; counts as a final confirmation.
- `games.byId`: `matches[].stamp`. The stamp action and line on both Apps.
- Docs: `CONTEXT.md` Verifier stamp, Match result confirmation.

**Acceptance criteria**
- A stamp completes a Public Game Match that only one side confirmed, and it counts.
- A seated Verifier, and a Verifier of another Venue, are refused.
- A stamp does not change the Match's weight.

**Dependencies.** RR-25.

**Files.** `packages/db/src/schema/venue-verifiers.ts`, `packages/api/src/routers/games/stampMatch.ts` (new, +test), `packages/api/src/routers/games/byId.ts`, `packages/api/src/games/match-result-confirmations.ts`.

## RR-27. A player disputes a counted Match, and an Operator decides

**Outcome.** A seated player of a Match that counted for Temba Level can say "this result is wrong"; an Operator sees a list of open disputes and upholds or dismisses each.

**What to build**
- Migration: enum `match_dispute_status`, table `match_disputes`.
- `games.disputeMatchResult({ matchId, note })`: a seated player, within 7 days of completion, one open dispute per Match.
- `games.listDisputesForOperator`, `games.decideDispute({ disputeId, upheld })`: upholding runs the wrong-score reversal as the Operator and returns the Match to pending.
- Notifications `match_dispute_raised` (Operators) and `match_dispute_decided` (the player and the Game's Organizers).
- The action in Game details on both Apps; an Operator page on web.
- Docs: `CONTEXT.md` Match dispute.

**Acceptance criteria**
- A player not seated in the Match, and a Match on an Unrated or tier Game, are refused.
- Upholding a football dispute subtracts every OVR event of the Match; upholding a padel dispute follows the existing eligibility rule and reports why when it cannot reverse.
- A second open dispute on the same Match is refused.

**Dependencies.** RR-13.

**Files.** `packages/db/src/schema/match-disputes.ts` (new), `packages/api/src/routers/games/disputeMatchResult.ts`, `listDisputesForOperator.ts`, `decideDispute.ts` (new, +tests), `apps/web/src/app/dashboard/operator/disputes/page.tsx` (new).

---

# Phase G: Ratings screen and Rating history

## RR-28. The Ratings screen shows three ladders for football and two for padel

**Outcome.** Screens 1a and 1b: from the You page a player opens Ratings, switches sport, and sees Temba Level (ring, band, number, change over the last 8, progress to the next band), Group tier rows on football, "In your groups" on padel, and the Official Rank slot.

**What to build**
- `ratings.myGroupTiers`: per tier Group, band, place, member count, points, Provisional games of five. `ratings.me`: `changeOverLast`.
- `@repo/domain/ratings-screen`: the view-model for both sports.
- The screen on both Apps. The Level card is the one ink `Surface`. The Official Rank slot is hatched with "Coming with official tournaments".
- Docs: `CONTEXT.md` Official Rank (reserved).

**Acceptance criteria**
- A football player in two tier Groups and one Verified Group sees two tier rows and the Verified Group under "In your groups".
- A padel player sees no tier section.
- A Provisional Level shows a hatched ring and the count to confirm.
- No number is shown in the Official Rank slot.

**Dependencies.** RR-12, RR-18, RR-20.

**Files.** `packages/api/src/routers/ratings/myGroupTiers.ts` (new, +test), `me.ts`, `packages/domain/src/ratings-screen.ts` (new, +test), new screens under `apps/mobile/src/profile/` and `apps/web/src/components/you/`.

## RR-29. Rating history lists every move and every manual change

**Outcome.** Screen 1c: from Ratings a player opens their history, filtered All, Level, Tier or Rank, grouped by week and month; manual changes show the person's name, reason and note.

**What to build**
- `ratings.history({ sport?, ladder, cursor? })`: the caller's own, a union of `rating_events`, `level_overrides` and `group_tier_events`.
- `rating-history.ts`: row copy for Level moves, tier moves, adjustments and overrides by role.
- The screen on both Apps. The Rank filter is present and empty.
- Docs: `CONTEXT.md` Rating history.

**Acceptance criteria**
- Entries from the three sources interleave by time and page correctly across a cursor.
- A Verifier calibration reads "Level calibrated by a verifier" with the name and Venue; an Organizer's adjustment reads "Tier points set by an organizer".
- A player cannot read another player's history.

**Dependencies.** RR-4, RR-16.

**Files.** `packages/api/src/routers/ratings/history.ts` (new, +test), `packages/domain/src/rating-history.ts`.

## RR-30. Rating history shows milestones

**Outcome.** The history marks "Level confirmed" on the fifth counting Match and "Up to Hamour" style rows for band changes, and the hatched track clears when a Level is confirmed.

**What to build**
- Derived "Level confirmed" entry in `ratings.history`; `band_change` events rendered as milestones.
- Notification when a Level is confirmed, once per sport.

**Acceptance criteria**
- Exactly one "Level confirmed" row per sport, at the right Match.
- A band change caused by someone else's adjustment appears in the affected player's history.

**Dependencies.** RR-29.

**Files.** `packages/domain/src/rating-history.ts`, `packages/api/src/routers/ratings/history.ts`.

## RR-31. Home and Player profile use the new faces

**Outcome.** Home's Level card opens Ratings; a Player profile shows the player's Temba Level in the sport's face and, to members of a shared tier Group, their fish there; Match history lines show the OVR or Level change.

**What to build**
- Home Level card on both Apps links to Ratings and uses the new view-model.
- `users.playerProfile`: `sharedGroupTiers` for tier Groups the viewer shares with the player.
- Match history row copy for football counted Matches.

**Acceptance criteria**
- A viewer who shares no tier Group sees no fish on the profile.
- A football Match that counted shows its OVR change; a tier Game shows none.

**Dependencies.** RR-28.

**Files.** `packages/domain/src/player-profile-page.ts`, `home-level.ts`, `match-history-card.ts`, `packages/api/src/routers/users/playerProfile.ts`, `apps/mobile/src/home/level-card.tsx`, `apps/web/src/components/home/level-card.tsx`.

---

## Documentation changes the tickets make

| Ticket | `CONTEXT.md` | `docs/adr/` |
| --- | --- | --- |
| RR-1 | Group Tier, Tier points, Tier band, Provisional, Rating scope, Standing; "tier" Avoid edits | 0065, 0066, 0067 accepted |
| RR-3 | Tier adjustment, Organizer, Group approver | 0073 (tier half) |
| RR-7, RR-8 | Rating settings, Performance rating, Rating window | 0068 accepted |
| RR-12, RR-13 | OVR, Level, Rating, Rated Match, Unrated Game, Game, Football self-placement, Team Level | 0069 accepted |
| RR-14 | Scorer, MVP, Marks window | none |
| RR-15 | Challenge Game | none |
| RR-16 | Level override | 0073 accepted |
| RR-18, RR-19 | Level | 0070 accepted |
| RR-20 | Group Level and Group Level override retired, Verified Group | none |
| RR-21, RR-22, RR-23 | Partner Venue, Public Game, Friendly game, Match result confirmation | 0071 accepted |
| RR-25, RR-26 | Verifier, Verifier stamp | 0072 accepted |
| RR-27 | Match dispute | none |
| RR-28, RR-29 | Official Rank (reserved), Rating history; "rank" Avoid edits | none |

## Linear issues

Not published yet.
