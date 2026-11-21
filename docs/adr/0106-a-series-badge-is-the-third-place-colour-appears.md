# A Series badge is the third place colour appears

**Status:** accepted. Amends [ADR-0056](0056-mark-coins-are-illustrated-assets.md) and the Bib entry
in `CONTEXT.md`. Spec: `.scratch/series/spec.md`. Geometry: `.scratch/series/design/badge-geometry.md`.

Temba is black and white. ADR-0056 let colour in at two places, both data a player earned or wears:
a Bib and a Mark coin. A Series is collected on a profile the same way a Mark is, and its design
gives every Series a badge in one of six colours. A badge without colour could not tell one
Group's Series from another's on a profile.

## Decision

- **A Series badge is data, like a Mark coin and a Bib.** Its colours appear only inside a badge,
  and in the six swatches of the New series colour picker, which preview one. No button, bar,
  background, text or count pill takes a badge colour, and no theme token is derived from one.
- **It is a six-sided coin, so it never reads as a Mark, which is round.**
- **A Group approver composes it and uploads nothing**: one of seven emblems (Cup, Crown, Star,
  Bolt, Flame, Moon, Ball) in one of six colours (Gold, Red, Blue, Green, Purple, Teal), 42
  badges in all. Every badge stays in the Temba style, and there is no image to store, moderate
  or serve.
- **Badges ship as data in `@repo/design-tokens`**, beside the coins: `src/series.ts`
  (`@repo/design-tokens/series`) holds the hexagon, the seven emblems as elements in a 120 by 120
  viewBox, and the six colours as two tones each (`disc` for the hexagon, `shade` for the emblem's
  shadow). The emblem's body is `paper` and its accents are `ink`. Each client draws them through
  one `SeriesBadge` primitive (`react-native-svg` on mobile, inline SVG on web) with the same
  `emblem`, `colour`, `size` and `count` props. Clients never import an SVG file or a bitmap.
- **A badge keeps its light tones in both Color schemes**, as an earned coin does (ADR-0064): it
  is a picture of something, not chrome.
- **The count on a badge is chrome**: a pill in `ink` with `paper` digits and a ring in the colour
  of the surface under it, so it follows the Color scheme while the badge does not.
- **"Not yet" stays `Hatch`.** A badge has no unearned state: a profile shows only the Series a
  player has won. What is not yet is a hatched tile ("Not part of a series") or a hatched row (the
  Edition not played yet), carrying no badge colour.
- **Badges are decorative to assistive technology.** The text beside one carries the Series name;
  the pickers label each choice with its emblem's or colour's name.
- **The hex-literal lint stays.** Badge colours live in the tokens Package, where hex literals are
  allowed.

**Considered options**: an uploaded image per Series (a Group's logo on every winner's profile,
with storage, moderation and a third look in the app); one fixed badge for every Series (a profile
with three wins shows three copies of the same picture); the Mark coin's disc with a Series emblem
(a Series win would read as a Mark someone gave); colour picked freely (no shade to pair it with,
and no promise it reads on black and on white).

## Consequences

- The glossary's "two places colour appears" becomes three: a Bib, a Mark coin, a Series badge.
- A design review of any surface asks: is this colour inside a coin or a badge, or a swatch that
  previews one? If not, it is a defect.
- Adding an emblem or a colour means adding its data entry, its name in both Message catalogs and
  its value to the database enum; the tokens test and the key parity tests guard the three.
- The emblem and the colour are stored on the Series as enum values, never as hex.
