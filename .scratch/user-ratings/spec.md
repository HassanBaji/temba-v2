# User ratings (Glicko-2)

Status: ready-for-agent

## Problem Statement

Users who play padel on Temba have no durable skill signal. After Friendly games and Friendly tournaments they can record Sets and complete Matches, but nothing moves: there is no Level, no confidence, and no way to place yourself on a ladder others recognise (Playtomic-style 0–7 / D3…A). Without a global, sport-keyed Rating, matchmaking and discovery stay guesswork, and the redesign’s Level chips and Standing skill story stay blocked.

## Solution

Ship a **platform-wide, sport-keyed per-User Rating** using **Glicko-2**. On each **Rated Match**, the four Users on the two Game teams update against a composite opponent. The App shows a continuous **Level** (0.0–7.0), a discrete **Level band** (D3…A), and **Provisional** while rating deviation is high — on the **You** page. New Users may self-declare a starting band once (or “I don’t know”). Club Group Matches weigh full; Loose Group and groupless weigh half. Leaderboards, Standing history, Team ratings, and Game-card chips stay out of this slice.

Approving this spec approves the Test seams in Testing Decisions and the glossary terms named here for `CONTEXT.md`.

## User Stories

1. As a User, I want a padel **Rating** that persists across Games, Groups, and Communities, so that my skill is not trapped inside one club.

2. As a User of a future football surface, I want Ratings to be **sport-keyed**, so that padel results never change a football Rating (and vice versa).

3. As a User who has never rated, I want the **You** page to offer a one-time self-declare CTA (D3…A or “I don’t know”), so that I can place myself without waiting for a Match.

4. As a User who chooses a Level band, I want my starting continuous Level to be that band’s midpoint and my Rating to start with high rating deviation, so that early Matches can still move me quickly.

5. As a User who chooses “I don’t know”, I want Level **3.0** and Level band **C2** with high rating deviation, so that mid-ladder is the default provisional placement.

6. As a User who has not self-declared and has not played a Rated Match, I want You to keep showing the declare CTA (not a fake settled Level), so that placement stays intentional.

7. As a User who completes a Rated Match without ever declaring, I want a Rating created at Level **3.0** / C2 with high rating deviation at that first update, so that play still produces a Level.

8. As a User who has already had a Rated Match, I want self-declare to be refused, so that I cannot re-seed after results exist.

9. As a User viewing You after I have a Rating, I want to see continuous Level (one decimal), Level band (D3…A), and **Provisional** when φ > 200, so that I understand both skill and confidence without raw Glicko numbers.

10. As a User whose φ is at or below 200, I want Provisional to be hidden, so that a settled Rating reads as settled.

11. As a User who has been idle, I want my rating deviation to grow with time since my last Rated Match (one empty Glicko period per 30 idle days, capped at φ₀ = 350), so that a long break makes me Provisional again.

12. As a User on You, I want idle RD growth applied when my Rating is read (and before the next update), so that Provisional reflects reality even before I play again.

13. As one of four Users on a completed Friendly game Match, I want my Rating to update from that Match outcome, so that a single head-to-head moves the ladder.

14. As one of four Users on a completed Friendly tournament Match, I want the same update rules, so that every completed Match in the tournament counts.

15. As a User on an Americano Match once Matches exist, I want the same User-only attribution and weights, so that rotating partners do not invent a second algorithm.

16. As a developer of Americano Match generation, I want this slice to define attribution without requiring Americano Matches to ship first, so that Friendly formats are not blocked.

17. As a User on a Club Group Game Match that completes, I want full weight (**1.0**), so that club Community play moves my Rating most.

18. As a User on a Loose Group Game Match that completes, I want half weight (**0.5**), so that informal squad play still counts but less than club play.

19. As a User on a groupless Game Match that completes, I want half weight (**0.5**), so that pickup matches the Loose weight.

20. As a User, I want `isPublic` not to change weight, so that a private Club Game and a public Club Game weigh the same.

21. As a User completing Sets on a Soft-archived Club Group Game, I want weight **1.0** still, so that archive does not erase that club play happened.

22. As a User on a cancelled Match, I want no Rating update, so that abandoned contests do not move Levels.

23. As a User on a Match whose parent Game is cancelled, I want no Rating update, so that Game cancel stays a hard stop.

24. As a User on a Match with a decisive win for my Game team, I want a Glicko score of **1.0** against the opposing pair composite, so that wins raise my Rating when expected.

