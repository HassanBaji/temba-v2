Status: implemented on the API and the Web App. The Mobile App is not built (see Not built).

Design: `.scratch/design-import/live-board-tv.html` ("Live board, TV").
Decisions: [ADR-0102](../../docs/adr/0102-a-live-board-is-a-web-page-a-tv-opens-with-a-board-code.md).

## Problem

On the day of a Social the room asks the Organizer the same three things: what is the score on the
other courts, where do we stand, and which court am I on next. The answers are in Temba, on phones.
Venues have a TV on the wall and nothing to put on it.

## What ships

### Show on TV, for the Organizer

- **Where.** The ⋮ menu of a Game the viewer organizes gets _Show on TV_: a padel Friendly game, a
  football Game, and a Social whose shape is Groups only, Rounds or Americano. Not on a cancelled
  Game, and not once the Game's window is six hours gone.
- **The sheet.** Opening it starts the Game's Live board and shows its **Board code**, six digits,
  with the address to type on the TV (`<web origin>/tv`). Under it: Rotate screens (Socials only),
  QR to follow, and Colour scheme (Dark, the default, or Light). _Copy board link_ copies
  `<web origin>/tv/<code>`; _Open the board on this device_ opens it in a new tab.
- **On TV now.** While a board is on, the Game screen carries a card under its header, for the
  Organizer only: the TV's name (or how many TVs), what it shows, and _Control_. What it shows is
  what the room sees: the screen on show and whether it is rotating or held; on a Social that is
  waiting for its first Round, that it is waiting; once the Social is over, the winners and the
  final table; on a one-Match board, the scoreboard. With no TV connected yet it reads "Live board
  is on" with the code.

### Share, on every Game screen of the Web App

The design puts Share in the header beside ⋮. The friendly game, the Social before its draw and
a finished Social already had it; the screens that did not now do:

- **A Social on the day** (Groups only, Rounds, Americano, King of the court and the Knockout
  screens, once drawn and until finished): Share beside ⋮ for everyone who can open the Game. It
  shares the invite link when the viewer can mint one and registration is still open, otherwise
  the Game page. The Share row the ⋮ menu carried for Organizers is gone, since the header has it.
  A finished Social keeps its "Share your day" result share.
- **A football Game** that is not cancelled: Share beside ⋮, sharing the Game page, as a
  Challenge Game's already did.

### The board control (`/dashboard/games/<id>/board`)

One scroll, no menus. Every change reaches every TV within about five seconds, and the page says
"within a few seconds" rather than the design's "straight away".

- **On the TV now**: a small picture of the board, what it shows and what comes next, read the
  same way as the On TV card: waiting, the screen on show, or the final table.
- **Screens** (Socials): tap On court, Standings or Next up to hold the board on it. Next up is
  greyed while no next Round is posted, since the TVs leave it out of the rotation then. Once the
  Social is over, Screens and Rotation are hidden: the board stays on the final table.
- **Rotation** (Socials): a switch, and 5, 10 or 20 seconds per screen (10 by default). Switching
  it off holds the screen on show. Switching it on, or changing the pace, starts again from On court.
