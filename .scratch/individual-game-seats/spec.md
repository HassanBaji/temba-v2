Status: ready-for-agent

## Problem Statement

On an individual **Friendly game** or **Friendly tournament**, a User cannot join alone or choose where they stand. Join still means lookup a partner; Game home lists **Game teams** as `"name / name"` rows. There is no 2v2 layout, no left/right **Position**, and a solo User does not occupy a side.

Players need to see four seats (two sides × left/right), pick a vacant seat, and sit there without a partner. A second User who takes the other Position on that side becomes the partner.

This amends games-matches Stories 15–16 and Decision 25 (partner required; solo does not occupy a side). It does not replace `.scratch/games-matches/spec.md`.

## Solution

Ship **Position** (left / right) on each Game team and a 2v2 seat display on Game home (Friendly game) and an N×2 seat grid plus per-Match 2v2 (Friendly tournament).

A User on an individual Friendly game or tournament **registers alone** by picking a vacant seat (side + Position). Empty sides are UI placeholders; the first occupant creates the Game team. The Game team may be incomplete (one of two Positions). Register-with-partner remains as a second path that fills **both** Positions on **one fully vacant** side.

Leave/kick frees only that Position. The seated User may move to another vacant Position while registration is open. Full is occupied seats ≥ players allowed. Waitlist FIFO auto-promotes into the vacated Position. Lookup / Invite link accept requires picking a vacant Position.

Americano and team-only stay as shipped. Approving this spec approves the Test seams in Testing Decisions.

## User Stories

1. As a User opening an individual Friendly game, I want to see a 2v2 of four seats (two sides of the net × left and right), so that I can tell which Positions are free.

2. As a User on that Friendly game, I want the two sides to be the one Match’s slot 1 and slot 2, so that picking a seat is picking a side of the net.

3. As a User opening an individual Friendly tournament, I want Game home to show N sides × two Positions (N = players allowed / 2), so that I join the Game, not a single Match.

4. As a viewer of a tournament Match, I want to see a 4-seat 2v2 of the two Game teams in that Match’s slots (including incomplete sides), so that I can see who is playing whom.

5. As a User who can register, I want to pick a vacant Position and join alone, so that I do not need a partner at join time.

6. As a User picking a seat on an empty side, I want that pick to create the Game team on that side, so that the side exists only once someone sits there.

7. As a User picking slot 2 / right on a Friendly game before anyone else has joined, I want that Game team to sit in Match slot 2, so that “right side of the net” is not rewritten by who joined first.

8. As a User picking tournament side *k* / left, I want that Game team to stay side *k* even if lower-index sides are empty, so that the grid does not compact.

9. As a User joining a side that already has one User, I want to take the remaining Position and become that User’s partner, so that we are one Game team without a partner lookup.

10. As a User, I want joining an occupied Position to be refused, so that two people cannot sit in the same seat.

11. As a User, I want a third person on a Game team to be refused, so that a side stays two Positions.

12. As a User, I want to register with a partner onto **one fully vacant** side in one action, so that an already-chosen pair can take a whole side.

13. As the caller of register-with-partner, I want to pick that vacant side and my Position (left or right), so that my partner gets the other Position.

14. As a User, I want register-with-partner to be refused if that side already has anyone, so that we do not displace or add a third User.

15. As a User, I want register-with-partner to be refused when there is no fully vacant side even if the Game is still open, so that I seat-pick solo instead of waiting while seats sit empty.

16. As a User, I want register-with-partner when the Game is **full** to put us both on the Waitlist as two separate FIFO rows, so that overflow still works.

17. As a registered User, I want leave to free **only my** Position, so that my partner stays on that Game team.

18. As the last User on a Game team, I want leave to delete that Game team and clear every Match slot that pointed at it, so that an empty Game team is not a ghost side.

19. As a User after that last-leave, I want the empty side to remain pickable as a placeholder (Friendly game: that Match slot; tournament: side *k*), so that someone else can sit there again.

20. As an organizer, I want kick of a seated User to have the same effects as that User leaving, so that kick stays the organizer tool.

21. As a seated User, I want to move to any vacant Position while the Game is not closed or cancelled, so that I can change side or left/right without leaving the Game.

22. As a seated User, I want move onto an occupied Position to be refused, including swapping left/right with my partner, so that nobody is displaced.

23. As a seated User, I want move not to waitlist and not to change occupied count, so that move is not a join/leave of the Game.

24. As the last User on a side, I want moving to another side to delete my old Game team (and clear its Match slots) and sit me on the destination, so that last-leave still applies.

25. As a User moving onto a side that already has one User, I want to become that partner in the vacant Position.

