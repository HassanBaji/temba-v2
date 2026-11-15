# Rounds is a Tournament shape, and a Round is added or cancelled after the draw

**Status:** accepted. Amends [ADR-0019](./0019-organizer-chooses-the-round-count.md) and
[ADR-0062](./0062-tournament-rounds-are-drafts-and-the-other-team-confirms.md).

Organizers asked for two things. A tournament where everyone is in one table and the only question
is how many Rounds are played. And a way to change the number of Rounds on the day, after the draw
is posted, in every shape that has Pool Rounds: one more because there is time, or one fewer because
there is not, including a Round that has already been played.

## Decision

- **Rounds is a fifth Tournament shape** (`tournament_shape = 'rounds'`). It is one Pool, always, so
  it has no Groups control, and everything built for a Pool stage (the draw, Round drafts, the Pool
  table, scores) works on it unchanged. It was not folded into Groups only with one group, because
  the two answer different questions at create and need different defaults.
- **Its Round count is always a number.** A Groups shape stores `null` for "one Pass of whoever is
  drawn" (ADR-0019). In the Rounds shape the Organizer picked the number on purpose, so it is stored
  as picked, even when it equals one Pass, and a smaller drawn field keeps it. The stepper starts on
  four Rounds, or one Pass when that is shorter, and still stops at two Passes.
- **After the draw the Round count is the Organizer's to change**, with `games.addRound` and
  `games.cancelRound`, on Groups only, Groups then knockout and Rounds. ADR-0019's "posting never
  rewrites `round_count`" still holds for posting; these two doors write the new count as a number.
- **An added Round goes after the last one and is not made.** The Organizer generates or pairs it
  like any other Round draft. `addRound` takes `post: true` to pair and post it in the same step,
  for the mobile App, which has no Round drafts yet. Two Passes stay the ceiling.
- **Cancelling a Round does one of two things, and the Organizer is told which.** A Round nobody has
  played, with no posted Round after it, comes off the schedule: its drafts and unscored Matches are
  deleted, the drafts after it move up a number, and the Round count drops by one. Any other posted
  Round stays in the list, numbered as it was, with every Match cancelled. Players already know
  those Round numbers, Courts and times, so they never move.
- **A cancelled Round's scores count for nobody.** Each confirmed score is taken back under the
  wrong-score rule (ADR-0011) before its Match is cancelled, so its Pool points and its rating
  change go with it. If one of them cannot be taken back, because a player has a later rated Match,
  the whole Round is refused and nothing changes. On a rated tournament that means a played Round
  can be cancelled only while no later Round has been played.
- **A tournament that had finished is open again once a Round is added**, and finishes again when
  that Round is settled. The Game finished Notification is not sent twice.
- **On Groups then knockout the Knockout follows the Pool Rounds.** Adding a Round or taking one off
  moves the Knockout's Round numbers, Courts and times, and takes back the qualifiers already placed
  so they are placed again from the final table. Neither is allowed once a Knockout Match has a Set,
  a result or a Walkover.

## Considered options

- Renumbering the Rounds after any cancelled Round. Rejected: a posted Round's number, Court and
  time are what players were told, and with uneven Pools the number also decides which Pool sits
  out (Pass alignment, ADR-0019).
- Keeping every cancelled Round in the list, posted or not. Rejected: an Organizer who planned five
  Rounds and plays four would carry a "Round 5, cancelled" that nobody ever saw.
- Replaying later rated Matches so an earlier played Round can always be cancelled. Rejected for
  now: ratings are sequential, and re-applying them changes every later Level change on the day.
- A separate Game format. Rejected for the reason ADR-0020 gives for the Knockout: the format stays
  Friendly tournament and the shape says which stages it plays.
