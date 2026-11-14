# King of the court has no Matches, and the Organizer posts the order

**Status:** accepted.

Groups want a looser Friendly tournament: teams spread over a few courts, winners move up a court,
losers move down, and whoever holds Court 1 at the end is king of the court. The design ("King of
the court") adds it as a fifth format on the existing create and tournament screens, and asks for no
rounds to make and no scores to enter.

## Decision

- **A Tournament shape, not a Game format.** `tournament_shape` gains `king_of_the_court`; the format
  stays Friendly tournament (ADR-0020), so seats, joining, the waitlist, Edit teams and cancelling
  work as they do for any drawn tournament.
- **Courts set the field.** Two Game teams a court, two to six courts, so `teams_allowed` is twice the
  courts. No Pool count, Round count or Match length is stored.
- **No Matches.** Moving between courts happens on the day and is not recorded. The only records are
  the Starting courts (`game_teams.start_court`) and the Final order (`game_teams.final_place`, with
  `games.final_order_posted_at`).
- **The Starting courts are the draw.** The draw sheet shuffles on the client and the Organizer swaps
  teams by hand, then `games.postKingCourts` posts the order: every complete Game team exactly once,
  two a court from Court 1 down. Posting sets `draw_posted_at`, closes the seats and empties the
  waitlist, as a posted Pool draw does. Posting again replaces the courts until the Final order is
  posted. The Pool draw doors (`drawPools`, `postPoolDraw`, `undoPoolDraw`) refuse this shape.
- **The Organizer posts the Final order.** `games.postKingFinalOrder` takes the teams first place
  first, at least the top three; the rest show as not placed. It opens once the tournament has
  started and stays open for 24 hours after the first post, measured from that first post so
  re-posting does not extend it. Posting it finishes the tournament.
- **Never rated.** Nothing is scored, so create stores `rated` and `group_rated` false whatever the
  request says, and no Rating events or Marks exist for it.
- **On the Games lists.** It leaves My Games once its Final order is posted. Played lists it as one
  row when `listMyMatchHistory` is asked with `kingOfTheCourt: true`, once the Final order is posted
  or its window has passed; the row's `matchId` is the Game id and its Match fields are empty. The flag
  keeps the change additive for the mobile App, which does not ask for it yet.

## Consequences

- Surfaces that count Rounds or read Pool tables check the shape first: the tournament card names the
  format instead of a Round count, and the finished Pool view is not built for it.
- The mobile App does not offer the shape yet and shows such a Game with its generic tournament
  screens until it adopts these doors.
