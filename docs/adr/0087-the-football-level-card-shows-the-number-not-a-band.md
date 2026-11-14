# A football Level shows the number, never a band

**Status:** accepted. Amends [ADR-0069](./0069-a-football-level-is-an-ovr-moved-by-four-parts.md) for how a football Level is shown.

ADR-0069 kept the Level bands on football, so the football Level card put a band letter in a ring beside the OVR. Football players read a 40 to 99 number on its own; the letter was a second scale to learn. The owner's design ("Football level card") retires the letter on football and keeps the number, first on the Level card and then on every other surface.

## Decision

- **The football Level card shows OVR alone.** Home's Level card and the Ratings screen's Temba Level card drop the band and its ring: a large OVR, a 40 to 99 bar filled to it with the labels 40, 55, 70, 85 and 99, and the change over the last eight counting Matches top right. Before a counting Match that corner says where the number came from.
- **Provisional is carried by the status and five pips**, never by hatching the number. The footer counts Matches to confirm.
- **A confirmed card's footer reads the last Match** and what it did to the OVR ("Won 5–3 +1"), not the way to the next band. `ratings.me` gains a `lastMatch` field for it; the change is additive.
- **The Home sport switch shows the football OVR** where it showed the band. Padel keeps its band everywhere.
- **Every other football surface follows.** Line-ups, Make teams, profiles, the You page, settings, Team Level, Challenges, Game Level ranges, Level requests, notifications, results and the Operator and Verifier tools show the whole OVR where they showed a band ("72" in a compact cell, "OVR 72" in prose), and averages read "avg OVR 72". Text about the way to the next band is dropped on football; a ring or bar that showed it fills along 40 to 99 instead.
- **Pickers keep storing bands.** A football Level range, a Challenge's Level wanted and the board filter still store band bounds in tenths, and label each option with its OVR span ("70–75") or bound.
- **Storage is unchanged.** `ratings.level_band` is still written on football, and the Game Level range, Team Level and Challenge gates still compare tenths.

**Considered Options**: keep the band beside the number (two scales on one card); show the band only in spoken text (a letter no one sees is noise).

## Consequences

- Football and padel no longer share Level copy: a padel surface keeps its band, and a surface that shows both sports picks the face by sport.
- Some procedures gained an additive whole-OVR field next to `levelBand` so clients can show the number without the μ.
