# Organizer chooses the Round count

**Status:** amends [ADR-0017](./0017-friendly-tournament-is-a-pool-round-robin.md).

ADR-0017 shipped "one shape — a pure Pool round robin", and the App derived the
Round count from the field: one full round robin in the biggest Pool. **The shape stays a Pool round
robin, but the organizer now sets how much of it is played.** At create, a Rounds stepper starts on
the suggested count (one **Pass** in the biggest Pool — size − 1 when even, the size itself when odd)
and goes from 1 to twice that. The value lives in a new nullable `games.round_count`.

**A partial round robin is allowed, and the cost is accepted.** A Group with time for three Rounds of
a five-Round schedule is a normal evening, and the only workaround before this was to change the
number of Game teams or groups, which changes who plays rather than how much they play. The price is
that a Pool table can rank Game teams that never met. We accepted that rather than refuse short
tournaments, and made it visible instead: the create screen says "Not everyone meets" whenever the
pick leaves a pair unplayed. A partial count is always the first R Rounds of the circle method — the
organizer does not choose which pairings are dropped, so hand-pairing stays deferred as ADR-0017 left
it.

**Passes are capped at two.** A second Pass answers a real request — everyone meets twice, with sides
swapped so slot order alternates. A third was not asked for, and each extra Pass multiplies the
schedule the one-day fit check has to hold. The cap also keeps the stepper's range readable: 1 to 2 ×
suggested, one number to explain.

**`null` means "follow the field", not "the number the suggestion was at create".** The suggestion is
computed from the planned field, but the Pool draw runs on whoever actually turned up. An organizer
who never touched the stepper meant "one full round robin", so if the drawn field is smaller, the
posted draw plays one Pass of the drawn Pools. A number the organizer changed is kept as their intent,
and is capped silently at twice the drawn suggestion when the draw is posted, so posting never fails
over a count the field can no longer fill. A value equal to the planned suggestion is stored as
`null`, so there is no hidden difference between "untouched" and "picked the suggestion". Posting
never rewrites `round_count`, so an Undo of the draw returns the organizer's original intent rather
than the clamped number. Existing rows stay `null` and behave exactly as before; nothing is
backfilled.

**Uneven Pools use Pass alignment.** With suggested S, Round r belongs to Pass k = ceil(r / S) at
position j = r − (k − 1) × S. Every Pool plays its own circle-method Round j in that Pass if its own
Pass is that long, and otherwise sits out. The alternative was free cycling: each Pool starts its
second Pass as soon as its first ends. That keeps Courts busier but lets a pair in a smaller Pool
meet twice before a pair in the biggest Pool has met once, which makes "Everyone meets once" and
"Some meet twice" mean different things in different Pools on the same Round. Pass alignment keeps a
single rule — no pair meets twice before every pair has met once — at the cost of idle Rounds for the
smaller Pool, and at R = S it reproduces the old schedule exactly.
