# Home ongoing Games carousel

Status: ready-for-agent

Tickets (Linear, `ready-for-agent`): [TEM-147](https://linear.app/temba-app/issue/TEM-147/put-the-signed-in-users-live-games-on-the-home-carousel) Put the signed-in User's live Games on the Home carousel → [TEM-148](https://linear.app/temba-app/issue/TEM-148/keep-full-finished-games-on-home-until-the-match-is-completed-and) Keep full finished Games on Home until the Match is completed, and prompt Add results.

## Problem Statement

A signed-in User’s Home carousel is titled **Your next games** and drops a Game as soon as its window ends. If the Match was played at cap but nobody entered Sets and completed it, the card is gone and nobody is prompted to add results. The strip is also capped at four Games and is fed by the Games hub **My Groups** filter, so it shows Group Games the User never joined and hides public Games they did join.

## Solution

Keep one scrollable hero carousel at the top of Home. It lists Games the User has Game admit on or organizes: not yet started, currently in the window, and — after the window — every Game that is still at cap with a Match that is not completed. Cancelled Games leave. Completing the Match removes the card. The primary action for a finished Game that still needs results is **Add results**, which opens Game home on the Results tab. Scoring permissions and Set entry stay as they are. Games hub lists do not change.

Approving this spec approves the Test seams in Testing Decisions.

## User Stories

1. As a signed-in User on Home, I want a carousel at the top of the page for my Games, so that play and missing results sit above level and stats.

2. As a User registered on a Friendly game whose window has not started, I want that Game on the carousel, so that I still see what is next.

3. As a User registered on a Friendly game whose window has started and has not ended, I want that Game on the carousel, so that a Game in progress stays on Home.

4. As an Organizer of a Game I did not sit on, I want that Game on the carousel while it is live, so that I can open it from Home.

5. As a User only on the Waitlist, I want that Game absent from this carousel, so that I am not treated as if I played.

6. As a Group member who did not Game admit, I want that Group’s Game absent from this carousel, so that Home is my schedule, not Group discovery.

7. As a User who Game-admitted on a public pickup Game, I want it on this carousel, so that public play is not missing from Home.

8. As a User viewing Home when I have no matching Games, I want the carousel section hidden, so that I do not see an empty strip.

9. As a User with more than four matching Games, I want every matching Game in the carousel, so that a fifth unfinished Game is not dropped.

10. As a User, I want the section titled **Your games**, so that the strip is not labelled as upcoming-only.

11. As a User on a live carousel card, I want **View game details** to open Game home, so that the hero stays a navigation card.

12. As a User registered on a Friendly game that reached cap, whose window has ended, and whose Match is not completed, I want that Game to stay on the carousel, so that I can still add results.

13. As an Organizer of that same Game, I want it to stay on the carousel, so that I can complete results even if I did not play.

14. As a User on a finished Game that never reached cap, I want it absent from the carousel, so that under-cap Games are not scoring prompts.

15. As a User on a finished at-cap Game whose Match is completed, I want the card gone, so that scored Games leave Home.

16. As a User who saved Set games-won but has not completed the Match, I want the card to remain, so that I am still prompted to finish results.

17. As a User on a cancelled Game, I want the card gone, so that cancel is the way a Game leaves without results.

18. As an Organizer who cancels the Friendly Match (which cancels the Game), I want the card gone.

19. As a User, I want no Delete Game control, so that cancel remains the product verb.

20. As a User, I want no dismiss-without-cancel on the card, so that unscored full Games stay until results or cancel.

21. As a User who may score a needs-results Game, I want the primary action **Add results**, so that Home prompts the Results flow.

22. As that User, I want **Add results** to open Game home on the Results tab, so that I land on Sets and Complete Match.

23. As a User who can see a needs-results card but cannot score yet, I want **View game details**, so that Home does not offer a scoring door the server would refuse.

24. As a User not on the Match’s Game teams and not an Organizer, I want no **Add results**, so that scoring permission does not widen.

25. As a User after Complete Match, I want the card gone on the next Home load without a new cache path, so that existing home invalidation is enough.

26. As a User, I want Home level and overall stats to keep using completed Matches and ratings as they do today, so that this strip does not recompute standings.

27. As a User on a Soft-archived Club Group Game I registered for or organize, I want the card to follow the same live and needs-results rules, so that archive does not hide scoring.

28. As a User on an Americano that is still live, I want it on the carousel if I qualify, so that existing rows stay visible.

29. As a User on an Americano whose window has ended, I want it absent, so that Home does not prompt Sets Americano does not have.

30. As a User on a Friendly tournament that finished at cap with a Match still not completed, I want it kept until every remaining Match is completed.

31. As a User with several cards, I want needs-results first (oldest window first), then ongoing, then upcoming (soonest start), so that missing results are not buried.

32. As a User, I want this change to leave Games hub **My Groups** and **Public**, and Group home upcoming/history, unchanged.

33. As a developer, I want Home to use a dedicated carousel list, not a change to `isGameLive`, so that Group history does not swallow unscored finished Games.

## Assumptions / Decisions

- **Ongoing** means the clock is inside the Game window. It is not a stored Game or Match status.
- **Finished** means the window has ended (or, if there is no window, there is no live Match under today’s live-Match rule).
- **Results recorded** means every non-cancelled Match is **completed**. Partial Sets without Complete Match are not enough to drop the card. Rated Match is a side effect, not the drop rule.
- **Full** for finished-Game retention means occupancy at cap **at query time**, not registration status `full` (that becomes `closed` after the window). Individual: `registeredUserCount >= playersAllowed` (Friendly default 4). Team-only: `registeredTeamCount >= teamsAllowed` (default 2). Waitlist does not count.
- Finished Games that never reached cap are not retained.
- Ongoing Games under cap still appear (View). Full is only the finished-retention gate.
- Audience is **Game admit** or **Organizer**. Waitlisted-only and unjoined Group members are out. Public Games the User joined are in.
- One carousel, reuse the existing hero strip, no 4-item cap, hide when empty, title **Your games**.
- **Add results** routes to Game home Results. No inline scoring. No new permission. CTA only when the viewer could score today (`canScoreSets` / `assertMayWriteSets`).
- Cancel removes the card. There is no User-facing Game delete and no personal dismiss.
- Americano is not retained after the window. Friendly tournament uses the same completed-Match rule.
- Do not change `isGameLive`, hub lists, or Group history.
- No schema migration. No TTL on unscored cards.
- Occupancy is at query time, not “ever was full.” A leave after the window that drops below cap can clear the prompt for everyone.

## Implementation Decisions

- Surface: existing Home hero carousel. Grow the item type with phase (`upcoming` | `ongoing` | `needs_results`) and `canAddResults`. Do not add a second carousel or a second Game card component.
- Home query: dedicated helper used only by Home. Do not reuse the Games hub **My Groups** list as the filter. Query non-cancelled Games the viewer organizes or has Game admit on. Apply live vs needs-results in one sort.
- Live: existing live window/Match rule for upcoming and ongoing. Split upcoming vs ongoing by `now` vs window start (fallback: list start time).
- Needs-results: not live, not cancelled, occupancy at cap, format has Matches that can be scored (not Americano), at least one non-cancelled Match not completed.
- At cap: same counts as today’s full branch, ignoring window/closed/Soft-archive join freeze.
- Organizer: existing organizer set (groupless creator; Loose Group creator; Club Group creator plus Community Owner and Admin).
- Payload: replace Home’s upcoming-Games list with a carousel list. Home page is the only App caller of that payload.
- UI copy: section **Your games**. Needs-results + canAddResults → **Add results**. Otherwise **View game details**. No See all on this section.
- Game home: honor `?tab=results` (and default Overview otherwise). Do not change Set save or Complete Match.
- Cache: completing or scoring already invalidates Home from Game home; keep that. Do not add Home-local scoring mutations.
- Schema: none.
- Hub, public pickup, Group home, `isGameLive`: unchanged.

## Testing Decisions

- Test external behavior: which Games appear, in which order, with which CTA, and that hub/history filters do not change. Do not assert CSS.
- Seams:
  1. Audience: registered in, waitlisted-only out, unjoined Group member out, public joined in, Organizer in, cancelled out.
  2. Time: before window = upcoming; during = ongoing; after + at cap + uncompleted = needs-results; after + under cap = out; after + completed = out.
  3. Americano after window = out; Friendly tournament incomplete Match = in.
  4. Add results only when scoring would be allowed; `?tab=results` opens Results.
  5. Hub list / live-Game helper / Group history still treat post-window unscored Games as not live.
- Prior art: existing Home upcoming list tests, hub list-row tests, and Game home Results mutations.

## Out of Scope

- Games hub tabs and cards
- Group home Games lists
- Push or email reminders
- Inline Set entry on Home
- New scoring permission
- User-facing Game delete or card dismiss
- Changing `isGameLive` or Group history
- Americano Sets
- Occupancy history / TTL
- Join / waitlist / price on the hero
- Home stats or rating formula changes

## Further Notes

- Domain: Game, Match, Set, Organizer, Game admit, Waitlist, cancel, Friendly game, Friendly tournament, Americano, Soft-archive. Avoid delete for Game, event for Game, score as an entity.
- Glossary gap: ongoing / finished / needs results are Home phases, not CONTEXT nouns. `full` after the window is occupancy at cap, not registration status `full`.
- ADR-0008 unchanged. No new ADR (reversible list filter, not a surprising domain split).
- Ticket 01 alone would narrow Home (drops unjoined Group Games, adds public joined) before the scoring prompt. Do not ship 01 to production without 02.
- Unbounded list of old unscored full Games is accepted (no TTL; the request was to keep all of them).
- Many carousel dots if many unscored Games.

## Implementation tickets

Published to Linear. Frontier is [TEM-147](https://linear.app/temba-app/issue/TEM-147/put-the-signed-in-users-live-games-on-the-home-carousel). Do not ship TEM-147 to production without TEM-148.

1. [TEM-147](https://linear.app/temba-app/issue/TEM-147/put-the-signed-in-users-live-games-on-the-home-carousel) Put the signed-in User's live Games on the Home carousel — unblocked.
2. [TEM-148](https://linear.app/temba-app/issue/TEM-148/keep-full-finished-games-on-home-until-the-match-is-completed-and) Keep full finished Games on Home until the Match is completed, and prompt Add results — blocked by TEM-147.
