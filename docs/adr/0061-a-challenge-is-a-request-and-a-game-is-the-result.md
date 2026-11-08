# A Challenge is a request and a Game is the result

**Status:** proposed (draft for the owner's review). The request half lands with posting and the Open board; the Game half (confirming a Proposal creates the Challenge Game) is completed with the Challenge Game.

A Team on Temba has a record it cannot earn: nothing lets it find another Team and play. The owner wants a board where a Team posts what it is looking for, another Team answers with a time and a Venue, and the poster confirms one answer. The question is what the board holds: a Game that waits for an opponent, or something that is not a Game until both Teams agree.

## Decision

- **A Challenge is its own record, never a Game.** `challenges` holds the posting Team, its sport, the Challenge format (`side_size`, football only, 5, 6 or 7), Level wanted (`level_min_tenths`, `level_max_tenths`, the same units as a Game Level range), preferred Venues (`challenge_venues`, ordered), days, timings and optional exact slots, a line of up to 140 characters, and `duration_minutes` (padel 90, football 60), which becomes the Game window. Nothing about who will play: a football Roster may be up to twenty and the players of one Game are named after it exists (ADR-0060).
- **Posting.** Someone who acts for the Team (ADR-0059) posts. Football needs a Format the Roster can field (`teamCanPostFormat`); padel has no Format and needs both players. Venues must offer the sport and exact slots must be ahead. A Team has at most one open Challenge, enforced by the partial unique index `challenges_team_open_uq` and checked by the door. Withdrawing frees the Team to post again.
- **Who may answer.** Any other Team of the sport whose Roster holds at least the Format's side (padel: both players), that shares no member with the poster, and whose Team Level sits inside Level wanted when one is set. A Team with no rated member has no Team Level and is outside any set range. There is no request or waiver path. The Open board is visible to every signed-in User; a viewer with no such Team sees the card greyed with the reason (`challenges.listOpen`, `challenges.byId`).
- **A Challenge expires; it is checked on read and stamped by a job.** Open for seven days. `@repo/domain/challenge-clock` answers whether a row is still open, and every read applies it, so a row the job has not stamped never acts. A Graphile Worker job (`challenge.expire`) enqueued at `expires_at` with `mode: "replace"` stamps `expired` and tells the Users who act for the Team (`challenge_expired`, once per Challenge by its dedupe key). A Challenge never expires while a Proposal is pending: the job re-schedules itself at that Proposal's expiry. Expired and withdrawn Challenges leave the board quietly. Precedent: `settleMvpJob` and the Invite link check-on-read.
- **Proposals are stored beside it.** `challenge_proposals` (a Venue, a start, an optional price per player, 48 hours to answer; one pending per Team per Challenge) exists from the start so the clock can see them; the propose and confirm doors land with the Proposal and Challenge Game work.
- **The Game half.** _To be completed with the Challenge Game_: confirming one Proposal creates a groupless Friendly game with both Game teams bound to the Teams, and the Challenge stays `confirmed` whatever happens to that Game.

**Considered options**: an open Game with one Team seated and the other side empty (every Game reader, admit door and Notification would have to learn a Game with no date, no Venue and no opponent, and a Game cannot have three Venues or "weekends, evenings"); a Challenge that never expires (the board fills with stale requests); expiry by job only (a late job leaves a stale card actionable) or on read only (nobody is told).

## Consequences

- The `Game` glossary entry gains a second groupless kind beside the Booking Game once the Game half lands; until then nothing about Games changes.
- `notifications` gains `challenge_id` and the `challenge_expired` type; the Web App and the Notification email send it to Challenges › Mine.
- `@repo/domain` gains `challenge-clock`, `challenge-card` and `challenge-form`, read by both client Apps and the API.
- The Mine segment lists the viewer's Teams' open Challenges; Proposals and Challenge Games join it with their doors.