25. As a User on a Match my Game team lost, I want a Glicko score of **0.0** against that composite, so that losses lower my Rating when expected.

26. As a User on a drawn Match (equal Set-wins), I want a Glicko score of **0.5**, so that draws still inform confidence without inventing a winner.

27. As a User, I want Set score margins not to change the update beyond W/L/D, so that notepad gaming cannot inflate Rating swings.

28. As a User updating from a doubles Match, I want my opponent to be the **mean μ** and **mean φ** of the two opposing Users, so that doubles is one contest vs a pair.

29. As a User updating from a doubles Match, I want my partner’s Rating ignored in the expected-score term, so that v1 stays simple and explainable.

30. As a User who has no Rating row yet when I appear as an opponent, I want the system to treat me as default mid placement (μ for Level 3.0, φ = 350, σ = 0.06) for composite purposes (and create my row when I myself update), so that first Matches against new Users still work.

31. As a User after a full Glicko step on a half-weight Match, I want μ, φ, and σ blended halfway back toward my pre-Match values, so that Loose/groupless Matches have half the impact of Club Matches.

32. As a User after a Club Match, I want the full Glicko step kept (weight 1.0), so that club results apply fully.

33. As a User, I want each completed Rated Match to be one Glicko-2 rating period for me, so that sparse play still moves Level when a Match completes.

34. As a User, I want my continuous Level derived as `clamp(3.0 + (μ − 1500) / 500, 0.0, 7.0)` displayed to one decimal, so that the product face stays Playtomic-like on a classic Glicko scale.

35. As a User, I want Level band labels on equal 0.7 bands (D3 0.0–0.7 … A 6.3–7.0), so that ten steps cover 0–7.

36. As a User whose Level oscillates near a band edge, I want the discrete label to flip only after crossing the boundary by **±0.10**, so that the badge does not thrash.

37. As a User whose μ maps slightly outside 0–7, I want displayed Level clamped to `[0.0, 7.0]`, so that the UI never shows an illegal Level.

38. As a User completing the same Match twice (retries / double submit), I want rating application to be **idempotent** per User per Match, so that Levels do not jump twice.

39. As a developer supporting a disputed result, I want append-only **rating events** (outcome, weight, μ/φ/σ before→after) per User per Rated Match, so that support can audit without a Standing UI.

40. As a User, I want rating events not shown as Standing or form history this slice, so that product scope stays You + write path.

41. As a User of You, I want no Match-complete toast that shows Level deltas this slice, so that UI stays one surface.

42. As a User browsing Games, I want no Level chip on Game cards this slice, so that redesign Level tokens wait for a later UI ticket.

43. As a User, I want Group Standing (sets/points counters) left alone this slice, so that skill Rating does not pretend to be Standing movement.

44. As a User, I want no global or Community leaderboard this slice, so that attribution ships before ranking surfaces.

45. As a member of a persistent Team, I want no Team Rating this slice, so that the ladder stays User-only.

46. As an organizer who completes a Match, I want the four Users’ Ratings to update in the same successful complete path, so that complete and rate stay one product moment.

47. As a User not on either Game team of a Match, I want that Match not to change my Rating, so that spectators and organizers-only are not rated for watching.

48. As a User on a Match that has no outcome yet (`none` — e.g. incomplete Set story), I want complete to remain refused by existing Set rules, so that ratings never run without a W/L/D.

49. As a User, I want raw μ, φ, and σ never shown in the App, so that confidence is communicated only via Provisional and Level movement.

50. As a developer, I want an ADR recording Glicko-2, the Level map, doubles composite, weight blend, and idle periods, so that future Elo/TrueSkill proposals have a documented trade-off.

51. As a developer of TEM-41 environments, I want this feature scheduled only where Sets and Match complete already work, so that the write hook has a real outcome.

52. As a User, I want football sport enum support on Rating rows even while the App stays padel-only, so that schema does not need a redesign when football UI opens.

53. As a User who self-declared D3, I want midpoint Level **0.35** (and corresponding μ), so that band picks are centred in their band.

54. As a User who self-declared A, I want midpoint Level **6.65**, so that the top band starts near the elite end without claiming 7.0.

55. As a User reading documentation and UI copy, I want the product to say **Level** and **Level band**, not “ELO” or “rank”, so that leaderboard rank is not confused with skill band.

## Implementation Decisions

- Schema, migrations, and kit live in the DB Package. App tRPC and You UI stay in the Temba App. No new Package. Follow existing Drizzle style: uuid PKs, reuse existing sport enums (`padel` | `football`), created/updated timestamps. Kit migrations for new tables.

