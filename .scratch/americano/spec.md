Status: implemented (web App; the mobile App reads it)

Design: `Temba Sports Community App - Americano Flow.html` (screens 1a–1b, 2a–2d, 3a–3c, 4a–4b),
shared in the session that built this. Decision: [ADR-0094](../../docs/adr/0094-americano-is-a-tournament-shape-whose-matches-seat-players.md).

Builds on `.scratch/friendly-tournament-redesign/spec.md` (create shell, pre-draw chrome),
`.scratch/tournament-rounds/spec.md` (drawn header, tabs, score sheet) and
`.scratch/king-of-the-court/spec.md` (a Tournament shape that is not a Pool stage).

## Problem

Groups run Americano mornings: everyone signs up alone, Temba gives everyone a new partner every
round, and one table of players decides the day on games won. The old Americano Game format only
collected sign-ups; it made no rounds and kept no scores.

## What ships

### Creating it (1a, 1b)

- **Americano** is the sixth option in create step 3's Format list: "Sign up alone, a new partner
  every round". Step 2's team count is hidden.
- Picking it shows **Players** (8 to 24, in fours; "Alone, in fours. 4 courts, nobody sits out") and
  **Rounds** (1 to players minus one; "7 partners each. 15 is everyone with everyone"). The Groups and
  Round count controls are hidden.
- Day, start time and game length as for any Social. The finish follows: the Rounds back to back
  from the start, rounded up to the half hour, waiting for Courts when fewer are recorded than games
  in a Round. The fit box reads "28 games, 9:00 AM to 12:30 PM" and "7 rounds of 4 games on 4 courts,
  30 minutes a game, back to back…".
- Step 4: "Who can enter" notes that an Americano changes no Level; the fee line reads per player;
  the Rating choice and "How people join" are hidden. Review: Format "Americano, 7 rounds", Players
  "16 players, alone", Rating "Friendly, no change".
- The header preview reads "16 players 28 games".

### Before play (2a–2c)

- Pre-draw keeps the tournament hero with three tiles: players (alone), rounds of N min, price per
  player, and the seat line "16 of 16 seats, full, ready for rounds".
- Organizer: "All 16 in. Make the rounds" with **Make rounds**. Everyone else: a hatched card,
  "The rounds: made when all 16 seats are taken…".
- **Players** grid in place of Teams: the players in, then open seats. One tap to take a seat
  (`games.register`); a full Social offers the Waitlist. An Organizer taps a player to remove them.
- **Schedule**: R1 to Rn, hatched, with start times, "partners after the draw".
- Detail rows: Organizer, Group, Format, Scores "Either pair enters, the other confirms",
  Counts for rating "No, it's friendly".
- **The rounds** sheet: Round 1 as it will be played, court by court. Tap two players to swap them,
  **Shuffle again**, then **Make all 7 rounds**. Needs every player, in fours, at least eight, and
  a recorded Court.

### Playing (2d, 3a–3c)

- Black header with the tab name, tabs **Players**, **Rounds**, **Standings**, and the round
  progress strip.
- Rounds: the viewer's game first ("You & Qasim, against Sara F. & Rashed K." with Enter score or
  Confirm), then every Round, the one on court and the next open. Each court shows the pairs, the
  score, "to confirm", or Enter score / Confirm when the viewer may.
- An Organizer's **Swap players** on a Round with no score: tap two players. Temba refuses a swap
  that repeats a partner.
- The score sheet is the Social's (games won, the other pair confirms, ten minutes to stand, the
  Organizer's word is final), with the line "6 games each for you and Qasim. Sara and Rashed get 4
  each. Games won is what ranks you, win or lose."
- Standings: one table, # / Player / P / +/− / GW, the viewer tinted, then **Your rounds**: partner,
  opponents, result or time and court.

### When it's over (4a, 4b)

- White finished header: the winner ("Won the day", games won, record), then the viewer's place
  with record, games behind and result marks. Opens on Standings. **Share your day**.
- Games list, Played: one card for the day, "Finished 3rd of 16", tags Social and Americano, the
  viewer's games won and partners with seven result marks, and "Won by Dana Al-Khalifa, 42 games".

## API (additive)

- `games.createTournament` accepts `tournamentShape: "americano"` with `teamCount` = players ÷ 2
  and `roundCount`. It stores `rated` false.
- New doors: `games.postAmericanoRounds({ gameId, gamePlayerIds })`,
  `games.swapAmericanoPlayers({ gameId, roundNumber, firstGamePlayerId, secondGamePlayerId })`,
  `games.americanoBoard({ gameId })`.
- `games.register` takes a seat on it (Roster registration). Kick is refused once the Rounds are
  made; leave already is for any posted draw. The Pool draw doors refuse it. `games.updateCaps`
  takes a player count in fours until the Rounds are made.
- Scores go through `games.enterTournamentScore`, `games.confirmMatchResult` and
  `games.markMatchNotFinished`, which read an Americano Match's sides from its seats.
- `games.listMyMatchHistory` accepts `americano: true` and adds one row per Americano, with
  `americano` set.
- Schema: `tournament_shape` value `americano`; table `americano_seats` (migration
  `0127_americano_shape`).

### Mobile App

- Reads an Americano: the players and a Take a seat button before the Rounds, then the table and
  the viewer's games. Create hides the shape. Making the Rounds, swapping and scoring point to the web.

## Not built

- Counting an Americano for Temba Level (the design leaves it open; review reads "Friendly, no change").
- Notifications when the Rounds are made.
- Marks ("Give marks" on 4a): Marks are given on Friendly games only.
- "Photo of the board" on the score sheet.
- Changing the players or the Rounds after create, and a player leaving once the Rounds are made.
- The mobile App does not create an Americano, make the Rounds, swap players or enter scores.

Preview states: `/dashboard/design/americano` (development only).
