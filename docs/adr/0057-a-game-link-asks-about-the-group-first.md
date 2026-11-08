# A Game Invite link asks about the Group first, and a Seat hold waits for the Group's answer

**Status:** accepted. Spec: `.scratch/game-link-group-join/spec.md`. Design: "Join via link" (1a to 1f). Extends `.scratch/invite-lookup-and-link/spec.md` and ADR-0047 (Group approvers).

A Game Invite link on a Group Game used to do one thing: register the holder and, as a side effect, put them in the Group, whatever the Group's Require approval said. The design makes the Group the decision and the Game the hook.

## Decision

- **A non-member who taps Join on a Game link answers the Group question first.** The sheet offers the seat and the Group together, or the Group only. Members never see it. Closing it creates nothing.
- **The Group's policy decides what the two options do.** Where anyone with the link may join, both are instant: `games.acceptInviteLink` as before, or the new `games.joinGroupFromInviteLink`, which joins the Group and leaves the seat open. Where Organizers approve (a Public Group with Require approval on), both become a Group join request from the Invite link, minted by the link's creator.
- **A Seat hold is a Group join request that names a Game.** It records the Game, the seat the holder asked for (a padel Position, or a football role and position) and when it lapses: 24 hours after the request. On approval the approver's action seats the requester on that Game if the hold is live and registration is open; the held seat that went falls back to any vacant one, a full Game to its Waitlist, and a refusal (Level range, keeper seats taken) leaves the membership approved without the seat. The hold does not count against the Game's capacity: it is a promise to try, kept on the requester's own screen as a hatched mark, not a reservation other players see.
- **The requester may withdraw a pending request**, hold included, with `groups.withdrawJoinRequest`, which removes the row.
- **Requests wait on the Organizer's Game, in one queue.** A Seat hold on the Game and a Level range request both show in the Game's Requests block, each with Approve and Decline on the row. Seat holds are listed only for viewers who are Group approvers, since approving one is a Group decision; Level range requests keep their Game Organizer door. Declining a Seat hold frees it.
- **Both sides are told.** Group approvers get a Notification when someone asks to join (`group_join_requested`, naming the Game when a seat is held) and Game admins when a player outside the Level range asks to play (`game_level_range_requested`). The requester gets one carrying the decider's name: `group_join_approved`, `group_join_declined`, `game_level_range_approved`, `game_level_range_declined`. These are the first player Notifications about a request; the in-app Notifications spec had left them out.
- **`games.acceptInviteLink` keeps its contract.** A member's one-tap join is unchanged. Both Apps choose the door from the preview's new `group` field; on the web the Game Invite link page no longer auto-joins a non-member until they have answered the Group question.

**Considered options**: counting live holds against capacity (touches Game admit and every seat count; a lapsed hold would need a worker to release it); landing a non-member on the Game details screen as in the mockup (a private Group Game is not viewable by a non-member, a separate access change); keeping auto-admit on approval Groups (the Group approver's Require approval would stay bypassable by any Game Organizer's link).

## Consequences

- `group_join_requests` gains `held_game_id`, `seat_held_until` and `held_seat`. No other table changes.
- `groups.approveJoinRequest` returns `heldSeat`: `registered`, `waitlisted`, `lapsed` or null.
- The Group's own Join requests list does not yet show that a request holds a seat; the Game's Requests block does.
- Not built from the mockup: decline reasons and an offered seat in another Game, the undo window after a decision, the approve sheet's separate seat and membership toggles, and "don't ask next time" for Level range. Each is additive on top of these doors.
- `games.previewInviteLink` also returns `hero`, what the link shows before anyone joins, to signed-out holders too. It names the seated players and the Organizer; the link was already the capability to join, so it carries no more than the Game details a joiner sees next.
- The football Game details screens have no Requests block yet on either App; a Seat hold on a football Game is decided from the Group's Join requests list until they do.
