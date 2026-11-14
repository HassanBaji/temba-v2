# Requests on Home and Notifications

Requests to join a game or a group, made clearer for Organizers and Group approvers: on top of Home,
in their own section on Notifications, on an All requests screen, and with the same card on the Game
and the Group. Answered in one tap. Design: "Temba Sports Community App, Requests" (sections 01 to 03).
Decision record: ADR-0087. Term: **Waiting request** in `CONTEXT.md`.

## What waits

| Kind          | Source                                                       | Who answers                  | What runs out          |
| ------------- | ------------------------------------------------------------ | ---------------------------- | ---------------------- |
| `level_range` | Game Level range request, upcoming Game                      | The Game's Organizers        | The Game's start       |
| `seat_hold`   | Group join request with a live Seat hold on an upcoming Game | The Group approvers          | The hold (24 hours)    |
| `group_join`  | Any other pending Group join request                         | The Group approvers          | Nothing; shows the age |

Order: seats first, then whichever runs out first, then the oldest ask (`compareWaitingRequests`).

## The card

1. Name, sport glyph and level (football OVR as a number, padel a band). On the right: what runs out
   (`seat held 6h left`, `starts in 2d`, `asked 2d ago`).
2. What they want: `Seat in Fri 7:00 PM football` or `Join Tuesday Night Padel`.
3. Why it reached you and what Approve does beyond the obvious: the requester's Group membership and
   where their level sits against the range; for a Seat hold that Approve adds them to the Group too;
   for a Group join request who invited them and how many games they played with the members. A note
   the requester wrote follows in quotes.
4. Approve and Decline, one tap each, no reason asked.

An answer becomes one line with Undo for six seconds, then it is sent. Leaving the App sends it at
once. The line says what approving does: "is in Friday’s game" for a Seat hold or a Level range
request whose asker picked a seat, "goes on Friday’s Waitlist" when the Game is full, and "can now
join Friday’s game" for a Level range request with no seat picked, which approval only waives. Once
the answer is sent the line says what the door did. A request asked again after its answer was sent
waits again.

## Where

- **Home**: Requests above Up next, only while something waits or an answer can still be undone.
  One full card, the most urgent; under it "Next: Jassim A, Faisal J and 2 more" and All.
- **Notifications**: Requests section above the Notifications: answered lines plus the three most
  urgent, "N more requests" to All requests, and a footnote. No section once nothing waits and every
  answer is sent.
- **All requests**: Games (grouped by Game, with how full it is, the seats held, and "Approve both" or
  "Approve all N"), then Groups. "Seats held" counts only requests whose approval takes a seat.
- **Game**: its Requests queue uses the card for seat requests on that Game.
- **Group**: the Members tab's join requests use the card.

## Code

- `packages/api/src/routers/notifications/waitingRequests.ts`: `notifications.waitingRequests`.
- `packages/domain/src/waiting-requests.ts`: card copy and order.
- `packages/domain/src/request-answers.ts`: this session's answers: the queue that holds an answer
  for the Undo window and sends it, and the views Home, Notifications, All requests, the Game and the
  Group read.
- `packages/i18n/src/messages/{en,ar}/requests.ts`: copy.
- Each App: one provider that wires the queue to its doors and timers, the card, the done line, and
  the screens above.
