# Requests wait on Home and Notifications, and an answer is sent after an Undo window

**Status:** accepted.

Organizers and Group approvers met requests in three places that each read differently: a Game's
Requests queue (Level range requests and Seat holds), a Group's join requests on its Members tab, and
a Notification that only said one was waiting. A held seat has a clock on it, and requests scrolled
away under news. The design ("Requests") gathers them where an approver already looks.

## Decision

- **One list of Waiting requests.** `notifications.waitingRequests` lists every request waiting on
  the viewer: Level range requests on upcoming Games they organize, Group join requests with a live
  Seat hold on an upcoming Game, and the rest of the Group join requests in Groups they approve for.
  A Seat hold that lapsed, or whose Game started, reads as a plain Group join request. Anyone who
  organizes nothing gets an empty list, so no role check gates the sections.
- **Most urgent first.** Seat requests come before Group join requests; among seats, whichever runs
  out first (the hold, else the Game's start); then the oldest ask. The order is pure, in
  `@repo/domain/waiting-requests`, and the API returns the list already sorted.
- **One card everywhere.** Who and their level (OVR for football, a band for padel), what they want
  in one line, why it reached you and what Approve does beyond the obvious, and what is running out.
  Home shows the most urgent one above Up next; Notifications shows a Requests section above the
  Notifications with the three most urgent and a row to All requests; All requests groups seats by
  Game, with one tap for a whole Game, then Group join requests. The Game's Requests queue and the
  Group's Members tab use the same card.
- **An answer is sent after an Undo window.** Approve and Decline take one tap and no reason. The
  App holds the answer for `REQUEST_UNDO_WINDOW_MS`, shows it as one line with Undo, and only then
  calls the existing door (`games.approveLevelRangeRequest`, `games.rejectLevelRangeRequest`,
  `groups.approveJoinRequest`, `groups.rejectJoinRequest`). Leaving the App or the page sends what is
  pending at once. The answers live in one provider per App, so the same request disappears from
  Home, Notifications, All requests, the Game and the Group together.

## Considered

- **Undo on the server.** `groups.undoJoinRequestDecision` already reverses a Group join decision,
  but it refuses once the requester holds a seat in the Group, which approving a Seat hold gives
  them, and Level range requests have no undo door. Reversing a seat means unseating a player who
  has been told they are in, and may move the Waitlist. Holding the answer back for a few seconds
  needs no new door and tells nobody anything that is then taken back.

## Consequences

- An answer is not final, and nobody is told, until the window ends. Another approver can still
  answer the same request meanwhile; the late answer then fails and the card comes back with a
  message.
- An App killed inside the window drops the answer; the request is still waiting next time.
