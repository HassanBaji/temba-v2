# Padel Level: trusting the declared band

Status: draft for the owner's review, 2026-11-16. No ticket exists yet. The owner's four open decisions and eight further questions (section 5) are **not answered**; this spec is written against the planner's recommended answer to each, and every place that depends on one carries its tag (**[OD-1]** to **[OD-4]**, **[BF]**, **[Q5]** to **[Q12]**) so one pass can revise it. `CONTEXT.md` and `docs/adr/` are unchanged; sections 4 and 16 list what the tickets will change.

Source: the owner's design doc "Padel Level: trusting the self-declared band" (2026-11-16, five pages). Its rules and numbers are the source of truth. Where the code disagrees with it, section 2.9 says so.

Builds on `.scratch/user-ratings/spec.md`, `.scratch/set-level/spec.md`, `.scratch/rating-redesign/spec.md` and ADR-0068, ADR-0070, ADR-0080, ADR-0089 and ADR-0095.

Audited at `195ffab1` on `claude/focused-gates-vu41vb`. Prototype: `.scratch/padel-declared-band-trust/prototype/simulate.ts` (section 8.5).

## 1. Problem

A padel player who declares a Level band starts at that band's midpoint with φ 350, the same uncertainty as a player who said "I don't know". The declaration sets the starting Level and carries no confidence, so one even win moves a D declarer +0.35 Level, half a band, for a result that only confirms what they declared.

The owner wants three things, in this build order:

1. **Start φ by declared band.** D, D+ and C- declarations are trusted: results against players at the same Level move them almost like a confirmed Level.
2. **A "prove it" rule.** C and above have to be proven: until the Level is confirmed, a loss to a pair at about the same level costs one and a half times as much. Wins count normally.
3. **A level check.** After a Match the other three players say what band the player played at. Their median answer is one measurement of the Level, weighed by the player's φ, so it counts most while the Level is new.

And a script that brings existing players in line.

## 2. Discovery: current behaviour

Verified by reading the code at the audited commit, unless marked inferred.

### 2.1 How a padel Rating is created from a declaration

- `selfDeclareRating` (`packages/api/src/routers/ratings/selfDeclare.ts:27-93`) is the one writer. It refuses after a Rated Match or an earlier declaration, calls `initialRatingFromChoice(choice)` (line 52) and inserts the `ratings` row with `self_declared_at` (lines 56-68). The choice itself is not stored.
- `initialRatingFromChoice` (`packages/domain/src/level.ts:285-303`): a band gives `muFromBand(choice)`, the band's midpoint, with `phi: INITIAL_PHI`; `"unknown"` gives μ 1500 (Level 3.0, band C2) with the same φ. It takes no sport.
- Constants (`level.ts:14-24`): `INITIAL_PHI = 350`, `PROVISIONAL_PHI_THRESHOLD = 200`, `LEVEL_OVERRIDE_PHI = 150`, `RATED_MATCHES_TO_CONFIRM = 5`.
- Callers of `selfDeclareRating`: `ratings.selfDeclare`; `submitOnboarding` (`routers/users/completeOnboarding.ts:208-219`) for padel **and football**; `createUnclaimedPlayer` (`unclaimed-players/create-unclaimed-player.ts:63`), where an Organizer picks the band for someone else; the seed.
- **"Not sure" is stored as a D+ declaration.** Both onboarding questionnaires send `PADEL_NOT_SURE_LEVEL = "D+"` (`packages/domain/src/onboarding-answers.ts:138`; web `onboarding-questionnaire.tsx:262`, mobile `onboarding-questionnaire.tsx:213`), which becomes stored band D1. Only the web Home declare dialog and a blank onboarding answer send `"unknown"`.
- Football self-placement maps four words to bands and goes through the same function (`football-self-placement.ts:42`, `:79-84`). A football Rating's φ carries its Provisional (ADR-0069), so a lower start φ on football would read as confirmed.

### 2.2 How a Match moves a padel Level

- `applyRatedMatch` (`packages/api/src/ratings/apply-rated-match.ts:222-327`) calls `applyTembaRatedMatch` (lines 333-451), which locks the four `ratings` rows, calls `rateDoublesMatch`, writes one `rating_events` row per player and updates the Rating.
- `rateDoublesMatch` (`packages/domain/src/rate-doubles-match.ts:138-189`): idle inflation, then each player faces the opposing pair's mean μ and φ, shifted by half the gap to their partner (ADR-0070), so both partners share one expected score.
- `ratePlayer` (`rate-doubles-match.ts:110-129`): `glicko2Step`, then `blendWeightedStep` by the Game's weight (lines 88-98, which blends μ, φ and σ), then on a loss `reliabilityPart = (lossFactor − 1) × step`. **A loss multiplier already exists**: `lossFactor` comes from Reliability (ADR-0095, `level-reliability.ts:50-57`), 1 at 100 and 1.5 at 0. The expected score is not exposed: `expectedScore` in `glicko2.ts:54-60` is private.
- Weight (`packages/api/src/ratings/game-rating-weight.ts:11-43`): 1 on a Club Group and on a Public Game, 0.5 on any other Group (an Operator-verified Loose Group) and on a groupless Game (a padel Challenge Game).