- **ADR-0009.** Choose Glicko-2 (classic scale) over Elo / TrueSkill / Level-native Glicko; User-only doubles via mean opponent μ/φ; context weight via post-step blend; idle empty periods every 30 days. Soft-archive does not change Club weight.

- **Glossary.** Add to root `CONTEXT.md`: **Rating**, **Level**, **Level band**, **Provisional**, **Rated Match** (definitions in Further Notes / decisions §27). Avoid “ELO”, “player rating”, and “rank” as synonyms for Level band.

- **Rating (current state).** One row per User per sport: μ, φ, σ; stored current **Level band** (for hysteresis); optional self-declared-at; last Rated Match at; timestamps. Unique (userId, sport). App always reads/writes padel; football rows allowed by schema.

- **Initial constants.** μ₀ = 1500, φ₀ = 350, σ₀ = 0.06, τ = 0.5. Self-declare or first-Match default without declare: Level 3.0 → μ = 1500, φ = 350, σ = 0.06, band C2. Band midpoints: D3 0.35, D2 1.05, D1 1.75, C3 2.45, C2 3.15, C1 3.85, B3 4.55, B2 5.25, B1 5.95, A 6.65 — map to μ via `μ = 1500 + (level − 3.0) × 500`.

- **Level map.** `level = clamp(3.0 + (μ − 1500) / 500, 0.0, 7.0)`; display one decimal. Bands: D3 [0.0, 0.7), D2 [0.7, 1.4), D1 [1.4, 2.1), C3 [2.1, 2.8), C2 [2.8, 3.5), C1 [3.5, 4.2), B3 [4.2, 4.9), B2 [4.9, 5.6), B1 [5.6, 6.3), A [6.3, 7.0] (include 7.0 in A). Hysteresis: keep stored band until continuous Level crosses the neighbouring boundary by +0.10 (up) or −0.10 (down), then set the new band from the strict table.

- **Provisional.** UI flag when φ > 200 after idle inflation is applied for the read. Never show raw φ.

- **Idle inflation.** Before read and before an update, compute whole empty periods = floor(days since lastRatedAt / 30) (if never rated, skip idle inflation beyond initial φ). Apply Glicko-2 empty-period φ growth that many times; cap φ at 350. Do not invent calendar rating periods for Matches — Matches are periods only when completed.

- **Rated Match eligibility.** Match `status` becomes completed via existing complete path; Match not cancelled; parent Game `cancelledAt` null; both slots have Game teams with two Users each; `matchOutcome` is `slot1`, `slot2`, or `draw` (not `none`). Formats: Friendly game and Friendly tournament now; Americano when Matches exist and pass the same gates. Weight from Game parentage: Club Group (`groupId` → Group with `communityId`) = 1.0; Loose Group (`groupId` → Group with null `communityId`) = 0.5; groupless (`groupId` null) = 0.5. Ignore `isPublic`. Soft-archived Community does not exclude or reweight.

- **Write hook.** After a successful Match complete (same transaction or immediately chained so complete cannot succeed without attempting rate), for each of the four Users: ensure Rating row; apply idle inflation; build composite opponent from the other pair (lazy-default opponents); run one Glicko-2 step with score 1 / 0 / 0.5; blend with weight w; update Level band with hysteresis; set lastRatedAt; insert rating event. If a rating event for (userId, matchId) already exists, skip that User (idempotent). Failure of rating after status flip must not leave silent inconsistency — prefer same transaction as complete, or compensate; do not leave completed Match without events when eligible.

- **Glicko step + blend.** Full Glicko-2 update → (μ\*, φ\*, σ\*). Then `μ += w(μ\* − μ)`, `φ += w(φ\* − φ)`, `σ += w(σ\* − σ)` with w ∈ {1.0, 0.5}. Document in ADR-0009 as Temba’s weighted step.

- **Composite opponent.** For User U on Game team T vs O1, O2: opponent μ = mean(μ_O1, μ_O2), opponent φ = mean(φ_O1, φ_O2). Partner ignored. Missing Rating rows use default mid placement for the mean (and persist a row when that User is themselves updated).

- **Rating events.** Append-only rows: userId, sport, matchId, outcome score, weight, before/after μ φ σ, createdAt. Unique (userId, matchId). Not exposed on You as history UI this slice; may power a support/admin read later.

