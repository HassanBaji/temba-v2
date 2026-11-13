Status: shipped

Design: `Edit game flow.dc.html` (Temba Sports Community App 19), frames 1a–1d.

## Problem Statement

The Edit game dialog was a stack of forms, each with its own Save, under an intro paragraph. A football Organizer could change players allowed but not the Side size, and could not drop players allowed under the number joined. A Group Game could not say which Season it belongs to.

## Solution

One sheet, four short sections, one Save, on web and mobile:

- **Name** (Friendly games only), **When** (day, start, finish; duration in the heading), **Players and price** (Players and A-side steppers on a football Game, price per player), **Season** (Group Games with at least one Season).
- The locked Venue and Court sit in the header. The footer shows what changed ("None yet", "Day moved. Season needs a fix.") and the one Save.
- Save sends the changed sections in order (name, window with any season fix, caps, price, Level range, rounds, season) through the existing doors. A failing step stops the run; the Game reloads with what saved, the draft keeps the rest, and the error names the section.
- Dropping players allowed under the joined count moves the latest joiners to the Waitlist, latest first, keeping their join time as their place (`games.updateCaps` returns `movedToWaitlist`). Growing the A-side lifts players allowed to two full sides. Neither is allowed once the Football sides are published.
- A Game links to a Season of its Group (`games.season_id`, ADR-0082). The picker offers "No season" and the Seasons that hold the game day; closed Seasons and Seasons that miss the day are dimmed. Moving the day outside the linked Season shows the fix card: move to the Season that covers the day, unlink, or move the day back.

## Pure modules

- `@repo/domain/game-edit-form`: draft, sections, change detection, ordered save plan, footer note, players and price copy.
- `@repo/domain/game-season-link`: picker rows, open Seasons for a day, the fix state, copy.

## Doors

- `games.updateCaps` takes `sideSize`; `games.updateWindow` takes `seasonId`; `games.updateSeason` is new; `games.byId` adds `seasonId`, `season`, `groupSeasons`, `canChangeSeason`.
- `groups.createSeason` links the Group's unlinked Games on its days; `groups.closeSeason` re-homes later Games.

## Out of scope

- A Notification to the players moved to the Waitlist.
- Americano and tournament caps still refuse a drop under the registered count.
- The Group Games tab still draws Season hairlines by date.
