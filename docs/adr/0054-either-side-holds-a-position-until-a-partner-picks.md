# Either side holds a Position until a partner picks

**Status:** accepted.

Players joining a padel Friendly game had to pick Left or Right. Many do not mind, and picking one shuts the other player out of it: a later joiner who wants that Position finds it taken by someone who never cared.

## Decision

- **A User may join a Friendly game's Game team Either side.** `games.registerSeat` takes `position: "either"` beside `left` and `right`; the change is additive.
- **Either side is a flag on the seat, not a missing Position.** `game_team_players.either_side` marks the row, and the row still holds a Position, `left` on an empty Game team. Every reader of `position` (Match sheets, Line-up, hub cards, vacancy counts, leave and Waitlist promotion) keeps working unchanged.
- **The next User on the Game team decides.** Picking the Either-side User's Position moves them to the other one; picking the other Position leaves them where they are. Either way they are settled (`either_side` false). A second Either-side User takes the other Position and both stay Either side. The rule is `resolveTeamSeat` in `@repo/api` `games/seats`, so every door that seats a User (register, invite links, Lookup invites, Organizer add, Waitlist promotion, Move seat) follows it.
- **Played side ignores unsettled Either-side seats.** Nobody picked that Position, so it is not a recorded one.
- **Friendly games only.** Tournaments keep a picked Position: Half teams and their merge read Positions before the draw.

**Considered Options**: storing a null Position for an Either-side User (every reader of `left` and `right` would have to learn a third state, and vacancy counts would show two open Positions for one open place); leaving Either side to the Preferred Position default (a default still picks a Position and still shuts the other player out).

## Consequences

- A Position shown on a Game team with an Either-side User and one vacancy is provisional: the join sheet offers it as takeable and says the Either-side User moves over.
- An Either-side User who is settled stays settled if their partner leaves.
- Waitlist promotion still seats the promoted User in the vacated Position, which settles an Either-side partner.
