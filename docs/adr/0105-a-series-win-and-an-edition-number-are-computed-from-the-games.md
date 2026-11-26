# A Series win and an Edition number are computed from the Games

**Status:** accepted. Spec: `.scratch/series/spec.md`.

A Verified Group gives the Social or Game it plays every week a name and a badge, a Series, and
attaches it to each Game it plays for it. Each attached Game is an Edition, numbered inside its
Series, and whoever wins an Edition collects the badge on their profile with a count. The design
asks that a win is awarded "the moment the last score is saved" and "follows the corrected result"
when a score changes later.

Two things could be stored: who won each Edition, and each Edition's number.

## Decision

- **A Series win is computed, never stored.** One pure rule, `seriesEditionResult` in
  `@repo/domain/series-result`, reads a Game with its Game teams, Matches and Sets and says whether
  the Edition is still to be decided, was decided with no winner, or was won and by whom. Every
  read (the Game screen, the Series page, the Group's tab, the profile, Home's Latest) asks it
  through one loader, `packages/api/src/series/load-series-editions.ts`. There is no wins table.
- **The rule names the winner each Game kind already names**, with the functions the finished
  screens already use, so a Series never disagrees with the result beside it:
  - a padel Friendly game and a football Game: every player on the side `matchOutcome` gives the
    completed Match to; a drawn Match gives the Edition to nobody;
  - a Social with a Pool stage and no Knockout (Rounds, Groups only): the Game team on top of each
    finished Pool table (`computePoolTables`). A Groups only Social drawn into several Pools has a
    winner per Pool and no Champion, so each Pool's top team wins;
  - a Social with a Knockout: the Champion, who won the Final or was awarded it as a Walkover;
  - King of the court: the Game team placed first in the posted Final order;
  - Americano: the player in first place of the Americano table, alone.
- **Every Game kind a Group can create carries a Series.** A legacy `americano` Game format row and
  a hand-built legacy tournament do not: neither can finish with a winner. A Game with no Group
  (Booking Game, Challenge Game, Public Game) does not: a Series belongs to a Group.
- **An Edition number is computed, never stored.** It is the Game's place among its Series' Games
  that are not cancelled, in order of window start, then creation, then id. A cancelled Game is no
  Edition; removing a Game's Series frees its number.
- **The link is one column, `games.series_id`, and it is locked both ways once the score is in**
  (a Match of the Game is completed, or a King of the court's Final order is posted), the line the
  Season link already draws. Until then the Organizer adds, changes or removes it in Edit game.
- **A Series win moves nothing else.** No Level, no Tier points, no Standing, and no Notification:
  the Finished Game Notification already brings the players to the Game, and a stored "you won"
  notice could not follow a correction.

**Considered options**:

- _A `series_wins` table written when a Game finishes._ Reads would be a `GROUP BY`. But a result
  changes through a dozen doors (a corrected Set, a wrong-score report, an upheld Match dispute, a
  cancelled Match or Round, an added Round, a corrected Final order, a player added to or removed
  from a Played game, a cancelled Game, a detached Series, a merged Unclaimed player) and each
  would have to remember to reconcile the table. A door that forgot would leave a badge on a
  profile for a Game its holder lost. The Standing, the Pool table, the Americano table, the Team
  record and the Finished Game are all computed for this reason.
- _An Edition number stored at attach, never reused._ Numbers would be stable, but every Game an
  Organizer cancels and recreates would leave a gap ("where is edition 12?"), and "11 played, next
  is edition 12" would stop being true. A number stored and renumbered on every cancel is the
  computed number with extra writes.
- _Only the shapes the design draws_ (a Rounds Social and a football Game). Groups only is the
  default Tournament shape, so the picker would be missing from the Social most Organizers create,
  with no way to say why.
- _Nobody wins a Groups only Social with several Pools._ A Group would play its Series and the
  badge would go to no one; each Pool's winner is who the finished screen already celebrates.

## Consequences

- Every Series read computes results from Matches. The loader keeps to a fixed number of queries
  however many Games it reads. The heaviest reads, the Group's Series tab and a Series page, are on
  the scale of the Standing tab's read. If one is ever too slow, the same pure function can fill a
  table without changing a rule.
- A new door that changes a result needs no Series code.
- An Edition number can move: when an earlier Game is cancelled, every later Edition moves up one.
  A Friendly game with a completed Match cannot be cancelled, so in practice this is a Social
  cancelled after it was played, or a Game that was never scored.
- A Game whose window ended without a score keeps its number and reads "No result yet" until it is
  scored, cancelled or detached.
- A Guest player can be among an Edition's winners on the Game and the Series page; they have no
  profile, so they are left out of Most wins and the count of different winners.
- Adding a Game kind or a Tournament shape means adding its row to `carriesSeries` and
  `seriesEditionResult`, or deciding it carries no Series.
