# Every Group Game rates a Group Level

**Status:** accepted. Spec: `.scratch/profile-and-group-levels/spec.md`. Amends ADR-0035; reverses the per-Group rating option ADR-0045 considered and declined.

ADR-0035 made every Game on a Group that is not Verified an Unrated Game, so its players got no Level from it. Organizers of those Groups, and of Verified ones, want a Level that reads their own Group's results without touching the Temba Level every Group shares.

## Decision

- **A Group Level is a second Glicko-2 Rating, per User and Group.** `group_ratings` and `group_rating_events` mirror `ratings` and `rating_events`; the Temba tables are untouched, so every reader of the Temba Level is unchanged.
- **A Game's Rating scope is `temba`, `group` or `unrated`, fixed at create.** `games.rated` keeps meaning "moves the Temba Level". New `games.group_rated` means "moves the Group Level". A padel Game on a Group is group rated unless its creator chose Unrated; it is also Temba rated when the Group is Verified. Groupless and football Games are Unrated.
- **A first Group Level starts from the Temba Level**, Provisional (φ at least 250), so a new Group reads players where Temba already places them and settles on its own results.
- **Organizers set Group Levels; Level setters set Temba Levels.** A Group Level override is stored in `group_level_overrides` and works like a Level override.
- **No replay.** Existing Games are `group_rated = false`.

**Considered Options**: a `rating_scope` enum column replacing `rated` (every insert and fixture of `games` changes, and the Temba readers would all move); a `group_id` column on `ratings` (every existing `ratings` query would need a `group_id is null` filter to stay correct).

## Consequences

- Every padel Group Game now rates something unless its creator opts out, so a made-up score in a Group that is not Verified moves that Group's Levels. Match result confirmation still applies, and the Temba Level stays behind the Verified Group gate.
- "Report a wrong score" reverses both kinds of rating event.
- Group Levels start the day this ships; Matches already played do not count towards them.