### 2.3 Confirmed and Provisional

- A padel Level is confirmed by five Rated Matches in a Verified Group or by any Level override (ADR-0080). `padelConfirmations` (`packages/api/src/ratings/level-confirmed.ts:67-108`) counts padel `rating_events` rows whose Game has a Group (`padelVerifiedEvent`, lines 56-59) and reads `level_overrides`.
- `tembaLevelView` (`level.ts:322-338`) turns that into Provisional for padel and ignores φ. The 200 threshold (`isProvisional`, `level.ts:243-245`) decides Provisional only on football and on retired Group Levels.
- One reader still uses φ for a padel Temba Level: `selfDeclareRating` returns `youRatingViewFromState(created)` (`selfDeclare.ts:77`). No client reads that return today (web `home-level-block.tsx:27-32` only invalidates).
- A Level override writes `φ = min(φ, 150)`, sets Reliability to 100 and appends `level_overrides` (`apply-level-override.ts:142-237`).

### 2.4 The Rating window, as it is today

- ADR-0068 made it for football. **ADR-0095 (merged 2026-11-16) already opens one on padel**: a padel Friendly game on a Verified Group (`apply-rated-match.ts:315-326`), Everyone mode, weight 0 (`settle-rating-window.ts:130-146`). Public Games, Challenge Games and tournaments open none.
- Players give a 1 to 10 Performance rating (`performance_ratings`, CHECK 1 to 10, unique per Match, rater and ratee). Ballots are hidden; two ballots settle a padel player (`PADEL_MIN_BALLOTS`, `performance-rating.ts:46`); an outlier rater counts half (`outlierRaterIds`, `performance-rating.ts:312-340`); an Operator's or Level setter's ballot weighs three times.
- `settleRatingWindow` (`settle-rating-window.ts:510-683`) runs from the `rating-window.settle` Job or on the next read. On padel it only moves Reliability (`applyReliability`, lines 692-736) and notifies (`notifyReliabilityRatingsClosed`, lines 809-845).
- A wrong-score report calls `suspendRatingWindow` (lines 950-968): results are deleted, Reliability is given back, ballots stay.
- The screen exists on both Apps: web `apps/web/src/components/games/rate-game-page.tsx` at `/dashboard/games/[id]/rate`, mobile `apps/mobile/src/game-details/rate-game-screen.tsx`. Procedures: `games.performanceRatingSheet`, `games.submitPerformanceRatings`, `games.performanceRatingResult`. The padel footnote reads "Ratings do not move a level" (`packages/i18n/src/messages/en/rating.ts:501-502`).

### 2.5 Ledgers and reversal

- `rating_events` is unique on `(user_id, match_id)` and has NOT NULL `outcome_score` and `weight` (`packages/db/src/schema/ratings.ts:85-133`). Every row is read as one Rated Match: the confirmation count, `userHasRatedMatch`, the wrong-score gate.
- A King of the court Place award moves a Level without a Rated Match, so it has its own ledger, `king_place_awards` (ADR-0089), and its own line in Rating history, which is already a union over four tables (`routers/ratings/history.ts:124-201`).
- `reportWrongScore` (`routers/games/reportWrongScore.ts:342-407`) restores μ, φ and σ to the before-values on the Match's events, and is allowed only when the event is each seated User's latest padel event and no Place award came after (`games/wrong-score-reversal.ts:30-80`). A Place award is taken back differently: exactly when nothing has touched the Rating since, otherwise by subtracting its μ move (`apply-king-place-awards.ts:41-87`).
- `merge-into-account.ts` moves or deletes `ratings`, `rating_events`, `level_overrides`, `king_place_awards` and the Performance rating tables when an Unclaimed player is claimed.

### 2.6 Recovering what was declared

- No table stores the declared band. `ratings.self_declared_at` says a declaration happened.
- For a Rating with no ledger row (no `rating_events`, `level_overrides` or `king_place_awards`), μ is still exactly the band midpoint, and the midpoints are whole numbers of μ (175, 525, 875, 1225, 1575, 1925, 2275, 2625, 2975, 3325), so the band is read back without rounding. μ 1500 is "unknown".
- For a Rating that has moved, the earliest ledger row holds `mu_before`, which is the declared μ: idle inflation never touches μ, and a reversal deletes the event and restores the Rating. So the band is recoverable for players who have played too.
- Not verifiable from the Workspace: whether earlier versions of the product used other midpoints. The script therefore matches exactly and reports what it cannot place (section 9).

