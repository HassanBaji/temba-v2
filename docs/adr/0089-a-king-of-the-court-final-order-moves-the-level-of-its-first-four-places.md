# A King of the court Final order moves the Level of its first four places

**Status:** accepted. Amends [ADR-0087](./0087-king-of-the-court-has-no-matches-and-the-organizer-posts-the-order.md), which said King of the court is never rated.

ADR-0087 left King of the court Unrated because nothing is scored. The owner wants a good finish to count: the first four places move up, by more the stronger the field was.

## Decision

- **First to fourth place win against the field.** The players of the Game teams placed first, second, third and fourth are rated as 2, 1, a half and a quarter of a win (`KING_PLACE_WINS`). Nobody moves down, and a place below fourth or a team left unplaced moves nothing.
- **The field is the average of everyone on a court.** Its μ and φ are the means over every player of a Game team with a Starting court, read when the awards are written. So the same place is worth more in a stronger field, and more to a player below the field than to one above it.
- **A win is the Rated Match step.** `rateKingPlace` runs `rateDoublesMatch` with the placed pair against the field, so the partner is weighed and a Provisional player moves further (ADR-0070). Each whole win is one full step, taken one after the other; a part of a win is one step blended by that part, as the 0.5 weight of a loose Group already is.
- **Only where padel counts.** A King of the court Game follows the padel rule (ADR-0066): it counts for Temba Level on a Verified Group, unless its creator chose Unrated. Create shows the Rating choice again. Games created before this stay Unrated.
- **Written when the Final order closes.** The Organizer can change the Final order for 24 hours (ADR-0087). The awards are written once, when those 24 hours end, from the order as it then stands: by the `king.place-awards` Job, or by the next read of the Game when the Job is late. `games.place_awards_settled_at` marks it. A corrected order therefore never has to take a Level back, which a padel Rating cannot do cleanly once a later Match is built on it.
- **A Place award is not a Rated Match.** It has its own ledger, `king_place_awards`, beside `rating_events` and `level_overrides`: one row per player and Game with the place, the wins, the field and the Rating either side. It does not count towards the five Rated Matches that confirm a padel Level (ADR-0080), the Rated Match count, Last 10 or the win rate.
- **It reads as a Level move everywhere a Level move is read.** Rating history has a "Level, King of the court" line, the Home trend and the profile chart have a point for it, the Played row carries it as its `levelMove`, and Game details says whether the Game counted and what it moved for the viewer.
- **Players are told once.** Each player who moved gets one `king_place_awarded` Notification with the place and the Level either side.
- **A later Place award blocks a padel reversal.** Reporting a wrong score on a Rated Match restores the Rating from before it, so a Place award written after that Match refuses the reversal, as a later Rated Match does.
- **Guest players.** A Guest player is neither rated nor counted in the field, and a guest partner stands in at the field (ADR-0079). A player whose partner left is rated beside themselves.

**Considered Options**: a fixed step scaled by the field (simple to explain, but ignores Provisional and the player's own Level); moving towards the field average (a strong pair winning a weaker field would gain nothing); writing the awards at the first post and reversing them on a re-post (a later Rated Match would then block the Organizer from correcting the order); storing the awards as `rating_events` with no Match (every count of Rated Matches would have to exclude them).

## Consequences

- The Level moves 24 hours after the Final order is first posted, not when it is posted.
- The Organizer names the order, so a playing Organizer can place their own team first. ADR-0075 already accepts that for a tournament score, and it is limited to Verified Groups.
- In a field of four teams every team is placed first to fourth, so every player moves up, the last by a quarter of a win.
- The mobile App reads the award on Game details, the Played card, Rating history and the trend. It still does not create or post a King of the court Game (ADR-0087).
