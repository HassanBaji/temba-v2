# Tournament shape adds a Knockout

**Status:** amends [ADR-0017](./0017-friendly-tournament-is-a-pool-round-robin.md),
[ADR-0018](./0018-hub-lists-expand-a-drawn-tournament.md) and
[ADR-0019](./0019-organizer-chooses-the-round-count.md).

ADR-0017 shipped one shape, a pure Pool round robin, and deferred the knockout, the format picker
and the overall champion together. **A Friendly tournament now has a Tournament shape chosen at
create: Groups only, Knockout only, or Groups then knockout.** Groups only is the default and is
exactly the tournament ADR-0017 described. A tournament with a Knockout ends with a **Champion**,
the winner of the Final, which is the cross-Pool comparison ADR-0017 said only a knockout could
make.

**The shape is a column on the Game, not a Game format.** ADR-0017 rejected a second tournament
format because every `switch (game.format)` would grow an arm and the product would hold two
tournament concepts. That reasoning applies three times over here, so `friendly_tournament` stays
the only tournament format and `games.tournament_shape` says which stages it plays. A null shape on
a row with `pool_count` set means Groups only, so nothing is backfilled. The cost is that "is this
a drawn tournament" can no longer be read as `pool_count is not null`: a Knockout only tournament
has no Pools. That one predicate is split into "drawn tournament" and "has Pools", and each call
site picks one on purpose.

**No new tables, again.** A Knockout Match is an ordinary `matches` row that also carries its
Knockout round and its position in that round. Which Match a winner feeds is arithmetic on those
two numbers, so "Winner of Q1" is derived, never stored. The whole tree is inserted when the draw
is posted, with empty slots, so the schedule is complete from day one and every Knockout Match
already has a Court and a time. A `brackets` table would have stored nothing these columns do not.
Two things are stored that could have been derived, both deliberately:

- **Where a qualifier comes from** (`A1`, `B2`) is written on the slot at post. Deriving it on read
  from the live Pool sizes would let a later withdrawal reshape a tree people have already seen.
- **The drafted Knockout draw** is an order number on each Game team, the same idea as a drafted
  Pool draw being `pool_index` with no Matches yet.

A Match's Pool is still derived from its two teams, but only for Matches that are not Knockout
Matches. Without that rule a Final between two teams from Pool A would be counted in Pool A's
table.

**A Bye is not a Match.** An uneven field is padded to the next power of two and the padding
becomes Byes. The team with a Bye is written straight into its slot in the second Knockout round.
The alternatives were to allow only fields of 2, 4, 8 or 16, which forbids three groups and most
knockout-only team counts, or to fill the tree with the best next-placed teams across Pools, which
ranks teams that never met. Inserting a placeholder Match for each Bye was also rejected: it would
be a completed Match with one team, and every reader of `matches` would have to learn to skip it.

**Byes go to Pool winners in Pool order, and nobody is ranked across Pools.** Entrants are ordered
all Pool winners first (Pool A, then B), then all second places, and Byes go to the front of that
order. Pool letters come out of a random draw, so giving Pool A's winner a Bye before Pool C's is
luck, not a judgement that Pool A was stronger. This keeps ADR-0017's refusal to compare records
from different Pools. Within that order, the tree keeps two teams from the same Pool out of the
same first-round Match whenever there is more than one Pool.

**A level Knockout Match cannot complete.** Everywhere else a Match may be drawn, and Glicko-2
scores it 0.5. A Knockout Match needs someone to go through, so level Sets are treated as no result
yet: force-complete is refused, automatic completion does not fire, and no Match result
confirmation is asked for. Players add a deciding Set. We rejected letting the Organizer pick who
advances from a drawn Match, because the rating would record a draw while the tree recorded a win,
and rejected games-won as a tie-break because it can still be level.

**Placement and advancing are automatic.** When the last Pool Match settles, the qualifiers are
read from the Pool tables and written into the tree; when a Knockout Match completes, its winner is
written into the Match it feeds, in the same transaction. There is no "Start knockout" step. The
price is that a late score correction can change who qualified, so a correction on a Pool Match
re-places the qualifiers only while no Knockout Match has a Set, and is refused after that. The
same rule protects a Knockout Match: its result can be reversed only until the next Match has a
Set. How many qualify follows ADR-0019's pattern: the Organizer's number is kept as intent, capped
silently at post by what the drawn Pools allow, and never rewritten.

**A Walkover is awarded but never rated.** ADR-0017 decided a withdrawing team's unplayed Matches
are voided, not awarded, because an unplayed win should not move a rating. That still holds for
Pool Matches. In a Knockout a voided Match leaves a hole nobody can advance through, so cancelling
a Knockout Match records which team goes through. It stays a cancelled Match with no Sets and no
rating effect, so the reason ADR-0017 gave is kept and only the tree moves.

**Hub lists.** ADR-0018's per-Match rows cover Knockout Matches too, from the moment the viewer's
Game team is in one of the slots. A Knockout Match the viewer might reach is not listed.

Not built: a third-place Match, double elimination, consolation games for knocked-out teams,
seeding by Level or Rating, and changing the shape after create.
