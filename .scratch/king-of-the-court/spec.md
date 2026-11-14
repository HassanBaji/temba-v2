Status: implemented (web App only)

Design: `Temba sports community app · King of the court.html` (screens 1a–1b, 2a–2c, 3a–3c), shared
in the session that built this. Decisions: [ADR-0087](../../docs/adr/0087-king-of-the-court-has-no-matches-and-the-organizer-posts-the-order.md).

Builds on `.scratch/friendly-tournament-redesign/spec.md` (create shell, pre-draw chrome) and
`.scratch/tournament-rounds/spec.md` (drawn header and tabs).

## Problem

Groups run King of the court nights: teams spread over a few courts, winners move up a court, losers
move down, and whoever holds Court 1 at the end is king. None of the tournament formats fit, because
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
- Step 4 hides the rating choice. Review shows Format "King of the court, 4 courts" and Rating
  "Friendly, no change".
- The header preview shows the team count and "4 courts".

### The draw (2a, 2b)

- Pre-draw keeps the tournament hero, seats and teams. The Organizer's draw entry reads "All 16 in.
  Draw the courts" with **Open the draw**. "How it runs" lists the courts, Court 1 marked King's
  court, and the move-up and move-down rules. Detail rows: Scores "None, the organizer posts the
  order", Counts for rating "No, nothing is scored".
- **Starting courts** sheet: the complete teams shuffled two a court. Tap two teams to swap them,
  **Draw again** reshuffles, **Post the starting courts** posts. Posted shows "All N players see where
  they start" with **Change**.

### After the draw (2c)

- Black header with the tab name, tabs **Teams**, **Courts**, **Final order**.
- Courts: the viewer's card ("You & Khalid start on Court 3, against …", win and lose moves; Court 1
  and the bottom court say "stay on"), then every starting court, the viewer's tagged "your court".
  The Organizer can **Change starting courts** until the final order is posted.

### The finish (3a–3c)

- **Final order** (Organizer, once the tournament has started): tap teams in finishing order, the
  arrow moves one up, the cross takes it out. Post unlocks from the top three. Posted shows "Every
  player sees it. 24 hours to change it" with **Change**.
- **Finished** (white header): the king first ("Held Court 1 at the end"), then the viewer's place
  ("Third of 8, Started on Court 3"), then the whole order with the king crowned and unplaced teams
  last. Scores "None, the organizer posted the order", Rating "Not counted, nothing was scored".
- **Games list, Played**: one card, "Finished 3rd of 8", the viewer's pair and starting court, and
  "King of the court: Layla & Mariam". Before the order is posted, once the window has passed:
  "Final order to come".

## API (additive)

- `games.createTournament` accepts `tournamentShape: "king_of_the_court"` with `teamCount` = courts × 2.
- New doors: `games.postKingCourts({ gameId, gameTeamIds })`,
  `games.postKingFinalOrder({ gameId, gameTeamIds })`.
- `games.byId` adds `finalOrderPostedAt` and, per Game team, `startCourt` and `finalPlace`.
- `games.listMyMatchHistory` accepts `kingOfTheCourt: true` and adds one row per King of the court
  Game, with `kingOfTheCourt` set.
- Schema: `tournament_shape` value `king_of_the_court`, `game_teams.start_court`,
  `game_teams.final_place`, `games.final_order_posted_at` (migration `0122_king_of_the_court`).

## Not built

- The mobile App: create hides the format; its tournament screens do not read the new fields yet.
- "Share your day" and "Give marks" on the finished screen: both need Matches, and there are none.
- The hero stat tiles on 2a (teams, courts, price); the existing hero lines are kept.
