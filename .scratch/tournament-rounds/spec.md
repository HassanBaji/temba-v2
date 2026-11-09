Status: implemented (web App only)

Design: `Temba Sports Community App Tournament Rounds.html` (screens 1a–1g, 2a–2e), shared in the
session that built this. Decisions: [ADR-0062](../../docs/adr/0062-tournament-rounds-are-drafts-and-the-other-team-confirms.md).

Builds on `.scratch/friendly-tournament-redesign/spec.md` (pre-draw chrome, unchanged here) and
`.scratch/friendly-tournaments/spec.md`.

## Problem

Posting the Pool draw generated every Pool Match in the circle method's order, so the Organizer could
not run the day round by round, pair a Round by hand, or react to who turned up. On the web App a
drawn tournament had no score entry at all, and the page stacked the table and every Round's results
in one long scroll.

## What ships

### Organizer, making Rounds (1a–1f)

- **1a The draw.** The draw sheet lists each Pool's teams numbered, with an initials mark and both
  names on two lines. _Post the draw, then make Rounds_ posts with `rounds: "later"`; _Draw again_
  re-rolls. Footer: "Posting closes the seats. Rounds come next, your way."
- **1b Three ways.** With nothing made, the Rounds tab offers _Generate all N Rounds_, _One Round at
  a time_ and _Pair them yourself_, plus Courts, Each game and Points rows.
- **1c Drafted.** Each Round is a collapsible card (R1, time, game count, state). Draft Matches show
  Court, time and _Swap_. _Regenerate_ re-makes every unposted Round. Footer: _Post Round N, keep the
  rest as drafts_ / _Post all N Rounds_.
- **1d Swap.** Picks a new opponent for a team; the displaced team takes the chosen team's place.
  Each option says the knock-on pairing, and a repeat left after re-pairing later drafts is listed
  before _Swap them_. Posted Matches swap only while unscored.
- **1e Round by round.** Played and posted Rounds, then a hatched _Round N, not made yet_ card with
  _Generate Round N_, _Pair myself_ and _Generate the rest_. From Round 3 a Round generated on its own
  pairs teams on similar points.
- **1f Pair them yourself.** Full-screen: games in the Round in Court order (hatched until made), the
  free teams with points and "Played them in Round k" greyed, _Fill the rest_, and _Post Round N,
  k games to go_ held until the Round is full.

### Everyone, after the draw (1g, 2a–2e)

- Black header: back, role chip (Organizer, or the viewer's Pool), Group/Venue eyebrow and date, the
  tab name as title, a lead line per tab. Tabs: Teams, Rounds, Standings, Bracket (Groups then
  knockout only). A strip shows which Round is on court and how many are played.
- **Standings.** Pool table with P W D L **Pts** (3/1/0), the viewer's row tinted, zeros in grey
  before any score with a "draw order" note, a dashed "Through to the knockout" line for Groups then
  knockout, then **Your Rounds** with result marks, _Enter score_ / _Confirm_ on the live one and the
  Court for later ones.
- **Rounds.** Every posted Match with its state: hatched until its slot, _Enter score_ when it is on
  court and yours, a grey score "waiting for confirm", bold once confirmed, "didn't finish". An
  Organizer sees _Enter score_ on every live Match and _Edit_ on every confirmed one.
- **2c Enter score.** Two steppers of games won, the outcome and points stated before _Save_,
  _Didn't finish_.
- **2d Confirm.** "Hassan entered 6–4", _Confirm 6–4_ or _Correct it_; stands on its own at the time
  shown.
- **Undo the draw** moved into the ⋮ menu behind a confirm, disabled once any score exists.

## API (additive)

`games.postPoolDraw` gains `rounds?: "all" | "later"`. New doors, one per file under
`packages/api/src/routers/games/`: `tournamentRounds` (query), `generateRounds`,
`saveRoundPairings`, `swapRoundPairing`, `postRounds`, `enterTournamentScore`,
`markMatchNotFinished`. New Job `match.score-stands`; new Notification type
`match_score_to_confirm`. Schema: `tournament_draft_matches`, `matches.not_finished_at`
(migration `0093_tournament_rounds`).

## Not built

- The mobile App keeps its current tournament screens (follow-up).
- _Photo of the board_ on the score sheet.
- _Two groups of 4_ on the draw sheet, and dragging teams or games to reorder.
- Moving a Match to another Court or time from the Rounds tab (`games.updateMatch` still does it).
