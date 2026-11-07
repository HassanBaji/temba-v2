# A Game day closes at the following midnight, and a Game may run past it

**Status:** accepted.

Venues in Bahrain run late. A Game at 10:30 PM that finishes at midnight, or one that starts at midnight and finishes at 1:30 AM, is part of that evening for everyone who plays it. The create and edit pickers allowed neither: a day's slots ran 00:00 to 23:30 and the finish had to fall on the same calendar day.

## Decision

- **A Game day runs from 00:30 to the following midnight inclusive.** `gameDayStart` in `@repo/domain/game-day` gives a Game's day: a start exactly at midnight belongs to the day before it. Every Game day label (card day, Today/Tomorrow, detail headings, the home Up next list, Season linking) reads that day, not the calendar day of the instant.
- **Picker slots count minutes from the Game day's midnight.** Start slots are `00:30` to `24:00`; finish slots run on to `27:00`, so 1:30 AM after a late start reads `25:30`. Parsing rolls hours of 24 and more into the next calendar day, and splitting a stored window puts it back on the day it was picked on.
- **A window that ends by 03:00 the next morning is a one-day window.** `isOneDayTournamentWindow` uses that bound, so a tournament that runs past midnight keeps back-to-back Rounds and one date line.
- **The server keeps its contract.** Windows are still two instants; only the client-side slot rules and day labels change. No migration.

**Considered options**: letting a day's first start stay `00:00` (two slots on a day would read 12:00 AM, and a midnight Game would sit on a different day from the evening it belongs to); a finish bound at 24:00 (no 12:00 AM to 1:30 AM Game); treating any window that crosses midnight as two days (spreads a late tournament's Rounds across the night).

## Consequences

- `GAME_WINDOW_TIME_SLOTS` no longer holds `00:00`; `GAME_WINDOW_FINISH_SLOTS` and `gameWindowFinishSlots` give the finish choices. Clients call `upcomingGameWindowFinishSlots` instead of filtering the start slots.
- A legacy Game that started at 00:00 is now listed under the evening before, and the Game created from a Booking at midnight follows the same rule.
- Booking slots on the Venue grid are unchanged: a Booking day still opens at 00:00.
