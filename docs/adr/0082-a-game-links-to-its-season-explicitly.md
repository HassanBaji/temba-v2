# A Game links to its Season explicitly

**Status:** accepted. Amends ADR-0045.

Seasons (design "Seasons") arrived as a lens: a Standing read every Match whose start fell inside the Season's date window. That left an Organizer no way to keep a Group Game out of the Standing, and no way to say which Season a Game belongs to when its day moves. The reworked Edit game sheet (design "Edit game flow") adds a Season section that links a Game to one of its Group's Seasons, or to none.

## Decision

- **A Game carries `season_id`, nullable, one of its Group's Seasons.** A Standing lens on a Season reads the completed Matches of the Games linked to it and nothing else. The All-time lens still reads every Match. A Game with no Season is a friendly: it still updates Levels, never a Standing.
- **The game day decides which Seasons fit.** A link is allowed only when the Season's window holds the Game's product-timezone day and the Season is not closed. `games.updateWindow` takes an optional `seasonId` so a day moved outside the linked Season is fixed in the same transaction: move to the Season that covers the new day, or unlink. Without it, a day the linked Season no longer holds is refused.
- **Links follow the Seasons.** A new Group Game starts in the open Season that holds its day. Opening a Season takes the Group's unlinked Games on its days. Closing a Season early re-homes its Games on later days to the Season that holds them, or unlinks them.
- **A confirmed score locks the link.** Once a Match of the Game is completed, the Season cannot change, so a result never moves between Standings.
- **Backfill once.** Migration 0074 links every existing Group Game to the Season whose window holds its day, so no Standing changes the day this ships.

**Considered Options**: keeping the date lens and adding an "excluded from standing" flag (two rules for one question, and still no answer when a day moves); counting a Match in a Season when either the link or the date matches (lets a friendly count by accident).

## Consequences

- `games.byId` carries `seasonId`, `season`, `groupSeasons` and `canChangeSeason`; `games.updateSeason` is the new door. Both are additive.
- The Group Games tab still draws its Season hairlines by date; a Game whose link differs from its day's Season is possible only by an Organizer's explicit choice.
- A Season closed early can leave a Game between Seasons as a friendly. The Organizer sees that in the Season section and links it once a Season covers the day.