### 2.7 Scripts and replay

- `packages/api/scripts/` holds `seed.ts`, `backfill-operators.ts` (the precedent: `tsx --env-file-if-exists=.env`, prints the database host, safe to rerun, documented in `packages/api/README.md`) and two football pitch scripts. `apps/web/scripts/` holds flow recorders.
- **No replay or recompute path exists.** Nothing rebuilds Ratings from Matches. ADR-0070 ("New Matches only. Nothing is replayed") and the rating redesign's non-goals say so on purpose.

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
3. **Padel already has a Rating window, a 1 to 10 rating and a loss multiplier** (ADR-0095, merged the day the doc was written). The doc calls the window football's. Parts 2 and 3 overlap it. **[Q8]** **[Q9]**
4. **A level check cannot be a `rating_events` row.** One row per User and Match is a unique constraint, and each row counts as a Rated Match towards confirmation. It needs its own ledger, as the Place award has.
5. **"After a padel Rated Match"** is wider than where a window opens today: Friendly games on Verified Groups only. **[OD-4]**
6. **"I don't know" is two different answers.** The onboarding "Not sure" is a stored D+ declaration; the web dialog's "I don't know" is μ 1500 (C, 3.0). **[Q5]**
7. **`selfDeclareRating` also places football players and Unclaimed players.** The φ table must be padel only, and an Organizer's pick is not a self-declaration. **[Q6]**
8. **"Pick a band" has nine choices, not ten.** The face shows D for both stored D3 and D2.
9. **"Provisional raters count half" and "at least one opponent" are new.** The existing rule is about the rated player: a Provisional player's Reliability moves twice as far.
10. **A declared D reads 1.00 before and after its first wins** (ADR-0070 floors the padel face at 1.0, and D3 and D2 both read "D"). The +0.35 is real in the stored Level, which gates Game Level ranges and Team Level, but the player does not see it.

## 3. Solution in one paragraph

A padel declaration is remembered (`ratings.declared_band`) and sets the starting φ: 150 for D and D+, 200 for C-, 250 for C and above, 350 with no band. While a player who declared C or above is not yet confirmed, a loss to a pair at about their level moves them one and a half times as far (the **Prove-it rule**). After a padel Friendly game that counts for Temba Level, the Rate the game screen also asks each player what band the others played at; when the Rating window settles, the median of at least two answers, one from an opponent, is blended into the player's Level as one measurement (a **Level check**), capped at 0.35 Level, written to its own ledger and shown in Rating history. A script fills `declared_band` for existing players and lowers φ for those who declared and have not played.

## 4. Glossary changes (to land in `CONTEXT.md` with the tickets)

New terms:

- **Declared band**: the Level band a padel player picked for themselves, or an Organizer picked when adding them by phone **[Q6]**, kept on the Rating (`ratings.declared_band`). Written once, never changed by a Match or a Level override. None for "I don't know" and "Not sure" **[Q5]**. It sets the starting φ and decides whether the Prove-it rule applies. _Avoid_: self-rating, initial level, Level band (that one moves).
- **Prove-it rule**: while a padel Level whose Declared band is C or above is Provisional, a lost Rated Match against a pair at about the same level (expected score 0.25 to 0.75) moves it one and a half times as far. Wins and draws are untouched; it ends when the Level is confirmed. _Avoid_: penalty, probation.
- **Level check**: the other players' answer to "What level did X play at?" on a padel Match with a Rating window: a band each, hidden, settled with the window into one verdict that moves the player's Level by a share set by their φ. Not a Rated Match and not a Performance rating. _Avoid_: peer rating, vote, review, Performance rating.

Edited terms: **Level** (a Level check also moves it), **Rating** (starting φ by Declared band on padel), **Rated Match** (a Level check, like a Place award, moves a Level without one), **Rating window** (on padel it also settles the Level check, and opens on a padel Public Game **[OD-4]**), **Performance rating** (the padel sentence "which is all it does on padel" stays true of the 1 to 10 rating), **Reliability** (never stacks with the Prove-it rule **[Q8]**), **Rating history** (a "Level check" line), **Onboarding questionnaire** ("Not sure" starts at D+ with no Declared band **[Q5]**), **Unclaimed player** (the Organizer's pick is their Declared band **[Q6]**), **Match dispute** (a reversal takes the Match's Level check back).

## 5. Decisions

### 5.1 Open decisions from the doc, with the recommended answer first

