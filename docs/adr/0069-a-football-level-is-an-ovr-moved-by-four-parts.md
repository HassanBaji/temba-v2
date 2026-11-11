# A football Level is an OVR moved by four parts

**Status:** proposed (draft for the owner's review). Spec: `.scratch/rating-redesign/spec.md`. Amends [ADR-0009](./0009-glicko-2-user-ratings.md), [ADR-0039](./0039-a-football-game-is-a-roster-with-sides-picked-later.md), [ADR-0040](./0040-football-sides-score-and-goals.md) and [ADR-0061](./0061-a-challenge-is-a-request-and-a-game-is-the-result.md) for football.

Football was never rated: ADR-0039 and ADR-0040 left "football rating" as future work, and a football Level was the word a player chose at sign-up. The owner's design gives football a Temba Level that reads as OVR 40 to 99 and moves on four things a player recognises.

## Decision

- **OVR is the football face of the existing Rating.** `ovr = 40 + 59 × level / 7` on the stored μ, shown as a whole number. The `ratings` row, the Level bands, Team Level, Game Level range and Level overrides are unchanged. No row is rewritten: a self-placed Beginner reads 43, Casual 61, Competitive 72, Pro 78.
- **A counting football Match moves OVR by four additive parts**: result 40% (against the other side's mean OVR), Performance ratings 30%, goals 20%, MVP 10%. The parts are stored on the `rating_events` row.
- **Each part sums to zero across the Match's players**, so the population cannot inflate. A missing part counts as zero and is not redistributed.
- **Goals are a rating input.** A player's own named goals count for them; the side's goals conceded count against them by Football role, most for a keeper and least for a forward. With no minutes recorded, "while you played" is the whole Match. A changed Scorer list clears Match result confirmations.
- **The MVP part counts only an MVP decided by vote.**
- **Provisional is five counting Matches.** The football writer sets φ from the count so every reader of Provisional keeps working; φ carries nothing else on football, and idle inflation does not apply.
- **What counts**: a football Game on a Verified Group, a Public Game ([ADR-0071](./0071-a-public-game-at-a-partner-venue-counts-for-temba-level.md)) and a football Challenge Game, which needs one confirmation from each Team.
- **Reversal subtracts** the event's parts ([ADR-0067](./0067-tier-points-are-an-additive-ledger-and-a-tier-band-is-a-place.md)).
- **Padel is unchanged**: Glicko-2, with the partner term of [ADR-0070](./0070-a-padel-level-weighs-the-partner-and-reads-from-one.md).

**Considered Options**: Glicko-2 generalised from a pair to a roster (`rateTeamMatch`, the football spec's draft; one win-or-loss outcome cannot carry ratings, goals and MVP, and its Provisional is not a count); a separate football rating table (every reader of a Level would fork); a 0 to 100 scale (the owner chose the 40 to 99 that football players know); goals by minutes played (ADR-0040 declined goal events, and recording substitutions is a product of its own).

## Consequences

- Two rating models share one table. Code that reads σ, or φ as uncertainty, must not assume football.
- A football Level can now move on one Organizer's confirmation in a Verified Group (ADR-0044). A Match dispute is the remedy.
- Football gets a Game Level range, shown in OVR.
