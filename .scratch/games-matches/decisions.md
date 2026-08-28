# Games and Matches — settled decisions

Status: grilling in progress — Rounds 1–2 settled; Round 3 open.

## Settled (round 1)

1. **Breaking rename.** Today’s contest entity is a **Match**. **Game** is the parent event that contains one or more Matches. Rejected: keep Game as the contest and add a parent named Event; nest Match inside today’s Game without renaming.
2. **Registration modes** on the Game: **individual** (Users fill seats) or **team-only** (only a complete persistent **Team** occupies a side). Padel doubles. No third team-like entity. Guests later unless requested.
3. **This slice:** create + registration rules + caps. Configure one set vs several on a Match. No score entry, no live scoring, no Team/User/Group counter updates.

## Settled (round 2)

4. **Formats this slice:** A (exactly one Match, created with the Game — product name still **Single** vs **Friendly game**), **Americano** (individual-only, rotating partners, Matches generated after registration in a later slice), **Friendly tournament** (fixed sides across Matches; organizer adds Matches by hand; individual or team-only). Bracket-style Friendly tournament (**D**) is later.
5. **Fixture** is another word for **Match**. Not a third entity. Not a glossary term.
6. **Belonging:** optional Group (Club or Loose). Public pickup is a flag on the **Game**. Games still do not belong to a Community directly.
7. **Registration** lives on the Game (not on a Match). Individual cap: **players allowed**, multiple of 4, min 4. Team-only cap: **teams allowed**, integer ≥ 2.
8. **Waitlist** once the cap is reached; promote when someone leaves. Registration states: open, full, closed (open until organizer closes, Game window, or cap).
9. **Court and time** live on **Match** (Court optional). Game may have an optional window and no Court. Set length is a Game default; per-Match override later.

## Glossary

Applied: Game, Match (avoid fixture), Set, Game team (side in a Match — **Game team rewrite still open**), Americano, Friendly tournament, Waitlist.

## Open (round 3)

- Product name for format A (Single vs Friendly game)
- Who may create / organize a Game
- Who may register or waitlist
- Waitlist promote, size, leave, and states
- Game team / entries vs Match sides; how individual tournament pairs form
- Which Courts an organizer may assign

## ADR offer (not written)

Game→Match rename: hard to reverse, surprising, real trade-off vs an Event parent. Formats and belonging will not un-rename. Write after Round 3 or with the spec.
