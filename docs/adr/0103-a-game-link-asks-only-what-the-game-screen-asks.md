# A Game Invite link asks only what the Game screen asks

**Status:** accepted. Amends ADR-0057 (a Game link asks about the Group first).

ADR-0057 gave the Game Invite link one join sheet: team and side on padel. That fits a Friendly game.
On a Social it asked the wrong things: an Americano has no Game teams, an Alone-only Social has none
until its Organizer makes them, and a Social with eight Game teams got eight team chips and no way to
join with a partner, which its Game screen offers.

## Decision

- **Opening a Game Invite link never seats anyone.** The web page used to join a member at once when
  the Game had no seat to pick. It now waits for Join, as the mobile App did.
- **An Americano link is Join only.** No team and no side. A non-member still answers the Group
  question in the link's sheet, which then shows nothing else.
- **An Alone-only Social's link asks for an optional side** until its teams are made, as its Game
  screen does. `games.previewInviteLink` says so with `asksForSide`, and `games.acceptInviteLink`
  takes `preferredSide`, refused on any other Game. Both are additive.
- **A Group member on a Social with Game team seats gets the Game screen's join sheet**: alone or
  with a partner when a whole Game team is open, then Take a seat. The seat still goes through
  `games.acceptInviteLink`; a partner registration goes through `games.registerWithPartner`.
  `gameInviteUsesGameJoinSheet` in `@repo/domain/invites` decides.
- **Anyone who still owes an answer keeps the link's own sheet.** A non-member, or a player outside
  the Level range, picks a seat there with the Group switch, since a Seat hold and a Level range
  request carry that seat. Joining with a partner opens once they are a member.

**Considered options**: sending the member to the Game screen with its join sheet open (the tapped
seat is lost, and closing the sheet leaves them off the link); offering a partner to a non-member (a
Seat hold names one seat, and the partner list is the viewer's Groups).

## Consequences

- A Friendly game's link is unchanged.
- The link's sheet lays a Social's Game teams two a row.
- A side asked for on an Alone-only link is dropped when the join becomes a Seat hold or a Level
  range request, so the sheet hides Side on those.
