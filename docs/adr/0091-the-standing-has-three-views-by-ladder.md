# The Standing has three views, and the Group's ladder decides which

**Status:** accepted. Design: "Group standings" (section 01). Amends
[ADR-0066](./0066-a-football-group-that-is-not-verified-has-a-group-tier.md) for where Tier points
are shown. Amended by
[ADR-0093](./0093-most-improved-counts-only-what-games-moved.md): the gain counts Games only.

A Group's Standing ranks points. Groups also wanted to see who leads among players of their own
level, and who improved most in a Season. Both questions need a ladder, and not every Group has one.

## Decision

- **Three Standing views under the Season chips:** Overall (the Standing as before), By level and
  Most improved. The Season chips pick when; the views pick what.
- **The Group's ladder decides which views it gets.** A Verified Group reads the Temba Level and
  gets all three. A tier Group has no Temba Level to split by, so it gets Overall and Most improved,
  which reads Tier points. A padel Group that is not Verified has no ladder and keeps Overall alone,
  with no views row.
- **By level keeps the Overall points** and ranks inside each category. Padel groups by band letter
  (A, B, C, D); football by OVR ranges of 15 from 40, because a football Level is a number
  (ADR-0087). A member is placed by their Level now, or at close for a closed Season.
- **Most improved is a Season view.** The gain is the Level (or Tier points) when the Season closed,
  or now, less the value when it opened. It is off on All-time. A member needs the Standing's
  minimum results in the Season to be ranked; members flat or down are listed below without a
  place.
- **A past value is read, not stored.** Every Level writer (Rated Match, Level override, King of the
  court Place award) and every Tier event records the value it replaced, so the value at an
  instant is the "before" of the first change after it, else the current value.
- **Provisional Tier points stay private.** As on Members, a Provisional member's points and gain
  show only to that member and the Group's Organizers.
- **One read:** `groups.standingLevels`, additive, beside `groups.seasonStanding`. The table rows
  still come from the Standing; the views combine them with the levels in `@repo/domain`.

**Considered Options**: storing a Level snapshot at each Season's open and close (a new table and a
job, for values the change logs already hold); a By level view on a tier Group by Tier band (the
fish is a place in the Group, so splitting a Standing by it ranks a ranking); Most improved on
All-time from each member's first Level (it rewards joining early, not improving).

## Consequences

- Tier points appear on the Standing for the first time, as a Season's gain only.
- Sharing the views is [ADR-0092](./0092-the-standing-shares-as-images-a-pdf-a-csv-or-a-link.md).