| # | Question | Recommended answer | Why, from the code |
| --- | --- | --- | --- |
| **OD-1** | Should padel Provisional mean "not yet confirmed" only? | **Yes, and it already does.** | `tembaLevelView` ignores φ on padel since ADR-0080. Nothing to change except `selfDeclareRating`'s return value (2.3). |
| **OD-2** | Pick a band, or Lower / About right / Higher? | **Pick a band**: the nine display bands, nothing preselected, and a verdict equal to the band the player shows moves no Level. | The band picker exists on both Apps. In the prototype a three-way answer leaves "says D, plays C" at 1.42 after nine Matches against 2.28 with bands. Without the "agreement moves nothing" rule an honest D drifts from 0.35 to 0.57, pulled to the middle of the band. |
| **OD-3** | Settled players: keep the check at 14%, or off once confirmed? | **Keep it on.** No rule beyond φ. | Confirmation takes five Matches (ADR-0080), and the doc's own nine-Match results have the check on throughout. Switched off at confirmation, "says D, plays C" ends at 1.90, not 2.28. The cost is the collusion risk in section 19, R1. |
| **OD-4** | Count on weight 0.5 Groups, or only Club Groups and Public Games? | **Every Verified Group, at the Game's own weight, plus padel Public Games.** Friendly games only. | Weight is already a property of the Game that halves every step (`blendWeightedStep`). The window already opens on every Verified Group's Friendly games; leaving weight 0.5 Groups out would make the same screen ask different questions by Group. Public Games open no padel window today, so that part is new. |

### 5.2 Backfill scope **[BF]**

| Option | What it does | Verdict |
| --- | --- | --- |
| A | φ by band for padel players who declared and have no Rated Match (the doc). | Safe, small. Leaves the Prove-it rule blind to everyone who has played. |
| **B** | A, plus `declared_band` for every Rating where it can be recovered (2.6). No μ or φ change for anyone who has played. | **Recommended.** |
| C | B, plus lower φ to the band's start φ for declared players who have played and are not confirmed. μ unchanged. | Offered behind a flag, off unless the owner says yes. It changes how far someone's next Match moves with no Match in between, and freezes a μ the old rules already moved. |
| D | Replay every padel Rated Match under the new rules. | **Not recommended.** No replay path exists; it rewrites every opponent's history, Rating history lines and Notifications players have read, the Levels of confirmed players, and closed Seasons' By level tables; and Part 3 cannot be replayed because no ballots exist. |

### 5.3 Further questions for the owner

| # | Question | Recommended answer |
| --- | --- | --- |
| **Q5** | "Not sure" in onboarding is stored as a D+ declaration. Trusted at φ 150, or uncertain? | **Uncertain**: keep the D+ start, φ 350, no Declared band, as the doc's "I don't know" row says. Existing D+ rows cannot be told apart, so the backfill treats them as declared D+. |
| **Q6** | Does a band an Organizer picked for an Unclaimed player count as declared? | **Yes.** It is the only placement that Level has, and it is as unproven as a self-declaration. |
| **Q7** | Was the flat φ 250 patch ever deployed? It is not in the Workspace. | Assume not. The script only lowers φ, so it is right either way. |
| **Q8** | Padel now has Reliability (ADR-0095), whose loss multiplier also reaches 1.5. Keep both, and how do they combine? | **Keep both; the larger of the two applies, never the product**, so a loss costs at most 1.5 times. Multiplied, a same-level loss at φ 250 would cost 0.52 Level. |
| **Q9** | ADR-0095 declined letting peer ratings move a padel Level ("four friends could lift each other's Level"). Part 3 reverses that. Intended? | **Yes, with the doc's guards**, recorded as an amendment to ADR-0095. See R1. |
| **Q10** | An Operator's or Level setter's Performance rating weighs three times. On a Level check too? | **No.** They hold the Level override, a stronger and audited door. |
| **Q11** | A player who only plays Public Games is never confirmed (ADR-0080), so the Prove-it rule never ends for them. Acceptable? | **Yes.** One definition of confirmed; a Level override or Verifier calibration ends it. |
| **Q12** | Does a Level check count as improvement in a Standing's Most improved view? | **No**, like a Level override (ADR-0093): the view stays what results moved. |

### 5.4 Design decisions

