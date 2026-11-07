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

On the web the sheet is a `ResponsiveDialog` and the auto-join on open waits until the Group question is answered. Rules, copy and the gate live in `@repo/domain/invites` (`gameInviteGroupGate`, `gameInviteGroupSheetCopy`, `seatHoldExpiry`). Copy keys are under `mobileInvite.link.group`.

## Out of scope

- Landing a non-member on the Game details screen (the mockup's chrome). A private Group Game is not viewable by a non-member; the Invite link screen carries the flow.
- Holds counting against Game capacity, and a worker releasing lapsed holds.
- The approver's Join requests list naming the held Game.

## Testing

- `packages/api/src/routers/games/invite-link-group-join.test.ts` (PGlite): preview modes, Group only, hold refused on an open Group, request without hold, hold then approval seats, lapsed hold, fallback seat, withdraw.
- `packages/domain/src/invites.test.ts`: gate, sheet copy in English and Arabic, cards, hold expiry.
