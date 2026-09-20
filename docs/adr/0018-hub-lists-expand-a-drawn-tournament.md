# Hub lists expand a drawn tournament into per-Match rows

`.scratch/games-matches/decisions.md` item 15 says flatly that Home, pickup and Group home list
**Games, not Matches**, and `listMyGamesHubRows` implements exactly that — one row per `games` row.
**A drawn Friendly tournament is the exception: it contributes one hub row per Pool Match the viewer
sits on.** Before the Pool draw it stays a single row for the Game.

The rule was right for the formats that existed when it was written. A Friendly game is one Match, so
Game and Match are the same card; an Americano is a pool with no fixed sides worth listing. A
Friendly tournament breaks the assumption underneath the rule, which is that a Game happens at a
time. A twelve-team tournament runs three Rounds that can be weeks apart — the design's own example
is Thu 25 Sep, Thu 2 Oct, Sat 11 Oct — so the Game has no single time to sort by, and the card would
have to answer "when do I play" with a date range. Under the strict reading, a player with a Pool
Match at 7:30 tonight would not see it in Today beside their other games. The design says this
plainly in screen 02, which shows a per-Round card reading "Autumn Friendly, R2 of 3" with the two
teams and a View game action, sitting in the same list as ordinary Friendly games.

The expansion is **scoped to the lists that are about the viewer**: My Games and the Home carousel.
Group home and public pickup keep listing the tournament itself, because someone browsing pickup is
shopping for open seats, not reading strangers' fixtures — and after the draw a tournament has no
open seats, so it leaves those lists on its own without a special rule.

The alternative was to keep one row per Game and put the schedule on the tournament card — "R2 of 3,
next Thu 7:30" — with the Match reachable one tap deeper. That preserves the rule and was rejected
because it makes the Games list lie by omission on exactly the evening it matters most: the list's
job is to answer "what am I playing", and a card that says a tournament is ongoing does not answer
it. Recording the exception is better than quietly bending item 15, since that decision is stated
without qualification and a future reader finding this expansion in `hub-list` would reasonably
assume it was a mistake.
