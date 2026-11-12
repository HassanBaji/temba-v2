# A Public Game at a partner Venue counts for Temba Level

**Status:** proposed (draft for the owner's review). Spec: `.scratch/rating-redesign/spec.md`. Amends [ADR-0014](./0014-public-groups-list-and-group-join-requests.md), [ADR-0029](./0029-a-booking-game-is-groupless-and-unrated.md), [ADR-0035](./0035-rated-and-public-games-need-a-verified-group.md) and [ADR-0044](./0044-an-organizers-score-confirmation-is-final.md) for this one Game kind.

Until now a Level could move only inside a Verified Group or a Challenge Game. A player with no such Group, or a football player with no Team, had no way to earn one. The owner's design adds a second road: a public game, open to anyone, at a partner venue, that both sides confirm.

## Decision

- **A Public Game is a Friendly game with no Group, `is_public` true, at a partner Venue.** Any User may create one. It is the third groupless kind, beside the Booking Game and the Challenge Game.
- **A partner Venue is a stored fact**: `venues.partner_at` and `partner_by`, set by an Operator. It is never inferred from managers, bookings or linked Groups.
- **Anyone inside the Game Level range may join.** The join gate and the Level range check already allow this for a public Game. The Games hub gets its Public tab back, listing Public Games.
- **It counts for Temba Level** at the Club weight, on padel and on football.
- **One player from each side confirms the score within 24 hours.** The creator is the Game's Organizer for edits, but their confirmation is not final here. A Verifier stamp is a final confirmation.
- **An unanswered score stands and moves nothing.** After 24 hours the Match completes with `stood_unconfirmed_at` set: it is in Match history and never rates.
- **A Booking Game is unchanged**: private and Unrated unless its holder makes it a Public Game at a partner Venue.

**Considered Options**: counting any public Game anywhere (no neutral ground and nobody to stamp or settle a dispute); requiring every seated player to confirm, as padel Group Games do (strangers do not all come back to the app, and one per side is the rule tournaments already use); letting the creator's confirmation be final, as ADR-0044 does for Organizers (one stranger could move seven other Levels); inferring "partner" from a Venue manager or bookings being on (ADR-0035's lesson is that the server enforces a stored fact).

## Consequences

- The Public tab that ADR-0014 hid returns, for Public Games only.
- A player can now earn a Level with no Group at all.
- Strangers bring no-shows and sandbagging. The Level range gate and the faster movement of Provisional players are the first defences; a Match dispute is the last.
