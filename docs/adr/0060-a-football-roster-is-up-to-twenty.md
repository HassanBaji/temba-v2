# A football Roster is up to twenty and a Matchday squad is named per Game

**Status:** proposed (draft for the owner's review). The Roster half lands with the Group tag; the Matchday squad half is completed with the Challenge Game.

ADR-0038 set a football Team at two to twenty-five, complete at five. The owner's rule for Challenges is a Roster of up to twenty, with the players for one Game named after that Game exists. The cap no longer has to fit a pitch, so the Roster is flat and independent of the Format the Team plays.

## Decision

- **Roster.** `teamRosterRule("football")` is `{ min 2, max 20, completeAt 5, pairIsUnique false }`. Complete still means "can post some Format": 5-a-side is the smallest.
- **Formats.** A Challenge asks for 5, 6 or 7-a-side (`FOOTBALL_CHALLENGE_SIDE_SIZES`). A Roster may post a Format when it holds at least that Format's side (`teamCanPostFormat`); `formatsPlayable(count)` lists them, and the Team detail reads "Roster 12 of 20" and "Plays 5, 6 and 7-a-side".
- **Legacy Rosters.** A Team above twenty (the old maximum was 25) keeps its members and shows "22 of 20". Invite, Invite link accept and add doors refuse at twenty; no door removes anyone.
- **Matchday squad.** _To be completed with the Challenge Game._

**Considered options**: a cap per Format (a Team would change size when it changes Format); keeping 25 (the owner's number is 20).

## Consequences

- ADR-0038's football maximum is amended from 25 to 20.
- The invite budget (`openInviteBudget`, `teamInviteSeatsLeft`) reads the new maximum and never goes below zero on a legacy Roster.
