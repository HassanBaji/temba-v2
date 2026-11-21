# Captain pick runs in a polled Pick room and reads the turn from the sides

**Status:** accepted. Spec: `.scratch/football-draft-line-up/spec.md`. Builds on
[ADR-0107](0107-a-draft-line-up-is-kept-apart-from-the-football-sides.md) and
[ADR-0108](0108-a-side-captain-is-named-per-football-side-and-answers-without-blocking.md); follows
[ADR-0102](0102-a-live-board-is-a-web-page-a-tv-opens-with-a-board-code.md).

In many football groups the Organizer does not make the teams: two captains pick players in turn.
The design adds Captain pick as a third way to make the Football sides, in a room the two Side
captains share while the Organizer watches.

## Decision

- **Captain pick is a third `football_teams_method`.** It produces a Draft line-up, never
  published teams. The Organizer publishes, shares or edits from there.
- **The Pick room is polled every two seconds.** Temba has no push transport (ADR-0102) and a pick
  takes seconds a turn. A Side captain is in the room while their screen has polled in the last
  ten seconds, as a Board TV is seen while it polls.
- **The pick starts when both Side captains are in the room, or when an Organizer starts it.** A
  toss, when the first pick is one, is made once at that moment.
- **The turn is not stored.** The side with fewer players picks; when they are level, the side
  with the first pick does. Each pick carries a number and undo removes the highest. A player who
  leaves or joins mid-pick needs no repair, and an odd pool gives the first picker the last
  player.
- **A pick names the pick number it expects** and locks the draft row, so two picks sent at once
  cannot both land.
- **The Organizer is in the room without a turn.** They may pick for the side on turn, undo the
  last pick, or stop the pick and finish by hand. Picking for a side is not gated on its Side
  captain being out of the room.
- **No timer, and keepers are picked like anyone else.**
- **Finishing writes both Captain's answers as approved.**
- **The room carries user ids only.** What a Side captain sees of each player is what a pool tile
  already shows any player, and the pool sorts by that.
- **"Told" and "Remind" are Notifications**, with their Notification email, until push exists. A
  reminder is sent at most once every five minutes.

## Considered options

- Websockets or SSE. Rejected again, for the reasons in ADR-0102, and because three clients for
  the length of a pick do not justify a transport.
- A stored turn pointer. Rejected: undo, leavers and joiners would each have to move it.
- A snake order, or a clock on each pick. Not in the design.
- Holding Captain pick until push ships. Rejected: the room works once both are in it, and
  Organizers already reach players on WhatsApp (ADR-0087).
- Waiting for a missing Side captain with no way out. Rejected: the Organizer may start without
  them, since they can pick for that side.

## Consequences

- `games.footballPickRoom` is a query that writes presence and makes the toss, as
  `liveBoards.snapshot` writes on read.
- A pick reaches the other Side captain up to two seconds late; copy says "in a moment", not "at
  once".
- In a tier Group a Side captain picks on Tier band and place, coarser than the Tier points the
  Organizer balances on, so that no Provisional member's points are shown.
- Three Notification types, which become pushes with Phase 7.
- A Side captain who leaves the Game during a pick stops it; what was picked stays as an ordinary
  Draft line-up.