26. As a User moving onto an empty placeholder, I want that move to create the Game team on that side.

27. As a User on a completed Match, I want move to be refused, so that a finished contest does not reshuffle.

28. As a User when the Game is full, I want move to be refused because there is no vacant Position.

29. As a User, I want only myself to move my seat, so that an organizer cannot drag me onto a Position (they kick instead).

30. As a User arriving when fewer than players-allowed seats are occupied, I want the Game to stay **open**, so that two incomplete Game teams do not lock the other seats.

31. As a User arriving when occupied seats ≥ players allowed, I want to join the Waitlist (or be refused if closed), so that full means four occupied Friendly-game seats, not two Game teams.

32. As the first eligible waitlisted User, I want leave/kick of a seated User to auto-promote me into **that exact vacated Position**, so that FIFO still fills a real seat.

33. As a waitlisted User promoted after last-leave, I want promotion to recreate the Game team on that side/Position if needed.

34. As a User who waitlisted via register-with-partner, I want my row to promote **alone**, so that my former partner may stay in line and I may sit next to a stranger.

35. As a User accepting a Game Lookup invite or Invite link on an individual Friendly game or tournament, I want to **pick a vacant Position**, so that accept occupies a seat like dashboard join.

36. As a User accepting that invite when no Position is vacant, I want to waitlist with no seat, so that I promote later into a vacated Position.

37. As a User accepting when the Game is closed or I fail the join gate, I want accept to be refused without a seat or waitlist row.

38. As an organizer raising tournament players allowed, I want N to grow and new empty placeholders to appear, so that more sides can be filled. The Waitlist is not auto-promoted on raise.

39. As an organizer lowering tournament players allowed, I want lower to stay a multiple of 4, min 4, not below registered User count, **and** refused if the highest occupied side index is greater than new N, so that seated Users on high-index sides are not hidden.

40. As an organizer, I want empty high-index placeholders to disappear when N shrinks, so that unused sides go away.

41. As an organizer or a User on a Match’s Game teams, I want Set shells to remain allowed while slots are empty.

42. As anyone, I want entering or editing games-won and completing a Match to be refused until **both** Match slots have Game teams **and both Game teams are complete** (two Positions), so that 1v2 is not scored.

43. As a User of an Americano, I want registration to stay individual pool-only with no 2v2 seat picker, so that Americano is unchanged until Match generation.

44. As a User of a team-only Game, I want to still register a complete Team into a Game team / Match slot with no per-User left/right and no 4-seat picker.

45. As an organizer of a Friendly game, I want Match slot assignment to stay refused, so that the seats people picked are the two sides.

46. As an organizer of a Friendly tournament, I want to still assign Game teams (including incomplete ones) to Match slots, so that I can schedule before sides are full.

47. As a User of a Soft-archived Club Group Game, I want seat-join, move, register-with-partner, waitlist, and invite accept to behave as closed, so that archive still freezes doors.

48. As a leftover unpaired User already on an individual Friendly game or tournament from Story 16 admit, I want Game home to make me pick a vacant Position before I occupy a side, so that old pool rows do not stay unseated.

49. As a viewer who can open Game home, I want to see occupied seats and names even if I cannot join, so that the diagram is the registration list.

50. As a User of create-Game copy, I want individual mode not to say that a partner is required, so that the join door matches seat-pick.

51. As a User, I want join gates (public, Group membership, groupless invite-only) to stay as shipped, so that seats do not widen a non-public Game.

52. As a developer of later Americano generation, I want this slice not to add Game teams or Positions on an Americano.

## Implementation Decisions

- Schema, migrations, and kit live in the DB Package. App tRPC and dashboard UI stay in the Temba App. No new Package. Follow existing Drizzle style. Clerk remains the only identity provider. ADR-0008 (Game parent / Match contest) stays. Do not invent a third team-like noun. Do not call the 2v2 diagram a **Court**.

- **Position** on the Game team’s Users (left | right), from that side facing the net. Persist on the Game-team–player link. Required for individual ad-hoc Game teams. Unique per Game team (one User per Position). Team-only Game teams have no Positions this slice.

- **Side index** on an individual Game team: integer 1..N that names the placeholder it occupies. Friendly game: 1 and 2 are Match slot 1 and slot 2; setting a Game team’s side index **sets that Match slot** (do **not** rewrite slots by Game team `createdAt`). Tournament: 1..N where N = players allowed / 2; unique live `(gameId, sideIndex)`. Team-only Game teams do not require a side index this slice.

