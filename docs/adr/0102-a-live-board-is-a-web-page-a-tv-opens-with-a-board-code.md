# A Live board is a web page a TV opens with a Board code

**Status:** accepted. Spec: `.scratch/live-board/spec.md`. Design: "Live board, TV".

Organizers want a board for the room on the day: the scores on every court, the table and who plays
next, on the TV a venue already has. The players and the scores are in Temba; the TV is a browser
nobody is signed in on.

## Decision

- **The board is a page of the Web App** (`/tv`), not an app and not a cast. Any TV browser, or a
  laptop on HDMI, opens it. It is the first page that shows a Game to someone who is not signed in.
- **A Board code opens it.** Show on TV starts a Game's one running Live board and mints six
  digits, unique among running boards. Six digits are typed on a remote; the eight-character invite
  alphabet is not. The code is a watch-only door: it shows names, Level bands and scores, never a
  phone number, and no door behind it writes anything.
- **A TV trades the code for a token of its own** (`liveBoards.connect`), kept in the browser, and
  reads the board with that token (`liveBoards.snapshot`). This is what lets the Organizer see each
  TV by name and disconnect one, and it keeps the enumerable step, guessing a code, to one door that
  the API counts with the other public code lookups (30 a minute per IP). A wrong code, a retired
  one and a closed board all read as "no board".
- **A token lives only while its TV keeps asking.** One that is quiet for 45 seconds has expired
  and its row is gone, so every token that can read the board is on the Organizer's list, and a
  board never holds more rows than TVs: eight at most. A TV that was only asleep joins again with
  the code it was opened with, which nobody sees happen.
- **The API sends content, not pixels, and one shape per kind of Game**: a Social's Rounds, Matches
  and tables; a padel Match's sides and Sets; a football Game's sides, Score and Scorers. It is
  built from the same modules the Game screens read (`computePoolTables`, the Round context, the
  Americano table), so the board's numbers are the app's. One thing differs on purpose: the board's
  table counts finished Rounds only and says which Round it is after, so the room never reads a
  table where some teams have played one Match more. What depends on the clock, the screen on show
  and the time left in a Round, is worked out on the TV in `@repo/domain/live-board`.
- **Rotation needs no channel.** The board stores when its rotation started and how long a screen
  stays. Every TV and the control work out the screen from that moment and the server's clock, sent
  with each snapshot, so they agree without talking to each other. A list too long for one screen
  turns its page on the same count. The rotation runs over the Board screens that have something
  to show (Next up drops out while no next Round is posted); the API sends the control the same
  reading, with whether the Social is waiting or over, so it describes the board the room sees.
- **Polling, every five seconds.** There is no push transport in Temba (ADR-0022 polls too), a
  score is saved a few times a Round, and a TV that drops its connection picks up on the next ask.
  The same ask marks the TV as still there. A TV that has heard nothing for 15 seconds says it is
  reconnecting, so a frozen score is never mistaken for a live one.
- **It closes on its own.** Stopping retires the code at once. Otherwise the board closes when the
  Game is cancelled and six hours after its window ends, read at request time like the Marks window,
  with no Job. The six hours keep the final table up after the last Match.
- **Organizers run it**, the people who can already score and cancel the Game, and on a Group Game
  the same people as its Group approvers, which is what the design's "organizers and admins"
  asks for. If two of them change different settings at once, both keep theirs: a change writes
  only what it changes. Two changes to the same setting: the last wins.
- **Scoped to the shapes with a Round and a table, or one Match.** Groups only, Rounds, Americano,
  a padel Friendly game and a football Game. A Knockout has no table to rotate to and King of the
  court has no Matches, so they have no board yet.
- **The board has its own Color scheme**, Dark by default, set by the Organizer and applied to the
  page whatever the device prefers. It uses the Color roles of ADR-0064 and the Lifted surface of
  ADR-0084: one Lifted card per screen, the rest hairline cards.

**Considered options**: casting from the phone (needs the native App and a cast receiver, and ties
the board to one phone staying awake); a signed-in TV (nobody signs in on a venue's TV, and the
session would outlive the day); putting the Game's invite code on the TV (it is a join door, and it
cannot be retired without breaking the invites already sent); a websocket or server-sent events
(a new transport and its hosting for a board that changes a few times a Round); rendering the board
on the server as an image (no rotation or clock without a refresh, and no right-to-left for free).

## Consequences

- Anyone who has the code can watch a private Game's names and scores until the board closes. The
  code is shown only to Organizers and on the TV itself, and Stop retires it.
- A code can be guessed: a million codes, few running at once, thirty tries a minute per IP. A
  guess lands on a stranger's board, which is view only.
- A TV shows a saved score up to five seconds late, and the round clock is as right as the
  schedule: a Round that starts late still counts down from its posted time.
- Each connected TV is a signed-out caller asking twelve times a minute. Eight TVs behind one
  address make 96, inside the signed-out limit of 120 a minute per IP; two full boards at one venue
  would not fit, and the limit, not the board, is what would have to move.
- TVs reach the API through the Web App's rewrite, so the API must trust the right number of proxy
  hops or every TV everywhere shares one limit. To check before launch.
- The table on the TV can be one Round behind the Standings tab on a phone while a Round is on
  court.
- The Mobile App has no Show on TV yet; its Social screen has no header menu to put it in.
