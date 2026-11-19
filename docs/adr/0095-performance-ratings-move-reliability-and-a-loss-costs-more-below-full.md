# Performance ratings move Reliability, and a loss costs more below full

**Status:** accepted. Amends [ADR-0068](./0068-a-football-match-can-ask-for-performance-ratings.md) (who rates, and how ballots weigh), [ADR-0069](./0069-a-football-level-is-an-ovr-moved-by-four-parts.md) (every part sums to zero) and [ADR-0070](./0070-a-padel-level-weighs-the-partner-and-reads-from-one.md) (the padel step). Amended by [ADR-0099](./0099-a-declared-c-or-above-loses-more-at-its-own-level-until-confirmed.md): on padel the larger of its loss factor and the Prove-it rule's applies, and the factor a Match read is stored. Amended by [ADR-0101](./0101-the-other-players-check-a-padel-level.md): the other players now move a padel Level through the Level check, and a padel Public Game whose Match counts for Temba Level opens a window too.

A football Match that counts for Temba Level already asks everyone to rate (ADR-0068). A padel Match asked nobody, so a player whose Level flattered them kept it until results caught up. The owner asked that in Verified Groups everyone rates how the others played, that several low ratings lower a player's reliability so they lose more when they lose, that this weighs more on a Provisional player, and that an Operator's or a Level setter's rating weighs more.

## Decision

- **Reliability is a number from 0 to 100 on each Rating** (`ratings.reliability`), per sport, 100 to start. It says how far the people a player plays with agree that their Level fits how they play.
- **A settled Performance rating moves it**, once per Match, when the Rating window settles on a Match that counts for Temba Level. Below 5 it drops, up to 20 at a rating of 1 (10 at 3, 5 at 4). From 6, an ordinary game, it comes back by 5. Between 5 and 6 nothing moves. It takes several low Matches to matter: one low Match costs a confirmed player at most 20.
- **A Provisional player moves twice as far**, either way, as they stand once the Match has moved their Level.
- **Below 100 a lost Match costs more**: 1 at full Reliability, rising in a straight line to 1.5 times at none. A win and a draw are untouched. On padel the μ step of a loss is multiplied; on football the result part of a loss is, as a fifth part. The extra is stored on the event (`rating_events.reliability_part`), so "What moved your OVR" shows it as its own line and a reversal takes it back with the rest.
- **A padel Friendly game on a Verified Group opens a Rating window** on its one Match: everyone rates, 24 hours, hidden until it closes. The padel Level still moves at completion. The ratings move Reliability and nothing else, so the window holds nothing back. A player needs two ballots, since a padel Match seats four.
- **An Operator's or a Level setter's ballot weighs three times** on a Match that counts for Temba Level, one of theirs settles a player on its own, and it is never the highest or lowest that is dropped. They rate as a seated player like anyone else. The ballot keeps what the rater was (`performance_ratings.rater_role`), because that lives in the session and the settling Job has none.
- **A Level override sets Reliability back to 100**: whoever set the Level vouches for it.
- **A wrong-score report gives the step back.** Each result keeps the Reliability either side of it (`performance_rating_results.reliability_before`, `reliability_after`); suspending the window subtracts the difference, and the next completion settles afresh.

**Considered Options**: a direct performance part on the padel Level, as football has (the padel Level would wait a day for the window, and four friends could lift each other's Level; Reliability can only make a loss cost more); moving both wins and losses further, as a Glicko φ does (a player rated low who keeps winning would climb faster); raising φ instead of a new number (φ decides Provisional on football and grows a win as well); letting an Operator or a Level setter rate a Match they did not play (a second door, and nothing says they watched); one fixed weight for every rater (the owner asked for the two roles to count for more); deriving Reliability from the stored results on every read (each Match completion would recompute it for four to twenty-two players).

## Consequences

- A football loss below full Reliability does not sum to zero across the Match. The population can only deflate, and only by what low Reliability adds.
- Tournaments, Americano and Challenge Games on padel open no window. Their losses still cost more at low Reliability. A padel Public Game whose Match counts for Temba Level opens one since ADR-0101; one whose score stood unconfirmed opens none.
- A padel Rating window holds no move back, so the padel MVP does not close with it: it keeps the Marks window's 48 hours. ADR-0068's rule now reads "a Rating window that holds a move".
- A tier Group is unchanged: its Rating settings decide who rates, and nothing there moves Reliability.
- A Guest player has no Rating, so no Reliability. Two Guest players on a padel Match leave the other two with one ballot each, which settles nobody unless an Operator or a Level setter gave it.
- Being an Operator or a Level setter is read when the ballot is sent. A role granted or revoked later does not change ballots already cast.