- **Placeholders, not ghost rows.** Do not pre-create empty Game teams. Game home **displays** N sides (Friendly game N=2 from the one Match’s slots; tournament N from players allowed). First join, partner-register, invite accept, move, or waitlist promotion onto an empty side **creates** the Game team with that side index. Last User leave **deletes** the Game team and nulls Match slots that pointed at it; the placeholder remains.

- **Incomplete Game team:** zero or one Position filled is allowed after create-on-join (zero only in the UI; the row exists only with ≥1 User). At most two Users. The second User on the remaining Position is the partner. Leave/kick removes only that User’s Game-player link (and the `game_players` row); do **not** delete the partner’s Game team.

- **`removeGameTeamAndPlayers` today deletes the whole side and both Users.** Replace that on individual Games with per-Position leave. Keep whole-side delete only when the last User leaves (then clear Match slots as today).

- **Stop `assignFriendlyMatchSlots` rewrite-by-createdAt** on individual Friendly games. Slots follow side index. Organizer Friendly-game slot remapping stays refused (already shipped). Tournament organizer assignment of Game teams to Match slots stays.

- **Full / open:** On individual Friendly game / tournament, drop “two Game teams ⇒ full.” Full = occupied Positions (Users on Game teams, plus leftover unseated `game_players` still counting toward cap) ≥ players allowed. Friendly game cap stays 4. Team-only full rule unchanged. Closed / cancelled / Soft-archive unchanged.

- **Seat-pick register:** New or extended mutation: individual Friendly game / tournament only; caller not already on the Game or Waitlist; join gate; Game open; target side index in 1..N; target Position vacant. Creates `game_players` + Game team (if needed) + Position link. If full, waitlist instead (no seat). Americano stays `register` into the pool. Team-only stays `registerTeam`.

- **register-with-partner:** Keep the path. Require a fully vacant side index, caller’s Position, and partner lookup (both pass the join gate). Partner gets the other Position. Creates one complete Game team. Refuse if that side has anyone. Refuse if no fully vacant side exists while the Game is open (error; do not waitlist). If the Game is full, enqueue two separate Waitlist User rows (shipped shape).

- **Move:** Seated User only. Target vacant Position on the same Game, side index in 1..N. Refuse if closed, cancelled, Soft-archive-frozen, or the caller sits on a completed Match. Refuse occupied (no occupant swap). Vacate source (last-on-side deletes that Game team); occupy destination (create Game team if needed). Does not waitlist; occupied count unchanged.

- **Waitlist promotion:** First eligible User row sits in the **exact vacated side index + Position**. Recreate the Game team if last-leave deleted it. Partner-register Waitlist rows stay unbound; each promotes alone. Closed: no new waitlist; existing line still promotes (shipped). Cap raise does not promote (shipped).

- **Invites:** Individual Lookup / Invite link accept on Friendly game / tournament takes a vacant side index + Position (same create-on-join rules). None vacant → waitlist, no seat. Team-only Invite link unchanged. Closed / join-gate still refuse. Accept never inserts Community or Group membership.

- **Leftover Story 16 rows:** Existing unpaired `game_players` on individual Friendly / tournament count toward the cap and must pick a vacant Position on Game home (or via a seat-pick mutation) before they occupy a side. New admit paths must not insert unpaired rows on those formats.

- **Cap lower (individual tournament):** Keep multiple of 4, min 4, not below registered User count, **and** refuse if the highest occupied side index > new N (new N = new players allowed / 2). Empty high-index placeholders disappear. No compacting side indexes.

- **Sets:** Entering or editing games-won and completing a Match require both Match slots filled **and** both slotted Game teams complete (two Positions). Shell Sets with empty slots stay organizer-allowed. Incomplete Game team = scoring frozen (same as empty slot). Organizer may still assign an incomplete Game team to a tournament Match.

- **UI:** Game home 2v2 (Friendly game) / N×2 plus per-Match 2v2 (tournament). Vacant seats are join/move targets. Occupied seats show the User. Register-with-partner: vacant-side + caller Position picker + partner lookup. Invite accept pages: vacant-Position picker. Create-Game individual copy must not say a partner is required. Reuse existing primitives. No visual redesign beyond this seat display. Padel-only lock unchanged.

- **Migration of existing pairs:** Individual Game teams that already have two Users get left/right (stable order, e.g. createdAt) and a side index (Friendly game: current Match slot if set, else createdAt order; tournament: createdAt order 1..count). Do not invent Positions on team-only or Americano.

