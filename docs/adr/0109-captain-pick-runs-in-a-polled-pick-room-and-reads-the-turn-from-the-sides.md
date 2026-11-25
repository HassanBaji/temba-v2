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
- **A pick whose pool empties without a pick finishes too.** When the last player still to be
  picked leaves the Game or is kicked, there is no pick left to finish on. The next read of the
  Pick room finishes it as the last pick would, once, under the draft row's lock, and the Game
  admins hear with copy that names no picker.
- **A room that ended reads stopped or closed, and only a stopped pick says so.** The draft
  records when its pick was stopped, by an Organizer or by losing a Side captain, and keeps that
  through later saves until a new room opens. A pick that finished and was then edited or
  published reads closed, and with the draft gone the room is not found for anyone but an
  Organizer. A screen says "The organizer stopped the pick" only for the pick it was showing.
- **Each opening of the room has its own id.** The room reads it back, so a screen tells a new
  pick from the one it watched. A screen that read the pick finish keeps "Teams are picked"
  through closed and not-found reads, reads the room every fifteen seconds instead of every two,
  and shows a new room when the Organizer opens one.
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
- Leaving a pick whose pool emptied without a pick live until an Organizer stops it. Rejected:
  the room would show a turn with nobody left to pick, and the teams are as picked as they can be.
- Reading every room without a pick as stopped. Rejected: a pick that finished and was published
  or edited inside one poll told its Side captains the Organizer had stopped it.
- Not reading a finished pick again. Rejected: a Side captain left on "Teams are picked" never
  learned that a new room was open.
- Naming the opening by a time the draft already has. Rejected: `saved_at` changes when the pick
  finishes, and `created_at` does not change when a room opens over a draft.

## Consequences

- `games.footballPickRoom` is a query that writes presence, makes the toss and finishes a pick
  whose pool emptied without a pick, as `liveBoards.snapshot` writes on read.
- A pick reaches the other Side captain up to two seconds late; copy says "in a moment", not "at
  once".
- In a tier Group a Side captain picks on Tier band and place, coarser than the Tier points the
  Organizer balances on, so that no Provisional member's points are shown.
- Three Notification types, which become pushes with Phase 7.
- A Side captain who leaves the Game during a pick stops it; what was picked stays as an ordinary
  Draft line-up.
- The draft carries `pick_id` and `pick_stopped_at`. A Side captain whose draft is gone, or who
  is no longer its captain, cannot be told apart from an outsider: the room is not found, and a
  screen that was showing the pick closes without saying it was stopped.
