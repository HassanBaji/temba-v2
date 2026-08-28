# Games and Matches — settled decisions

Status: grilling in progress — Round 1 settled; Round 2 open.

## Settled (round 1)

1. **Breaking rename.** Today’s contest entity is a **Match**. **Game** is the parent event that contains one or more Matches. Rejected: keep Game as the contest and add a parent named Event; nest Match inside today’s Game without renaming.
2. **Registration modes** on the Game: **individual** (Users fill seats) or **team-only** (only a complete persistent **Team** occupies a side). Padel doubles. No third team-like entity. Guests later unless requested.
3. **This slice:** create + registration rules + caps. Configure one set vs several on a Match. No score entry, no live scoring, no Team/User/Group counter updates.

## Proposed glossary (applied to `CONTEXT.md`)

Game, Match, Set, and Game team (side in a Match). Americano, friendly tournament, and fixture are not glossary terms until Round 2 defines them.

## Open (round 2)

- Game formats (americano vs friendly tournament vs single Match) and whether **fixture** is a term
- Where a Game lives (optional Group, public pickup, Community-direct)
- Registration and caps mechanics
- Court, time, and set length: Game vs Match

## ADR offer (not written)

Game→Match rename: hard to reverse, surprising, real trade-off vs an Event parent. Write after formats and belonging settle.