- **D1.** `declared_band` is nullable, typed `rating_level_band`, written by `selfDeclareRating` for both sports. Only padel reads it.
- **D2.** The start φ table is padel only. `initialRatingFromChoice` takes the sport; football keeps φ 350 (ADR-0069).
- **D3.** The Prove-it rule reads confirmation as it stood before the Match, so it applies to the fifth Verified Group Match and not the sixth.
- **D4.** The extra a loss cost is stored on the event (`rating_events.prove_it_part`), beside `reliability_part`, so the played Game can say why and a reversal takes it back with the rest.
- **D5.** Level check ballots get their own table. `performance_ratings.value` is NOT NULL with a 1 to 10 CHECK, and `submitPerformanceRatings` deletes a player's row when their 1 to 10 is cleared; a band on the same row would go with it.
- **D6.** Level check results get their own ledger (2.9, item 4), shaped like `king_place_awards`.
- **D7.** A verdict is read against the band the player shows when the window settles. Same band: μ stays, φ still narrows. Otherwise the verdict's Level is the middle of the picked display band's span (D is 0.70, the middle of 0.0 to 1.4).
- **D8.** The check's step is blended by the Game's weight, after the cap. **[OD-4]**
- **D9.** A rater's Provisional and outlier weights are computed when the window settles, from the ledger and the stored ballots. Nothing is stored about a rater (ADR-0068).
- **D10.** Taking a Level check back follows the Place award: exact when nothing has touched the Rating since, otherwise its μ move is subtracted. A wrong-score reversal takes the Match's own check back first, and no later check blocks a reversal.
- **D11.** One new procedure, `games.submitLevelChecks`. `games.submitPerformanceRatings` keeps its input.
- **D12.** No new Notification type. The padel "ratings are in" notice is sent when either a rating or a Level check settled, and reads both.

## 6. Actors

- **Player**: declares once; is asked the Level check about the other three; sees their own verdict, never who answered what.
- **Organizer**: picks the Declared band of an Unclaimed player they add **[Q6]**. Holds no Level check door.
- **Level setter, Verifier, Operator**: unchanged. A Level override confirms the Level, which ends the Prove-it rule. Their Level check ballot weighs like anyone's **[Q10]**.
- **Whoever runs the backfill**: a developer with the production `DATABASE_URL`.

## 7. Schema

Three generated migrations, one per part, numbered at generation time (the next is `0129`). No existing migration is edited.

### 7.1 Part 1

`ratings.declared_band rating_level_band NULL`. No default, no index.

### 7.2 Part 2

`rating_events.prove_it_part double precision NULL`: μ points, zero or below, null when the rule added nothing.

### 7.3 Part 3

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

`PADEL_DECLARED_START_PHI`: D3, D2, D1 → 150; C3 → 200; C2 to A → 250. `initialRatingFromChoice(choice, sport)` returns it for a padel band and `INITIAL_PHI` for football, `"unknown"` and `"not_sure"`. `"not_sure"` is a new `SelfDeclareChoice`: μ of D1, φ 350, band D1 **[Q5]**.

### 8.2 Prove-it rule (`rate-doubles-match.ts`, `level.ts`, `glicko2.ts`)

- `PROVE_IT_LOSS_FACTOR = 1.5`, `PROVE_IT_EXPECTED_MIN = 0.25`, `PROVE_IT_EXPECTED_MAX = 0.75`, `PROVE_IT_FROM_BAND = "C2"`.
- `proveItApplies(declaredBand, confirmation)` in `level.ts`: the band is C2 or above and `padelMatchesRemainingToConfirm(confirmation) > 0`.
- `glicko2.ts` exports the expected score of a classic-scale player against an opponent, the function the step already uses.
- `DoublesPlayerInput` gains `proveIt?: boolean`. In `ratePlayer`, on a loss with `proveIt` and an expected score inside the bounds, the factor is `max(lossFactor, PROVE_IT_LOSS_FACTOR)` **[Q8]**; otherwise it is `lossFactor` as today. `proveItPart` is the share the rule added and `reliabilityPart` what is left, so the two never double count.
- It applies to every padel Rated Match the player loses: Verified Group Games, tournament Matches, Public Games and Challenge Games. A Place award is never a loss.

### 8.3 Level check (`level-check.ts`, new)

- `LEVEL_CHECK_R = 250`, `LEVEL_CHECK_CAP_MU = 175` (0.35 Level), `LEVEL_CHECK_MIN_BALLOTS = 2`, `LEVEL_CHECK_PROVISIONAL_RATER_WEIGHT = 0.5`, `LEVEL_CHECK_OUTLIER_WEIGHT = 0.5`, `LEVEL_CHECK_OUTLIER_BANDS = 1.5`, `LEVEL_CHECK_OUTLIER_MATCHES_RUNNING = 3`.
- **Who is checked.** A seated player with a padel Rating. A Guest player has none.
- **Which ballots count.** From a seated account holder, about another seated player. A player needs at least two, one of them from the opposing Game team.
- **Weights.** 1; half for a rater whose own padel Level is Provisional when the window settles; half again for an outlier: a rater whose picks were on average more than 1.5 bands from the verdicts in this Match and in each of their previous two Matches with a Level check.
- **Verdict.** The weighted median of the picks on the nine display bands. With the weight split evenly across two bands, the verdict's Level is the mean of their two middles.
- **Step**, with φ as stored, `k = φ² / (φ² + r²)`:
  - agreed (D7): `μ' = μ`;
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

