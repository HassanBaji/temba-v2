Status: implemented

## Problem Statement

A player opens a Game Invite link for a Group they are not in. Join took the seat and put them in the Group in one step, whatever the Group's Require approval said. They could not join the Group without the seat, and an approval Group's queue was bypassed by any Game Organizer's link.

## Solution

Design "Join via link" (screens 1a to 1f). On the mobile App's Invite link screen and the web App's Game Invite link page (`/invites/game/link/{token}` and `/g/{code}`), Join asks about the Group first:

- **Landing (1a):** the Game hero, a Group row, a note "Games live inside groups…" with an inline Join group action, and Join game, which opens the sheet instead of taking the seat.
- **Open Group (1b):** "Join the group and take the seat" (existing `games.acceptInviteLink`) or "Join the group only" (new `games.joinGroupFromInviteLink`). "Just looking for now" closes the sheet and creates nothing.
- **Organizers approve (1c):** "Request to join and hold the seat" or "Request to join the group only". Both are Group join requests from the Invite link; the first carries a Seat hold of 24 hours.
- **Joined the Group only (1d):** a notice "You're in {Group}" with Open group, then the usual one-tap join.
- **Joined both (1e):** lands on the Game as before.
- **Request sent (1f):** a card with the hold's expiry, who shared the link, and Withdraw request (new `groups.withdrawJoinRequest`).

On approval, `groups.approveJoinRequest` seats a live hold's requester on the Game (held seat, else any vacant seat, else the Waitlist) and reports `heldSeat`.

**The organizer (design 2a to 2e, in part).** `games.byId` returns `pendingSeatHolds` to a viewer who is a Group approver. Both Apps show one Requests queue on the Game (the former Level range requests block): Seat holds first, then Level range requests, each row with Approve and Decline. Seat holds go through `groups.approveJoinRequest` and `groups.rejectJoinRequest`; declining drops the hold.

**Notifications.** Group approvers hear `group_join_requested` (from the Group page, a Group link, or a Game link, naming the Game when a seat is held); Game admins hear `game_level_range_requested`. The requester hears the decision with the decider's name: `group_join_approved`, `group_join_declined`, `game_level_range_approved`, `game_level_range_declined`. Copy in `@repo/domain/notification-copy`; the web list and the Notification email link to the Game when one is named, else the Group.

On the web the sheet is a `ResponsiveDialog` and the auto-join on open waits until the Group question is answered. Rules, copy and the gate live in `@repo/domain/invites` (`gameInviteGroupGate`, `gameInviteGroupSheetCopy`, `seatHoldExpiry`). Copy keys are under `mobileInvite.link.group`.

## The design pass

The Invite link screens now follow the "Join via link" design closely on both Apps:

- **The Game hero (1a to 1f).** `games.previewInviteLink` gains `hero` (additive): when and where, the court, side size, seat count, the seated players' names, price, rated, the Organizer, who shared the link, when the link lapses, and a Group card. Anyone holding the link sees it, signed in or not; the link is the capability. `@repo/domain/game-invite-hero` turns it into the ink head ("From a link", status, kick-off, day and venue, detail line, "8 of 12 in", a tile per player with the open seats hatched), the Organizer, Group and Level rows ("C−/C+, yours fits"), and the web's Level card and Format, Court and Link rows.
- **Mobile.** The Invite link screen draws the hero full-bleed in ink with the shared-by note inside it, the rows under it, the "Games live inside groups" note with an inline Join group, and a fixed bar with the seats open and the one action. The joined notice (1d) has the check mark and Open group; the request card (1f) has the hatched mark, the Shared by row and Withdraw as a quiet row. Group and Team links keep the titled layout.
- **Web (3a to 3c).** A Game Invite link renders on the ink page: the Game card, the Level card ("Sign in to see if you fit" when signed out), the Group card with the member stack and Join group, the Format, Court and Link rows, and a sticky bar ("Sign in to join" when signed out). Arabic mirrors it.
- **Organizer queue (2a).** Each request row shows the requester's band beside their name, what they asked for in a sentence, the hold's countdown on the right, then Approve across the row and Decline. `OrganizerRequest` gains `level`, `detail` and `held`.

## Out of scope

- Decline reasons, an offered seat in another Game, the undo window, the approve sheet's seat and membership toggles, and "don't ask next time" (designs 2b to 2g).
- A Requests block on the football Game details screens.
- Landing a non-member on the Game details screen (the mockup's chrome). A private Group Game is not viewable by a non-member; the Invite link screen carries the flow, now drawn with the Game details hero.
- The design's "Plays" row (when the Group plays) and "Their next games" list (1d): the Group has no schedule to read them from yet.
- The padel court picture on the web landing (3a): a padel Game still shows the seat grid to pick from, or the roster tiles.
- Share from the request-sent and joined bars (1e, 1f), and the "held" tiles in the Organizer's hero (2a).
- Holds counting against Game capacity, and a worker releasing lapsed holds.
- The approver's Join requests list naming the held Game.

## Testing

- `packages/api/src/routers/games/invite-link-group-join.test.ts` (PGlite): preview modes, Group only, hold refused on an open Group, request without hold, hold then approval seats, lapsed hold, fallback seat, withdraw.
- `packages/api/src/notifications/notify-requests.test.ts` (PGlite): approvers notified of a Seat hold and the requester of the answer, `pendingSeatHolds` for an approver, decline drops the hold, Group page requests, Level range request and decision notices.
- `packages/domain/src/seat-hold-request.test.ts` and `friendly-game-organizer.test.ts`: row meta, hold countdown, queue heading and order.
- `packages/domain/src/invites.test.ts`: gate, sheet copy in English and Arabic, cards, hold expiry.
- `packages/domain/src/game-invite-hero.test.ts`: hero lines, tiles with the viewer first, Level fit, row and card copy, info and web rows.
- `invite-link-group-join.test.ts` also checks the `hero` a signed-out holder and a seated viewer get.
