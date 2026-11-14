Status: implemented (web App; the mobile App reads it)

Design: `Temba sports community app · King of the court.html` (screens 1a–1b, 2a–2c, 3a–3c), shared
in the session that built this. Decisions: [ADR-0087](../../docs/adr/0087-king-of-the-court-has-no-matches-and-the-organizer-posts-the-order.md),
and [ADR-0089](../../docs/adr/0089-a-king-of-the-court-final-order-moves-the-level-of-its-first-four-places.md)
for the Level (see "Level" below).

Builds on `.scratch/friendly-tournament-redesign/spec.md` (create shell, pre-draw chrome) and
`.scratch/tournament-rounds/spec.md` (drawn header and tabs).

## Problem

Groups run King of the court nights: teams spread over a few courts, winners move up a court, losers
move down, and whoever holds Court 1 at the end is king. None of the Tournament shapes fit, because
each one generates Matches and asks for scores. The Organizer needs only two things from Temba:
which team starts on which court, and a place to post who finished where.

## What ships

### Creating it (1a, 1b)

- **King of the court** is the fifth option in create step 3's Format list: "Winners move up a court,
  losers move down".
- Picking it swaps Groups, Rounds and Through for **Courts**: a stepper from 2 to 6 plus chips 3–6.
  Two teams start on every court, so courts set the team count and step 2's team count is hidden.
- **Play time** (1 h 30, 2 h, 3 h, Set) replaces Finish; Set opens the finish chips. Game length is
  hidden. The fit box reads "8 teams, 9:00 AM to 11:00 AM" and explains that Temba draws the starting
  courts and the Organizer names the final order.
- Step 4 keeps the rating choice (ADR-0089). Review shows Format "King of the court, 4 courts" and
  the rating as any tournament does.
- The header preview shows the team count and "4 courts".

### The draw (2a, 2b)

- Pre-draw keeps the tournament hero, seats and teams, with three tiles under the title: teams,
  courts and the price per player. The Organizer's draw entry reads "All 16 in.
  Draw the courts" with **Open the draw**. "How it runs" lists the courts, Court 1 marked King's
  court, and the move-up and move-down rules. Detail rows: Scores "None, the organizer posts the
  order", and Counts for rating as "Level" below sets out.
- **Starting courts** sheet: the complete teams shuffled two a court. Tap two teams to swap them,
  **Draw again** reshuffles, **Post the starting courts** posts. The sheet stays open after posting and
  shows "All N players see where they start" with **Change**. Posting tells every player once.
- The field can be smaller than planned, but two teams start on each court: an odd number of complete
  teams, or a Half team, holds Post with the reason.
- A team that loses a player after the draw keeps its court, shows with the one name, and can still
  be moved and placed.

### After the draw (2c)

- Black header with the tab name, tabs **Teams**, **Courts**, **Final order**.
- Courts: the viewer's card ("You & Khalid start on Court 3, against …", win and lose moves; Court 1
  and the bottom court say "stay on"), then every starting court, the viewer's tagged "your court".
  The Organizer can **Change starting courts** until the final order is posted.

### The finish (3a–3c)

- **Final order** (Organizer, once the tournament has started): tap teams in finishing order, the
  arrow moves one up, the cross takes it out. Post unlocks from the top three. Posted shows "Every
  player sees it. 24 hours to change it" with **Change**. Posting tells every player once.
- Until the order is posted the Game stays in its Organizer's Upcoming list for two weeks after its
  window, so an Organizer who is not playing can still get to it.
- **Finished** (white header): the king first ("Held Court 1 at the end"), then the viewer's place
  ("Third of 8, Started on Court 3"), then the whole order with the king crowned and unplaced teams
  last, under a "# / Team" header. **Share your day** shares the viewer's place, or the top of the
  order for someone without one. Scores "None, the organizer posted the order", and Counts for
  rating as "Level" below sets out.
- **Games list, Played**: one card, "Finished 3rd of 8", the viewer's pair and starting court, and
  "King of the court: Layla & Mariam". Before the order is posted, once the window has passed:
  "Final order to come".

### Level (ADR-0089)

- On a Verified Group a King of the court Game counts for Temba Level, unless its creator chose
  Unrated. Create step 4 shows the rating choice and Review shows it as any tournament does.
- First to fourth place in the Final order count as 2, 1, a half and a quarter of a win against the
  field, the average Level of everyone on a court. Nobody moves down.
- The Levels move once, when the Final order closes, 24 hours after it is first posted. Each player
  who moved is told once, with the place and the Level either side.
- Detail row "Counts for rating": "Yes, for first to fourth place" before the order, "Yes, 24 hours
  after the final order" while it can still change, then "Counted for first to fourth place" with
  "Your Level moved from 3.40 to 3.55." for a player who moved. An Unrated Game reads "No", then
  "Not counted".
- Rating history lists it as "Level, King of the court", "Finished 1st of 8, <venue>". The Home trend
  draws it as a won point. The Played card carries the Game's rating tag.

## API (additive)

- `games.createTournament` accepts `tournamentShape: "king_of_the_court"` with `teamCount` = courts × 2.
- New doors: `games.postKingCourts({ gameId, gameTeamIds })`,
  `games.postKingFinalOrder({ gameId, gameTeamIds })`.
- `games.byId` adds `finalOrderPostedAt` and, per Game team, `startCourt` and `finalPlace`.
- `games.listMyMatchHistory` accepts `kingOfTheCourt: true` and adds one row per King of the court
  Game, with `kingOfTheCourt` set.
- Schema: `tournament_shape` value `king_of_the_court`, `game_teams.start_court`,
  `game_teams.final_place`, `games.final_order_posted_at` (migration `0122_king_of_the_court`).
- Notification types `king_courts_posted` and `king_final_order_posted` (migration
  `0123_king_of_the_court_notifications`).
- Place awards (migration `0124_king_place_awards`): table `king_place_awards`,
  `games.place_awards_settled_at`, Notification type `king_place_awarded`, Job `king.place-awards`.
  `games.byId` adds `placeAwardsSettledAt` and `viewerPlaceAward`; `ratings.history` adds the
  `king_place` line; `ratings.me` history steps add `placed`; a King of the court Played row
  carries its real `rated`, `ratingScope` and `levelMove`.

### Mobile App

- A drawn King of the court Game shows where the viewer starts, every starting court, and the Final
  order once posted. Played lists it as one card.
- Create still hides the format, and the Organizer card points to the web for the draw and the order.

## Not built

- The mobile App does not create a King of the court Game, draw the courts or post the order.
- "Give marks" on the finished screen: Marks are given per Match, and there are none.
- Choosing which court is the king's court: Court 1 always is, as in the design. Courts are numbered
  and are not tied to the Venue Courts recorded on the Game.
