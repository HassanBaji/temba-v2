# A football Game is a roster with sides picked later

**Status:** accepted.

A football Game registers Users against a cap with no Position (Roster registration, the path Americano already uses), carries a Side size, and in v1 has no Match and is Unrated. When results ship, an Organizer picks two sides, the Game gets its one Match, and the Score is that Match's one Set, so that win, loss, draw, confirmation, Standing, Last 10 and the rating step stay unchanged readers.

## Decision

- **A football Game is a Friendly game with `registrationMode = individual` and `sport = football`.** `isRosterRegistrationGame` in `@repo/domain/game-shape` is true for Americano and for a football Friendly game. `isIndividualSeatGame` is true only for the other individual Friendly games and tournaments, so every seat door and the shared admit module treat a football Game as having no seats.
- **`games.side_size` is nullable and football-only.** Check constraints allow 5, 6, 7, 8, 9 or 11, and require a value on every football Game. Players allowed is between twice the Side size and 40.
- **A football Game comes only from a football Group or a football Court Booking.** `games.create` takes the sport from the Group; the input has no sport field. Americano and Friendly tournament are refused on a football Group.
- **No Match, Sets or Level range exist on a football Game.** The pitch is recorded in `game_courts`. `rated` is false whatever the Group's verification; snapshot semantics (ADR-0035) mean football results flip only Games created after they ship.
- **Seat doors refuse a roster Game** with one message, "This Game has no seats; register as yourself". Invite accept on a roster Game admits without a Position.

**Considered Options**: a four-seat Game with larger sides (Positions have no meaning past two); a separate `football_games` table (every Game door would fork); goal columns on Match (a second outcome reader in Standing, stats, Last 10, confirmations and the rating step).

## Consequences

- Padel and Americano behaviour is unchanged; the hinge is one function with a table test.
- Football results (Side pick, Score as the Match's one Set, rating over rosters) extend this ADR when they ship.
- A football Game carries no Match, so Standing and stats loaders return zeros for a Group that has only football Games.
