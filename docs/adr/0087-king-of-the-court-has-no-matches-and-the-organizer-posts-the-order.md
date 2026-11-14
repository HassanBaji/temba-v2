# King of the court has no Matches, and the Organizer posts the order

**Status:** accepted.

Groups want a looser Friendly tournament: teams spread over a few courts, winners move up a court,
losers move down, and whoever holds Court 1 at the end is king of the court. The design ("King of
the court") adds it as a fifth Tournament shape (shown to users as Format) on the existing create and
tournament screens, and asks for no rounds to make and no scores to enter.

## Decision

- **A Tournament shape, not a Game format.** `tournament_shape` gains `king_of_the_court`; the format
  stays Friendly tournament (ADR-0020), so seats, joining, the waitlist, Edit teams and cancelling
  work as they do for any drawn tournament.
- **Courts set the field.** Two Game teams a court, two to six courts, so `teams_allowed` is twice the
  courts. No Pool count, Round count or Match length is stored.
- **No Matches.** Moving between courts happens on the day and is not recorded. The only records are
  the Starting courts (`game_teams.start_court`) and the Final order (`game_teams.final_place`, with
  `games.final_order_posted_at`).
- **Court 1 is the king's court.** The Organizer does not pick it. Courts are numbered from the king's
  court down and are not tied to the Venue Courts recorded on the Game.
- **The Starting courts are the draw.** The draw sheet shuffles on the client and the Organizer swaps
  teams by hand, then `games.postKingCourts` posts the order: every complete Game team exactly once,
  two a court from Court 1 down. The field may be smaller than planned but must be an even number of
  complete Game teams, with no Half team. Posting sets `draw_posted_at`, closes the seats and empties
  the waitlist, as a posted Pool draw does. The door reads the field under the Game lock.
- **Posting again moves the teams on a court.** Until the Final order is posted the Organizer can
  post the courts again. A later post takes the Game teams already on a court, so a team that lost a
  player after the draw keeps its court and its place in the Final order; a team left with no player
  drops out. The Pool draw doors (`drawPools`, `postPoolDraw`, `undoPoolDraw`) refuse this shape.
- **The Organizer posts the Final order.** `games.postKingFinalOrder` takes the teams first place
  first, at least the top three; the rest show as not placed. It opens once the tournament has
  started and stays open for 24 hours after the first post, measured from that first post so
  re-posting does not extend it. Posting it finishes the tournament.
- **Never rated.** Nothing is scored, so create stores `rated` and `group_rated` false whatever the
  request says, and no Rating events or Marks exist for it.
- **Players are told once.** The first post of the Starting courts and the first post of the Final
  order each send one Notification to every player on a court (`king_courts_posted`,
  `king_final_order_posted`). Posting again sends nothing.
- **On the Games lists.** It leaves My Games once its Final order is posted. With no Match to keep it
  live, it stays in its Organizer's My Games for two weeks after its window while the Final order is
  not posted, so an Organizer who is not playing still has a way in. Played lists it as one row when
  `listMyMatchHistory` is asked with `kingOfTheCourt: true`, once the Final order is posted or its
  window has passed. The row reuses the Match row shape with placeholders: `matchId` is the Game id,
  slot 2 and the Sets are empty, and `outcome` is `draw`; a client reads `kingOfTheCourt` first. The
  flag keeps the change additive for clients that do not ask for it.
- **Sharing.** A finished King of the court shares the existing tournament card: the viewer's place,
  or the top of the Final order for someone without one. Marks stay per Match, so there are none.

## Consequences

- Surfaces that count Rounds or read Pool tables check the shape first: the tournament card names the
  format instead of a Round count, and the finished Pool view is not built for it.
- The mobile App reads a King of the court Game (the Starting courts, the Final order, the Played
  card) but does not create one, draw the courts or post the order: its Organizer is pointed to the
  web until the mobile App adopts these doors.
