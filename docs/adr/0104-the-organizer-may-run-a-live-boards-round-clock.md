# The Organizer may run a Live board's Round clock

**Status:** accepted. Amends [ADR-0102](0102-a-live-board-is-a-web-page-a-tv-opens-with-a-board-code.md).
Spec: `.scratch/live-board/spec.md`.

ADR-0102 worked the Round clock out from the posted schedule and accepted that "a Round that starts
late still counts down from its posted time". On the day that is the common case: pairs are still
finding their court when the board says the Round is ten minutes old, and a stoppage has no way to
stop the count. Organizers asked to start and pause the Round themselves.

## Decision

- **The Round clock follows the schedule until an Organizer takes it.** A board that nobody touches
  behaves as before. Starting a Round, pausing the clock or switching _Follow the schedule_ off
  takes it; switching it back on hands it back.
- **Once taken, every Round waits for Start.** A day that ran late once is late for the rest of
  it, so the next Round does not go live at a posted time that no longer holds. The board reads
  "Soon" with the Round's full length until the Organizer starts it.
- **The clock is a stopwatch stored on the board**: the Round it was started for, when it was
  started, when it was last set running (null while paused) and the time banked before that. The
  TVs and the control work out the time left from those and the server's clock, as they do the
  rotation, so they agree without a channel. Taking the clock while the schedule's count is
  running keeps that count.
- **It belongs to the board, not the Game.** No Match start time and no score moves. The Game
  screens, the Round states they show and the posted times on Next up keep reading the schedule.
  ADR-0102's "the board changes nothing" holds for the Game; the board now has one more setting.
- **A Round with a score saved is on court whatever the clock says.** If the Organizer runs one
  Round by hand and forgets the next, the board shows that Round as live without a clock once a
  score comes in, and never "Soon" over a Round being played.
- **A tap that has nothing to do changes nothing**, so two Organizers pressing Pause do not undo
  each other, and a tap names the Round it was made for, so one that arrives after the board moved
  on is refused instead of starting the next Round.
- **Socials only.** A one-Match board's match time still counts from the Game's start.

**Considered options**: moving the Matches' start times when the Organizer starts a Round (the
schedule is what players were told, a pause has no start time to move to, and it would turn a
view-only board into a second way to edit the Game); a per-Round override that falls back to the
schedule at the next Round (the next Round would go live by itself at a time already known to be
wrong); a clock that never runs until started (it would change every board in use today and leave
a board nobody is tending stuck on "Soon").

## Consequences

- The board and the Game screens can disagree on whether a Round has started, by as long as the
  Organizer is late to start it.
- The posted times of later Rounds are not shifted; an Organizer running late reads them as the
  plan, not the clock.
- A pause reaches a TV up to five seconds late; the time left is worked out from the moment of the
  tap, so the TV steps back to it instead of drifting.
