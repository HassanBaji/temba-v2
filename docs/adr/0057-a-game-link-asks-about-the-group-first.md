# A Game Invite link asks about the Group first, and a Seat hold waits for the Group's answer

**Status:** accepted. Spec: `.scratch/game-link-group-join/spec.md`. Design: "Join via link" (1a to 1f). Extends `.scratch/invite-lookup-and-link/spec.md` and ADR-0047 (Group approvers).

A Game Invite link on a Group Game used to do one thing: register the holder and, as a side effect, put them in the Group, whatever the Group's Require approval said. The design makes the Group the decision and the Game the hook.

## Decision

- **A non-member who taps Join on a Game link answers the Group question first.** The sheet offers the seat and the Group together, or the Group only. Members never see it. Closing it creates nothing.
- **The Group's policy decides what the two options do.** Where anyone with the link may join, both are instant: `games.acceptInviteLink` as before, or the new `games.joinGroupFromInviteLink`, which joins the Group and leaves the seat open. Where Organizers approve (a Public Group with Require approval on), both become a Group join request from the Invite link, minted by the link's creator.
- **A Seat hold is a Group join request that names a Game.** It records the Game, the seat the holder asked for (a padel Position, or a football role and position) and when it lapses: 24 hours after the request. On approval the approver's action seats the requester on that Game if the hold is live and registration is open; the held seat that went falls back to any vacant one, a full Game to its Waitlist, and a refusal (Level range, keeper seats taken) leaves the membership approved without the seat. The hold does not count against the Game's capacity: it is a promise to try, kept on the requester's own screen as a hatched mark, not a reservation other players see.
- **The requester may withdraw a pending request**, hold included, with `groups.withdrawJoinRequest`, which removes the row.
- **`games.acceptInviteLink` keeps its contract.** The web App and a member's one-tap join are unchanged. The mobile App chooses the door from the preview's new `group` field.

**Considered options**: counting live holds against capacity (touches Game admit and every seat count; a lapsed hold would need a worker to release it); landing a non-member on the Game details screen as in the mockup (a private Group Game is not viewable by a non-member, a separate access change); keeping auto-admit on approval Groups (the Group approver's Require approval would stay bypassable by any Game Organizer's link).

## Consequences

- `group_join_requests` gains `held_game_id`, `seat_held_until` and `held_seat`. No other table changes.
- `groups.approveJoinRequest` returns `heldSeat`: `registered`, `waitlisted`, `lapsed` or null.
- The Join requests list does not yet show that a request holds a seat; the approver's copy is a follow-up.
