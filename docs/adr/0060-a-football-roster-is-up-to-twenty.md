# A football Roster is up to twenty and a Matchday squad is named per Game

**Status:** proposed (draft for the owner's review). The Roster half landed with the Group tag; the Matchday squad half lands with the Challenge Game. Amends ADR-0038 and, for Challenge Games, ADR-0039.

ADR-0038 set a football Team at two to twenty-five, complete at five. The owner's rule for Challenges is a Roster of up to twenty, with the players for one Game named after that Game exists. The cap no longer has to fit a pitch, so the Roster is flat and independent of the Format the Team plays.

## Decision

- **Roster.** `teamRosterRule("football")` is `{ min 2, max 20, completeAt 5, pairIsUnique false }`. Complete still means "can post some Format": 5-a-side is the smallest.
- **Formats.** A Challenge asks for 5, 6 or 7-a-side (`FOOTBALL_CHALLENGE_SIDE_SIZES`). A Roster may post a Format when it holds at least that Format's side (`teamCanPostFormat`); `formatsPlayable(count)` lists them, and the Team detail reads "Roster 12 of 20" and "Plays 5, 6 and 7-a-side".
- **Legacy Rosters.** A Team above twenty (the old maximum was 25) keeps its members and shows "22 of 20". Invite, Invite link accept and add doors refuse at twenty; no door removes anyone.
- **Matchday squad.** A football Challenge Game opens with two empty sides of `side + 3` seats: the side plus up to three Reserves (8, 9 or 10). There is no squad table and no stored Reserve or "played" flag. Naming a player writes the same `game_players` row and `game_team_players` link any seated player has; the first `side` named are the side and the rest are Reserves for display, so a named Reserve gets the result, Marks, MVP vote and head-to-head like the side. `@repo/domain/matchday-squad` derives the seats (`squadSeatCount`, `squadSeats`), the state (`squadState`: empty, partial, named, and locked once the Score is entered or the Match is completed) and the counter copy ("6 of 9 named, 6 + 3 reserves", "4 + 5 to name, 4 of 9"); `loadChallengeSides` reads both sides for every reader.
- **A Score waits for both squads.** `saveFootballScore` refuses on a Challenge Game until both sides are named: "Name both squads first". A day before kick-off whoever acts for a side still empty or short is reminded once (`challenge_squad_due`).
- **Sides are not published (amends ADR-0039).** ADR-0039 has the Organizer publish the two sides, which creates the Match. On a Challenge Game the sides and the Match exist from confirm and the Captains fill them; `publishFootballTeams` is refused there. Every football reader (the board, Game details, hub rows, the result card) reads two empty sides without error.

**Considered options**: a cap per Format (a Team would change size when it changes Format); keeping 25 (the owner's number is 20); seating the whole Roster at confirm (twenty players do not fit a 6-a-side pitch); a `reserve` or `played` flag on `game_team_players` (Last 10, Marks eligibility and the result card would all learn a second notion of "seated but did not play"; it stays an additive step if the owner wants it).

## Consequences

- ADR-0038's football maximum is amended from 25 to 20.
- Only named players are seated, so "only the squad gets the result" falls out of the existing readers; the Team record reads `game_teams.team_id` and does not depend on who was named.
- The invite budget (`openInviteBudget`, `teamInviteSeatsLeft`) reads the new maximum and never goes below zero on a legacy Roster.
