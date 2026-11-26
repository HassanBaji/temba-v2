# The Series winners card is the one focus of a won Social

**Status:** accepted. Builds on [ADR-0064](0064-dark-mode-moves-values-not-roles.md) and
[ADR-0105](0105-a-series-win-and-an-edition-number-are-computed-from-the-games.md). Spec:
`.scratch/series/spec.md` (8.7, decision 12). Design: `screens/3a-series-won.png`.

The design system gives a screen one focused surface, `Surface tone="ink"`, for the thing coming up,
and draws finished things on `paper`. A finished Social therefore had no focus: its table, its
Rounds and its results are all paper. A Series changes what a finished Social is for. When its
Edition is won, the screen opens on who won it and what number that win is for each of them, and
that card carries Share and See the series.

## Decision

- **On a Social whose Edition is won, the Series winners card is `Surface tone="ink"`**, first on
  the screen, on the web and mobile Apps alike. It is the one focused surface of that screen: no
  other surface of a finished Social is ink.
- **It is a named exception to "finished things are `paper`"**, not a new rule. The focus still
  marks the one thing a player came to the screen for; on a won Social that is the winners, not a
  Match still to play.
- **Only a won Edition lifts it.** While the Edition is upcoming the screen shows the paper "Part
  of" card, and an Edition decided with no winner shows the paper result card.
- **A Played game keeps its result hero as the focus.** A padel Friendly game or a football Game
  already has a focused surface, so its Series win is a paper card under the hero. No screen gets
  two focused surfaces.
- **No new Color role or `SurfaceTone`.** The card is the existing focus: Lifted on the web, and on
  the mobile App whatever its `invertedFocusPalettes` draw until that App moves to Palette v2
  (ADR-0084).

**Considered options**: a paper winners card, as on a Played game (the finished Social would open
on a card that looks like every card under it, and the win a Series exists for would not lead);
making the Series card the focus on a Played game too (two focused surfaces on one screen, and the
result hero is what that screen is for).

## Consequences

- A design review of a finished screen asks: is the ink surface the Series winners card of a won
  Social? If not, it is a defect.
- `seriesEditionCard` decides the card's kind for both Apps (`winners` only for a won Edition on a
  Social), so the two cannot disagree about when the focus appears.
- A score correction that takes the win away takes the focus away with it: the card is computed
  from the Game's result (ADR-0105).
