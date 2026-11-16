# Americano is a Tournament shape whose Matches seat players

**Status:** accepted.

Groups run Americano mornings: everyone signs up alone, gets a new partner every round, and one
table of players decides the day on games won. The design ("Americano Flow") adds it as a sixth
Format on the Social create and tournament screens, and drops the separate Americano entry from the
first create screen.

## Decision

- **A Tournament shape, not a Game format.** `tournament_shape` gains `americano`; the format stays
  Friendly tournament (ADR-0020), so the create shell, cancelling, invites, the Waitlist and the
  tournament screen chrome work as they do for any Social. The legacy `americano` Game format stays
  in the enum for old rows and is not created any more.
- **Players, not Game teams.** It is a Roster registration Game: a player takes a seat alone, with
  no Position, through `games.register`. `playersAllowed` is the seat count, eight to twenty-four in
  fours, so four players fill a court and nobody sits out. `teams_allowed` holds half of it, the
  pairs on court in one Round, because the create flow keeps one team count for every shape.
- **The Round count is picked at create**, one to one fewer than the players: each Round is a new
  partner, and players minus one is everyone with everyone. Making the Rounds with a smaller field
  keeps the count unless it would repeat a partner.
- **The window must hold the Rounds.** Create needs at least one recorded Court and a window at
  least as long as the Rounds back to back, waiting for a Court when fewer are recorded than Matches
  in a Round. Making the Rounds refuses a layout that would end after the window, so Courts taken
  off later cannot push play past the end.
- **A Match seats four players, not two Game teams.** A Game player sits on one Game team at most,
  and an Americano pair lives for one Match, so its Matches keep their slot Game teams empty and list
  their players in `americano_seats` (Match, Game player, slot). The score doors read a Match's sides
  through `matchSideSeats`, which reads the seats when the slots are empty, so entering, confirming,
  Score stands, Didn't finish and an Organizer's final word all work unchanged. No Game team is made
  up for a pair, in storage or on the wire: `games.americanoBoard` sends each side as its two Game
  players, and the web score sheet keys the pair by Match and slot for itself.
- **Making the Rounds is the draw.** The sheet shuffles the players on the client and shows Round 1;
  tapping two players swaps them in the drawn order. `games.postAmericanoRounds` takes that order and
  builds every Round from it: partners from the circle method, so nobody partners anyone twice, and
  each Round's pairs set against each other with the fewest repeat opponents (an exhaustive search,
  at most 10,395 splits for twelve pairs). Swapping two players in the order swaps them in every
  Round, so the sheet cannot break the rule. Matches go on the recorded Courts and times as a posted
  Pool draw lays them out. Making the Rounds sets `draw_posted_at`, closes the seats and empties the
  Waitlist; it needs every player on the Game, in fours, at least eight, and one recorded Court.
- **Swaps after the draw are per Round.** `games.swapAmericanoPlayers` swaps two players in one Round
  nothing in it has a score yet, and refuses a swap that gives anyone the same partner twice.
- **Once the Rounds are made, nobody leaves or joins.** Every player sits in every Round, so leave,
  kick and the Organizer's add doors are refused; the Organizer swaps players instead. Before the
  Rounds, an Organizer adds a player alone, as a Roster registration.
- **One table of players.** The Standing of an Americano is computed, never stored: completed Matches
  only, each pair's games counted for both its players, ranked on games won, then game difference,
  then games won outright. `games.americanoBoard` returns the Rounds, what the viewer may do with each
  Match, and the table. The Pool draw doors refuse the shape.
- **Never rated.** The design's review step reads "Friendly, no change", so create stores `rated`
  and `group_rated` false whatever the request says. Marks stay on Friendly games only.
- **On the Games lists.** The day is finished once every Match is settled (completed, cancelled or
  did not finish) and one completed. My Games drops it then; Played lists it as one row for the whole
  day when `listMyMatchHistory` is asked with `americano: true`, once it is finished or no longer
  live by the rule My Games uses, so it is never on both. The row reuses
  the Match row shape with placeholders like a King of the court row, `matchId` being the Game id,
  and carries the viewer's place, results and the day's winner in `americano`. Its Matches have no
  slot Game teams, so they never appear as Match rows.
- **Sharing.** A finished Americano shares the tournament card: the viewer's place, games won and
  results, or the top of the table for someone who did not play.

## Considered options

- A Game team per pair per Round. Rejected: it breaks "a Game player sits on one Game team at
  most", which the seat, leave, kick and team-making code all rely on.
- Storing the Standing. Rejected: it follows from the Matches, and a corrected score would have to
  rewrite it.
- Counting it for Temba Level. Left open in the design. Rating a pair that changes every Match needs
  its own rule; the review step's "Friendly, no change" ships for now.

## Consequences

- The mobile App reads an Americano (the players, the table, the viewer's games) and joins it with
  `register`, but does not create one, make the Rounds, swap players or enter scores: those point to
  the web, as King of the court does (ADR-0087).
- Editing an Americano does not change its players or Rounds after create.
