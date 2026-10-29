# Football sides, Score and goals

**Status:** accepted. Extends ADR-0039. Football Matches feed a Standing since [ADR-0045](./0045-a-standing-counts-unrated-games.md).

A football Game's roster is split by its Organizer into two Football sides, each in a Bib colour. Publishing the sides creates the Game's one Match. Its Score is that Match's one Set, so win, loss, draw, Standing, Last 10 and confirmation stay unchanged readers. Who scored is kept beside the Score, never inside it.

## Decision

- **A registration carries a Football role and a Preferred football position.** `game_players.football_role` (keeper or outfield) and `game_players.football_position` (def, mid, fwd), both nullable: invite and waitlist admits arrive with neither, and the player sets them later through `games.setFootballRole`. `games.register` takes them as an optional `football` input. Two keepers at most per Game.
- **Sides are Game teams with a side index and a bib.** `game_teams.bib` (`football_bib` enum) and `games.football_teams_method` (level or manual) record how the Organizer published them. `games.publishFootballTeams` places every registered User on exactly one side; sides may differ by one player. Publishing again replaces the links until a Score is in.
- **The first publish creates the one Match** with both slots and the Game's pitch. A player who leaves or is kicked after the sides are set loses only their own place: the side stays.
- **The Score is the Match's one Set**, entered through `games.saveFootballScore` (0 to 99 a side) from kick-off by an Organizer or a player on either side. The player who enters it confirms for their side; a changed Score clears every other confirmation.
- **A football Score is agreed when one player from each side confirms** (`matchResultFullyConfirmed`), not every seated User as for padel (ADR-0011). Agreement runs the usual completion effect; the Game stays Unrated, so no rating events are written.
- **Goals live in `match_goals`** (Match, User, goals 1 to 99). Named goals never exceed their side's Score; fewer is fine.
- **Bib colours are tokens.** `@repo/design-tokens` holds `bibColors`; the black-and-white rule still holds for every other surface.

**Considered Options**: goal columns on Match (a second outcome reader everywhere); a goal event per row (adds minutes nobody records at pickup football); every rostered User confirming (twenty-two confirmations for an 11-a-side Game).

## Consequences

- A completed football Match counts as played, won, lost or drawn in All time stats, Win streak and Match history, as any Unrated Match does. It feeds no Standing and no Level; the player profile's Last 10 still skips football. Football rating remains future work.
- `games.footballBoard` is the football read model beside `games.byId`, so `byId` keeps its padel shape.
