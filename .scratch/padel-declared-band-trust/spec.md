# Padel Level: trusting the declared band

Status: draft, revised 2026-11-16 after the owner's first answers. No ticket exists yet. Four decisions are **settled by the owner** (section 5.1). Eight defaults were not asked and four new questions came out of the replay design; each is in force unless the owner says otherwise, and every place that depends on one carries its tag (**[OD-1]**, **[OD-2]**, **[OD-4]**, **[Q6]**, **[Q7]**, **[Q10]** to **[Q12]**, **[RQ-1]** to **[RQ-7]**) so one pass can revise it. `CONTEXT.md` and `docs/adr/` are unchanged; sections 4 and 16 list what the tickets will change.

Source: the owner's design doc "Padel Level: trusting the self-declared band" (2026-11-16, five pages). Its rules and numbers are the source of truth. Where the code disagrees with it, section 2.9 says so.

Builds on `.scratch/user-ratings/spec.md`, `.scratch/set-level/spec.md`, `.scratch/rating-redesign/spec.md` and ADR-0068, ADR-0070, ADR-0080, ADR-0089 and ADR-0095.

Audited at `195ffab1` on `claude/focused-gates-vu41vb`. Prototypes: `.scratch/padel-declared-band-trust/prototype/simulate.ts` (section 8.5) and `prototype/replay.ts` (section 9.12).

## 1. Problem

A padel player who declares a Level band starts at that band's midpoint with φ 350, the same uncertainty as a player who said "I don't know". The declaration sets the starting Level and carries no confidence, so one even win moves a D declarer +0.35 Level, half a band, for a result that only confirms what they declared.

The owner wants three things, in this build order:

1. **Start φ by declared band.** D, D+ and C- declarations are trusted: results against players at the same Level move them almost like a confirmed Level.
2. **A "prove it" rule.** C and above have to be proven: until the Level is confirmed, a loss to a pair at about the same level costs one and a half times as much. Wins count normally.
3. **A level check.** After a Match the other three players say what band the player played at. Their median answer is one measurement of the Level, weighed by the player's φ, so it counts most while the Level is new.

