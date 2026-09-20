Status: ready-for-agent

Decisions: `.scratch/friendly-tournaments/decisions.md`
ADRs: `docs/adr/0017-friendly-tournament-is-a-pool-round-robin.md`,
`docs/adr/0018-hub-lists-expand-a-drawn-tournament.md`
Design: claude.ai design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`,
file `Friendly tournaments flow.dc.html`

Tickets (Linear, `ready-for-agent`), in dependency order:

| # | Ticket | Blocked by |
|---|--------|-----------|
| 1 | TEM-239 Create a Friendly tournament with Pools and Rounds | — |
| 2 | TEM-240 Take a seat on a Friendly tournament | TEM-239 |
| 3 | TEM-241 Merge two Half teams into one Game team | TEM-240 |
| 4 | TEM-242 Draft the Pool draw and re-roll it | TEM-240 |
| 5 | TEM-243 Post the Pool draw: generate the Rounds and freeze the seats | TEM-242 |
| 6 | TEM-244 Play a Round: Pool Matches in the Games list and in Match history | TEM-243 |
| 7 | TEM-245 The Pool table | TEM-243 |
| 8 | TEM-246 Withdrawal and cancelling after the Pool draw | TEM-245 |

TEM-241 and TEM-242 may run in parallel; so may TEM-244 and TEM-245.

## Problem Statement

A Group can only run one-off Friendly games. Every Friendly game is a single Match between two
sides, created and played in an evening, and that is the whole product. A Group that wants to run
something over a season — twelve pairs, everyone plays everyone in their part of the draw, a table
at the end — has no way to do it in Temba. They run it in a spreadsheet and a chat thread, then
enter nothing, so none of it counts toward anyone's Level.

The App has a `friendly_tournament` format already, but it is not this. It is a flat set of sides
where the Organizer hand-adds every Match, it has no Rounds, no Pools and no table, and the App
hides it completely: create has no format chooser at all. Nobody has ever made one from the product.

For the Organizer the missing thing is the draw: deciding who plays whom, fairly, without being
accused of arranging it. For the player the missing thing is a seat — a way to say "I am in, with
Sofia, for all three Rounds" — and then a table that tells them where they stand.

## Solution

A **Friendly tournament** becomes a Game whose **Game teams** are drawn at random into **Pools**,
each Pool playing a full round robin across several **Rounds**.

An Organizer creates one from a Group through its own create door, separate from Friendly game
create. They choose how many Game teams, how many Pools, whether it runs in one day or over a few
weeks, and on which Courts. The form shows what that produces — the Pool sizes, how many Matches
each Game team plays, how many Rounds, and whether the day actually fits — before anything is saved.

Users take seats the way they already do on an individual Friendly game: sit with someone who has a
seat open, or start a Game team on your own and let someone take the other Position. A Game team with
one Position taken is a **Half team**. When seats do not fill neatly, the Organizer merges two Half
teams into one Game team, choosing who plays left and who plays right.

When the Game teams are complete, the Organizer draws the Pools. The draw is random, generated on the
server, and lands first as a draft the Organizer can re-roll as often as they like. Posting it
generates every Pool Match at once — Pool, Round, date and Court already assigned — closes
registration and freezes the seats.

From there nothing is new. A Pool Match is an ordinary Match: two Game teams, Sets entered the usual
way, confirmed by the other side, rated by Glicko-2, and it shows up in the Games list on the night
it is played like any other game. What is new is the **Pool table** — each Game team's **Pool
record** of played, won, drawn and lost, ordered — which is how the tournament is read while it runs
and how it ends. Each Pool has a winner. There is no overall champion, because the knockout that
would decide one is a later slice.

## User Stories

### Creating a tournament

1. As an Organizer of a Group, I want a create door for a tournament that is separate from Friendly
   game create, so that the Friendly game form stays as simple as it is today.
2. As an Organizer, I want to name the tournament, so that the Group recognises it in a list.
3. As an Organizer, I want to choose how many Game teams take part, between 4 and 32 in steps of 2,
   so that the size matches the number of people I expect.
4. As an Organizer, I want to choose how many Pools, from one up to a third of the Game team count,
   so that I can trade Matches per Game team against how long the tournament runs.
5. As an Organizer, I want the form to tell me the Pool sizes it will produce before I save, so that
   I know whether the split is even.
6. As an Organizer creating uneven Pools, I want the form to say so plainly, so that I am not
   surprised that some Game teams play one more Match than others.
7. As an Organizer, I want the form to tell me how many Matches each Game team plays and how many
   Rounds there will be, so that I can tell the Group what they are committing to.
8. As an Organizer, I want the form to tell me the total Match count, so that I can judge the size of
   the thing I am creating.
9. As an Organizer, I want to choose whether the tournament runs in one day or over a few weeks, so
   that the same format covers a Saturday event and a season.
10. As an Organizer running it in one day, I want to give a date, a start time and a finish time, so
    that the Matches can be laid out across the day automatically.
11. As an Organizer running it in one day, I want the form to tell me when the last Match would
    finish, so that I know whether the day works.
12. As an Organizer whose day does not fit, I want the form to say that it runs past my finish time
    and suggest adding a Court or taking fewer Game teams, so that I can fix it before saving.
13. As an Organizer whose day does not fit, I still want to be allowed to save, so that the warning
    informs me rather than blocks me.
14. As an Organizer running it over a few weeks, I want to give one date and start time per Round, so
    that each Round lands on the evening the Group actually plays.
15. As an Organizer, I want to record several Courts on the tournament, so that Matches in a Round
    can run at the same time.
16. As an Organizer, I want the tournament to take a Venue at create the way every Game does, so
    that Venue behaviour is not special here.
17. As an Organizer of a Club Group whose Community has a Venue link, I want that Venue used and not
    swappable, so that the existing Venue rule holds.
18. As an Organizer, I want to say whether the seats are for my Group only or for anyone with the
    link, so that I can open the tournament up when I want to.
19. As an Organizer, I want to set a Price per player, so that the Group knows the Court cost.
20. As a User looking at a tournament, I want to see what I will owe in total across my Matches, so
    that the per-Match price means something to me.
21. As a User on a Game team in a smaller Pool, I want my total to reflect the Matches I actually
    play, so that I am not quoted someone else's total.
22. As a Member who is not an Organizer of that Group, I want creating a tournament to be refused,
    so that organizer power does not leak.
23. As an Owner or Admin of a Soft-archived Community, I want creating a new Club Group tournament to
    be refused, so that archived clubs do not start new events.
24. As an Organizer, I want no format picker offering knockout options, so that I am not offered a
    choice the product cannot yet honour.

### Taking a seat

25. As a User, I want to see a tournament in my Games list while seats are open, so that I can join
    it.
26. As a User, I want to see how many seats are taken out of how many, so that I know whether it is
    filling.
27. As a User, I want to see the Round dates before I join, so that I know whether I can commit to
    all of them.
28. As a User, I want to take a seat beside someone who already has one, so that I can pick who I
    play with.
29. As a User picking a seat, I want to see who has a Position open and what their Level band is, so
    that I can choose a partner sensibly.
30. As a User, I want to start a Game team on my own, so that I can enter without arranging a partner
    first.
31. As a User taking the second Position on a Game team, I want the remaining Position chosen for me,
    so that I am not asked a question with one answer.
32. As a User, I want my Preferred Position used as the default when both Positions are open, so that
    I usually do not have to think about it.
33. As a User, I want my Preferred Position to be a default and not a restriction, so that I can take
    the other Position when that is what is free.
34. As a User, I want to register with a partner and take both Positions at once, so that a pair can
    enter in one action the way they already can on a Friendly game.
35. As a User, I want to leave my seat before the Pool draw, so that I can change my mind.
36. As a User leaving a seat, I want only my Position freed and my partner's kept, so that leaving
    does not eject someone else.
37. As a User, I want to move to a different vacant Position before the draw, so that I can switch
    Game teams if plans change.
38. As a User arriving after the seats are full, I want to go on the Waitlist, so that I get in if
    someone leaves.
39. As a waitlisted User, I want to be admitted automatically when a seat frees up before the draw,
    so that I do not have to watch the page.
40. As an Organizer, I want to send a Lookup invite to Users for the tournament, so that I can fill
    seats from people I know.
41. As a User, I want to open a tournament Invite link and take a seat, so that the link works like
    it does on any Game.
42. As an Organizer, I want the Game Level range to apply to the tournament, so that the seats match
    the standard I set.
43. As a User outside the Level range, I want to request a waiver, so that the existing door still
    works here.
44. As an Organizer, I want a complete Team to be able to register on a team-only tournament, so that
    persistent partnerships can enter as themselves.

### Half teams and merging

45. As an Organizer, I want to see which Game teams have a Position still open, so that I know what
    is blocking the draw.
46. As an Organizer with two Half teams, I want to be told that putting them together completes the
    field, so that I know the fix.
47. As an Organizer, I want to merge two Half teams into one Game team, so that two people who each
    entered alone can play.
48. As an Organizer merging two Half teams who both sit on the same Position, I want to choose which
    of them moves, so that the merge is possible at all.
49. As an Organizer merging, I want to swap which of the two plays left before I confirm, so that I
    can respect what they prefer.
50. As an Organizer, I want a merge that would leave both Users on the same Position to be refused,
    so that I cannot create a Game team that cannot play.
51. As a User who was merged with someone, I want to see my new partner on the tournament when I next
    open it, so that I find out without being told.
52. As a User who was merged and does not want to be, I want to leave my seat up until the Pool draw,
    so that I am never trapped in a Game team I did not choose.
53. As an Organizer, I want merging to take effect immediately without waiting for either User to
    accept, so that I can close the field on the night.

### The Pool draw

54. As an Organizer, I want to draw the Pools once the Game teams are complete, so that the
    tournament can start.
55. As an Organizer, I want the draw generated on the server at random, so that nobody can accuse me
    of arranging it.
56. As an Organizer, I want to see the draw as a draft before it is real, so that I can look at it
    first.
57. As an Organizer, I want to see which Game teams landed in which Pool, with each Pool's date and
    Courts, so that I can sanity-check it.
58. As an Organizer, I want to draw again and get a different random result, so that I can re-roll if
    the first one looks lopsided.
59. As an Organizer, I want a draft draw to create no Matches, so that re-rolling does not leave
    debris behind.
60. As an Organizer, I want to post the draw, so that every Pool Match is created at once and the
    Group can see them.
61. As an Organizer, I want posting to create every Pool Match with its Pool, Round, date and Court
    already set, so that I do not schedule anything by hand.
62. As an Organizer, I want posting to close registration, so that there is one answer to whether
    someone can still join.
63. As an Organizer, I want the draw refused while any Half team exists, so that no Game team is
    drawn with a missing player.
64. As an Organizer whose seats will not fill, I want to draw early with the complete Game teams I
    have, down to a minimum of four, so that a short field does not kill the tournament.
65. As an Organizer drawing early, I want the Pools rebalanced to the real number of Game teams, so
    that the split is still even.
66. As an Organizer who has just posted and spotted a problem, I want to undo the draw, so that I can
    fix it and draw again.
67. As an Organizer, I want undo refused once any Pool Match has a Set or is completed, so that
    nobody can erase a result that has already been rated.
68. As a User, I want to see that the draw has not happened yet and that my opponents are not yet
    known, so that I understand why my Rounds are blank.
69. As a User, I want to be told the draw is random, so that I trust the result.

### Once the Pools are drawn

70. As a User, I want my seat to be fixed once the draw is posted, so that Game teams do not change
    underneath a schedule that has been published.
71. As a User, I want leaving my seat to be refused after the draw, with a reason that says the Pools
    are drawn, so that I understand why.
72. As a User, I want moving Position to be refused after the draw, for the same reason.
73. As a User, I want taking a seat to be refused after the draw, so that the field is closed.
74. As a User holding an Invite link, I want accepting it to be refused after the draw, so that the
    link cannot reopen a closed field.
75. As a waitlisted User, I want my Waitlist entry closed when the draw is posted, so that I am not
    left in a queue that can never move.
76. As an Organizer, I want reopening registration to be refused after the draw, so that the freeze
    holds.
77. As an Organizer, I want to still be able to kick a Game team after the draw, so that I have a way
    to handle a withdrawal.

### Playing the Rounds

78. As a User, I want each of my Pool Matches to appear in my Games list on the day it is played, so
    that I see tonight's Match beside my other games.
79. As a User, I want that card to say which Round it is and how many there are, so that I know where
    I am in the tournament.
80. As a User, I want that card to show my Game team and my opponents, so that I know who I am
    playing.
81. As a User, I want to open a Pool Match and enter Sets the usual way, so that scoring is not a new
    thing to learn.
82. As a User on the other Game team, I want to confirm the Match result the usual way, so that
    results stay agreed.
83. As a User, I want a completed Pool Match to move my Level, so that the tournament counts.
84. As a User, I want my Pool Matches in my Match history, so that a season of tournament play is not
    invisible in my own record.
85. As a User, I want a Pool Match to appear in my Home carousel like any other Game, so that Home
    stays the place I look.
86. As an Organizer, I want to change one Pool Match's time or Court after the draw, so that I can
    handle a Court clash without redrawing.
87. As a User, I want a drawn Pool Match recorded as a draw, so that an equal result is not forced
    into a win or a loss.

### The Pool table

88. As a User, I want to see my Pool's table, so that I know where my Game team stands.
89. As a User, I want the table to show played, won, drawn and lost for each Game team, so that the
    numbers add up.
90. As a User, I want the table ordered by wins, so that the leader is at the top.
91. As a User whose Game team is level with another on wins, I want the head-to-head result between
    us to separate us, so that the order has a reason.
92. As a User still level after head to head, I want Set difference and then games difference to
    decide, so that the order is always determined.
93. As a User, I want a Game team that has played nothing to sit at the bottom with a dash rather
    than a zero, so that not having played is distinguishable from having lost.
94. As a User, I want to see the other Pools' tables too, so that I can follow the whole tournament.
95. As a User, I want to see my own Round-by-Round results with scores, so that I can read my run
    back.
96. As a User, I want to see the results of the other Matches in my Pool, so that I can work out what
    I need.
97. As a User, I want a cancelled Pool Match to count as not played, so that it does not distort the
    table.
98. As a User, I want each Pool's winner marked when every Match in it is done, so that the
    tournament has an ending.
99. As a User, I want the tournament to be finished when every Pool Match is completed or cancelled,
    so that it stops being live.
100. As a User, I want the product not to claim an overall winner, so that I am not shown a champion
     decided between Game teams who never played each other.

### Withdrawal, cancelling and legacy

101. As an Organizer, I want a withdrawing Game team's unplayed Pool Matches cancelled, so that the
     schedule reflects reality.
102. As a User who already played that Game team, I want my completed Match against them to stand
     with its rating, so that a result I earned is not taken away.
103. As a User, I want no Game team awarded a win for a Match nobody played, so that the table only
     reflects play.
104. As an Organizer, I want to cancel the whole tournament, so that I can call off an event.
105. As an Organizer cancelling, I want pending Pool Matches cancelled and completed ones left rated,
     so that cancelling is not a rewrite of history.
106. As an Organizer, I want to cancel a single Pool Match, so that one Match falling through does
     not need a redraw.
107. As a User who can see an old hand-built Friendly tournament, I want to still open it and read
     it, so that redefining the format does not hide history.
108. As an operator, I want no conversion, backfill or deletion of existing Friendly tournament rows,
     so that this change is not a data migration.
109. As a User opening an old Friendly tournament, I want no Pool table, Pool draw or Round strip on
     it, so that the App does not imply structure that row does not have.

### Honesty about what is not there

110. As a User who has been merged into a Game team, I want the product not to tell me a message was
     sent, so that the UI does not promise something that did not happen.
111. As a waitlisted User whose entry was closed at the draw, I want that visible when I open the
     tournament, so that I can find out by looking.
112. As an Organizer, I want the create copy to describe Pool winners rather than a final, so that I
     do not promise the Group a knockout that will not happen.

## Implementation Decisions

### Format and glossary

- `friendly_tournament` is **redefined**, not replaced. No new `game_format` enum value. Recorded in
  ADR-0017 and superseding item 13 of `.scratch/games-matches/decisions.md`.
- Vocabulary is fixed in CONTEXT.md and must be used throughout code and copy: **Pool** (never
  "group" — Group is a set of people), **Pool table** (never "standings" — Standing is a User's
  position among a Group's members), **Pool record**, **Pool draw** (never bare "draw" — a draw is a
  tied Match result), **Round**, **Half team**.

### Schema

Four nullable columns, no new tables:

- `games.pool_count` — number of Pools. Its presence is what marks a Game as a Pool-based tournament;
  every new surface gates on it being non-null, which is what leaves legacy rows untouched.
- `games.draw_posted_at` — stamped when the Pool draw is posted. The freeze flag.
- `game_teams.pool_index` — which Pool this Game team is in, 1-based. Null until drawn.
- `matches.round_number` — which Round this Match belongs to, 1-based. Null on non-tournament Games.

A Match's Pool is **derived** from its two slot Game teams, not stored. A **draft Pool draw is
`pool_index` set with no Matches**; re-rolling overwrites `pool_index`; posting inserts Matches and
stamps `draw_posted_at`. There is deliberately no draft table.

Round dates for the multi-week shape are not stored on the Game — they are expressed as the
`start_time` already on each generated Match, which is also what the one-day shape produces. One
representation, both shapes.

### Sizing math — one shared pure module

The arithmetic below is pinned by the design's own embedded script and must be implemented once, in
a shared pure module imported by **both** the create form and create validation. Two
implementations would drift and the form would promise a tournament create rejects.

```
teams T            4..32, step 2
pools G            1..max(1, floor(T / 3))
pool sizes         base = floor(T / G); the first (T mod G) Pools get base + 1
pool matches       sum over pools of k*(k-1)/2
matches per team   k - 1 for a team in a Pool of k
rounds             max pool size - 1 when that size is even; max pool size when odd (byes)
players            T * 2
one-day fit        slots = ceil(poolMatches / courts), each slot 45 minutes from the start time
```

The one-day fit is a **warning, not a validation failure**: an Organizer may save a tournament that
runs past its stated finish time.

### Create

- A **new endpoint** for tournament create rather than more branches on the existing one. The
  existing Friendly game create keeps its shape and its lock from `friendly-only-ui`; this is a
  second door beside it, not a reversal.
- The App gets a separate create route. No format picker anywhere.
- Both registration modes are accepted. The Pool draw takes complete Game teams and does not care
  whether one came from seat join, Partner registration or a complete Team, so `team_only` works
  unchanged and simply never shows the Half team or merge flow.
- Venue, Court, Group, Price per player, Level range, public flag and the Soft-archive refusal all
  reuse the existing create rules with no change.

### The Pool draw

- Generated **server-side**. The client never proposes an assignment. This is the fairness claim the
  product makes on screen and is recorded in ADR-0017.
- The draw takes an **injectable shuffle**, defaulting to a crypto-backed one. This is the single new
  test seam.
- Draft: assign complete Game teams to Pools by balanced size, write `pool_index`, create nothing
  else. Re-roll overwrites.
- Refused while any Half team exists. Allowed early with at least 4 complete Game teams, Pools
  rebalanced to the real count.
- Post, in one transaction: generate the round-robin pairings (circle method, byes for odd Pools),
  insert every Pool Match with `round_number`, `start_time`, Court and both slot Game teams; stamp
  `draw_posted_at`; set `registration_closed_at` if unset; close outstanding Waitlist entries.
- Undo: delete every Pool Match and clear `pool_index`. Refused once any Pool Match has a Set or is
  completed.

### The freeze

Once `draw_posted_at` is set, these refuse with a reason naming the Pool draw: self-leave, move
Position, seat register, Partner registration, merge, Invite link accept, Lookup invite accept, and
reopen registration. Organizer kick stays open — it is the withdrawal door. Because the freeze is
checked by more than one endpoint, it belongs in a shared guard module, which is the condition the
repo's one-endpoint-per-file rule sets for extracting anything at all.

### Merge

- Organizer-only, immediate, no consent. Consistent with ADR-0013.
- Takes an explicit Position assignment. Default: the first Half team keeps its Position and the
  other takes the opposite. The Organizer may swap before confirming.
- Refused if it would put both Users on the same Position — `game_team_players` has a unique index on
  Game team and Position, so this must be checked, not left to the database.
- Refused after the Pool draw.

### The Pool table

- Computed from completed Pool Matches and their Sets. Not stored, not denormalised.
- Columns: played, won, drawn, lost. The `D` column exists because this domain has Match draws; the
  design's played/won-only table cannot represent one.
- Order: wins, then head-to-head result between the tied Game teams, then Set difference, then games
  difference, then `pool_index` order as the stable final tiebreak.
- A Game team with no played Matches sorts last and renders a dash, not a zero.
- Cancelled Pool Matches count as not played.
- A Pool has a winner once every Match in it is completed or cancelled. The tournament is finished
  once that is true of every Pool. **No overall winner is computed.**

### Lists

- My Games and the Home carousel **expand** a Game with `draw_posted_at` set into one row per Pool
  Match the viewer sits on. Before the draw it stays one row for the Game. Recorded in ADR-0018,
  amending item 15 of `.scratch/games-matches/decisions.md`.
- Group home and public pickup do **not** expand — they keep listing the tournament.
- The expanded row carries the Round number and total, both Game teams, the Match time and Court.
- `listMyMatchHistory` stops excluding Friendly tournament. A Pool Match is an ordinary rated Match.

### Endpoint placement

Every new endpoint is one procedure per file under the games router, with that door's logic in the
same file, per the repo's one-endpoint-per-file rule. New doors: tournament create, draw Pools,
post Pool draw, undo Pool draw, merge Half teams, and a Pool tables query. Shared modules are added
only where two or more callers genuinely exist — the sizing math (create validation and the create
form), the freeze guard (many endpoints), the schedule generator (post, and its own tests), and the
Pool table computation (its query and Game home). No service, repository or use-case layer.

## Testing Decisions

A good test here asserts **external behaviour** — what a caller can observe through a returned value
or a subsequent read — and never reaches for internal structure. Tests run against a real database
through the existing pglite helper, with no mocks. Assert on refusal reasons and on resulting rows,
not on how a function reached them.

### Seam 1 — existing, reused unchanged

Exported endpoint functions called directly against a pglite database, alongside the exported input
schema for validation-only assertions. This is the established house pattern and the overwhelming
majority of these tests belong here. Prior art: the Game create tests, the admit tests, the hub list
row tests, the Home carousel tests, the Match history tests, and the Match slot tests.

Covered at this seam: create validation and refusals; seat join, leave, move and Partner
registration before the draw; Waitlist promotion and closure; merge including the same-Position
refusal; draft draw, re-roll, early draw and the Half team refusal; post and everything it does in
its transaction; undo and its refusal after a Set; every freeze refusal; withdrawal and cancel;
Pool table contents and ordering through its query; hub expansion before and after the draw; Match
history inclusion; and legacy rows staying inert.

### Seam 2 — the one new seam

The Pool draw takes an injectable shuffle, defaulting to crypto-backed randomness. Tests pass a
deterministic shuffle and assert the **exact** resulting Pools and the exact generated schedule.
Without this the randomness contract in ADR-0017 cannot be pinned and a biased shuffle would pass.

### Pure functions, called directly

The sizing math, the circle-method pairing and the Pool table ordering comparator are deterministic
and are tested as plain exported functions. These are the same functions the create form imports, so
these tests are authoritative for what the form shows. Prior art for a pure comparator under test
already exists in the Standing comparison module.

Worth covering specifically: uneven Pool splits (`base` against `base + 1`); odd Pool sizes producing
a bye Round; the boundaries at 4 and 32 Game teams; one Pool meaning everyone plays everyone; the
maximum Pool count at a third of the Game team count; a fit that runs past the finish time; and every
tiebreak step in the ordering including the head-to-head one.

## Out of Scope

- **The knockout bracket**, and with it the "Knockout only" and "Groups, then knockout" options, the
  qualifier count, winner-of placeholder Matches and any overall champion. Design screen 07c.
- **Manual Round pairing** — the Organizer pairing Game teams themselves as the day goes on. Design
  screen 08c. In a pure round robin the pairings are already forced; this earns its keep with the
  knockout.
- **Walkovers.** A withdrawing Game team's unplayed Matches are cancelled, never awarded. Awarding an
  unplayed win needs a Glicko-2 answer first.
- **Notifications of any kind.** This is a non-goal, not an omission: the product has no delivery
  channel at all. No UI copy may claim a message was sent on merge, posting or Waitlist closure.
- **A second merge door** — design 07d's "Ask them first". The seat staying leaveable until the draw
  is the protection.
- **Seeding.** The draw is random and nobody is seeded.
- **Migrating existing Friendly tournament rows.** No backfill, no conversion, no deletion.
- **Changing Americano** in any way.
- **Level range on the tournament create form.** The Game Level range and Level range requests keep
  working on the row; the new form simply does not surface the field yet.
- **Any sport other than padel.**
- **Re-drawing after play has started**, beyond the undo window before the first Set.

## Further Notes

- The design's amounts read "100 kr". That is placeholder copy from the design canvas; the product's
  currency is BD. Take the numbers, not the currency.
- The design's Games list card reads "3 rounds, then quarters" and its tournament header reads "12
  teams, 3 groups of 4, then quarters". That copy must **not** ship, because the knockout is out of
  scope. Create and Game home copy should describe Pool winners.
- The design's per-player totals assume every Game team plays the same number of Matches. That is
  false whenever Pools are uneven, which is why the total is derived per Game team from its own Pool
  Match count rather than stored on the Game.
- The design's Pool table shows played and won only. `D` was added deliberately — see the Pool table
  decisions above.
- Design screens 07a-2 and 07b show a multi-week group stage while 07c shows a one-day finals day.
  Since the knockout is deferred, the multi-week shape is the one this slice will mostly be used for,
  even though the one-day fit math is the more eye-catching part of the create form.
