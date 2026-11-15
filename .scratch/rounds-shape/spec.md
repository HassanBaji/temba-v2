Status: implemented (web and mobile Apps)

Decisions: [ADR-0090](../../docs/adr/0090-rounds-is-a-shape-and-a-round-is-added-or-cancelled-after-the-draw.md).
Builds on `.scratch/tournament-round-count/spec.md` and `.scratch/tournament-rounds/spec.md`.

## Problem

An Organizer who wants one table and a fixed number of Rounds had to pick Groups only, set one group
and then change the suggested Round count. And once the draw was posted the Round count was locked:
there was no way to play one more Round, or to drop one, on the day.

## What ships

### Rounds, a new Tournament shape

- Create step 3 lists **Rounds** under Groups only: "One table. You pick how many Rounds are played".
- It has no Groups control: it is always one group.
- The Rounds stepper starts on 4 (or one Pass when that is shorter), goes from 1 to two Passes, and
  has no "Suggested" tag or reset link. Changing Game teams or the format resets it.
- Review shows Format "Rounds" and the picked Round count.
- Before the draw, Edit Game changes the count the same way.

### Add a Round, after the draw (Groups only, Groups then knockout, Rounds)

- **Web, Rounds tab:** _Add a Round_ under the Round cards. The new Round is "not made yet":
  Generate it, pair it by hand, or cancel it.
- **Mobile, Organizer card:** _Add a Round_ asks once, then pairs the Round from the standings and
  posts it. It needs every earlier Round posted.
- Stops at two Passes. A finished tournament is open again until the new Round is settled.

### Cancel a Round, after the draw

- **Web:** _Cancel Round N_ at the foot of every open Round card and on the "not made yet" card.
- **Mobile:** _Cancel a Round_ on the Organizer card lists the Rounds to pick from.
- The confirm says what happens:
  - a Round nobody has played, with no posted Round after it, **comes off the schedule** and the
    count drops by one;
  - any other Round **stays in the list as cancelled**, and its scores leave the standings and the
    players' ratings.
- At least one Round stays.

### Groups then knockout

Adding or removing a Round moves the Knockout after the Pool Rounds and places the qualifiers again.
Refused once the Knockout has started.

## API (additive)

`games.createTournament` takes `tournamentShape: "rounds"`. New doors `games.addRound`
(`{ gameId, post? }`) and `games.cancelRound` (`{ gameId, roundNumber }`). `games.tournamentRounds`
gains `canAddRound`, `maxRoundCount` and, per Round, `cancelEffect` and the `cancelled` state.
Schema: enum value `rounds` on `tournament_shape` (migration `0125_tournament_rounds_shape`).

## Not built

- Cancelling a played Round on a rated tournament once a later Round has been played. Ratings are
  sequential, so the score cannot be taken back; the cancel is refused with that reason.
- More than two Passes.
- Notifications to players when a Round is added or cancelled.
- Round drafts on the mobile App (it posts an added Round at once).
