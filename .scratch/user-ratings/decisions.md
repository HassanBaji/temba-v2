# User ratings (Glicko-2) — settled decisions

Status: spec published — `.scratch/user-ratings/spec.md` (ready-for-agent). Tickets: [TEM-73](https://linear.app/temba-app/issue/TEM-73/self-declare-level-on-you) → [TEM-74](https://linear.app/temba-app/issue/TEM-74/update-ratings-when-a-match-completes) → [TEM-75](https://linear.app/temba-app/issue/TEM-75/idle-rd-inflation-on-you-and-before-updates).

## Settled (round 1)

1. **Product scope.** This slice is only per-User rating/level (Glicko-2 + continuous 0.0–7.0 + discrete D3…A). Deferred: cross-Group/global leaderboards, Standing movement history, full User profile aggregation.
2. **Global = platform-wide, sport-keyed.** One Rating per User per sport. Padel now; schema supports other sports. Filtered leaderboards later (out of slice).
3. **Rated entity = User only.** Doubles: each of the four Users updates; opponent strength from the opposing pair composite. No Team rating this slice.
4. **What counts.** Friendly game and Friendly tournament completed Matches: yes. Americano: yes when Matches exist (same rules). All Game scopes (Club Group, Loose Group, groupless; public and non-public): yes. Draws: yes. Context weighting left to round 2. Cancelled: exclude (confirmed round 2).
5. **Level model.** Continuous Level 0.0–7.0 (one decimal); discrete Level band D3…A (A highest); Playtomic prose is calibration reference only (not product copy). Not the redesign’s Level 1–5 artefact ramp.
6. **Initial placement.** Optional self-declared starting Level + high rating deviation; “I don’t know” → mid default + high RD. Details in round 3.
7. **Dependency + ADR.** TEM-41 (Sets + Match complete) is a hard prerequisite for scheduling implementation. ADR required for Glicko-2 + User doubles attribution (+ weight blend).

## Settled (round 2)

8. **Context weight.** Club Group Game = 1.0; Loose Group = 0.5; groupless = 0.5. Ignore `isPublic`. Soft-archived Club Group Games that complete still 1.0. Weight is the Game’s context on every Match in that Game.
9. **Cancelled.** No rating update for cancelled Matches or Matches on cancelled Games.
10. **Americano timing.** Specify attribution now; ship Friendly write path with TEM-41; wire Americano when Matches exist (same rules). Do not block the feature on Americano generation.
11. **Update cadence.** Per completed Rated Match (each Match is one Glicko-2 period for each of the four Users).
12. **Internal scale.** Classic Glicko-2: μ₀ ≈ 1500, φ₀ ≈ 350, σ₀ ≈ 0.06, τ ≈ 0.5; map μ ↔ Level 0–7 (round 3).
13. **Confidence UI.** Show Level + Level band + Provisional when φ is high; no raw RD/μ/φ/σ in the App.
14. **Bands + hysteresis.** Equal-width 0.7 bands (D3 0.0–0.7 … A 6.3–7.0). Buffer hysteresis ±0.10 before the discrete label flips. Clamp displayed Level to [0.0, 7.0]. “I don’t know” continuous Level = 3.0, label C2.
15. **Doubles composite.** One outcome vs mean μ and mean φ of the two opponents; partner ignored in expected score.
16. **Draws.** Glicko outcome score = 0.5.
17. **Margin of victory.** Match W/L/D only (from existing Set-wins / `matchOutcome`). No score-margin weighting.
18. **Inactivity.** Time-based RD inflation via empty periods since last Rated Match; cap φ at φ₀ (350). Period length in round 3.
19. **Anti-abuse (light).** Self-declare once; locked after first Rated Match. No smurf/fraud product in v1.
20. **Visibility.** You page shows Level + Level band + Provisional. Write path still runs on Match complete. No Match-complete toast and no Game-card level chips this slice.

## Settled (round 3)

21. **μ ↔ Level map (linear).**
    `level = clamp(3.0 + (μ - 1500) / 500, 0.0, 7.0)`
    `μ = 1500 + (level - 3.0) * 500`
    (level 0 ⇔ μ 0; level 3 ⇔ 1500; level 7 ⇔ 3500.)
22. **Provisional threshold.** Show Provisional when φ > 200.
23. **Idle empty period.** One Glicko-2 empty period per **30** idle days since last Rated Match; cap φ at 350.
24. **Self-declare UX.** You page CTA only (no signup hard-gate; does not block Game register). Picker: discrete D3…A + “I don’t know”. Band choice → continuous Level = band midpoint; “I don’t know” → 3.0 / C2. Sets initial μ via inverse map; φ = 350; σ = 0.06. Locked after first Rated Match.
25. **Weight in Glicko math (blend).** Full update → (μ*, φ*, σ*); then
    `μ += w(μ* − μ)`, `φ += w(φ* − φ)`, `σ += w(σ* − σ)` with w ∈ {1.0, 0.5}.
26. **Rating events.** Append-only rating events per User per Rated Match (outcome, weight, before→after μ/φ/σ) for idempotency and support. Not shown as Standing / history UI this slice.
27. **Glossary (for CONTEXT.md at spec time).** **Rating** (sport-keyed Glicko-2 μ/φ/σ, not shown raw); **Level** (0.0–7.0); **Level band** (D3…A); **Provisional** (φ > 200); **Rated Match** (completed, non-cancelled Match that produced rating events). Avoid “ELO”, “player rating”, and “rank” as synonyms for Level band.

## Out of this slice

- Leaderboards / cross-Group ranking surfaces
- Standing movement over time (▲/▼ history UI)
- Full User profile aggregation
- Team ratings
- Game-card level chips / Match-complete level toasts
- Americano Match generation (ratings wire when Matches exist)
- Margin-of-victory weighting; smurf detection; Operator rating resets (unless later)

## ADR / glossary / dependency

- **ADR (to write with or right after `/to-spec`):** Glicko-2 choice, classic scale + Level map, User-only doubles composite, context weight blend, idle empty periods.
- **Glossary:** terms in §27 → root `CONTEXT.md` when domain-modeling runs with the spec.
- **Prerequisite:** TEM-41 Sets + Match complete. Natural write hook: after successful Match complete (no counter updates today; ratings are a separate write).