And existing players are brought in line by **replaying every padel Rated Match** under parts 1 and 2 (the owner's choice, section 5.1).

## 2. Discovery: current behaviour

Verified by reading the code at the audited commit, unless marked inferred.

### 2.1 How a padel Rating is created from a declaration

- `selfDeclareRating` (`packages/api/src/routers/ratings/selfDeclare.ts:27-93`) is the one writer. It refuses after a Rated Match or an earlier declaration, calls `initialRatingFromChoice(choice)` (line 52) and inserts the `ratings` row with `self_declared_at` (lines 56-68). The choice itself is not stored.
- `initialRatingFromChoice` (`packages/domain/src/level.ts:285-303`): a band gives `muFromBand(choice)`, the band's midpoint, with `phi: INITIAL_PHI`; `"unknown"` gives μ 1500 (Level 3.0, band C2) with the same φ. It takes no sport.
- Constants (`level.ts:14-24`): `INITIAL_PHI = 350`, `PROVISIONAL_PHI_THRESHOLD = 200`, `LEVEL_OVERRIDE_PHI = 150`, `RATED_MATCHES_TO_CONFIRM = 5`.
- Callers of `selfDeclareRating`: `ratings.selfDeclare`; `submitOnboarding` (`routers/users/completeOnboarding.ts:208-219`) for padel **and football**; `createUnclaimedPlayer` (`unclaimed-players/create-unclaimed-player.ts:63`), where an Organizer picks the band for someone else; the seed.
- **"Not sure" is stored as a D+ declaration.** Both onboarding questionnaires send `PADEL_NOT_SURE_LEVEL = "D+"` (`packages/domain/src/onboarding-answers.ts:138`), which becomes stored band D1. Only the web Home declare dialog and a blank onboarding answer send `"unknown"`.
- Football self-placement maps four words to bands and goes through the same function (`football-self-placement.ts:42`, `:79-84`). A football Rating's φ carries its Provisional (ADR-0069), so a lower start φ on football would read as confirmed.

### 2.2 How a Match moves a padel Level

- `applyRatedMatch` (`packages/api/src/ratings/apply-rated-match.ts:222-327`) calls `applyTembaRatedMatch` (lines 333-451), which locks the four `ratings` rows, calls `rateDoublesMatch`, writes one `rating_events` row per player and updates the Rating. One `now` is the events' `created_at`, the Rating's `last_rated_at` and the clock idle inflation reads.
- `rateDoublesMatch` (`packages/domain/src/rate-doubles-match.ts:138-189`): idle inflation, then each player faces the opposing pair's mean μ and φ, shifted by half the gap to their partner (ADR-0070), so both partners share one expected score.
- `ratePlayer` (`rate-doubles-match.ts:110-129`): `glicko2Step`, then `blendWeightedStep` by the Game's weight (lines 88-98, which blends μ, φ and σ), then on a loss `reliabilityPart = (lossFactor − 1) × step`. **A loss multiplier already exists**: `lossFactor` comes from Reliability (ADR-0095, `level-reliability.ts:50-57`), 1 at 100 and 1.5 at 0. The expected score is not exposed: `expectedScore` in `glicko2.ts:54-60` is private.
- Weight (`packages/api/src/ratings/game-rating-weight.ts:11-43`): 1 on a Club Group and on a Public Game, 0.5 on any other Group (an Operator-verified Loose Group) and on a groupless Game (a padel Challenge Game). The weight used is stored on each event (`rating_events.weight`).

### 2.3 Confirmed and Provisional

- A padel Level is confirmed by five Rated Matches in a Verified Group or by any Level override (ADR-0080). `padelConfirmations` (`packages/api/src/ratings/level-confirmed.ts:67-108`) counts padel `rating_events` rows whose Game has a Group (`padelVerifiedEvent`, lines 56-59) and reads `level_overrides`.
- `tembaLevelView` (`level.ts:322-338`) turns that into Provisional for padel and ignores φ. The 200 threshold (`isProvisional`, `level.ts:243-245`) decides Provisional only on football and on retired Group Levels.
- One reader still uses φ for a padel Temba Level: `selfDeclareRating` returns `youRatingViewFromState(created)` (`selfDeclare.ts:77`). No client reads that return today (web `home-level-block.tsx:27-32` only invalidates).
- A Level override writes μ from the Level set, `φ = min(φ, 150)`, sets Reliability to 100 and appends `level_overrides` (`apply-level-override.ts:142-237`). σ and `last_rated_at` are kept.

### 2.4 The Rating window, as it is today

- ADR-0068 made it for football. **ADR-0095 (merged 2026-11-16) already opens one on padel**: a padel Friendly game on a Verified Group (`apply-rated-match.ts:315-326`), Everyone mode, weight 0 (`settle-rating-window.ts:130-146`). Public Games, Challenge Games and tournaments open none.
- Players give a 1 to 10 Performance rating (`performance_ratings`, CHECK 1 to 10, unique per Match, rater and ratee). Ballots are hidden; two ballots settle a padel player (`PADEL_MIN_BALLOTS`, `performance-rating.ts:46`); an outlier rater counts half (`outlierRaterIds`, `performance-rating.ts:312-340`); an Operator's or Level setter's ballot weighs three times.
- `settleRatingWindow` (`settle-rating-window.ts:510-683`) runs from the `rating-window.settle` Job or on the next read. On padel it only moves Reliability (`applyReliability`, lines 692-736) and notifies (`notifyReliabilityRatingsClosed`, lines 809-845).
- A wrong-score report calls `suspendRatingWindow` (lines 950-968): results are deleted, Reliability is given back, ballots stay.
- The screen exists on both Apps: web `apps/web/src/components/games/rate-game-page.tsx` at `/dashboard/games/[id]/rate`, mobile `apps/mobile/src/game-details/rate-game-screen.tsx`. Procedures: `games.performanceRatingSheet`, `games.submitPerformanceRatings`, `games.performanceRatingResult`. The padel footnote reads "Ratings do not move a level" (`packages/i18n/src/messages/en/rating.ts:501-502`).

### 2.5 Ledgers and reversal

- `rating_events` is unique on `(user_id, match_id)` and has NOT NULL `outcome_score` and `weight` (`packages/db/src/schema/ratings.ts:85-133`). Every row is read as one Rated Match: the confirmation count, `userHasRatedMatch`, the wrong-score gate.
- A King of the court Place award moves a Level without a Rated Match, so it has its own ledger, `king_place_awards` (ADR-0089), and its own line in Rating history, which is already a union over four tables (`routers/ratings/history.ts:124-201`).
- `reportWrongScore` (`routers/games/reportWrongScore.ts:342-407`) restores μ, φ and σ to the before-values on the Match's events and deletes them. It is allowed only when the event is each seated User's latest padel event and no Place award came after (`games/wrong-score-reversal.ts:30-80`). A Place award is taken back differently: exactly when nothing has touched the Rating since, otherwise by subtracting its μ move (`apply-king-place-awards.ts:41-87`).
- `merge-into-account.ts` keeps one Rating per sport when an Unclaimed player is claimed, the one with more Rated Matches, and **deletes the other Rating with its events, Level overrides and Place awards** (`resolveRatings`, lines 445-476); seats move to the surviving User.

### 2.6 Recovering what was declared

- No table stores the declared band. `ratings.self_declared_at` says a declaration happened.
- For a Rating with no ledger row (no `rating_events`, `level_overrides` or `king_place_awards`), μ is still exactly the band midpoint, and the midpoints are whole numbers of μ (175, 525, 875, 1225, 1575, 1925, 2275, 2625, 2975, 3325), so the band is read back without rounding. μ 1500 is "unknown".
- For a Rating that has moved, the earliest ledger row holds `mu_before`, which is the declared μ: idle inflation never touches μ, and a reversal deletes the event and restores the Rating.
- Not verifiable from the Workspace: whether earlier versions of the product used other midpoints. The replay matches exactly and reports what it cannot place **[RQ-5]**.

### 2.7 Scripts and replay

- `packages/api/scripts/` holds `seed.ts`, `backfill-operators.ts` (the precedent: `tsx --env-file-if-exists=.env`, prints the database host, safe to rerun, documented in `packages/api/README.md`) and two football pitch scripts. `apps/web/scripts/` holds flow recorders.
- **No replay or recompute path exists today.** Nothing rebuilds Ratings from Matches. ADR-0070 ("New Matches only. Nothing is replayed") and the rating redesign's non-goals say so on purpose; section 9 reverses that for padel, once.

### 2.8 Numbers checked against the real step

Run through `rateDoublesMatch` at weight 1, four players at the same μ:

| Own φ | Even win, others at φ 100 to 150 | Others at φ 350 |
| --- | --- | --- |
| 150 | ±0.10 to 0.11 Level | ±0.08 |
| 200 | ±0.16 to 0.17 | ±0.13 |
| 250 | ±0.23 | ±0.20 |
| 350 | ±0.35 | ±0.33 |

The doc's table holds against settled players. Its level-check shares (50%, 26%, 14%) are exact for r = 250. An expected score between 0.25 and 0.75 is a gap of 0.40 Level when the other pair's φ is 100 and 0.57 when it is 350.

### 2.9 Where the doc and the code differ

1. **`SELF_DECLARED_PADEL_PHI` and "the earlier patch" do not exist.** No file, no commit reachable in this checkout, and none of the 134 branches on the remote has the constant or a flat φ 250. Every declared band starts at 350 today. **[Q7]**
2. **Padel Provisional is not φ.** Since ADR-0080 it is the count of Verified Group Matches. A D declarer at φ 150 still reads Provisional everywhere. **[OD-1]**
3. **Padel already has a Rating window, a 1 to 10 rating and a loss multiplier** (ADR-0095, merged the day the doc was written). The doc calls the window football's. Parts 2 and 3 overlap it; the owner has settled how (5.1).
4. **A level check cannot be a `rating_events` row.** One row per User and Match is a unique constraint, and each row counts as a Rated Match towards confirmation. It needs its own ledger, as the Place award has.
5. **"After a padel Rated Match"** is wider than where a window opens today: Friendly games on Verified Groups only. **[OD-4]**
6. **"I don't know" is two different answers.** The onboarding "Not sure" is a stored D+ declaration; the web dialog's "I don't know" is μ 1500 (C, 3.0). The owner settled that "Not sure" is a declared D+ (5.1).
7. **`selfDeclareRating` also places football players and Unclaimed players.** The φ table must be padel only, and an Organizer's pick is not a self-declaration. **[Q6]**
8. **"Pick a band" has nine choices, not ten.** The face shows D for both stored D3 and D2.
9. **"Provisional raters count half" and "at least one opponent" are new.** The existing rule is about the rated player: a Provisional player's Reliability moves twice as far.
10. **A declared D reads 1.00 before and after its first wins** (ADR-0070 floors the padel face at 1.0, and D3 and D2 both read "D"). The +0.35 is real in the stored Level, which gates Game Level ranges and Team Level, but the player does not see it.

## 3. Solution in one paragraph

A padel declaration is remembered (`ratings.declared_band`) and sets the starting φ: 150 for D and D+, 200 for C-, 250 for C and above, 350 with no band. While a player who declared C or above is not yet confirmed, a loss to a pair at about their level moves them one and a half times as far (the **Prove-it rule**). Once both are deployed, a one-time **Level recalculation** replays every padel Rated Match, Place award and Level override in order under those two rules and rewrites the padel ledger and Ratings to match. After that, on a padel Friendly game that counts for Temba Level, the Rate the game screen also asks each player what band the others played at; when the Rating window settles, the median of at least two answers, one from an opponent, is blended into the player's Level as one measurement (a **Level check**), capped at 0.35 Level, written to its own ledger and shown in Rating history.

## 4. Glossary changes (to land in `CONTEXT.md` with the tickets)

New terms:

- **Declared band**: the Level band a padel player picked for themselves, or an Organizer picked when adding them by phone **[Q6]**, kept on the Rating (`ratings.declared_band`). Written once, never changed by a Match or a Level override. "Not sure" is a declared D+; only "I don't know" has none. It sets the starting φ and decides whether the Prove-it rule applies. _Avoid_: self-rating, initial level, Level band (that one moves).
- **Prove-it rule**: while a padel Level whose Declared band is C or above is Provisional, a lost Rated Match against a pair at about the same level (expected score 0.25 to 0.75) moves it one and a half times as far. Wins and draws are untouched; it ends when the Level is confirmed. It never multiplies with Reliability: the larger of the two applies. _Avoid_: penalty, probation.
- **Level check**: the other players' answer to "What level did X play at?" on a padel Match with a Rating window: a band each, hidden, settled with the window into one verdict that moves the player's Level by a share set by their φ. Not a Rated Match and not a Performance rating. _Avoid_: peer rating, vote, review, Performance rating.
- **Level recalculation**: the one-time replay of every padel Rated Match, Place award and Level override, in order, under the Declared band rules (ADR to write). It rewrites each padel Rating and the before and after of every padel ledger row; it adds and removes no Rated Match, so it cannot change who is confirmed. Product copy says "recalculated". _Avoid_: migration, reset, backfill (in product copy).

Edited terms: **Level** (a Level check also moves it), **Rating** (starting φ by Declared band on padel), **Rated Match** (a Level check, like a Place award, moves a Level without one), **Rating window** (on padel it also settles the Level check, and opens on a padel Public Game **[OD-4]**), **Performance rating** (the padel sentence "which is all it does on padel" stays true of the 1 to 10 rating), **Reliability** (the larger of its loss factor and the Prove-it rule's applies), **Rating history** (a "Level check" line; after the Level recalculation its Match lines read the recalculated moves), **Onboarding questionnaire** ("Not sure" is a declared D+), **Unclaimed player** (the Organizer's pick is their Declared band **[Q6]**), **Match dispute** (a reversal takes the Match's Level check back).

## 5. Decisions

### 5.1 Answered by the owner (2026-11-16)

| # | Answer |
| --- | --- |
| U1 | **Build the level check, reversing ADR-0095's refusal to let peers move a padel Level**, with the doc's guards. It stays on for confirmed players. The new ADR amends ADR-0095 as well as ADR-0068. (Was Q9 and OD-3.) |
| U2 | **Existing players are brought in line by a full replay of history**, not by a φ-only backfill. Chosen knowing it was not the planner's recommendation. Section 9. |
| U3 | **The larger of the two loss multipliers applies**, never the product. Reliability stays. (Was Q8.) |
| U4 | **"Not sure" is a declared D+**: φ 150, `declared_band` set. No new choice on the onboarding screens. (Was Q5.) |

### 5.2 Defaults not asked, in force unless the owner says otherwise

| Tag | Default | Why, from the code |
| --- | --- | --- |
| **[OD-1]** | Padel Provisional means "not yet confirmed" only. | It already does: `tembaLevelView` ignores φ on padel since ADR-0080. Only `selfDeclareRating`'s return value changes (2.3). |
| **[OD-2]** | Pick a band: the nine display bands, nothing preselected, and a verdict equal to the band the player shows moves no Level. | The band picker exists on both Apps. In the prototype a three-way answer leaves "says D, plays C" at 1.42 after nine Matches against 2.28 with bands. Without the "agreement moves nothing" rule an honest D drifts from 0.35 to 0.57. |
| **[OD-4]** | Friendly games on every Verified Group, at the Game's own weight, plus padel Public Games. Not tournaments or Challenge Games. | Weight already halves every step (`blendWeightedStep`). The window already opens on every Verified Group's Friendly games. Public Games open no padel window today, so that part is new. |
| **[Q6]** | A band an Organizer picked for an Unclaimed player counts as declared. | It is the only placement that Level has. |
| **[Q7]** | The flat φ 250 patch was never deployed. | It is not in the Workspace. The replay starts every player from the new table, so it is right either way. |
| **[Q10]** | An Operator's or Level setter's Level check ballot weighs like anyone's. | They hold the Level override, a stronger and audited door. |
| **[Q11]** | The Prove-it rule ends only at confirmation, so it never ends for a player who only plays Public Games. | One definition of confirmed (ADR-0080); a Level override ends it. |
| **[Q12]** | A Level check is not improvement in a Standing's Most improved view. | Like a Level override (ADR-0093): the view stays what results moved. |

### 5.3 New questions from the replay, recommended answer first

| Tag | Question | Recommended answer |
| --- | --- | --- |
| **[RQ-1]** | Matches rated before ADR-0070 used a different formula (the partner was ignored). Replay them under today's formula, or the one in force then? | **Today's formula for every Match.** One rule set, and the replay goes "through the real `rateDoublesMatch`". The Workspace does not hold the date ADR-0070 reached production, so the older formula cannot be applied by date without the owner supplying it. It means the replay also undoes ADR-0070's "nothing is replayed". |
| **[RQ-2]** | Are players told their Level was recalculated? | **Yes, once, in the app only**: a Notification to each player whose shown Level or band changed, with no Notification email. Nothing is added to Rating history. |
| **[RQ-3]** | Closed Seasons: their By level tables and Most improved are derived from the ledger on every read, so they will re-read from the replayed values. Accept, or freeze them? | **Accept.** Nothing is stored at close today; freezing would need a new snapshot table and a second meaning of "at close". The Standing itself, places and points, never reads a Level and does not change. |
| **[RQ-4]** | When does it run? | **Once, after Part 2 is deployed and before Part 3 is.** The command refuses once any Level check result exists. Part 1 may deploy earlier on its own. |

Technical defaults taken, tagged so they can be revisited:

| Tag | Default |
| --- | --- |
| **[RQ-5]** | A declared player whose starting μ is not a band midpoint keeps that μ as the start, and the band it falls in becomes their Declared band. Listed in the report. |
| **[RQ-6]** | A seat whose rating history was deleted by an Unclaimed player merge plays that Match as a Guest player does: at the mean of the others, unrated (ADR-0079). |
| **[RQ-7]** | A ledger row the replay cannot recompute is carried over: its stored μ move is applied to the replayed Rating, φ and σ move by the stored ratio. `--apply` refuses while any such row exists unless `--carry-unplaced` is passed. |

### 5.4 Design decisions

- **D1.** `declared_band` is nullable, typed `rating_level_band`, written by `selfDeclareRating` for both sports. Only padel reads it.
- **D2.** The start φ table is padel only. `initialRatingFromChoice` takes the sport; football keeps φ 350 (ADR-0069).
- **D3.** The Prove-it rule reads confirmation as it stood before the Match, so it applies to the fifth Verified Group Match and not the sixth.
- **D4.** The extra a loss cost is stored on the event (`rating_events.prove_it_part`), beside `reliability_part`, so the played Game can say why and a reversal takes it back with the rest.
- **D5.** The Reliability loss factor a Match used is stored on the event (`rating_events.reliability_loss_factor`). Today only its μ result is stored, which is not enough to replay a Match exactly (9.2).
- **D6.** Level check ballots get their own table. `performance_ratings.value` is NOT NULL with a 1 to 10 CHECK, and `submitPerformanceRatings` deletes a player's row when their 1 to 10 is cleared; a band on the same row would go with it.
- **D7.** Level check results get their own ledger (2.9, item 4), shaped like `king_place_awards`.
- **D8.** A verdict is read against the band the player shows when the window settles. Same band: μ stays, φ still narrows. Otherwise the verdict's Level is the middle of the picked display band's span (D is 0.70, the middle of 0.0 to 1.4).
- **D9.** The check's step is blended by the Game's weight, after the cap. **[OD-4]**
- **D10.** A rater's Provisional and outlier weights are computed when the window settles, from the ledger and the stored ballots. Nothing is stored about a rater (ADR-0068).
- **D11.** Taking a Level check back follows the Place award: exact when nothing has touched the Rating since, otherwise its μ move is subtracted. A wrong-score reversal takes the Match's own check back first, and no later check blocks a reversal.
- **D12.** One new procedure, `games.submitLevelChecks`. `games.submitPerformanceRatings` keeps its input.
- **D13.** The padel "ratings are in" notice is sent when either a rating or a Level check settled, and reads both. The only new Notification type is the recalculation's **[RQ-2]**.
- **D14.** The replay reads the ledger, not the Matches: a Match counts if and only if it has padel `rating_events` rows today (9.2).
- **D15.** The replay is one transaction under a table lock, writes only rows whose values differ, and backs up every row it changes in that transaction (9.8).

## 6. Actors

- **Player**: declares once; is asked the Level check about the other three; sees their own verdict, never who answered what; is told once if the recalculation changed their Level **[RQ-2]**.
- **Organizer**: picks the Declared band of an Unclaimed player they add **[Q6]**. Holds no Level check door.
- **Level setter, Verifier, Operator**: unchanged. A Level override confirms the Level, which ends the Prove-it rule, and the replay keeps every override as the Level it set. Their Level check ballot weighs like anyone's **[Q10]**.
- **Whoever runs the recalculation**: a developer with the production `DATABASE_URL`, after the owner has read the dry-run report.

## 7. Schema

Generated migrations, numbered at generation time (the next is `0129`). No existing migration is edited.

### 7.1 Part 1

`ratings.declared_band rating_level_band NULL`. No default, no index.

### 7.2 Part 2

- `rating_events.prove_it_part double precision NULL`: μ points, zero or below, null when the rule added nothing.
- `rating_events.reliability_loss_factor double precision NULL`: the Reliability loss factor the Match read for this player, null when it was 1 (D5).

### 7.3 The replay

`rating_replay_runs`: `id`, `applied_at`, `rules` (text: the rule set's name), `summary` (jsonb: the report's counts).

`rating_replay_backups`: `run_id` (cascade), `table_name` (text), `row_id` (uuid), `row` (jsonb: the whole row as it was). Primary key `(run_id, table_name, row_id)`. One row for every row the run changed in `ratings`, `rating_events`, `king_place_awards` and `level_overrides`.

A `level_recalculated` value on `notification_type` **[RQ-2]**.

### 7.4 Part 3

`level_check_ballots`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `match_id` | uuid, cascade | |
| `rater_user_id`, `ratee_user_id` | uuid, cascade | CHECK not equal; indexed (foreign-key index test) |
| `band` | `rating_level_band` NOT NULL | the picked display band's lower stored band, as `storedBandFromDisplayLabel` gives |
| `created_at`, `updated_at` | timestamp | |

Unique on `(match_id, rater_user_id, ratee_user_id)`. Kept through a wrong-score report.

`level_check_results`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `user_id` | uuid, cascade | the rated player |
| `sport` | `group_sport` | `padel`; kept so the ledger reads like the other three |
| `match_id` | uuid, cascade | |
| `verdict_level_hundredths` | integer | the verdict's Level |
| `agreed` | boolean | the verdict was the band the player showed |
| `ballots_counted` | integer | |
| `weight` | double precision | the Game's weight |
| `mu_before`, `phi_before`, `mu_after`, `phi_after` | double precision | σ and `last_rated_at` never move |
| `level_band_before` | `rating_level_band` | |
| `created_at` | timestamp | |

Unique on `(user_id, match_id)`; index on `match_id`.

## 8. Algorithms and constants

All pure, in `@repo/domain`. The constants are starting values and tunable.

### 8.1 Start φ (`level.ts`)

`PADEL_DECLARED_START_PHI`: D3, D2, D1 → 150; C3 → 200; C2 to A → 250. `initialRatingFromChoice(choice, sport)` returns it for a padel band and `INITIAL_PHI` for football and for `"unknown"`. `SELF_DECLARE_CHOICES` is unchanged: "Not sure" keeps arriving as D1 and is a declared D+.

### 8.2 Prove-it rule (`rate-doubles-match.ts`, `level.ts`, `glicko2.ts`)

- `PROVE_IT_LOSS_FACTOR = 1.5`, `PROVE_IT_EXPECTED_MIN = 0.25`, `PROVE_IT_EXPECTED_MAX = 0.75`, `PROVE_IT_FROM_BAND = "C2"`.
- `proveItApplies(declaredBand, confirmation)` in `level.ts`: the band is C2 or above and `padelMatchesRemainingToConfirm(confirmation) > 0`.
- `glicko2.ts` exports the expected score of a classic-scale player against an opponent, the function the step already uses.
- `DoublesPlayerInput` gains `proveIt?: boolean`. In `ratePlayer`, on a loss with `proveIt` and an expected score inside the bounds, the factor is `max(lossFactor, PROVE_IT_LOSS_FACTOR)`; otherwise it is `lossFactor` as today. `proveItPart` is the share the rule added and `reliabilityPart` what is left, so the two never double count.
- It applies to every padel Rated Match the player loses: Verified Group Games, tournament Matches, Public Games and Challenge Games. A Place award is never a loss.

### 8.3 Level check (`level-check.ts`, new)

- `LEVEL_CHECK_R = 250`, `LEVEL_CHECK_CAP_MU = 175` (0.35 Level), `LEVEL_CHECK_MIN_BALLOTS = 2`, `LEVEL_CHECK_PROVISIONAL_RATER_WEIGHT = 0.5`, `LEVEL_CHECK_OUTLIER_WEIGHT = 0.5`, `LEVEL_CHECK_OUTLIER_BANDS = 1.5`, `LEVEL_CHECK_OUTLIER_MATCHES_RUNNING = 3`.
- **Who is checked.** A seated player with a padel Rating, confirmed or not. A Guest player has none.
- **Which ballots count.** From a seated account holder, about another seated player. A player needs at least two, one of them from the opposing Game team.
- **Weights.** 1; half for a rater whose own padel Level is Provisional when the window settles; half again for an outlier: a rater whose picks were on average more than 1.5 bands from the verdicts in this Match and in each of their previous two Matches with a Level check.
- **Verdict.** The weighted median of the picks on the nine display bands. With the weight split evenly across two bands, the verdict's Level is the mean of their two middles.
- **Step**, with φ as stored, `k = φ² / (φ² + r²)`:
  - agreed (D8): `μ' = μ`;
  - otherwise `μ' = μ + w × clamp(k × (μ_verdict − μ), ±175)`;
  - `φ* = 1 / sqrt(1/φ² + 1/r²)`, `φ' = φ + w × (φ* − φ)`;
  - the Level band follows by `bandWithHysteresis`.

### 8.4 What it adds up to

| Player's φ | Share of the gap moved at weight 1 | φ after |
| --- | --- | --- |
| 350 (no band) | 66% | 203 |
| 250 (declared C or above) | 50% | 177 |
| 200 (declared C-) | 39% | 156 |
| 150 (declared D or D+) | 26% | 129 |
| 100 (settled) | 14% | 93 |

### 8.5 Prototype

`prototype/simulate.ts` runs the doc's cases through the real `rateDoublesMatch` (nine Matches, 3,000 runs, the others at the declared Level with φ 100, raters see the true Level with noise of 0.4).

| Case | Today | Part 1 | Parts 1 and 2 | Check, continuous (the doc) | Check, bands, as specified | Three-way answer | Check off at confirmation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Honest D (0.35) | 0.37 | 0.35 | 0.35 | 0.36 | 0.35 | 0.35 | 0.35 |
| Says D, plays C (3.15) | 1.31 | 0.87 | 0.87 | 2.28 | 2.28 | 1.42 | 1.90 |
| Honest C (3.15) | 3.16 | 3.15 | 3.02 | 3.11 | 3.10 | 3.09 | 3.09 |
| Says C+, plays C- (2.45) | 3.12 | 3.25 | 3.06 | 2.63 | 2.67 | 2.66 | 2.72 |
| Honest B (5.25) | 5.26 | 5.25 | 5.13 | 5.22 | 5.20 | 5.19 | 5.19 |

It reproduces the doc's combined results, and shows that band picks do as well as a continuous verdict once agreement moves nothing. It also shows that **parts 1 and 2 alone slow the correction of a wrong declaration** (1.31 to 0.87) until Part 3 ships (R3).

## 9. The Level recalculation (replay)

### 9.1 What it does and does not change

It recomputes every padel Rating from the start, as if parts 1 and 2 had always been in force, and rewrites the stored numbers to match.

- **Replayed:** the starting φ by Declared band (Part 1) and the Prove-it rule (Part 2), under today's formula **[RQ-1]**.
- **Not replayed: the Level check (Part 3).** No ballots exist for past Matches, so there is nothing to replay. The check starts with the first Match after Part 3 deploys.
- **Changes:** each padel player's Level, band, φ and σ; the before and after of every padel Rated Match, Place award and Level override line.
- **Does not change:** which Matches counted, who won, any Game, Match, Set or Standing; who is confirmed (the count reads rows, not values); Reliability; any football Rating or OVR; the Level a Level override set.

### 9.2 Inputs, and whether the ledger holds enough

The replay reads what stands in the ledger today (D14). A Match is replayed if and only if it has padel `rating_events` rows.

| What moved a padel Rating | How the replay treats it | Is the ledger enough? |
| --- | --- | --- |
| **Rated Match** | Recomputed through `rateDoublesMatch` from the replayed states of its four seats. | **Yes.** Each event stores the outcome (`outcome_score`), the weight as it was (`weight`) and the time (`created_at`). Sides come from the Match's two Game teams. |
| **Idle inflation** | Recomputed inside `rateDoublesMatch`. No Job or other step applies it. | **Yes.** It reads `last_rated_at`, which the replay carries forward from the previous event or award, and the event's `created_at`. |
| **Level override** | Kept as set: μ is the stored `mu_after`, `φ = min(replayed φ, 150)`, σ kept, band from the Level. Its before-values, `phi_after` and `sigma_after` are rewritten. | **Yes.** `mu_after` is absolute (`apply-level-override.ts:174-181`). |
| **Place award (ADR-0089)** | Recomputed through `kingField` and `rateKingPlace` from the Game's Game teams, their starting courts and final places, at the award's `created_at`. | **Mostly.** Wins and place are stored; the field is rebuilt from the Game teams as they are now. See the merge row. |
| **Wrong-score reversal, re-entered score** | Nothing to do: a reversal deleted the events and a re-entered score wrote new ones at the new completion. A cancelled Round goes through the same door (`cancelRound.ts:156`). | **Yes, with one gap.** A reversal after a later Level override leaves the Rating as it was (`reportWrongScore.ts:371-381`). The replay treats that Match as never rated; only φ could differ, since the override set μ. |
| **Reliability loss factor (ADR-0095)** | Used as it was: Reliability is moved by Performance ratings, not by Levels, so the replay does not change it or write it. | **Not as stored today.** Only the μ it added is stored (`reliability_part`). Part 2 stores the factor itself (D5); for events older than that the replay derives it once as `1 + reliability_part / (mu_after − mu_before − reliability_part)` and writes it. |
| **Guest player (ADR-0079)** | Stands in at the mean of the others, unrated, as `guestStandInState` does. | **Yes** (`user.guest_at`). |
| **Unclaimed player merge** | A seat with no event on a Rated Match plays as a Guest player **[RQ-6]**. | **No.** The merge deleted that Rating and its history (2.5). On a King of the court Game a merged-away player below fourth place cannot be told from the survivor, so the field uses the survivor's Rating. |
| **Seats changed after rating** | Checked: every rated User must sit on one of the Match's two sides and partners must share an outcome. A decisive Match that fails is rebuilt from the scores (winners together). A drawn one cannot be rebuilt and is carried over **[RQ-7]**. | **Not verified.** I found no guard in `games.kick` that stops an Organizer removing a player after a Match was rated, and did not trace it to the end. |
| **Soft-archive, deleted Group, cancelled Game** | Ignored. Soft-archive is a Venue's. A deleted Group's or cancelled Game's rated Matches keep their events, so they still count, as they do today. | **Yes.** |
| **Group Level (retired)** | Untouched: `group_ratings` and `group_rating_events` are a separate ledger. | Not applicable. |

### 9.3 Starting state of each player

- **Declared, band recovered** (2.6): μ at the band's midpoint, φ from the new table, σ 0.06, band as declared, `declared_band` written. A stored D1, which includes every "Not sure", is a declared D+ at φ 150.
- **"I don't know"** (start μ 1500 with `self_declared_at` set): φ 350, band C2, no Declared band.
- **Declared, band not recovered** **[RQ-5]**: the recorded start μ is kept, the band that μ falls in gives φ and becomes the Declared band.
- **Never declared** (no `self_declared_at`): no Rating until their first Match, override or award creates one from μ 1500, φ 350, as today.

### 9.4 Order and engine

1. Load every padel row of `ratings`, `rating_events`, `level_overrides` and `king_place_awards`, with each event's Match, its two Game teams, the Game's Group (for the confirmation count) and each seated User's `guest_at`.
2. Build one time line of units: a Match (its events share one `created_at`), a Level override, a Game's Place awards. Order by `created_at`, then by kind, then by id. Units at the same instant that share a player are listed in the report.
3. Walk it once, holding each player's state (μ, φ, σ, band, `last_rated_at`), their count of Group Matches so far and whether an override has come.
   - **Match:** build the four inputs; set `proveIt` from the Declared band and the confirmation as it stood before the Match; pass the stored Reliability factor; call `rateDoublesMatch` with the stored weight and the event's `created_at` as `now`.
   - **Override:** as in 9.2.
   - **Awards:** rebuild the field from every non-Guest player with a starting court, then each placed pair, exactly as `applyKingPlaceAwards` does.
4. The engine is a pure function from the loaded ledger to the new values. It calls the same domain functions the live writers call; the property test in section 17 is what holds the two together.

### 9.5 What is rewritten

| Table (padel rows only) | Columns written | Never written |
| --- | --- | --- |
| `ratings` | `mu`, `phi`, `sigma`, `level_band`, `last_rated_at`, `declared_band`, `updated_at` | `reliability`, `self_declared_at`, the row's existence |
| `rating_events` | the six before and after values, `level_band_before`, `last_rated_at_before`, `reliability_part`, `prove_it_part`, `reliability_loss_factor` | `user_id`, `match_id`, `outcome_score`, `weight`, `created_at` |
| `king_place_awards` | `field_mu`, `field_phi`, the before and after values, `level_band_before`, `last_rated_at_before` | `wins`, `final_place`, `had_rating`, `created_at` |
| `level_overrides` | the before values, `phi_after`, `sigma_after` | `mu_after`, `level_band_after`, who, why, `created_at` |

No row is inserted or deleted in these tables. Confirmation counts are not stored (ADR-0080), so there is nothing to rewrite, and the count cannot change.

### 9.6 Everything that reads those values

| Reader | After the replay | Verified |
| --- | --- | --- |
| Level, band and "To confirm" on Home, You, Player profile, Members lists, line-ups | Recomputed: read from `ratings` on every request. | Yes |
| Rating history, the Home Level chart, a played Game's rating impact, Match history moves | Recomputed: read from the ledger rows. Every past line shows the recalculated move. | `routers/ratings/history.ts`, `routers/games/byId.ts:1100-1150` |
| Standing: places and points, open and closed Seasons | Unchanged: 3, 1, 0 by result, never a Level. | Glossary and ADR-0045; not re-read |
| Standing's By level and Most improved, open and closed Seasons | Recomputed on read: the Level "at close" is walked back from the ledger's before-values, nothing is stored (`routers/groups/standingLevels.ts:68-76`, `:132-200`). A closed Season's categories and its Most improved order can change. **[RQ-3]** | Yes |
| Game Level range, Challenge Level wanted, Team Level | Evaluated when someone joins, proposes or opens the page; the tables hold only the bounds in tenths (`games.level_min_tenths`, `challenges.level_min_tenths`). Past admits, decided Level range requests and confirmed Challenges stay. A player already seated on an upcoming Game whose new Level is outside its range stays seated; the report counts them. | Schema yes; that nothing re-checks a seated player is inferred |
| In-app Notifications | Built on read. A Place award notice quotes the Level before and after from the award row and will show the recalculated numbers (`notifications/load-notification-items.ts:248-269`). A Level set notice quotes `mu_after`, which does not change. No Notification quotes a padel Rated Match's move: the only event read there is football's (lines 143-153). | Yes |
| Notification emails, shared Result cards, shared Standing images, PDFs and CSVs | **Cannot be recomputed.** They left the product. | n/a |
| "Level confirmed" milestone and Notification | Unchanged: the same fifth Match. | Yes |
| Reliability, Performance rating results | Unchanged, not written. | Yes |
| Server caches | None found for Levels. The Apps' own query caches refresh on the next fetch. | grep only |

### 9.7 Football

The replay is padel only. Every query and every `UPDATE` carries `sport = 'padel'`; `ratings` is unique on `(user_id, sport)`, so a football Rating is a different row; Place awards exist only on padel; `group_tier_events` and `group_ratings` are never read. The engine refuses a football row at its boundary, and a test asserts a football fixture is byte-identical after an apply.

### 9.8 Safety

- **Dry run is the default.** One read-only, repeatable-read transaction. It prints the database host and writes a per-player CSV with `--report <path>`.
- **The report.** Counts of players, Matches, events, overrides and awards; how each Declared band was recovered (never played, first Match, first override, first award), "I don't know", and the players placed by **[RQ-5]**; per player the Level, band and φ before and after; how many move by 0.01 or more; the twenty largest moves up and down; every player whose band letter changes; players crossing the confirmation line, which must be zero and fails the run otherwise; seated players on upcoming Games now outside the Level range; and the anomalies: Matches with a missing seat **[RQ-6]**, rows carried over **[RQ-7]**, units at the same instant, and how long loading and computing took.
- **Baseline pass.** The report also replays under today's rules (φ 350, no Prove-it rule) and counts how many stored events that reproduces. The rest were rated under an earlier formula or carry something the ledger does not explain, which tells the owner how much of each move comes from **[RQ-1]** and how much from the new rules.
- **Backup in the same transaction.** `--apply` copies every row it is about to change into `rating_replay_backups` under a new `rating_replay_runs` row, then writes. `--restore <run id>` writes them back, and refuses if any padel ledger row is newer than the run: after the next Rated Match the fix is forward, not back. A database backup on the host before the run is a human step in the runbook.
- **One transaction, not resumable.** Glicko-2 is sequential: a half-applied replay leaves Ratings that match neither rule set, and a resumable design would have to block rating writes for its whole length anyway. All or nothing is simpler and safer.
- **While the API is live.** The apply transaction first takes `LOCK TABLE ratings IN EXCLUSIVE MODE` with a `lock_timeout`, then loads, computes and writes. Every padel rating writer locks or writes `ratings` rows before it writes a ledger row (`apply-rated-match.ts:362-367`, `apply-level-override.ts:165-171`, `apply-king-place-awards.ts:161-172`, `reportWrongScore.ts:353-358`, `selfDeclare.ts:56`, the merge), so a Match completing mid-run waits and is then rated on top of the replayed values. Reads are not blocked. Football rating writes wait too, for the same seconds. No maintenance window is needed if the dry run's timing is a few seconds; if it is not, run it with the API's Job queue and rating doors paused. Run it at a quiet hour either way.
- **Idempotent.** Only rows whose values differ are updated. A second run computes the same values from the same inputs, finds no difference, writes nothing and records no run.

### 9.9 Telling players **[RQ-2]**

In the apply transaction, one `level_recalculated` Notification for each account holder whose padel Level changes on the two-decimal face or whose band letter changes, written as already emailed so no Notification email goes out (the email Job skips a row with `emailed_at`, `jobs/handlers/notification.email.ts:33`). The copy carries no numbers: it says the Level was recalculated under the new rules and opens the Ratings screen.

### 9.10 Where it lives and when it runs

- Engine, loader, writer and report in `packages/api/src/ratings/padel-replay.ts`; a thin command in `packages/api/scripts/replay-padel-ratings.ts`; `"db:replay-padel-ratings"` in `packages/api/package.json`, beside `db:backfill-operators`. `@repo/api` may import `@repo/db` and `@repo/domain`; `@repo/db` may not import the rules, `@repo/domain` may not touch the database, and `apps/web/scripts` is for flow recorders.
- Commands: `pnpm --filter @repo/api db:replay-padel-ratings` (dry run), `-- --report <path>`, `-- --apply`, `-- --apply --carry-unplaced`, `-- --restore <run id>`.
- **Order** **[RQ-4]**:
  1. Part 1 deploys. New declarations get the new φ. Existing players are untouched.
  2. Part 2 and the replay's migration and code deploy. Existing players have no Declared band yet, so the Prove-it rule skips them on live Matches; the replay applies it to those Matches afterwards.
  3. Dry run against production; the owner reads the report; database backup; apply.
  4. Part 3 deploys only after the apply. The replay does not run again: its command refuses once `level_check_results` has a row, because a Level check moves a Rating and the engine does not replay one.
- Recorded in `packages/api/README.md` as a runbook, beside the Operator backfill.

### 9.11 Size check

The owner runs this against production before the dry run; the planner cannot reach it.

```sql
select
  (select count(*) from rating_events where sport = 'padel') as padel_events,
  (select count(distinct match_id) from rating_events where sport = 'padel') as padel_rated_matches,
  (select count(distinct user_id) from rating_events where sport = 'padel') as players_who_played,
  (select count(*) from ratings where sport = 'padel') as padel_ratings,
  (select count(*) from ratings where sport = 'padel' and self_declared_at is not null) as declared,
  (select count(*) from level_overrides where sport = 'padel') as padel_overrides,
  (select count(*) from king_place_awards where sport = 'padel') as place_awards,
  (select count(*) from rating_events where sport = 'padel' and reliability_part is not null) as events_with_reliability,
  (select count(*) from user_merges where summary -> 'ratingKeptBySport' ? 'padel') as merges_that_dropped_a_padel_rating,
  (select min(created_at) from rating_events where sport = 'padel') as first_padel_event;
```

Computing is in memory and takes microseconds per event; the writes are one batched `UPDATE` per table. The dry run prints its own load and compute time, which is the lower bound for the lock.

### 9.12 Prototype

`prototype/replay.ts` writes a synthetic history of 60 Matches and one Level override for 12 players under today's rules, then replays that ledger as 9.3 and 9.4 describe, through the real `rateDoublesMatch`.

| Player | Declared | Plays like | Matches | Stored Level, band, φ | Replayed | Move |
| --- | --- | --- | --- | --- | --- | --- |
| essa | D+ | 1.8 | 23 | 2.20, C-, 143 | 1.97, D+, 106 | −0.23 |
| lulwa | none | 2.9 | 15 | 2.81, C-, 160 | 2.54, C-, 143 | −0.28 |
| jana | C+ | 3.9 | 15 | 4.19, C+, 145 | 4.03, C+, 133 | −0.16 |
| isa | C+ | 2.4 | 15 | 2.71, C-, 162 | 2.75, C, 138 | +0.05 |
| dana | D, set to 2.6 by hand | 3.1 | 21 | 2.60, C-, 114 | 2.58, C-, 105 | −0.03 |
| mona | C | 3.0 | 14 | 2.97, C, 176 | 2.97, C, 153 | 0.00 |

Ten of twelve players move by 0.01 or more, two change band letter, the largest move is −0.28, and it belongs to a player who declared nothing: her own rules did not change, her opponents' Levels did. Both properties the tests rest on hold: a second replay changes nothing, and a history written under the new rules replays to itself exactly.

## 10. Permissions

- `ratings.selfDeclare`, `users.completeOnboarding`: unchanged.
- `games.submitLevelChecks`: a seated account holder of the Match, while the window is open; never about themselves; only about a seated player with a padel Rating.
- Reading: a player reads their own ballots and their own verdict. Nobody reads another player's ballots, and no door lists who answered what, an Organizer and an Operator included.
- The replay has no procedure. It is a command run with the database URL.

## 11. API (all additive, one procedure per file)

| Procedure | Change |
| --- | --- |
| `ratings.selfDeclare`, `users.completeOnboarding` | Inputs unchanged. `selfDeclareRating` writes `declared_band`, passes the sport to `initialRatingFromChoice`, and returns `tembaLevelView` so a D declarer reads Provisional. |
| `games.performanceRatingSheet` | Adds `levelCheck`: null when the Match asks none, else each other player's shown band and the viewer's own answers. |
| `games.submitLevelChecks` (new) | The viewer's whole set of answers: each listed player's band is written or changed, a player left out loses the viewer's earlier answer. Refused once the window is no longer open. |
| `games.performanceRatingResult` | Adds `levelCheck`: the viewer's verdict band, the Level before and after and the ballots counted, or why none settled (too few answers, no opponent answered). |
| `games.byId` | The padel rating impact carries `proveItPart`. |
| `ratings.history` | A `level_check` entry, a fifth source in the union. |
| `notifications.*` | A `level_recalculated` item **[RQ-2]**. |

Server modules: `applyTembaRatedMatch` reads `declared_band` from the rows it already locks and `padelConfirmations` before it writes events, and stores `prove_it_part` and `reliability_loss_factor`. `settleRatingWindow` settles the Level check on a padel window after Reliability. `suspendRatingWindow` takes the results back and keeps the ballots; `reportWrongScore` calls it before it restores the Match's events (D11). The padel branch of `applyRatedMatch` also opens the window on a padel Public Game **[OD-4]**. `merge-into-account.ts`, `routers/users/myProfile.ts`, `routers/ratings/me.ts`, `routers/groups/standingLevels.ts` **[Q12]**, `routers/games/listMyMatchHistory.ts` and `notifications/load-notification-items.ts` each treat `level_check_results` where they treat `king_place_awards`, and the merge moves both new tables with the Rating.

## 12. Clients

View-models live in `@repo/domain/level-check` and are rendered twice.

- **Declaring** (web `declare-level-dialog.tsx`, both `onboarding-questionnaire.tsx`): no change to what is sent. One line under the picker says what a C or above declaration means until the Level is confirmed.
- **Rate the game** (web `rate-game-page.tsx`, mobile `rate-game-screen.tsx`), padel only: under each of the three other players, the question "What level did {name} play at?" and the nine display bands in one row, opened on the band the player shows, which is marked "now". Nothing is selected until tapped; a blank is not an answer **[OD-2]**. Opponents are not marked optional: the check needs one. Submit sends the Level check answers, then the ratings.
- **Played game** (both `performance-result-card.tsx`): once the window settles, "Players placed you at {band}" with the Level before and after, or "Agreed with your level", or why nothing settled. The padel rating impact adds one line when the Prove-it rule applied.
- **Rating history** (both Apps' Ratings screens): a "Level check" line with the Game, the verdict band and the move.
- **Notifications** (both Apps): the `level_recalculated` item opens the Ratings screen **[RQ-2]**.
- **Mobile design rules.** Black and white, roles from `useColors()`, hairlines, text through `Text`, sizes from `@repo/design-tokens`. A selected band is Solid (`control`); an unanswered row is a `Hatch` slot. No new mount animation.
- The console has no rating UI and is unchanged.

## 13. Notifications

- `performance_ratings_open` on padel says the screen also asks for levels. `performance_ratings_closed` on padel goes to each account holder whose rating or Level check settled, once, and reads the verdict and the Level move beside the rating and Reliability (D13).
- `level_recalculated` (new) **[RQ-2]**: once per player, from the replay's apply, in the app only.

## 14. i18n

Every string in `en/` and `ar/`, read by property access. Proposed keys, with the English copy; the Arabic is written with the ticket and confirmed by the owner.

- `rating.ts`, new `levelCheck` block: `question(name)` "What level did {name} play at?" (proposed Arabic: "بأي مستوى لعب {name}؟"); `now` "now"; `notAnswered`; `bandSpoken(name, band)`; `footnote` "Your answers are averaged with the others' and can move a level. Nobody sees who gave what."; `result.placed(band)`, `result.agreed`, `result.moved(from, to)`, `result.tooFew(n, min)` through `plural()`, `result.noOpponent`; `history.title` "Level check", `history.line(band)`; `errors.self`, `errors.notPlayer`, `errors.closed`, `errors.noWindow`.
- `rating.ts`, changed: `performance.padel.footnote` no longer says ratings do not move a level; `performance.entry.padel` names both questions.
- `rating.ts`, new: `proveIt.line` "You declared {band} and lost to a pair at your level, so this loss counted one and a half times."
- `level.ts` and `onboarding.ts`: `declare.proveItHint`, one line under the band picker. `padelNotSure` is unchanged.
- `notification.ts`: the padel variants of the open and closed notices, and `levelRecalculated` "Your padel level was recalculated under the new level rules. Open Ratings to see where you stand." **[RQ-2]**
- Surface-only strings go in `web-game.ts` and `mobile-game-details.ts`.

## 15. Migration of existing behaviour

- New declarations get the new φ from the day Part 1 deploys. Existing Ratings keep theirs until the replay.
- Between Part 2's deploy and the replay, the Prove-it rule skips existing players (no Declared band yet). The replay then applies it to those Matches as well, so nothing is uneven afterwards.
- The replay is the one exception to "nothing is replayed" (ADR-0070), recorded in its own ADR. It also brings Matches rated before ADR-0070 under the partner-weighted formula **[RQ-1]**.
- Level checks start with the first Match completed after Part 3 deploys, which is after the replay **[RQ-4]**.
- The Mobile App is not released (Phase 7), and every API change here is additive anyway.

## 16. Documentation the tickets will change

ADRs, numbered at writing time (the next free number is 0096; four ADRs share 0087 and two share 0089, so check first):

1. **A padel declaration sets the starting φ** (Part 1). Amends ADR-0009. Records the table, `declared_band`, padel only, "Not sure" as a declared D+, Organizer picks **[Q6]**.
2. **A declared C or above loses more at its own level until confirmed** (Part 2). Amends ADR-0070 (the padel step) and ADR-0095 (the larger loss factor applies; the factor is stored). Consequences: the pool deflates a little, only from unconfirmed players; a Public Game-only player stays under it **[Q11]**.
3. **Padel Levels were recalculated once under the declared-band rules** (the replay). Amends ADR-0070 ("New Matches only"). Records what was and was not replayed, today's formula for every Match **[RQ-1]**, overrides kept as set, closed Seasons re-read **[RQ-3]**, the inputs the ledger did not hold (9.2), the backup and the one run **[RQ-4]**.
4. **The other players check a padel Level** (Part 3). Amends ADR-0068 (the window asks a second question on padel), ADR-0095 (peers now move a padel Level; a padel Public Game opens a window **[OD-4]**) and ADR-0011's reversal rule (D11). Records the own ledger, bands over a three-way answer **[OD-2]**, on after confirmation, the weights and the cap.

`CONTEXT.md`: section 4, each term with its first ticket. `packages/api/README.md`: the replay runbook.

## 17. Testing

- **Domain, beside each module.** `level.test.ts`: the φ table by band, football and "unknown" unchanged, D1 at 150. `rate-doubles-match.test.ts`: a same-level loss moves 1.5 times as far and stores the part; a win, a draw, a loss outside 0.25 to 0.75, a confirmed player and a D declarer do not; with low Reliability the larger factor applies and the two parts add up to the extra; the partner and opponents move as before. `level-check.test.ts`: the median for two and three ballots, weights, the opponent rule, agreement moves no μ and narrows φ, the cap, weight 0.5, the shares in 8.4, outliers, and the doc's worked cases as fixtures.
- **Procedures, through the plain exported function on PGlite** (`@repo/db/testing`). `selfDeclareRating` writes the band and φ per sport. `applyRatedMatch`: the rule on the fifth Verified Group Match and not the sixth; not after a Level override; the stored factor. `submitLevelChecks`: seated only, never self, whole-set semantics, closed window. `settleRatingWindow`: one ballot settles nobody; two partners' ballots alone settle nobody; a settled verdict writes the result, the Rating and the band; idempotent. `reportWrongScore`: the Match's check is taken back before its events; a check from an earlier Match that settled later survives; a Level override since leaves the Rating alone. `ratings.history`: the new line, in order. The merge moves ballots and results.
- **Replay engine, pure.** A fixture per input in 9.2: Matches at weight 1 and 0.5; an idle gap of more than 30 days; a Level override before, between and after Matches, and one that created the Rating; a Place award, a corrected one, and a placed player with a Guest partner; a Match reversed and re-entered; a loss with a stored Reliability factor, and an old one with only `reliability_part`; a Guest player; a Match with three events after a merge; a drawn Match whose seats no longer fit; a declared band per row of the table, "I don't know", an unrecognised start μ and a player who never declared.
- **Replay properties.** (1) A history generated by the live writers under the new rules, with every input kind above, replays to exactly the stored values: no row differs, bit for bit. (2) A second apply writes nothing and records no run. (3) The baseline pass over a history generated under today's rules reproduces it exactly. (4) No replay changes any player's count of confirming Matches.
- **Replay on PGlite.** The dry run writes nothing; apply writes only differing rows and backs each one up; restore returns every table to its bytes; restore refuses after a later Rated Match; a football Rating, its events and a Group Tier are byte-identical after an apply; `level_recalculated` goes only to players whose shown Level changed and carries `emailed_at`; the command refuses once a Level check result exists.
- **Schema.** `constraints.test.ts` and `foreign-key-indexes.test.ts` cover the new tables.
- **Seed.** A Verified padel Group with a settled Level check, an agreed one and a player under the Prove-it rule.
- The gate for every pull request stays `pnpm exec turbo run typecheck lint test`.

## 18. Non-goals

- Football. Its φ comes from its count of counting Matches (ADR-0069), and the replay cannot touch it.
- Replaying Level checks, or running the replay again after Part 3.
- Applying older formulas by date in the replay **[RQ-1]**.
- Freezing closed Seasons' By level tables **[RQ-3]**, or re-checking players already seated on a Game against its Level range.
- A "recalculated" line in Rating history **[RQ-2]**.
- A Level check on tournament Matches, Americano, King of the court or Challenge Games.
- Changing or removing the padel 1 to 10 Performance rating or Reliability.
- Letting a player change their Declared band.
- A stored judgement of a rater, or any screen that shows who answered what.
- Console changes.

## 19. Risks

- **R1 Collusion.** Four players who agree to answer high can each gain up to 0.35 Level a Match on a Club Group, which no rule here stops: they include an opponent and agree with each other. The owner accepted this (U1). Mitigation: the cap, the opponent rule, φ falling with every check, and a ledger row an Operator can read.
- **R2 Levels change with no Match behind the change.** After the replay a player opens the App to a different Level, band or both, for nothing they did. In the prototype ten of twelve moved. Mitigation: the dry-run report the owner reads first, and the Notification **[RQ-2]**.
- **R3 Opponents' histories change too.** A player whose own declaration rules did not change still moves, because everyone they played did. The largest move in the prototype belongs to such a player.
- **R4 Rating history is rewritten, not appended.** Afterwards every past Match line shows the recalculated move, and the old numbers are only in the backup. A player who remembers "+0.35 that night" will not find it.
- **R5 Two changes land at once** **[RQ-1]**. The replay applies the declared-band rules and today's partner-weighted formula to old Matches together. The baseline pass in the report separates the two.
- **R6 Parts 1 and 2 slow correction until Part 3.** A wrong D declaration corrects more slowly than today (8.5), and the replay applies that to the past as well: a player who declared D and has won their way up is pulled back towards D. The Level override stays the fix in between.
- **R7 Inputs the ledger does not hold** (9.2): merged-away seats, seats changed after rating, a reversal behind an override. Each is rare, reported, and has a stated rule.
- **R8 The lock.** Rating writes wait while the apply runs. If the production ledger is much larger than expected, that is a visible stall. Mitigation: the size query and the dry run's timing come first.
- **R9 Restore has a short life.** After the next padel Rated Match the backup can no longer be written back safely.
- **R10 Thin anonymity.** With three raters, a verdict tells a player a lot about who said what. The 1 to 10 result already has this property.
- **R11 Stacked penalties.** An over-declared player can meet the Prove-it rule, low Reliability and a downward Level check in one Match. Mitigation: the larger loss factor applies (U3), and the check is capped.
- **R12 Reversal.** A wrong-score reversal after a later Level check restores μ by subtraction, not exactly (D11).
- **R13 Vocabulary.** "Level check", "Prove-it rule", "Declared band" and "Level recalculation" are not in the glossary until section 4 lands with the first ticket of each part.

## 20. Open questions, with the default taken

Settled by the owner: U1 to U4 (5.1). Each default below is in force unless the owner says otherwise; the tag is where the spec changes.

1. **[OD-1]** Padel Provisional means not yet confirmed. Already true.
2. **[OD-2]** Pick a band; nothing preselected; agreement moves no Level.
3. **[OD-4]** Friendly games on every Verified Group at the Game's weight, and padel Public Games.
4. **[Q6]** An Organizer's pick for an Unclaimed player is a Declared band.
5. **[Q7]** The φ 250 patch is assumed never deployed.
6. **[Q10]** No extra weight for an Operator or a Level setter on a Level check.
7. **[Q11]** The Prove-it rule ends only at confirmation.
8. **[Q12]** A Level check is not improvement in Most improved.
9. **[RQ-1]** The replay uses today's formula for every Match.
10. **[RQ-2]** Players whose shown Level changed are told once, in the app, with no email and no Rating history line.
11. **[RQ-3]** Closed Seasons' By level and Most improved re-read from the replayed ledger.
12. **[RQ-4]** The replay runs once, after Part 2 and before Part 3.
13. **[RQ-5]** An unrecognised start μ is kept, and its band becomes the Declared band.
14. **[RQ-6]** A merged-away seat plays as a Guest player.
15. **[RQ-7]** A row that cannot be recomputed is carried over, and the apply needs a flag to proceed.
16. Arabic copy for the new keys, for the owner to confirm.

## Comments