- **Message to the room**: one line, up to 80 characters. _Edit_ saves it without showing it (the
  design's "Not showing" state); _Show on the board_ puts it across the bottom of the board until
  it is taken down.
- **Display**: Colour scheme and QR to follow.
- **TVs**: each connected screen by name with _Disconnect_, and the address and code to add another.
- **Stop the board**: asks first, closes the board on every TV and retires the code. The Game is
  not touched; Show on TV starts a new board with a new code.

### The board on a TV (`/tv`, `/tv/<code>`)

A public web page: no app, no sign-in. `/tv` asks for the code and, optionally, a name for the
screen; `/tv/<code>` opens the board straight away. It is drawn at 1280 by 720 and scaled to fill
the screen, in its own Color scheme whatever the device prefers, and follows the browser's Locale
(English or Arabic, right to left).

- **A Social** rotates the Board screens that have something to show, the bars at the bottom
  showing which is on. Next up drops out while no next Round is posted, so the rotation, the bars
  and the control agree:
  - **On court**: every Match of the Round on court with its score as saved (hatched boxes until
    one is saved), the table at the side, the next Round along the bottom.
  - **Standings**: the full table (played, won, drawn, lost, games, difference, points, and a mark
    per Round), the courts at the side.
  - **Next up**: who plays whom on which court next, each side with its place and points, and the
    Round after that along the bottom.
  - The header shows the Round of how many, one bar per Round, and the time left in the Round,
    worked out from the Round's start and the Match length.
  - The table counts finished Rounds only and says which Round it is after: a score saved on one
    court does not move it until every Match of that Round is settled, and a Round still open
    holds back every Round after it, so "after round N" counts Rounds 1 to N.
  - Before a Round is posted the board waits and says when the Social starts. When every Round is
    settled, a Match that did not finish included, it stops on the winners and the final table,
    and the QR reads "Results in Temba".
  - An Americano uses the same screens with players in the table, ranked on games won.
  - More than four courts, more than eight rows or more than one group: a Round of five or six
    courts takes three columns; a longer Round, a table past twelve rows and each further group turn
    their page once per rotation.
- **A padel Friendly game** shows one scoreboard: both pairs with their Level bands, one tile per
  saved Set (solid for the pair that won it, outlined for the pair that lost it, a heavier outline
  for the Set in play), Sets won, match time, and the court, start and Venue along the bottom.
- **A football Game** shows the Score in the middle, the Scorers with their goals under each side,
  both sides listed with their roles, minutes played, and the pitch, kick-off, Side size and MVP
  along the bottom. Until the Organizer publishes the sides it waits.
- A stopped, closed or disconnected board sends the TV back to `/tv` with the reason.

## Rules

- One running board per Game. A second Organizer who taps Show on TV gets the board already on.
- Who may start, control and stop it: the Game's Organizers (`isGameOrganizer`), as for Payment
  tracking. The design says "organizers and admins"; on a Group Game the Organizers are the Group
  creator and its Appointed Organizers, who are also every Group approver, so the admins are
  already in. Operators are not.
- The board is view only. Scores are entered where they are today.
- A board closes on its own when its Game is cancelled, and six hours after the Game's window ends.
- A TV is listed while it keeps asking for the board. One that is quiet for 45 seconds loses its
  token, so no TV the Organizer cannot see can read the board; when it comes back it joins again
  with the code, without anyone doing anything. At most eight are connected at once.
- If two Organizers change a setting, the last change wins.

## API (additive)

New router `liveBoards`:

| Door           | Who       | What                                                                                                                       |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `forGame`      | signed in | The Game's board for its Organizer: kind, whether it can start, the running board, what its TVs show and the TVs connected |
| `start`        | Organizer | Starts the board and mints the code; returns the running one if on                                                         |
| `update`       | Organizer | Rotate, seconds, held screen, colour scheme, QR                                                                            |
| `setMessage`   | Organizer | Save the message, show it, take it down                                                                                    |
| `disconnectTv` | Organizer | Take one TV off the board                                                                                                  |
| `stop`         | Organizer | Close the board and retire the code                                                                                        |
| `connect`      | public    | A TV joins with the code and gets a token                                                                                  |
| `snapshot`     | public    | What one TV draws, by its token                                                                                            |

`liveBoards.connect` is counted with the public code lookups (30 a minute per IP). Schema:
`live_boards` and `live_board_tvs` (migration `0132_live_boards`). Shared rules:
`@repo/domain/live-board`. Copy: `liveBoard` in `@repo/i18n`, English and Arabic.

## Where it differs from the design

- **Scorer minutes** ("6, 21 min") are not stored; the board lists each Scorer with their goals.
- **Captain marks** on football squads are left out: a football side has no captain outside a
  Challenge Game.
- **"Best of 3 sets"** is not a Temba rule (a Match may have any number of Sets); that corner of
  the padel board says what the Game counts for instead.
- **Head to head** on the padel strip is replaced by the Venue: head to head exists for Teams, not
  for the ad-hoc pairs of a Friendly game.
- **Level on the padel board** is the band ("C+") without the number.
- **"In play"** is shown for a score that is saved but not yet final (entered, awaiting the other
  side), as the design labels it. A final score reads "Final".
- **The code works until the board closes**, six hours after the Game's window ends, so the final
  table stays up after the last Match.
- **TV names**: the TV may name itself on `/tv`; otherwise it is "TV 1", "TV 2".
- **"On 1 screen"** reads "On 1 TV": on the control, Screens already means the three Board screens.
- **Next up on an Americano** shows no place beside a pair: its pairs last one Match and the table
  ranks players.
- **"Theme"** reads "Colour scheme": the glossary keeps "theme" out of the product's language.
- **"Shows on the TV straight away"** reads "within a few seconds": TVs and the control ask every
  five seconds.
- **"The same code adds another TV"** holds up to eight TVs a board. Eight TVs asking every five
  seconds stay inside one venue address's signed-out request limit.
- **The QR opens the Game page**, which asks for a Temba account and, on a private Game, shows a
  member the Game and anyone else the join notice. The design's "lets the room open the
  tournament on a phone" holds for the players, who are members; a spectator without an account
  sees the sign-in. A public read-only page is not built (open question 2).

## Beyond the design

Added while building, each for a case the design does not draw:

- **A TV token that goes quiet for 45 seconds expires**, so every token that can read a board is on
  the Organizer's list; the TV joins again by itself.
- **The TV keeps its screen awake** (the Wake Lock API, where the browser has it) and says
  "Reconnecting" when it has heard nothing for 15 seconds, so a frozen score is not taken for a
  live one.
- **Before the first Round** the board shows a "Soon" tag, a countdown "to round 1" in place of
  "left in the round", and a waiting panel with the start time.
- **A dev preview** at `/dashboard/design/live-board` (development only, like the other design
  previews) draws every board state from the design's own sample data, the board beside its
  control, and the control and card in the waiting, partial and final states.

## Not built

- **The Mobile App**: Show on TV, the On TV card and the board control. The API is ready for it.
  The mobile Social screen has no header menu today, so the entry needs a design decision first.
- **Knockout stages and King of the court.** Groups then knockout, Knockout only and King of the
  court have no board; Show on TV is not offered there.
- **Casting** from the phone (the design leaves it out too).
- **Push instead of polling.** TVs and the control poll every five seconds (ADR-0022 polls too).
- **A board per court**, or a venue-wide board across Games.

## Open questions for the owner

0. Before launch, check how many proxy hops the API trusts (`TRUST_PROXY_HOPS`). TVs reach the API
   through the Web App's rewrite; if every TV arrives from one address, they share one request
   limit. This is the first signed-out page with steady traffic.
1. Is `<web origin>/tv` the address to print, or should `temba.app/tv` be a shorter host?
2. Should the room's QR open the Game page (members only on a private Game), as built, or a public
   read-only results page?
3. Is the web board control enough for Organizers on the day, or does the Mobile App need Show on
   TV and the control before launch? The design draws them as phone screens.
