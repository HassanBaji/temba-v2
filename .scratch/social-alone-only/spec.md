Status: implemented (web and mobile Apps)

Design: `Temba sports community app - Social alone mode.html` (screens 1a–1b, 2a–2c, 3a–3c, 4a–4c,
5a–5c), shared in the session that built this. Decision:
[ADR-0096](../../docs/adr/0096-alone-only-socials-take-a-player-list-until-the-organizer-posts-teams.md).

Builds on `.scratch/tournament-allow-registering-alone/spec.md` (How people join),
`.scratch/americano/spec.md` (a Social whose players sign up alone, as a Roster registration) and
the Share result screen.

## Problem

Many Groups run Socials where nobody brings a partner: players put their names down, and the
organizer pairs them on the day, usually by level, then posts the teams in the group chat. Temba's
Socials only know two doors today, Alone or with a partner, and With a partner only. With the first,
players who sign up alone sit with whoever was there first, as Half teams the organizer then merges
by hand.

## What ships

### Creating it (1a, 1b)

- **How people join** on a padel Social gains a third choice, **Alone only, you make the teams**,
  beside Alone or with a partner and With a partner only. It is a sign-up choice, not a Format: every
  Tournament shape except Americano (whose players already sign up alone) can follow it.
- The size is still picked in teams; the hint under it reads in players, "8 teams of two. Players sign
  up one by one; you pair them, then post the teams."
- The fee line reads per player. Review: Sign up "Alone only, you make the teams".
- The choice is fixed after create, like the other two.

### Signing up (2a, 2b)

- Until the teams are posted the Social lists **Players**, the players in and then the open seats,
  where the team cards were. Nobody picks a team, a partner or a seat.
- The hero's teams tile reads "8 teams, made later"; the seat line "11 of 16 seats, teams are made
  when full".
- Everyone else sees a hatched card: "The teams: made by the organizer once the seats are taken. You
  sign up alone and get a partner. Then comes the draw."
- **Take a seat** opens a sheet with only the side left to pick, optional: Left, Right or Either
  ("The organizer sees this when pairing, so a left can go with a right"), then "Your partner: picked
  by the organizer". It calls `games.register` with `preferredSide`.
- Full: the Waitlist, as on any Social. Leaving takes the player off the list and the first on the
  Waitlist takes the seat.
- An Organizer adds a player alone (Add player), as on an Americano. Partner registration, Lookup
  invites for a pair, moving and merging are refused: every seat is one player.

### Making the teams (2c, 3a)

- Organizer, with at least eight players in (the four teams any Social needs): the black card reads
  "All 16 in. Make the teams. Pair them by level or by hand, then post." with **Make teams**. With
  fewer than the seats it reads "12 of 16 in. Make the teams".
- **Make teams** opens already balanced by level: strongest with weakest, and a left with a right
  where it can. Each row shows the two players, Left first, their band and the side they asked for,
  and the pair's average. "2 L" or "2 R" marks a pair who both asked for the same side.
- Tap two players to swap them. **Shuffle** draws a random set; **Balance by level** goes back.
- An odd player out is not placed: they stay on the list, unseated, until one more joins or the
  Organizer removes them.
- **Post the teams**: "Posting tells all 16 who their partner is. The draw opens next."

### Teams posted (3b, 3c)

- From here it is the Social as it is today: the Teams list, then Draw the group (or the Starting
  courts, or the bracket), then rounds and standings.
- Organizer: "Teams posted. Draw the group" with **Open the draw**, then **Share teams** and **Edit
  teams**. Make teams stays available to re-pair everyone until the draw is posted.
- Player: "You're with Khalid Janahi. The organizer made the teams. You on the right, Khalid on the
  left. The draw comes next."
- Every placed player is told: "Hassan Haji posted the teams for Sunday Social. You're with Khalid
  Janahi." (`game_teams_posted`).
- A player who leaves after posting frees their Position: their partner waits on a Half team, the
  first on the Waitlist takes the seat, and the Organizer can Edit teams. The draw refuses Half teams
  as today.

### Sharing the teams (4a–4c)

- **Share teams** sits next to Edit teams once the teams are posted. Organizers only; players already
  see the teams in the App.
- The Share result screen, with three tabs: **Story** (1080 × 1920), **Square** (1080 × 1080) and
  **Text**, a numbered list to paste into the group chat ("Copy text").
- **Show levels**, off by default, adds each pair's average. Nobody is highlighted.

## Server

- `games.organizer_makes_teams` (boolean, default false) and `games.teams_posted_at` (timestamp);
  `game_players.preferred_side` (`game_position`, null is Either).
- `createTournament` takes `organizerMakesTeams`; refused on Americano and with With a partner only.
- While `organizer_makes_teams` is on and `teams_posted_at` is null the Social is a **Roster
  registration** (`isRosterRegistrationGame`), so `register`, the Waitlist, leave, kick and the
  Organizer's add take the no-seat path an Americano takes, and every seat door refuses. `register`
  takes `preferredSide`, only on such a Social.
- `games.teamsSheet` (Organizers): every player with their Level, band and side, the posted teams,
  and whether Make teams may post.
- `games.postTeams` (Organizers): the pairs, Left then Right. Every player on the Game once, at
  least four pairs, at most the Social's team count, and nobody left out but one odd player.
  Replaces any posted teams until the draw is posted, writes the Game teams as sides 1 to n, sets
  `teams_posted_at`, and tells each placed player who their partner is.
- `registerWithPartner` refuses an alone-only Social at any stage. Draw doors refuse until the
  teams are posted.
- `byId` adds `organizerMakesTeams`, `teamsPostedAt`, `viewerPreferredSide` and `canMakeTeamsAlone`.
- Pure rules in `@repo/domain/alone-teams`: the balance, the shuffle, a pair's average, the
  same-side mark and the share text.

## Out of scope

- A player changing their side after signing up (they leave and sign up again).
- Pairing suggestions that weigh anything but Level and side.
- Venue console.
