# A padel Level weighs the partner and reads from 1.0

**Status:** accepted. Spec: `.scratch/rating-redesign/spec.md`. Amends [ADR-0009](./0009-glicko-2-user-ratings.md).

ADR-0009 rated each padel player against the mean of the opposing pair and ignored the partner. A weak player beside a strong partner was then expected to lose, and gained a full step for a win their partner earned. The owner's design also asks for "the 1.0 to 7.0 scale padel players already know", with two decimals.

## Decision

- **The expectation is pair against pair.** In `rateDoublesMatch` each player's opponent is `oppMean − DOUBLES_PARTNER_WEIGHT × (partnerMu − ownMu) / 2`, with the opposing pair's mean φ, so both partners share one expected score. Each still moves by their own φ, so a Provisional player moves further than a confirmed partner. Four players of equal μ move exactly as under ADR-0009.
- **New Matches only.** Nothing is replayed.
- **The face starts at 1.0.** A stored Level below 1.0 is shown as 1.0 (`formatPadelLevel`). Two decimals on the Ratings screen, the profile hero, the Home Level card and the Player profile; one in dense lists.
- **Storage is unchanged**: μ, the ten bands, tenths in Game Level range and Level wanted, the Club and non-Club weights, idle inflation and the reversal rule.

**Considered Options**: remapping the whole scale to 1.0 to 7.0 (every stored range and band edge would move); TrueSkill or a team rating (ADR-0009 already declined it as over-scope); a partner weight below one (kept as a constant, `DOUBLES_PARTNER_WEIGHT`, defaulting to 1).

## Consequences

- A strong player carrying a weak partner gains more for a win than before, and the weak partner less.
- Every self-declared D sits below 1.0 and reads 1.00 until they climb.
- The rating impact on a Game reads the Match's stored rating events, so it follows the formula with no change of its own.
- The padel Group Level (ADR-0053) is retired ([ADR-0066](./0066-a-football-group-that-is-not-verified-has-a-group-tier.md)), so no Group Level steps through `rateDoublesMatch`; the Group Level rows written before stay as they were.
