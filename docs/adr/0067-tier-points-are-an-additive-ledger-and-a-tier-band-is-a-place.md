# Tier points are an additive ledger and a Tier band is a place

**Status:** proposed (draft for the owner's review). Spec: `.scratch/rating-redesign/spec.md`. Amends [ADR-0011](./0011-match-result-confirmation.md) for additive ladders. Reverses the per-Group rating option [ADR-0045](./0045-a-standing-counts-unrated-games.md) declined, for football.

A Group Tier has to be explainable on one line of a phone: "Won 5–3, rated 8.1. Result +10, performance +9." It has to accept an Organizer's adjustment "on top of what the games did", and it has to give exactly one Shark.

## Decision

- **Tier points are a whole number per member per Group**, starting at 1,200 (`group_tier_points`), moved by events in an append-only ledger (`group_tier_events`).
- **One event per player per Match.** The delta is a result part and a performance part. The result part is an expected-score step on the mean Tier points of the two Football sides. The performance part compares the player's Performance rating with their own usual ([ADR-0068](./0068-a-football-match-can-ask-for-performance-ratings.md)). The split is the Group's Rating settings weight.
- **A Tier band is a place among ranked members.** The Shark is place 1. Hamour is the next 15% of the rest, Kanaad the next 35%, Safi the others. The band is stored only to detect a change and tell the player.
- **Provisional** for a member's first five Group Games, or until an Organizer adjusts them: no fish, a hatched slot, and they are not counted when places are cut. Fish appear once four members are ranked.
- **A Tier adjustment is an event** with who, a required reason and an optional note. It moves points; the fish follows from the place.
- **Reversal subtracts.** Reporting a wrong score removes the Match's tier events by subtracting their deltas and recomputing bands. It is never blocked by a later Match. The same rule holds for football OVR events ([ADR-0069](./0069-a-football-level-is-an-ovr-moved-by-four-parts.md)). The padel rule of ADR-0011 is unchanged.
- **Tier points carry across Seasons** and are cleared when a member leaves the Group. The events stay.
- **No replay.** The ledger starts the day the feature ships.

**Considered Options**: a Glicko-2 Rating per Group, as ADR-0053 did (no whole-number delta to show, no clean way to add an adjustment, order-dependent reversal); bands as point thresholds (points drift with Group size and adjustments, and the owner's sheet says the fish follows the place); deriving Tier points from the Season Standing (a Standing restarts and counts wins, not strength of opposition); a goal-margin multiplier on the result part (left out of the first version; the constants are tunable).

## Consequences

- Moving one player can change someone else's fish. The adjust sheet says who.
- The ledger is not exactly zero-sum when sides differ in size or when Provisional players move faster. Bands are places, so drift in the absolute number changes nothing a player sees.
- An Organizer can now reopen a football Group Game, which was impossible while the Match had nothing to reverse.
