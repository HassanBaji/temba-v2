Status: implemented (web App sets them; the mobile App reads them)

Design: `Temba sports community app - Americano fixed pairs.html` (screens 1a–1d), shared in the
session that built this. Decision: [ADR-0113](../../docs/adr/0113-an-americano-may-keep-up-to-two-fixed-pairs-together-all-day.md).
Builds on `.scratch/americano/spec.md`.

## Problem

In an Americano everyone changes partner each Round. Organizers want to keep a couple or two friends
together for the whole day while everyone else still rotates.

## What ships

### Before the Rounds (1a, 1b)

- Organizer only, under the "Make the rounds" card: a **Fixed pairs** card. "None yet. Keep two
  players together in every match, up to 2 pairs." with **Pick**; once set, the pairs by name with
  **Change**. When the Rounds leave no room for a pair (8 players, 7 Rounds) the card says so and
  Pick is disabled.
- **Fixed pairs** sheet: tap one player, then their partner. The pair appears under **Pairs**
  ("You and Khalid Janahi", "Together in all 7 rounds", **Remove**) and both chips carry
  "Pair 1". A hatched slot reads "Pair 2: tap two players below", then "Pair 2: now tap Hassan's
  partner". The foot counts the rotating players: "14 players rotate and each still gets 7
  partners, all different. You can fix one more pair." **Done** saves; "You can change this until
  the rounds are made."
- The Players grid marks fixed players with their pair number for the Organizer, and its foot
  reads "Partners change every round, unless you fix a pair."
- **The rounds** sheet places the pairs in Round 1, marks their chips, does not let them be
  swapped, and leads with "2 fixed pairs stay together; the other 12 get 7 partners each".

### Playing (1c, 1d)

- Rounds: each fixed pair is marked "fixed" under its names. The Organizer's lead reads "7 rounds
  made. 2 fixed pairs stay together; the other 12 players get 7 partners, all different." A swap
  cannot pick a fixed player; the foot reads "A fixed pair cannot be split by a swap. To change the
  pairs, undo the rounds before a score is in."
- Standings: one table of players. A fixed player carries "with Khalid J" (or "with you"), and
  fixed partners sit next to each other on a tie. Lead: "Fixed partners share every result, so they
  sit together."
- Players tab: chips carry the pair number.

### Rules

- At most two pairs. Every rotating player must still get a new partner every Round, so the
  rotating players must be at least one more than the Round count.
- Pairs lock when the Rounds are made and open again when the Rounds are undone.
- A player leaving or taken off removes their pair.
- Only the Organizer sets them; players do not ask for a partner.

## API (additive)

- `games.setAmericanoFixedPairs({ gameId, pairs: [{ firstGamePlayerId, secondGamePlayerId }] })`
  replaces the pairs. Refuses more than two, a player twice, a player not on the Social, pairs
  that leave too few rotating players, anyone but an Organizer, and a Social with Rounds made.
- `games.americanoBoard` adds `fixedPairs: [string, string][]` (Game player ids, pair 1 first).
- `games.postAmericanoRounds` keeps each fixed pair together in every Round, and refuses when the
  pairs no longer fit the Round count.
- `games.swapAmericanoPlayers` refuses a fixed player.
- Schema: table `americano_fixed_pairs` (migration `0139_americano_fixed_pairs`).

### Mobile App

- Standings show "with …" under fixed players and the fixed-pairs lead. Setting pairs stays on
  the web with the rest of Americano administration.

## Not built

- Players asking for a fixed partner at sign-up.
- Changing a pair after the Rounds are made without undoing them.
- Spreading fixed pairs across Courts: they play on the first Courts of each Round.

Preview states: `/dashboard/design/americano`, columns 1b, 1c and 1d (development only).
