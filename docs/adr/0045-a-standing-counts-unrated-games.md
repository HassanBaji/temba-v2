# A Standing counts Unrated Games

**Status:** accepted. Amends ADR-0035 and ADR-0040.

ADR-0035 kept Unrated Games out of a Standing as well as out of Levels, and ADR-0040 did the same for football. So a Group that was not Verified, and every football Group, had no Standing. Their Standing tab sorted members by name under "No Standing in this Group", even though its W-L column already counted those Games. The Verified Group gate protects Temba Levels, which every Group shares. A Standing is a position among one Group's members, so it needs no such gate.

## Decision

- **A Standing counts every completed Match of the Group's Games, Rated or Unrated.** `loadGroupStandingMembers` drops cancelled Games only. Group home, the Groups list and Home read it, so all three change together.
- **Football uses the same Standing.** A football Score is one Set (ADR-0040), so a win is one Set won and the side's goals are its points. A draw counts as played, with no Set won.
- **Levels are unchanged.** `games.rated` still decides rating events and Level changes, and the Level column still shows the Temba Level.
- **No backfill.** The Standing is derived on every read, so Matches already played on Unrated Games count from the moment this ships.

**Considered Options**: a per-Group Glicko-2 rating (a second rating model, with its own events and wrong-score reversal, for a position that sets and points already give); counting only Games created after this change (needs a new stored flag, and members would see part of their history ignored).

## Consequences

- Groups that are not Verified, and football Groups, now show a Standing position on Home, in the Groups list and on Group home. Positions in those Groups can change the day this ships.
- A made-up score in a Group that is not Verified can move that Group's Standing, but never a Level. Match result confirmation still applies.
- The football order is wins, then goals scored, then Games played. An order built for football, with points for a draw or goal difference, would need its own decision.
