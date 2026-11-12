# The Organizer edits teams as one line-up

**Status:** accepted.

Players pick their own seats when they join a padel Friendly game or a Friendly tournament. Organizers
wanted to change those teams: move a player to the other side or the other team, and seat someone in
an open spot straight from the line-up. The design ("Edit teams") puts both behind the Organizer's
tools and keeps the line-up itself unchanged for everyone else.

## Decision

- **Edit teams saves the whole line-up at once.** `games.editTeams` takes every seated player and
  the spot they end in. The same players must be listed, each once, in distinct spots; anything else
  is refused as a line-up that changed while the Organizer was editing. Nothing changes until Save.
- **Game teams keep their rows.** A moved player's `game_team_players` row points at its new Game team; Matches,
  draws and Standings follow the Game team, so a tournament's rounds show the new names. A padel Game
  side left empty loses its Game team, and an empty side that gains a player gets one, with the Match
  slot pointed at it, as joining and leaving already do.
- **Who and when.** The Organizer (the Game's Organizers, as everywhere else), on a padel Friendly
  game until a score is entered, and on a Friendly tournament while it is not cancelled. Individual
  registration only: a team-only Game's sides are persistent Teams.
- **What locks on a tournament.** A Game team with a scored Match keeps its two players, because
  the result is theirs; its sides can still swap. A score still waiting to be confirmed counts: it
  stands on its own after ten minutes (ADR-0062) and would otherwise become the result of a pair that
  did not play it. Once the Pool draw is posted no side gains or loses a player, so only swaps
  between teams are allowed, and a Game team left empty after the draw keeps its row and Matches. A
  tournament that does not allow registering alone never ends a move with a Half team.
- **The door reads the score under the Match locks.** It locks the Game, then its Matches, so a
  score being written is seen before the line-up is checked.
- **Not on a Challenge Game.** Its sides are the two Teams' squads.
- **Moved seats are set by the Organizer.** A moved player's seat loses Either side and records the
  Organizer in `side_set_by`, like setting a Game team's sides.
- **Telling the players is the Organizer's choice, on by default.** Everyone whose spot changed,
  except the Organizer, gets a `game_team_changed` Notification (new enum value, migration 0102).
- **Adding at an open spot.** An Organizer who taps an open spot gets Add a player for that spot. If
  they could also take or move to it themselves, a short menu offers both. On a tournament the first
  player added goes to the tapped team, from the Group list as well as by phone.

## Consequences

- Substituting a player into a locked tournament team for the rounds left is not part of this; the
  design's substitute flow needs its own decision on how results and ratings split.
- The edit board shows Level bands, not a numeric team average, so the design's balance line and
  Balance for me / Even them out shortcuts are not built.
- The Mobile and web Apps share the board logic in `@repo/domain/edit-teams`; each draws its own sheet or dialog.
