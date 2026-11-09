# Tournament Rounds are drafts, and the other team confirms the score

**Status:** accepted. Amends [ADR-0011](./0011-match-result-confirmation.md),
[ADR-0017](./0017-friendly-tournament-is-a-pool-round-robin.md) and
[ADR-0019](./0019-organizer-chooses-the-round-count.md) for drawn Friendly tournaments.

Posting the Pool draw used to insert every Pool Match at once, in the circle method's order. The
redesign (`.scratch/tournament-rounds/spec.md`) lets the Organizer make Rounds three ways — all at
once, one at a time, or by hand — and switch between them, and asks one tap from the other team to
settle a score.

## Decision

- **A Round is a draft until posted.** Drafts live in `tournament_draft_matches` (Game, Round,
  position, two Game teams) and only Organizers see them. Posting a Round inserts its Matches on the
  Court and time of each position and deletes the drafts. A Round is posted only complete, and only
  after every earlier Round. ADR-0017's "no new tables" held because a draft draw was a column; a
  draft Round is a list of pairings, which a column cannot hold.
- **`games.postPoolDraw` takes `rounds: "all" | "later"`.** `"all"` (the default) keeps the old
  behaviour for every existing caller; the web App posts `"later"`. A Groups then knockout draw still
  posts its empty Knockout tree with the draw, scheduled after the Pool Rounds.
- **The three ways are one model.** Generate all is the circle method when nothing is made yet;
  otherwise each missing Round is paired around what exists, avoiding repeats. A Round made on its
  own from Round 3 on pairs teams on similar points. Hand pairing saves the pairings made so far, and
  _Fill the rest_ pairs the free teams around them. Randomness is the server's, as for the draw.
- **A swap keeps the Round complete** (the displaced team takes the chosen team's place) and
  re-pairs later draft Rounds when the swap leaves a repeat. The repair is deterministic for a seed
  built from the swap, so the client previews exactly the repeats the server will leave. Posted
  Rounds never move; a posted Match swaps only while it has no score.
- **The Pool stage, and the Game, finish only once every Pool Round is posted.** Every settled Match
  no longer means finished when Rounds are made as the day goes.
- **A drawn tournament Match is agreed by one player from each side**, as a football Match already
  is, instead of every seated player. The team that enters the score is confirmed by entering it.
- **An unanswered score stands ten minutes after it is entered.** ADR-0011 rejected a timeout because
  nothing told players a score was waiting; now the other team gets a `match_score_to_confirm`
  Notification and the `match.score-stands` Job completes the Match at the deadline. A correction
  restarts the clock and asks the first team instead.
- **An Organizer not playing in the Match sets the score outright**, including over a confirmed one
  (reopened first under ADR-0011's wrong-score rule). The sheet states the winner and points before
  Save, which is the typo guard ADR-0044 wanted from a separate confirm. An Organizer who plays in the
  Match enters it as a player.
- **A tournament score is games won, one Set**, so 5–5 is a draw. Points are 3 for a win, 1 for a
  draw, 0 for a loss, and the table sorts on them before head-to-head.
- **Didn't finish** clears the score and marks the Match. It counts for nobody, and the Pool waits
  for a score or for the Organizer to cancel it.

## Considered options

- A `posted_at` column on `matches`. Rejected: every Match query in the App would have to learn to
  skip drafts, and a missed filter leaks a draft into history, ratings or the hub.
- A client-side draft. Rejected: drafts survive a reload and are shared between Organizers, and the
  server must own the randomness.
- Keeping unanimous confirmation with the new screens. Rejected by the product: on court, a score
  that needs three more taps stalls the day.
