# A Draft line-up is kept apart from the Football sides

**Status:** accepted. Spec: `.scratch/football-draft-line-up/spec.md`. Design: "Draft line-up"
(`.scratch/design-import/football-draft-line-up.html`).

An Organizer of a football Game splits the roster into two Football sides and publishes, and
publishing is the only way to show the teams to anyone. Organizers want to save the teams first,
show them to a few people, share a picture of them, and publish later.

## Decision

- **A Draft line-up is its own rows, not unpublished Game teams.** `football_lineup_drafts` and
  `football_lineup_draft_players` hold it. A Game with a draft has no Game teams and no Match, so
  every reader that exists today sees a Game whose teams are not set.
- **One per Game, and only before the Football sides are published.** Publishing writes the sides
  as it always has and deletes the draft in the same transaction. There is no draft beside
  published teams.
- **It follows the roster by foreign key.** A draft player row hangs off the `game_players` row,
  so leaving, a kick and a cut to players allowed remove the player with no code in those doors. A
  player who joins is on neither side until the Organizer places them.
- **It may be incomplete.** Saving needs one player placed; only publishing needs every player on
  a side.
- **Only the Game's Organizers and the Side captains named on it read it**, through
  `games.footballBoard`. Everyone else gets null, and a Game screen that looks the same whether or
  not a draft exists. On a Booking Game or a Public Game the only Organizer is the creator.
- **A save or a publish names the draft it was made from** (`updatedAt`), or says that there was
  none. One that names an older draft, or saw none where there is one now, is refused, so two
  Organizers do not overwrite each other.
- **The Draft card carries names, positions and Side captains only.** No Level leaves the app on
  it, it is stamped "Draft, not final", and nobody is highlighted. It is made on the Share result
  screen.
- **Never on a Challenge Game**, whose sides are the two Teams' Matchday squads.

## Considered options

- Game teams with a "published" flag. Rejected: `games.byId`, the invite preview, the payments
  ledger, `games.updateCaps`, partner suggestions and the hub list read Game teams without asking
  for a Match, and each would need a check that the next reader could forget.
- Keeping the draft on the device. Rejected: Side captains and the other Organizers could not see
  it.
- A draft beside published teams. Rejected: players would hold one set of teams while the
  Organizers argued another.
- A door that discards a draft. Not built: editing it, opening a Pick room or publishing replaces
  it.

## Consequences

- No existing reader changes. Tests pin that a saved draft is invisible to each of them.
- `games.footballBoard` gains `draft` and `games.publishFootballTeams` gains optional fields; both
  are additive.
- A draft can outlive its usefulness: nothing removes one from a Game that kicks off unpublished.
  The Score still needs published teams, as before.
- An image goes wherever it is sent. The share screen says so; the visibility rule holds inside
  Temba only.