- **Self-declare API.** Authenticated mutation: sport (padel from App), choice = Level band or “unknown”. Allowed only if no Rated Match yet for that sport (no rating event; or lastRatedAt null and no events). Sets μ/φ/σ/band/level as above; sets self-declared-at. Second declare refused. Does not block Game register.

- **You UI.** `/dashboard/you`: if no Rating and never rated → CTA + picker. If Rating exists → Level (one decimal) + Level band label + Provisional badge when applicable. No raw Glicko. No leaderboard. Reuse existing layout primitives; Level colour tokens from the redesign contract may be introduced only as needed for this You chip (D3…A, not Level 1–5) and must stay greyscale-distinguishable (label required).

- **tRPC.** Read current Rating (with idle inflation applied for display) for the caller; self-declare mutation; complete Match path gains rating side effects (no separate “rate match” User action). Prefer a dedicated ratings domain module next to games domain logic (pure Glicko helpers + apply-on-complete), following existing `server/games` style — not a new Workspace Package.

- **Counters.** User / Group / Team stored play counters remain untouched (still zero attribution product). Rating is separate from Standing counters.

- **Libraries.** Prefer a small pure TypeScript Glicko-2 implementation in-App (or DB Package only if shared — default in App server domain) over a new heavy dependency; if a well-maintained tiny library is used, pin it and keep the blend/idle/map outside it. Do not invent a second rating algorithm package.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI for this slice. The test is external product behavior: signed-in flows in the App and the data those flows persist. Do not assert exact table JSON or router file names except as those flows fail. Pure Glicko helpers may be exercised manually or via ad-hoc scripts during development; they are not a reason to introduce Vitest/Jest.

### Test seams

Highest seam (one): an authenticated User can self-declare (or skip), complete an eligible Friendly Match with four Users, and see Levels / Level bands / Provisional on You move according to weight and outcome — without leaderboards, without Team ratings, without double-applying on retry, and without rating cancelled Matches.

If you implement this spec, you implement these seams:

- Self-declare on You: each band midpoint and “I don’t know” → 3.0 / C2; second declare refused; declare after first Rated Match refused
- You shows Level (one decimal), Level band, Provisional when φ > 200; hides Provisional when settled; never shows raw μ/φ/σ
- Idle: after 30+ days since last Rated Match, read path shows higher uncertainty (Provisional returns when φ crosses 200)
- Complete Friendly game Match: four Users get rating events; winners gain vs weaker composite, lose vs stronger (directionally); draw → 0.5
- Complete Friendly tournament Match: same rules; weight from that Game’s parentage
- Club Group weight 1.0 vs Loose/groupless 0.5 (half-weight moves Level less than full-weight for the same upset)
- Cancelled Match / cancelled Game: complete refused or no events
- Idempotent complete/rate: second attempt does not create a second event or double μ jump
- Soft-archived Club Group Game complete still rates at weight 1.0
- Americano: no requirement to generate Matches this slice; when a completed Americano Match exists, same attribution applies
- `isPublic` does not change weight
- Football Rating rows are schema-possible; App padel-only UI unchanged elsewhere
- Group Standing counters still unchanged on complete
- No Game-card Level chip; no Match-complete Level toast

Approving this spec approves these seams.

## Out of Scope

- Cross-Group / global / Community leaderboard surfaces
- Standing movement history UI (▲/▼) and FormBadge product
- Full User profile aggregation beyond You’s Level chip
- Team Rating or partnership ladders
- Game-card Level chips and Match-complete Level delta toasts
- Americano Match generation
- Margin-of-victory weighting
- Smurf detection, reports, Operator rating resets
- Redesign Level 1–5 token ramp as product labels
- Payment, counters attribution, and any change to Set/complete authorization rules
- Multi-sport You UI (padel chip only this slice)

## Further Notes

- Settled grilling: `.scratch/user-ratings/decisions.md`.
- Redesign Open question 6 / Part 2 placeholder: `.scratch/redesign/games-and-rankings-contract.md` — this spec owns rankings product (1); Parts 2.2–2.4 Level 1–5 artefacts are superseded for labels by D3…A.
- Prerequisite: TEM-41 Sets + Match complete (`games.completeMatch` / domain `completeMatch` + `matchOutcome`).
- Playtomic 0–7 prose bands are calibration reference for the linear map only; do not ship that prose as Temba copy this slice.
- Band midpoints for self-declare: D3 0.35, D2 1.05, D1 1.75, C3 2.45, C2 3.15, C1 3.85, B3 4.55, B2 5.25, B1 5.95, A 6.65.