It reproduces the doc's combined results, and shows that band picks do as well as a continuous verdict once agreement moves nothing. It also shows that **Part 1 alone slows the correction of a wrong declaration** (1.31 to 0.87) until Part 3 ships (R3).

## 9. The backfill script **[BF]**

- **Where.** Logic in `packages/api/src/ratings/declared-band-backfill.ts`, so it is tested on PGlite; a thin command in `packages/api/scripts/backfill-declared-bands.ts`; `"db:backfill-declared-bands"` in `packages/api/package.json`, beside `db:backfill-operators`. `@repo/api` may import `@repo/db` and `@repo/domain`; `@repo/db` may not import the φ table, and `apps/web/scripts` is for flow recorders.
- **Step 1, Declared band.** For each `ratings` row with `self_declared_at` set and `declared_band` null: the start μ is the row's μ when it has no ledger row, else `mu_before` of its earliest row across `rating_events`, `level_overrides` and `king_place_awards`. The band is the one whose `muFromBand` equals it exactly. μ 1500 is "unknown" and stays null. Anything else stays null and is listed.
- **Step 2, φ.** For each padel row with a Declared band, no ledger row, `last_rated_at` null and φ above the band's start φ: set φ to it. φ is only ever lowered, so a row at 350 or at 250 **[Q7]** lands in the same place and a second run changes nothing.
- **Step 3, off by default (`--cap-played`, option C).** For each padel row with a Declared band that has played and is not confirmed: `φ = min(φ, start φ)`.
- **Dry run is the default.** It prints the database host, then counts by band and by source (never played, first Match, first Level override, first Place award), the φ changes by band as before and after, the D+ rows on their own line **[Q5]**, "unknown" rows, and the user ids and μ of rows it could not place. `--apply` does the same work in one transaction, re-checks each row's conditions in the `UPDATE`, and prints what it wrote.
- **Against production.** Once, after the Part 1 migration and code are deployed and before Part 2 is: with the production `DATABASE_URL` in the shell, run the dry run, read it, then `pnpm --filter @repo/api db:backfill-declared-bands -- --apply`. Recorded in `packages/api/README.md` beside the Operator backfill.
- **Risk.** It writes `ratings` for players who took no action. Mitigation: no μ ever changes, φ only falls, played players are untouched unless the flag is passed, and the dry run shows every row count first. A Match completing mid-run is safe: the row then has a ledger row and fails the re-check.

## 10. Permissions

- `ratings.selfDeclare`, `users.completeOnboarding`: unchanged.
- `games.submitLevelChecks`: a seated account holder of the Match, while the window is open; never about themselves; only about a seated player with a padel Rating.
- Reading: a player reads their own ballots and their own verdict. Nobody reads another player's ballots, and no door lists who answered what, an Organizer and an Operator included.

## 11. API (all additive, one procedure per file)

| Procedure | Change |
| --- | --- |
| `ratings.selfDeclare`, `users.completeOnboarding` | Accept `"not_sure"` **[Q5]**. `selfDeclareRating` writes `declared_band`, passes the sport to `initialRatingFromChoice`, and returns `tembaLevelView` so a D declarer reads Provisional. |
| `games.performanceRatingSheet` | Adds `levelCheck`: null when the Match asks none, else each other player's shown band and the viewer's own answers. |
| `games.submitLevelChecks` (new) | The viewer's whole set of answers: each listed player's band is written or changed, a player left out loses the viewer's earlier answer. Refused once the window is no longer open. |
| `games.performanceRatingResult` | Adds `levelCheck`: the viewer's verdict band, the Level before and after and the ballots counted, or why none settled (too few answers, no opponent answered). |
| `games.byId` | The padel rating impact carries `proveItPart`. |
| `ratings.history` | A `level_check` entry, a fifth source in the union. |

Server modules: `applyTembaRatedMatch` reads `declared_band` from the rows it already locks and `padelConfirmations` before it writes events. `settleRatingWindow` settles the Level check on a padel window after Reliability. `suspendRatingWindow` takes the results back and keeps the ballots; `reportWrongScore` calls it before it restores the Match's events (D10). The padel branch of `applyRatedMatch` also opens the window on a padel Public Game **[OD-4]**. `merge-into-account.ts`, `routers/users/myProfile.ts`, `routers/ratings/me.ts`, `routers/groups/standingLevels.ts` **[Q12]**, `routers/games/listMyMatchHistory.ts` and `notifications/load-notification-items.ts` each treat `level_check_results` where they treat `king_place_awards`, and the merge moves both new tables with the Rating.

## 12. Clients

View-models live in `@repo/domain/level-check` and are rendered twice.

