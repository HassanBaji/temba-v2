# The football Level card shows the number, not a band

**Status:** accepted. Amends [ADR-0069](./0069-a-football-level-is-an-ovr-moved-by-four-parts.md) for how a football Level is shown.

ADR-0069 kept the Level bands on football, so the football Level card put a band letter in a ring beside the OVR. Football players read a 40 to 99 number on its own; the letter was a second scale to learn. The owner's design ("Football level card") retires the letter on football and keeps the number.

## Decision

- **The football Level card shows OVR alone.** Home's Level card and the Ratings screen's Temba Level card drop the band and its ring: a large OVR, a 40 to 99 bar filled to it with the labels 40, 55, 70, 85 and 99, and the change over the last eight counting Matches top right. Before a counting Match that corner says where the number came from.
- **Provisional is carried by the status and five pips**, never by hatching the number. The footer counts Matches to confirm.
- **A confirmed card's footer reads the last Match** and what it did to the OVR ("Won 5–3 +1"), not the way to the next band. `ratings.me` gains a `lastMatch` field for it; the change is additive.
- **The Home sport switch shows the football OVR** where it showed the band. Padel keeps its band everywhere.
- **Storage is unchanged.** `ratings.level_band` is still written on football, and the Game Level range, Team Level and Challenge gates still compare tenths.

**Considered Options**: keep the band beside the number (two scales on one card); show the band only in spoken text (a letter no one sees is noise).

## Consequences

- Other surfaces still show a football band: a Game's Level range, names in line-ups, other players' profiles, the You page and the Operator's Player Levels page. Each needs its own change to read in OVR.
