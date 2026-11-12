# A football Match can ask for Performance ratings

**Status:** accepted for a tier Group's Rating settings; proposed (draft for the owner's review) for Performance ratings, the Rating window and settling. Spec: `.scratch/rating-redesign/spec.md`. Amends the Marks window for the MVP on Matches that have a Rating window.

A result alone says who won. The owner's design also asks how each player played: a 1 to 10 rating from the people on the pitch, feeding 20 to 50% of a tier move and 30% of an OVR move.

## Decision

- **A Performance rating is a 1 to 10 score** from one seated account holder to another seated player of a completed football Match (`performance_ratings`). 6 is an ordinary game. Nobody rates themselves. A blank is not a zero.
- **A tier Group chooses its Rating settings**: Off, Organizer rates, or Everyone rates; a weight of 20, 30 or 50%; and whether an Organizer counts double. Organizers set them; they apply from the next Game, because each Match snapshots them on its Rating window.
- **On a Game that counts for Temba Level everyone rates**, and the weight is OVR's fixed 30%.
- **The Rating window is 24 hours** from Match completion (`match_rating_windows`). Ratings are hidden until it closes and can be changed until then. In Organizer mode it closes when the Organizer submits.
- **Settling** drops the highest and lowest from five ballots up, needs three ballots in Everyone mode, and takes a weighted mean. A rater whose ratings sit far from everyone else's, in this Match and their previous two, counts for half. That weight is computed from stored ballots each time; there is no stored mark on a rater, and nobody, including an Organizer, is shown who gave what.
- **The move is written when the window closes**, by a job with a read-time fallback. A Match with no window (Off mode, any padel Match) writes its move at completion.
- **The performance part is relative.** It uses the rating minus the player's own usual, minus the Match's mean of that difference.
- **The MVP closes with the Rating window** on a Match that has one. Marks keep their 48 hours.
- **A wrong-score report suspends the window** and keeps the ballots; the next completion opens a fresh 24 hours.

**Considered Options**: reusing Marks as the performance signal (Marks are praise and are scarce by design; they are not a scale); a 1 to 5 scale (the owner's screens and football convention are 1 to 10); showing ratings as they arrive (invites rating in reply); storing a reliability score per rater (a permanent judgement of a person from a few games); letting the Organizer in Organizer mode rate themselves (one person would set their own move).

## Consequences

- In Organizer mode the Organizer's own points move on the result alone.
- A player nobody rated has no performance part for that Match.
- Football Matches with ratings move their ladder up to a day after the final whistle.
