# Either side holds a Position until a partner picks

**Status:** accepted. Design: "Padel join, sides optional" (J0–J3).

Players joining a padel Friendly game had to pick Left or Right. Many do not mind, and a player who picked a side they did not care about could shut a later joiner out of it.

## Decision

- **Seats, not sides.** A Game team has two seats; a side is a label on a seat. A joiner picks a team, then Left, Right or Either. `games.registerSeat` takes `position: "either"` beside `left` and `right`; the change is additive.
- **Either is stored as the User's answer, beside a real Position.** `game_team_players.either_side` is the answer and stays theirs; `position` is where they play. Every reader of `position` (Match sheets, hub cards, vacancy counts, leave, Waitlist promotion) keeps working unchanged.
- **Resolving.** Either next to a User who picked plays the other side ("auto"). Either next to Either stays open ("no sides picked"). A joiner who picks the Position an Either-side User holds moves them over; a picked Position is never taken. The rule is `resolveTeamSeat` in `@repo/api` `games/seats`, so every door that seats a User follows it.
- **Changing it.** `games.setSeatSide` lets a seated User change their answer until the Game starts. `games.setTeamSides` lets an Organizer set a full Game team's sides, or swap them, recorded in `game_team_players.side_set_by`. A User whose Position moves because of either gets a `game_side_changed` Notification.
- **Played side** counts a User's Position unless both Users on the Game team answered Either and nobody set it.
- **Friendly games only.** Tournaments keep a picked Position: Half teams and their merge read Positions before the draw.

**Considered Options**: storing a null Position for Either (every reader of `left` and `right` would have to learn a third state, and vacancy counts would show two open Positions for one open seat); clearing `either_side` once a partner picks (the Line-up could no longer say "auto", and a User who changes their mind would lose their answer).

## Consequences

- The Line-up labels each seat with its side state: picked, auto, Either, or set by the Organizer.
- Sides never block starting or scoring a Game; setting them is a convenience for the sheet.
- Waitlist promotion still seats the promoted User in the vacated Position as a picked side.
