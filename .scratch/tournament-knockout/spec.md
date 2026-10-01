Status: ready-for-agent

Tickets (Linear, `ready-for-agent`), in dependency order:

| Ticket | Title | Blocked by |
| --- | --- | --- |
| [TEM-289](https://linear.app/temba-app/issue/TEM-289) | Create, draw and post a Knockout only tournament and see its tree | None |
| [TEM-290](https://linear.app/temba-app/issue/TEM-290) | Play a Knockout to a Champion: winners advance, level Matches cannot complete | TEM-289 |
| [TEM-291](https://linear.app/temba-app/issue/TEM-291) | Groups then knockout: Through from each group, placeholders, automatic placement | TEM-290 |
| [TEM-292](https://linear.app/temba-app/issue/TEM-292) | Walkovers: cancelling a Knockout Match and removing a team after the draw | TEM-290 |
| [TEM-293](https://linear.app/temba-app/issue/TEM-293) | Knockout Matches on hub lists, tournament cards and Home | TEM-290 |

TEM-289 carries the schema, the predicate split and the tree builder. TEM-291, TEM-292 and
TEM-293 can run in parallel after TEM-290.

Amends: ADR-0017 (knockout, format picker, overall champion and "voided, not awarded" were
deferred or decided there), ADR-0018 (hub rows per Pool Match), ADR-0019 (Round count),
`.scratch/friendly-tournament-redesign/spec.md` (stories 75 and the "never emit a knockout
clause" rule), `.scratch/tournament-card-redesign/spec.md` (no knockout copy). The decisions are
recorded in ADR-0020.

Design source: `.scratch/design-import/friendly-tournaments-flow.html`, screens 08a (Format
picker, "Through from each group") and 07c (bracket). Where this spec and the mock disagree, this
spec wins; the differences are listed in Further Notes.

## Problem Statement

A Friendly tournament has one shape: Game teams are drawn into Pools and each Pool plays a round
robin. It ends with one winner per Pool and no overall champion, because nothing in the product
lets teams from different Pools play each other. An Organizer who wants a champion, or who wants a
straight elimination day with no group stage, cannot run it.

## Solution

At create, the Organizer picks a **Tournament shape**:

- **Groups only**: today's tournament, unchanged.
- **Knockout only**: every Game team is drawn at random into a knockout tree. Lose once and you are
  out.
- **Groups, then knockout**: Pools play their round robin, then the top teams from each Pool go
  into a knockout tree. The Organizer sets **Through from each group**, and that number decides the
  size of the tree.

The system builds the tree. For Knockout only it is built by the draw. For Groups, then knockout
the whole tree is created when the Pool draw is posted, showing placeholders such as `A1` and
`Winner of Q1`; when the last Pool Match settles, the qualified teams drop in automatically, and
each winner moves on automatically as Matches complete. The winner of the Final is the tournament's
**Champion**.

## Decisions settled with the Organizer

1. **Uneven fields use Byes.** Any qualifier count of 2 or more is allowed. The tree is padded to
   the next power of two and the padding becomes Byes in the first knockout round.
2. **A level knockout Match cannot complete.** Players add a deciding Set until one side leads on
   Sets.
3. **Advancing is fully automatic.** No "Start knockout" step.
4. **An unplayable knockout Match is a Walkover.** The Organizer names who goes through; no Sets,
   no rating change.

## Glossary (add to `CONTEXT.md`)

- **Tournament shape**: which stages a Friendly tournament plays: Groups only, Knockout only, or
  Groups then knockout. Chosen at create. Not a Game format: the format stays Friendly tournament
  (ADR-0017). Shown to users as *Format*. _Avoid_: Game format, mode, type.
- **Knockout**: the single-elimination stage of a Friendly tournament. _Avoid_: bracket (UI word
  only), playoffs, finals.
- **Knockout Match**: a Match in the Knockout. It must have a winner. A Pool Match is every other
  Match of a drawn tournament.
- **Knockout round**: one level of the Knockout, named by the teams left in it: Round of 32, Round
  of 16, Quarter-finals, Semi-finals, Final. Each Knockout round is also a Round (one date-slice),
  numbered after the Pool Rounds.
- **Qualifiers per Pool**: how many Game teams go from each Pool into the Knockout. Shown as
  *Through from each group*.
- **Knockout draw**: the random placement of every Game team into the tree of a Knockout only
  tournament. Drafted and re-rollable, then posted, like the Pool draw. _Avoid_: seeding.
- **Bye**: a first-round place in the tree with no opponent. The team starts in the next Knockout
  round. A Bye is not a Match.
- **Walkover**: a Knockout Match that was not played and whose place in the next round was awarded
  by the Organizer. Never rated.
- **Champion**: the Game team that wins the Final. Only a tournament with a Knockout has one.

Update the existing entries: **Friendly tournament** (drop "bracket (a later slice)", mention the
shape), **Round** (covers Knockout rounds), **Pool table** (counts Pool Matches only).

## User Stories

### Choosing the shape at create

1. As an Organizer, I want a Format picker with Groups only, Knockout only and Groups then
   knockout, so that I can run the tournament I have in mind.
2. As an Organizer, I want Groups only preselected, so that today's flow is unchanged if I do not
   touch it.
3. As an Organizer picking Knockout only, I want the Groups and Rounds steppers hidden, so that I
   am not asked about a stage that will not be played.
4. As an Organizer picking Groups then knockout, I want a **Through from each group** stepper
   under Groups and Rounds, so that I control how many teams go through.
5. As an Organizer, I want the stepper to start at 2 (or the highest allowed value if 2 is not
   allowed), so that the common case needs no input.
6. As an Organizer, I want the stepper limited to 1 up to one fewer than the smallest group, so
   that the group stage always eliminates someone.
7. As an Organizer with a single group, I want the stepper to start at a minimum of 2, so that a
   knockout always has at least a Final.
8. As an Organizer, I want a line under the stepper such as "6 teams into the knockout, 2 byes.",
   so that I see the consequence of my pick.
9. As an Organizer, I want the review to show a **Knockout** row such as "Top two in each group,
   quarters onward. 2 byes" or, for Knockout only, "Round of 16 onward. 4 byes", so that I can check
   the tree before creating.
10. As an Organizer, I want changing Game teams or groups to re-clamp Through from each group, so
    that the form never holds an invalid number.
11. As an Organizer of a one-day tournament, I want the day-fit check and "last Match would finish
    at" to include the Knockout rounds, so that I do not create a day that overruns.
12. As an Organizer of a few-weeks tournament, I want the Knockout rounds to get their own dates
    after the Pool Rounds inside my window, so that the schedule is complete at create.
13. As an Organizer, I want existing tournaments to behave as Groups only, so that nothing I
    already created changes.

### Knockout only: draw and post

14. As an Organizer, I want **Draw** to place every complete Game team into the tree at random, so
    that nobody is seeded.
15. As an Organizer, I want to see the drafted first-round pairings and which teams have Byes, and
    to re-roll, so that I review before anyone is told.
16. As an Organizer, I want Half teams and a field below 4 complete Game teams to block the draw
    with the same messages as today, so that the rules are the same in every shape.
17. As an Organizer, I want posting to create every Knockout Match with a Court and time, close
    registration and clear the Waitlist, so that posting means the same as it does for a Pool draw.
18. As an Organizer, I want to undo the draw until a Set is played, so that I can fix a mistake.
19. As a player, I want the tree to size itself to the teams that actually turned up, so that a
    short field still plays.

### Groups then knockout: post and placement

20. As an Organizer, I want posting the Pool draw to create the Pool Matches and the whole empty
    tree, so that everyone sees the full schedule from day one.
21. As a player, I want empty places to read as `A1`, `B2` or `Winner of Q1`, so that I can see
    my route to the Final.
22. As a player, I want teams from the same group kept apart in the first Knockout round whenever
    there is more than one group, so that I do not replay a group opponent straight away.
23. As a player, I want Byes to go to group winners, so that winning the group is worth something.
24. As a player, I want the qualified teams placed automatically the moment the last Pool Match
    settles, so that nobody waits for the Organizer.
25. As an Organizer, I want the smaller of my pick and what the drawn groups allow to be used when
    fewer teams turned up, so that posting never fails over my qualifier count.
26. As a player whose team did not qualify, I want to see that the tournament is over for my team,
    so that I am not left waiting.
27. As a player, I want the Pool table to count only Pool Matches, so that a Knockout Match
    against a team from my own group does not change the table.
28. As a player, I want a corrected Pool score to re-place the qualifiers while no Knockout Match
    has a Set, so that an honest fix reaches the tree.
29. As an Organizer, I want a Pool score correction refused once any Knockout Match has a Set, so
    that the tree never changes under a Match that has started.

### Playing the Knockout

30. As a player, I want to score Sets on a Knockout Match exactly like any other Match, so that
    there is nothing new to learn.
31. As a player, I want a level Knockout Match to tell me "Add a deciding Set", so that I know why
    it will not complete.
32. As a player, I want nobody to be asked to confirm a level Knockout score, so that confirmation
    always means a real result.
33. As an Organizer, I want force-complete refused on a level Knockout Match, so that I cannot
    create a Match with nobody going through.
34. As a player, I want the winner placed into the next Knockout Match as soon as the Match
    completes, so that the tree is always current.
35. As a player, I want a Knockout Match to move my Rating like any Match, so that knockout games
    count.
36. As a player, I want a Knockout Match with an empty side to be read-only, so that nobody
    scores against a placeholder.
37. As a player, I want a wrong-score report on a Knockout Match to work only while the next
    Match has no Sets, and to take the winner back out of it, so that a correction is possible but
    cannot rewrite a Match already under way.
38. As an Organizer, I want to change the Court and time of a Knockout Match but not its sides, so
    that the tree stays the system's.
39. As anyone, I want the Final's winner shown as Champion on the tournament, so that the
    tournament has an ending.

### Walkovers and withdrawals

40. As an Organizer cancelling a Knockout Match with both sides present, I want to be asked which
    team goes through, so that the tree keeps moving.
41. As an Organizer cancelling a Knockout Match with one side present, I want that team to go
    through without a question, so that I am not asked the obvious.
42. As a player, I want a Walkover to leave my Rating alone, so that unplayed results never rate.
43. As a player, I want a Walkover shown as "Walkover" on the Match and in the tree, so that it is
    not mistaken for a played win.
44. As an Organizer removing a team after the draw, I want its unplayed Pool Matches voided as
    today and its place in any unplayed Knockout Match vacated, so that I can then resolve that
    Match as a Walkover.
45. As a player, I want a team that left the tournament never to be placed as a qualifier, so that
    the next team in the Pool table goes through instead.

### Everywhere else

46. As a player, I want my Knockout Matches in My Games and the Home carousel once my team is
    placed in them, labelled with the Knockout round, so that "what am I playing" is still
    answered.
47. As a player, I want tournament cards and summary lines to mention the knockout only when the
    shape has one, so that Groups only tournaments read exactly as today.
48. As a player on a Groups only tournament, I still want "Each group has a winner. There is no
    overall champion.", so that nothing is implied that will not happen.
49. As an Organizer cancelling the tournament, I want played Matches kept and unplayed ones
    cancelled, as today, in both stages.

## Implementation Decisions

### Shape is a column, not a Game format

- ADR-0017's reasoning stands: `friendly_tournament` stays the only tournament format. Add
  `games.tournament_shape` (new enum: `groups_only`, `groups_then_knockout`, `knockout_only`),
  nullable. Null on a tournament with `pool_count` set means Groups only. No backfill.
- Add `games.qualifiers_per_pool` (nullable integer), set only for Groups then knockout.
- A Knockout only tournament has `pool_count` and `round_count` null. Today "is this the drawn
  kind of tournament" is `pool_count is not null`, used across roughly 35 files. Split that
  predicate in two: "drawn tournament" (any shape) and "has Pools". Every existing call site must
  be assigned to one of them on purpose. This is the largest regression risk in the feature.
- Legacy hand-built tournaments (no `pool_count`, no shape) stay read-only as today.

### Matches

- No new tables. Add to `matches`: `knockout_round` (1 = first Knockout round),
  `knockout_position` (1-based within the round), `walkover_game_team_id` (nullable, references
  Game teams), and four nullable integers recording where an unfilled first-entry place comes
  from: Pool index and Pool position for slot 1 and for slot 2.
- A Match is a Knockout Match when `knockout_round` is set. A Match's Pool is still derived from
  its teams, but only for Matches that are not Knockout Matches. The Pool table, Rounds-played
  label and posted Round count must all ignore Knockout Matches.
- The Match fed by position `p` of round `r` is position `ceil(p / 2)` of round `r + 1`; odd `p`
  feeds slot 1, even `p` feeds slot 2. "Winner of Q1" placeholders are derived from this, not
  stored.
- Qualifier sources (`A1`) are stored at post rather than derived on read, because a later
  withdrawal changes Pool sizes and must not reshape a posted tree.
- A Bye creates no Match. The team (or its `A1` source) is written straight into its slot in the
  second Knockout round.
- `round_number` on a Knockout Match is the number of Pool Rounds plus `knockout_round`, so the
  existing date and slot scheduling orders everything. `round_count` keeps meaning Pool Rounds.
- Add `game_teams.knockout_seed` (nullable integer): the drafted Knockout draw order for Knockout
  only. Cleared by undo.

### Tree builder (pure, shared)

One pure module, used by create (preview and validation), draw, post and the read surfaces.

- Input: number of entrants, or drawn Pool sizes plus Qualifiers per Pool. Output: Knockout round
  count, Match count per round, Bye count, and for each first-entry place either an entrant order
  number or a Pool index and position.
- Tree size is the next power of two at or above the entrant count. Byes = size minus entrants.
- Knockout only: entrants are in drawn random order; Byes go to the first of them.
- Groups then knockout: entrants are ordered all Pool winners (Pool A first), then all second
  places, and so on. Byes go to the front of that order, so to Pool winners in Pool order. Pool
  letters come from a random draw, so this ranks nobody across Pools.
- Required properties, to be enforced by tests rather than by a prescribed algorithm: with two or
  more Pools no first-round Match pairs two teams from the same Pool; with exactly two Pools and
  two qualifiers each, the two teams of a Pool are in opposite halves; every entrant appears
  exactly once; Match count is entrants minus one.
- Validation: total qualifiers at least 2. Qualifiers per Pool from 1 (2 with a single Pool) to
  smallest Pool size minus 1.
- Resolved qualifiers at post: the stored value capped at the drawn smallest Pool minus 1. The
  stored value is never rewritten, mirroring ADR-0019.

### Create

- `createTournament` input gains the shape and Qualifiers per Pool. Knockout only ignores Pool and
  Round counts. Team count limits are unchanged (4 to 32, even).
- The one-day fit check and the few-weeks date spread take the Knockout rounds as extra Rounds.
- The Format picker ships option by option with the slice that makes the option work, so no
  option is ever dead (ADR-0017's rule).

### Draw, post, undo

- The existing three doors (draw, post, undo) serve every shape; the App has one Draw action.
- Knockout only draw writes `knockout_seed` on the complete Game teams; post creates all
  Knockout Matches, fills the first-entry slots, and does everything post does today.
- Groups then knockout post creates Pool Matches as today plus every Knockout Match with empty
  slots and stored qualifier sources.
- Undo keeps its rule (no Set played, nothing completed) and also clears `knockout_seed`.

### Knockout advance (shared module)

One shared module owns moving teams through the tree. It is called from Match completion (both
the confirmation path and the Organizer force-complete), cancel Match, wrong-score reversal, and
team removal, which is why it is shared rather than living in one endpoint.

- **Place qualifiers**: when a Pool Match settles and every Pool Match is settled, read the Pool
  tables and write each qualifier into the slot whose stored source matches. Existing tie-break
  order decides positions. A source with no team (Pool too small after withdrawals) stays empty.
- **Advance winner**: on completion of a Knockout Match, write the winner into the fed slot, in
  the same transaction.
- **Level guard**: a Knockout Match whose Sets are level has no result. Force-complete is refused
  with a message telling the user to add a deciding Set; automatic completion does not fire;
  result confirmation is not requested or accepted.
- **Walkover**: cancel on a Knockout Match takes the advancing Game team when both slots are
  filled, infers it when one is, and advances nobody when none is. It sets the Match cancelled,
  records `walkover_game_team_id`, advances that team, and applies no rating.
- **Take back**: wrong-score reversal on a Knockout Match is allowed only while the fed Match has
  no Sets and is not completed; it clears the fed slot. Reversal on a Pool Match after placement
  is allowed only while no Knockout Match has a Set; it clears every placed qualifier slot, and
  placement runs again when the Pool stage is settled again.
- **Withdrawal**: removing a team after the draw voids its unplayed Pool Matches (as today) and
  leaves its slot in an unplayed Knockout Match empty. The Organizer resolves that Match by cancel.
- Editing a Knockout Match may change Court and time only.

### Read surfaces

- The Game details payload gains the tree: rounds with name, Matches with code (`Q1`, `S1`,
  `Final`), each side as a team, a placeholder, or a Bye, plus Walkover and Champion.
- Tournament home gains a Knockout section after the Pool tables (design 07c layout). Knockout
  only shows the tree in place of the Pool tables, and the draw panel shows drafted pairings.
- Hub lists (ADR-0018): a Knockout Match is a hub row for the viewer once the viewer's team is in
  one of its slots. Its label is the Knockout round name instead of "R2 of 3".
- Size and status lines may carry a knockout clause only when the shape has a Knockout. Groups
  only output is byte-for-byte unchanged.
- A Knockout Match is an ordinary rated Match and appears in Match History as one.

### Docs

- ADR-0020: Tournament shape adds a Knockout. Record: shape is a column not a format; the tree is
  Match rows created at post with empty slots; Byes are not Matches; level Matches cannot complete;
  placement is automatic; Walkovers are awarded but unrated (amending ADR-0017's "voided, not
  awarded" for Knockout Matches only); Byes go to Pool winners in Pool order.
- `CONTEXT.md`: the glossary changes above.

## Testing Decisions

Test behaviour through the existing seams; add no new ones beyond the two new modules.

- **Tree builder**: pure unit tests, including property-style checks over every team count 4 to
  32, every Pool count and every legal qualifier count. Prior art: the tournament sizing and
  schedule tests.
- **Procedures against the database**: create, draw, post, undo, complete, score, confirm, cancel
  Match, kick, wrong-score report. Prior art: the post-Pool-draw, Pool-match-play and
  withdrawal-and-cancel tests. Cover: placement on the last Pool Match; re-placement after a
  reversal; refusal once a Knockout Set exists; level refusal on all three completion paths;
  Walkover with two, one and no sides; clamped qualifiers on a short field; Byes written into the
  second round.
- **Pool table**: a Knockout Match between two teams of one Pool does not change the table.
- **Regression**: a Groups only tournament, and a row with a null shape, produce identical
  results on every existing tournament test. Existing tests asserting "no knockout copy" are
  narrowed to Groups only, not deleted.
- **Hub lists and card copy**: extend the existing drawn-tournament list and card tests.

## Out of Scope

- Third-place Match, double elimination, consolation games for knocked-out teams.
- Best-placed runners-up across Pools, and any ranking of teams from different Pools.
- Seeding by Level or Rating.
- Changing the shape or Qualifiers per Pool after create. The Organizer cancels and recreates.
  (Field changes are absorbed by the clamp at post.)
- Organizer hand-pairing, and "one round at a time" from design 08a.
- Notifications.
- Americano and Friendly game.

## Further Notes

Differences from the design mock:

- 07c shows eight teams from three groups, including `A3` and `B3` but not `C3`. That is
  best-third-place qualification, which is out of scope. Three groups with two through gives six
  teams and two Byes.
- 07c says "Losing teams keep playing the friendly games in the group as usual." Out of scope; do
  not ship that line.
- 08a's "Who makes the rounds" control is not built.
- 08a lets a single group send one team through, which is a knockout with no Match. The minimum
  there is two.

Known risks:

- The predicate split (drawn tournament vs has Pools) touches many files; a missed call site
  hides a Knockout only tournament or shows Pool UI on it.
- Round arithmetic: anything that takes the highest `round_number` as the Round count will now
  include Knockout rounds unless it filters.
- Placement and reversal run inside Match completion; they must be in the same transaction and
  idempotent, as the completion effect is today.

## Comments