- **tRPC:** Extend Game get/home payload with sides, Positions, placeholders, and occupancy. Replace or extend register / registerWithPartner / leave / kick / waitlist promote / invite accept / cap edit / Set score+complete guards. Add move-seat. tRPC may still accept football on sport fields; App never sends it.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): on an individual Friendly game and an individual Friendly tournament, an authenticated User can see seats, join alone into a vacant Position, complete a Game team when a second User takes the other Position, register-with-partner onto a fully vacant side, leave/kick one Position, move while open, fill from the Waitlist into the vacated Position, accept an invite by picking a seat, and freeze scoring until both sides are complete — without changing Americano, team-only, or shipped join gates.

If you implement this spec, you implement these seams:

- Friendly game 2v2 is the one Match’s slot 1/2 × left/right; first pick of slot 2 sticks in slot 2
- Tournament Game home N×2; Match shows assigned Game teams; side *k* does not compact
- Solo seat-join creates the Game team; second User on that side is the partner
- Occupied Position and third User refused
- register-with-partner: vacant side + caller Position; refuse half-full side; refuse no-vacant-side while open; waitlist two User rows when full
- Leave/kick one Position; last-leave deletes Game team, clears Match slots, placeholder stays
- Move to vacant Position; no occupant swap; no move when closed/cancelled/completed Match/full; only the seated User
- Full = occupied seats ≥ cap; two incomplete Game teams do not fill a Friendly game
- Waitlist promote into that vacated Position; recreate Game team after last-leave; pair rows promote alone
- Invite accept picks a vacant Position; none → waitlist
- Cap raise adds placeholders, no promote; cap lower refused when highest occupied side index > new N
- Score/complete refused until both slots filled and both Game teams complete; Set shells still allowed
- Americano pool-only; team-only unchanged; Friendly game organizer cannot remap slots
- Soft-archive / closed / join gates unchanged
- Leftover unpaired Story 16 Users must pick a seat
- Create-Game individual copy does not require a partner

Manual check: existing Community, Group, Team, Venue, Americano, team-only, login, Invites, and Soft-archive flows still work. Route `/public` still redirects to login.

### Modules under that seam

DB Package schema/migration for Position and side index; App tRPC register/leave/kick/move/waitlist/invites/caps/Sets; Game home and invite-accept UI — only as they affect the flows above.

### Prior art

`.scratch/games-matches/spec.md` registration, Waitlist FIFO, invite accept, Set freeze. Game home partner-lookup and Americano pool. No automated tests.

## Out of Scope

- Americano sides, Match generation, rotating partners
- Team-only left/right or 4-seat picker
- Organizer placing or swapping Users on seats
- Bound-pair Waitlist for register-with-partner
- Occupant swap / partner left↔right swap
- Pre-created empty Game team rows
- Compacting tournament side indexes
- Scoring 1v2 or completing with an incomplete Game team
- Story 16 unpaired pool as a going-forward join path
- Replacing the games-matches spec
- Payment, football pickers, Game Email invite
- Updating User / Group / Team counters
- CI, test runner, visual redesign beyond the seat display

## Further Notes

Glossary: Root `CONTEXT.md` (Game team may be incomplete; **Position**; Game, Match, Game team, Americano, Friendly game, Friendly tournament, Waitlist). Architecture: ADR-0008. Parent spec: `.scratch/games-matches/spec.md` (Stories 15–16 and Decision 25 amended). Settled grilling: `.scratch/individual-game-seats/decisions.md`.

## Implementation tickets (Linear)

All labelled `ready-for-agent`. Spec: `.scratch/individual-game-seats/spec.md`.

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-76 Friendly game 2v2 + solo seat-join](https://linear.app/temba-app/issue/TEM-76/friendly-game-2v2-solo-seat-join) | — |
| 2 | [TEM-77 Per-position leave + register-with-partner on a vacant side](https://linear.app/temba-app/issue/TEM-77/per-position-leave-register-with-partner-on-a-vacant-side) | TEM-76 |
| 3 | [TEM-78 Move to a vacant Position](https://linear.app/temba-app/issue/TEM-78/move-to-a-vacant-position) | TEM-76 |
| 4 | [TEM-79 Invite accept picks a Position](https://linear.app/temba-app/issue/TEM-79/invite-accept-picks-a-position) | TEM-76 |
| 5 | [TEM-80 Scoring frozen until both Game teams are complete](https://linear.app/temba-app/issue/TEM-80/scoring-frozen-until-both-game-teams-are-complete) | TEM-76 |
| 6 | [TEM-81 Tournament N×2 seats + cap](https://linear.app/temba-app/issue/TEM-81/tournament-n2-seats-cap) | TEM-76 |

Frontier: **TEM-76** only. Do not implement until an implementer / orchestrator is asked to run the tickets.
