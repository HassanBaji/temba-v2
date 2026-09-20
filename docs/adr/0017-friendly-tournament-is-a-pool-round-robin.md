# Friendly tournament is a Pool round robin

Friendly tournament shipped as a thin thing: a Game with `playersAllowed / 2` flat sides, and an
organizer who added every Match by hand through `games.addMatch`. The glossary said "multiple
Matches and the same sides on every Match". The design this feature is built from
(`Friendly tournaments flow.dc.html`) describes something else entirely — Game teams **drawn at
random** into Pools, each Pool playing a full round robin across several Rounds, with the Matches
generated rather than hand-added. **We redefined the existing `friendly_tournament` format rather
than adding a second tournament format beside it.**

Adding a new enum value was the safe-looking option and was rejected. It would have left the product
with two tournament concepts, one of which nobody could explain, and grown a third arm on every
`switch (game.format)` in the codebase — `carousel-games`, `byId`, `cancelMatch`,
`listMyMatchHistory` and the seat helpers all branch on format today. The redefinition is cheap
because `.scratch/friendly-only-ui/spec.md` removed the format chooser from App create: the App has
never created a Friendly tournament, so only tRPC and seed rows can exist. Those rows are left
exactly as they are — the new surfaces key off `pool_count is not null`, and a legacy tournament
renders read-only with the plain Match list. No backfill, no conversion, no deletion, which is the
same line `friendly-only-ui` drew for these rows in the first place. This supersedes the round-4
decision in `.scratch/games-matches/decisions.md` item 13 ("Tournament Matches add anytime; sides
optional").

**No new tables were added, and this is the point worth recording.** The format needs four columns:
`games.pool_count`, `games.draw_posted_at`, `game_teams.pool_index`, `matches.round_number`. A
Match's Pool is derived from its two slot teams rather than stored, and — the observation that kept
this from growing a subsystem — **a draft Pool draw is `pool_index` set with no Matches yet**. The
organizer re-rolls by overwriting `pool_index`; posting inserts the Matches in one transaction and
stamps `draw_posted_at`. A `tournament_draws` table holding a provisional assignment would have
stored nothing the column doesn't, while adding an orphan-draft lifecycle to reason about. Everything
else is reused unchanged: seat join, Partner registration, move-seat, Waitlist, the Level range gate,
both Invite doors, `updateMatch`, `cancel`, `cancelMatch`, `closeRegistration`, Set scoring, Match
result confirmation and Glicko-2. A Pool Match is an ordinary rated Match, which is why the Friendly
tournament exclusion comes out of `listMyMatchHistory`.

The draw is generated **server-side** and persisted as a draft. Letting the client shuffle and submit
the final assignment would have been simpler and was rejected: the product sells this feature on
fairness in two separate places in the design — "it is random", "Nobody is seeded" — and an organizer
re-rolling locally until the pools suit them makes that claim false. Randomness that the server does
not own is not a promise the product can keep.

Several things in the design were deliberately **not** built. The knockout bracket and the
"Knockout only" and "Groups, then knockout" options are deferred, so this slice ships one shape — a
pure Pool round robin — with no format picker rather than a picker with two dead options. A
groups-only tournament therefore ends with **one winner per Pool and no overall champion**, because
crowning one across Pools compares teams who never played each other, which is exactly the job the
knockout exists to do. Manual round pairing (design 08c) is deferred with it: in a pure round robin
the pairings are already forced, so hand-pairing only chooses which forced pair plays when, and that
is what `updateMatch` is for. A withdrawing team's unplayed Pool Matches are **voided, not awarded**
— walkovers need an answer to "does an unplayed win move a Glicko-2 rating" that is better given
after a real tournament has run. And **no notification is sent** on merge, posting or Waitlist
closure: this product has no delivery channel at all, so the design's "Both of them get a message" is
recorded as a non-goal, and the protection it was there to provide is structural instead — a seat
stays leaveable until the Pool draw.