- **Declaring** (web `declare-level-dialog.tsx`, both `onboarding-questionnaire.tsx`): "Not sure" sends `"not_sure"` **[Q5]**. One line under the picker says what a C or above declaration means until the Level is confirmed.
- **Rate the game** (web `rate-game-page.tsx`, mobile `rate-game-screen.tsx`), padel only: under each of the three other players, the question "What level did {name} play at?" and the nine display bands in one row, opened on the band the player shows, which is marked "now". Nothing is selected until tapped; a blank is not an answer **[OD-2]**. Opponents are not marked optional: the check needs one. Submit sends the Level check answers, then the ratings.
- **Played game** (both `performance-result-card.tsx`): once the window settles, "Players placed you at {band}" with the Level before and after, or "Agreed with your level", or why nothing settled. The padel rating impact adds one line when the Prove-it rule applied.
- **Rating history** (both Apps' Ratings screens): a "Level check" line with the Game, the verdict band and the move.
- **Mobile design rules.** Black and white, roles from `useColors()`, hairlines, text through `Text`, sizes from `@repo/design-tokens`. A selected band is Solid (`control`); an unanswered row is a `Hatch` slot. No new mount animation.
- The console has no rating UI and is unchanged.

## 13. Notifications

No new type (D12). `performance_ratings_open` on padel says the screen also asks for levels. `performance_ratings_closed` on padel goes to each account holder whose rating or Level check settled, once, and reads the verdict and the Level move beside the rating and Reliability.

## 14. i18n

Every string in `en/` and `ar/`, read by property access. Proposed keys, with the English copy; the Arabic is written with the ticket and confirmed by the owner.

- `rating.ts`, new `levelCheck` block: `question(name)` "What level did {name} play at?" (proposed Arabic: "بأي مستوى لعب {name}؟"); `now` "now"; `notAnswered`; `bandSpoken(name, band)`; `footnote` "Your answers are averaged with the others' and can move a level. Nobody sees who gave what."; `result.placed(band)`, `result.agreed`, `result.moved(from, to)`, `result.tooFew(n, min)` through `plural()`, `result.noOpponent`; `history.title` "Level check", `history.line(band)`; `errors.self`, `errors.notPlayer`, `errors.closed`, `errors.noWindow`.
- `rating.ts`, changed: `performance.padel.footnote` no longer says ratings do not move a level; `performance.entry.padel` names both questions.
- `rating.ts`, new: `proveIt.line` "You declared {band} and lost to a pair at your level, so this loss counted one and a half times."
- `level.ts` and `onboarding.ts`: `declare.proveItHint`, one line under the band picker; `padelNotSure` unchanged.
- `notification.ts`: the padel variants of the open and closed notices.
- Surface-only strings go in `web-game.ts` and `mobile-game-details.ts`.

## 15. Migration of existing behaviour

- New declarations get the new φ from the day Part 1 deploys. Existing rows keep theirs until the script runs.
- Until the script runs, existing rows have no Declared band, so the Prove-it rule skips them. Nothing breaks if it runs late; it is uneven, which is why it runs before Part 2 deploys.
- Nothing is replayed (ADR-0070). Past `rating_events` rows keep their numbers.
- Level checks start with the first Match completed after Part 3 deploys. A window already open at deploy settles with whatever answers it has, usually none.
- The Mobile App is not released (Phase 7), and every API change here is additive anyway.

## 16. Documentation the tickets will change

ADRs, numbered at writing time (the next free number is 0096; four ADRs share 0087 and two share 0089, so check first):

1. **A padel declaration sets the starting φ** (Part 1). Amends ADR-0009. Records the table, `declared_band`, padel only, "Not sure" **[Q5]**, Organizer picks **[Q6]**, and that nothing is replayed.
2. **A declared C or above loses more at its own level until confirmed** (Part 2). Amends ADR-0070 (the padel step) and ADR-0095 (the two loss factors never multiply **[Q8]**). Consequences: the pool deflates a little, only from unconfirmed players; a Public Game-only player stays under it **[Q11]**.
3. **The other players check a padel Level** (Part 3). Amends ADR-0068 (the window asks a second question on padel), ADR-0095 (peers can now move a padel Level **[Q9]**; a padel Public Game opens a window **[OD-4]**) and ADR-0011's reversal rule (D10). Records the own ledger, bands over a three-way answer **[OD-2]**, on after confirmation **[OD-3]**, the weights and the cap.

`CONTEXT.md`: section 4, each term with its first ticket. `packages/api/README.md`: the backfill step.

## 17. Testing

- **Domain, beside each module.** `level.test.ts`: the φ table by band, football and "unknown" unchanged, `"not_sure"`. `rate-doubles-match.test.ts`: a same-level loss moves 1.5 times as far and stores the part; a win, a draw, a loss outside 0.25 to 0.75, a confirmed player and a D declarer do not; with low Reliability the larger factor applies and the two parts add up to the extra; the partner and opponents move as before. `level-check.test.ts`: the median for two and three ballots, weights, the opponent rule, agreement moves no μ and narrows φ, the cap, weight 0.5, the shares in 8.4, outliers, and the doc's worked cases as fixtures.
- **Procedures, through the plain exported function on PGlite** (`@repo/db/testing`). `selfDeclareRating` writes the band and φ per sport. `applyRatedMatch`: the rule on the fifth Verified Group Match and not the sixth; not after a Level override. `submitLevelChecks`: seated only, never self, whole-set semantics, closed window. `settleRatingWindow`: one ballot settles nobody; two partners' ballots alone settle nobody; a settled verdict writes the result, the Rating and the band; idempotent. `reportWrongScore`: the Match's check is taken back before its events; a check from an earlier Match that settled later survives; a Level override since leaves the Rating alone. `ratings.history`: the new line, in order. The merge moves ballots and results.
- **Backfill** on PGlite: a never-played row per band; a played row recovered from its first event, its first override and a Place award; "unknown"; an unrecognised μ; the D+ line; a second run writes nothing; the dry run writes nothing; `--cap-played`.
- **Schema.** `constraints.test.ts` and `foreign-key-indexes.test.ts` cover the two new tables.
- **Seed.** A Verified padel Group with a settled Level check, an agreed one and a player under the Prove-it rule.
- The gate for every pull request stays `pnpm exec turbo run typecheck lint test`.

## 18. Non-goals

- Football. Its φ comes from its count of counting Matches (ADR-0069).
- Replaying past Matches, or changing any μ in the backfill.
- A Level check on tournament Matches, Americano, King of the court or Challenge Games.
- Changing or removing the padel 1 to 10 Performance rating or Reliability **[Q8]**.
- Letting a player change their Declared band.
- A stored judgement of a rater, or any screen that shows who answered what.
- A Level check door for someone who did not play.
- Console changes.

## 19. Risks

- **R1 Collusion.** Four players who agree to answer high can each gain up to 0.35 Level a Match on a Club Group, which no rule here stops: they are confirmed, they include an opponent, and they agree with each other. ADR-0095 declined a peer-moved padel Level for this reason. Mitigation: the cap, the opponent rule, φ falling with every check, a ledger row an Operator can read, and the answer to **[OD-3]**: off at confirmation bounds it to five Matches.
- **R2 Thin anonymity.** With three raters, a verdict tells a player a lot about who said what. The 1 to 10 result already has this property.
- **R3 Part 1 alone slows correction.** Between Part 1 and Part 3 a wrong D declaration corrects more slowly than today (8.5). The Level override stays the fix in between.
- **R4 Stacked penalties.** An over-declared player can meet the Prove-it rule, low Reliability and a downward Level check in one Match. Mitigation: the two loss factors never multiply **[Q8]**, and the check is capped.
- **R5 Reversal.** A wrong-score reversal after a later Level check restores μ by subtraction, not exactly (D10); φ stays slightly lower than a clean restore would leave it.
- **R6 Six taps a rater.** Two questions for three players. Mitigation: one screen, every answer optional, a blank is not an answer.
- **R7 The backfill cannot tell "Not sure" from a picked D+** **[Q5]**. The dry run reports how many rows that is.
- **R8 Vocabulary.** "Level check", "Prove-it rule" and "Declared band" are not in the glossary until section 4 lands with the first ticket of each part.

## 20. Open questions, with the default taken

Each default is in force unless the owner says otherwise; the tag is where the spec changes.

1. **[OD-1]** Padel Provisional means not yet confirmed. Already true.
2. **[OD-2]** Pick a band; nothing preselected; agreement moves no Level.
3. **[OD-3]** The Level check stays on after confirmation.
4. **[OD-4]** Friendly games on every Verified Group at the Game's weight, and padel Public Games.
5. **[BF]** Option B; option C behind a flag, off.
6. **[Q5]** "Not sure" starts at D+ with φ 350 and no Declared band.
7. **[Q6]** An Organizer's pick for an Unclaimed player is a Declared band.
8. **[Q7]** No φ 250 rows are assumed; the script lowers only.
9. **[Q8]** Reliability stays; the larger loss factor applies.
10. **[Q9]** Peers may move a padel Level; ADR-0095 is amended.
11. **[Q10]** No extra weight for an Operator or a Level setter on a Level check.
12. **[Q11]** The Prove-it rule ends only at confirmation.
13. **[Q12]** A Level check is not improvement in Most improved.
14. Arabic copy for the new keys, for the owner to confirm.

## Comments
