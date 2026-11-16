# A declared C or above loses more at its own level until confirmed

**Status:** accepted. Spec: `.scratch/padel-declared-band-trust/spec.md`. Amends [ADR-0070](./0070-a-padel-level-weighs-the-partner-and-reads-from-one.md) (the padel step) and [ADR-0095](./0095-performance-ratings-move-reliability-and-a-loss-costs-more-below-full.md) (the larger loss factor applies, and the factor is stored).

A padel declaration now sets the starting φ (ADR-0096), so a player who declared C or above starts at φ 250 and moves less on every result. A player who overstated has less room to fall than before. The owner asked that C and above be proven: until the Level is confirmed, a loss to a pair at about the same level costs one and a half times as much, while wins count normally.

## Decision

- **The Prove-it rule.** On a lost padel Rated Match, a player's μ step is multiplied by 1.5 (`PROVE_IT_LOSS_FACTOR`) when all of these hold: their Declared band is C or above (`PROVE_IT_FROM_BAND`, stored C2); their Level was not confirmed before the Match (fewer than five Rated Matches in a Verified Group and no Level override, ADR-0080); and the pair's expected score was between 0.25 and 0.75, both ends included. Both partners share one expected score (ADR-0070), read after idle inflation.
- **Confirmation is read as it stood before the Match**, so the rule covers the fifth Rated Match in a Verified Group and not the sixth.
- **It covers every padel Rated Match**: Verified Group Games, tournament Matches, Public Games and Challenge Games. A King of the court Place award is never a loss and is untouched.
- **It never multiplies with Reliability.** The larger of the two loss factors applies, so a loss costs at most 1.5 times. `reliability_part` keeps what Reliability's factor added, as before; `rating_events.prove_it_part` keeps what the rule added beyond it. The two add up to the whole extra.
- **The Reliability loss factor a Match read is stored** (`rating_events.reliability_loss_factor`, null when it was 1), on a win or a draw as well as a loss. The μ it added alone is not enough to recompute a Match exactly.
- **The partner and both opponents move exactly as without the rule.** Wins and draws are untouched.
- **The played Game says so**, on both Apps: "You declared {band} and lost to a pair at your level, so this loss counted one and a half times." The band picker on the web declare dialog and both onboarding screens says what a C or above declaration means.
- **A wrong-score report takes it back** with the rest of the Match: the Rating returns to the event's before-values.
- **No existing player changes.** A Rating with no Declared band is never covered, and existing players have none until the Level recalculation.

**Considered Options**: multiplying the two factors (a player at low Reliability who declared high would lose 2.25 times, a stack the owner ruled out); applying the rule to every loss whatever the gap (an over-declared player losing to a far stronger pair learns nothing from it, and a heavy upset would compound); ending the rule at a φ threshold (padel Provisional is the count of Verified Group Matches, ADR-0080, and one definition of confirmed is kept); covering D, D+ and C- (they start trusted, at φ 150 and 200, and the owner trusts the low bands); storing only the combined extra (the played Game and the recalculation need to know which rule added what).

## Consequences

- The padel pool deflates a little, only from unconfirmed players who declared C or above and lose even Matches.
- A player who plays only Public Games or Challenge Games never confirms, so stays under the rule until a Level override.
- An Organizer's band for an Unclaimed player is a Declared band (ADR-0096), so the rule covers them too.
- Between this deploy and the Level recalculation the rule covers only new declarers. The recalculation then replays every padel Match under it.
