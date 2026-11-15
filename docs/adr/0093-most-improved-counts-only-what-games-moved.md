# Most improved counts only what Games moved

**Status:** accepted. Amends [ADR-0091](./0091-the-standing-has-three-views-by-ladder.md).

Most improved read the gain as the Level (or Tier points) at close or now, less the value when the
Season opened. A Level override or a Tier adjustment in the Season counted as improvement, so a
member placed up by hand could top the view without winning anything.

## Decision

- **The gain is what Games moved in the Season:** Rated Matches and King of the court Place awards
  on the Temba Level, `game` events on Tier points. Level overrides and Tier adjustments are left
  out.
- **The start moves with a hand change.** `start` is the value now (or at close) less the gain from
  Games, so a row still reads start to now and the gain is the difference. With no hand change in
  the Season, `start` is the value when the Season opened, as before.
- **By level is unchanged.** A member is still placed by their Level now, or at close, whatever
  moved it.

**Considered Options**: keeping the real opening value and showing a gain that is not the
difference of the two columns (the row stops adding up); adding only Game moves to the opening value
(the Now column would show a Level the member does not hold).
