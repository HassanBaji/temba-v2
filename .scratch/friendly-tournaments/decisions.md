# Friendly tournaments — settled decisions

Status: requirements settled across four grilling rounds. Ready for `/to-spec`.

ADRs: `docs/adr/0017-friendly-tournament-is-a-pool-round-robin.md`,
`docs/adr/0018-hub-lists-expand-a-drawn-tournament.md`.
Glossary: CONTEXT.md carries the rewritten **Friendly tournament** plus **Pool**,
**Pool table**, **Pool record**, **Pool draw**, **Round**, **Half team**.

Design source: claude.ai design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`,
file `Friendly tournaments flow.dc.html` (11 screens). `support.js` is the
generic design-canvas runtime and carries no product semantics.

## What exists today

`friendly_tournament` is already a `game_format` enum value, but it means
something much smaller than the design:

- `games.format = "friendly_tournament"`, individual or team_only registration.
- Sides are flat: `seats.sideCount()` returns `playersAllowed / 2`, and
  `game_teams.side_index` is unique per Game, so a 12-team tournament is
  sides 1..12 with `playersAllowed = 24`.
- Seat join already exists: `registerSeat(sideIndex, position)`, plus
  `registerWithPartner`, `moveSeat`, `leave`, Waitlist, Level range, Invite doors.
- Matches are added **by hand**: `games.addMatch` → `addTournamentMatch`,
  pairing any two `game_teams` into `matches.slot1GameTeamId` / `slot2GameTeamId`.
- `game_courts` already records several Courts on the Game at create.
- There is **no** notion of round, group, standings, draw, or bracket anywhere
  in the schema or the server.
- The App surface is **hidden**: `.scratch/friendly-only-ui/spec.md` locks
  `/dashboard/games/new` to `format: "friendly_game"`, removes the format
  chooser, Add Match, and format badges. tRPC still accepts the format.
- `games.listMyMatchHistory` **excludes** Friendly tournament
  (`listMyMatchHistory.ts`, "Friendly tournament and Americano are excluded
  this slice"). `carousel-games` and `byId` also branch on format.

## Settled (round 1)

1. **Slice scope: groups stage first, knockout bracket later.**
   In scope: tournament create with the sizing form, seat/team formation
   including organizer merge of two half-teams, the random draw into groups,
   rounds as real Matches, and the standings table.
   Out of scope for this slice: the knockout bracket (design 07c), the
   "Knockout only" format option, and winner-of placeholder Matches.
   Rationale: the glossary already calls bracket "a later style of Friendly
   tournament", and the bracket carries the hardest schema question — Matches
   that must exist before their two sides are known.

2. **Redefine `friendly_tournament`; do not add a second tournament format.**
   Keep the enum value, rewrite the CONTEXT.md glossary entry, and add an ADR
   recording the redefinition. Pre-existing rows are legacy: the App never
   created one, because `friendly-only-ui` locked create to Friendly game, so
   only tRPC or seed rows can exist. One tournament concept in the product.

3. **Tournament create gets its own route, not a format chooser.**
   Design 08a ("New game, several rounds") is a separate entry point reached
   from a Group, with its own sizing form. `/dashboard/games/new` keeps no
   format select and keeps creating Friendly games. The `friendly-only-ui`
   spec is **amended**, not reversed: the lock on the Friendly-game create form
   stands; a second, tournament-only create door is added beside it.

## Sizing and scheduling math (pinned by the design, not open)

The design's embedded script fixes this arithmetic. Treat it as the contract.

- Teams `T`: 4..32, adjusted in steps of 2. Default 12.
- Groups `G`: 1..max(1, ⌊T/3⌋). Default 3. Forced to 1 when "Knockout only".
- Group sizes are balanced: `base = ⌊T/G⌋`, the first `T mod G` groups get
  `base + 1`.
- Group games = `Σ kᵢ(kᵢ−1)/2` over the group sizes (full round robin inside
  each group). Each team plays `kᵢ − 1` group games.
- Qualifiers per group `q`: 1..max(1, smallestGroupSize − 1). Default 2.
- Knockout (later slice): `qualifiers = min(T, G·q)`, bracket = next power of
  two ≥ qualifiers, `byes = bracket − qualifiers`, knockout games =
  `qualifiers − 1`.
- Players line: `T · 2` players in pairs, two seats per team.
- One-day fit: `slots = ⌈totalGames / courts⌉`, each slot 45 minutes, back to
  back from the start time; over the finish time is a warning, not a block
  ("Add a court, or drop a group or a team" / "take fewer teams").

## Open — to settle in grilling

These are product decisions the design does not answer. They block the spec.

1. **Draw trigger and re-roll.** 08b has "Post the draw" and "Draw again", so
   the draw is organizer-triggered, previewable, and re-rollable *before*
   posting. What is the state of the Game between full seats and posting?
   May the organizer draw with fewer than `T` teams, and what happens to the
   empty slots?
2. **Posting the draw.** "Posting creates six games in each group" — so post
   inserts every group Match at once, with group, round, date, and Court
   already assigned. Is posting reversible?
3. **What is a round?** The design shows R1/R2/R3 with dates and a round chip
   row. Does a Match carry an explicit round number and group id, or is a round
   derived from its start time? "All at once" vs "One round at a time" (08c)
   are two different generation modes — is the manual mode in this slice?
4. **Seat lock.** "You can leave the seat up until the draw" — leave, kick,
   moveSeat, Waitlist promotion, and the Invite doors all need a behaviour
   after the draw. Today none of them know about a draw.
5. **Merge consent.** 07d offers "Put them in one team" *and* "Ask them first"
   as separate buttons, plus a side swap. Is merge an immediate organizer
   action, a request the two Users accept, or both doors? How does this sit
   with ADR-0013 (Partner registration seats the partner without consent)?
6. **Standings columns and tiebreaks.** The table shows `#`, `TEAM`, `P`, `W`
   only. What orders two teams on equal wins — set difference, games
   difference, head to head, Level? What shows before a group has played?
7. **Rating.** The design says "Counts for rating: Yes" and every round game is
   scored and confirmed the usual way. That means `listMyMatchHistory` must
   stop excluding Friendly tournament, and `carousel-games` / Home need a
   position. Does a withdrawal or no-show produce a rated result?
8. **Price.** The design says "Court cost 100 kr per round" and "You owe 300
   kr, after each round" — a per-round amount, not the per-Game
   `pricePerPlayerCents` the glossary defines. Is the stored number per round,
   and is the total shown as `price × rounds`?
9. **Duration.** "One day" vs "A few weeks". One-day gets the fit math and
   automatic Court and time assignment. How are round dates chosen for the
   multi-week shape, and is multi-week in this slice?
10. **Withdrawal after the draw.** A team drops mid-tournament. Walkover,
    forfeit, void the remaining Matches, or re-draw? The design is silent.
11. **Level range and join doors.** 08a shows "Who can take a seat: Tuesday
    Crew / Anyone with the link" but no Level range. Does a tournament carry a
    Game Level range, and do Level range requests apply?
12. **Cancel.** Cancelling a tournament, a group, or one round Match — what
    each does to the standings and to the remaining schedule.

## Glossary consequences (draft, not yet applied)

- **Friendly tournament** — rewrite. Today: "multiple Matches and the same
  sides on every Match. The organizer adds each Match by hand." That is the
  opposite of the design, where sides are drawn at random into groups.
- New terms likely needed: **Round**, **Group stage**, **Tournament group**,
  **Draw**, **Standings** (distinct from the existing **Standing**, which is a
  User's position inside a Group — collision, needs a different name),
  **Qualifier**, **Half team** / seat merge.
- ADR: redefinition of Friendly tournament, superseding the round-4 decision
  in `.scratch/games-matches/decisions.md` item 13.

## Settled (round 2)

4. **One shape only: a pure Pool round robin.** No format picker on create. "Knockout
   only" and "Groups, then knockout" wait for the bracket slice, the same way
   `friendly-only-ui` handled a not-yet-shipped format.
5. **Auto schedule only.** The Pool draw generates the whole round robin (circle
   method). The organizer adjusts an individual Match's time and Court afterwards
   through the existing `games.updateMatch`. Manual pairing (design 08c) ships with
   the knockout, where pairings are genuinely free.
6. **Both durations.** One day derives every Match time from the fit math; a few
   weeks takes one date per round. Stored data is identical — each Match has a
   start time and a Court.
7. **The draw is server-side and drafted.** The server generates the random Pool
   assignment and persists it as a draft; re-roll replaces the draft; posting
   materialises the Matches. The client never proposes the assignment, because the
   product sells this on fairness ("it is random", "Nobody is seeded").
8. **Merge is immediate, no consent.** Consistent with ADR-0013. Both Users are
   notified, and either may leave the seat until the draw. Design 07d's
   "Ask them first" is a second door, deferred.
9. **No new join concepts.** "Tuesday Crew / Anyone with the link" maps to the
   existing `isPublic` flag. Game Level range, Level range requests, Waitlist and
   both Invite doors keep working unchanged — they sit on the Game, not the format.
10. **Pool Matches rate and appear everywhere.** Remove the Friendly tournament
    exclusion from `listMyMatchHistory`; include Pool Matches in Home's carousel and
    Recent form. A Pool Match is an ordinary rated Match with ordinary Match result
    confirmation.
11. **Pool table is P / W / D / L.** The design's P/W-only table cannot represent a
    Match draw, which this domain has. Order: wins → head to head → Set difference →
    games difference → draw order. An unplayed team sorts last and shows a dash.
12. **Price is unchanged.** `pricePerPlayerCents` stays per player per Match. The
    tournament screens show a derived total — price × that Game team's Pool Match
    count — as display-only text. A stored total would be wrong the moment Pools are
    uneven (`base` vs `base + 1`). The design's "kr" is placeholder copy; the
    product currency constant is `BD`.
13. **Naming: Pool, Pool table, Pool record.** The design's "Group A/B/C" collides
    with Group (a set of people); its "Standings" collides with Standing (a User's
    position among a Group's members, shipped in `server/standing/compare-standing.ts`
    and `components/groups/group-standing-tab.tsx`). Glossary updated.

## Settled (round 3)

14. **No new tables.** `games.pool_count`, `games.draw_posted_at`,
    `game_teams.pool_index`, `matches.round_number`. A Match's Pool is derived from
    its two slot teams. A **draft Pool draw is `pool_index` set with no Matches**;
    posting inserts the Matches; re-rolling overwrites `pool_index`.
15. **Hub lists expand a drawn tournament into per-Match rows.** Before the Pool
    draw a tournament is one hub row; after it, one row per Pool Match the viewer
    sits on. This **amends** `.scratch/games-matches/decisions.md` item 15 ("lists
    show Games, not Matches"), which would otherwise hide tonight's tournament Match
    from the Games list.
16. **Naming: Pool draw.** Bare "draw" stays the tied Match result, which is shipped
    and rated and now appears as `D` on the same screen.
17. **Seats freeze at `draw_posted_at`.** Self-leave, moveSeat, merge, registerSeat
    and Invite accept refuse once posted. Organizer kick stays open as the
    withdrawal door. Waitlist rows are closed at posting rather than left in a queue
    that can never advance.
18. **Early Pool draw allowed** when every seated team is complete and there are at
    least 4 teams; Pools rebalance to the real count. Refused while any Half team
    exists — that is what merge is for.
19. **Undo the Pool draw** is allowed until the first Set lands: it deletes every
    Pool Match and clears `pool_index`. Never after a Pool Match has a Set or is
    completed.
20. **Withdrawal voids, it does not award.** The withdrawing team's unplayed Pool
    Matches are cancelled; played ones stand with their ratings. No walkovers this
    slice — an awarded win needs a Glicko-2 story first.
21. **Cancel reuses `games.cancel` and `games.cancelMatch`.** A cancelled Pool Match
    counts as not played on the Pool table. No re-draw.
22. **Round count is derived, dates are entered.** `k−1` Rounds for an even Pool of
    `k`, `k` with byes when odd. One day derives every time from the fit math; a few
    weeks takes one date and start time per Round, then the same 45-minute slot
    spread across the Game's Courts.
23. **Finished when every Pool Match is completed or cancelled. Each Pool has a
    winner; there is no single tournament winner this slice** — crowning one across
    Pools compares teams who never met, which is the knockout's job. Create copy
    says "three Pool winners", not "a champion".
24. **Merge takes an explicit Position assignment.** Default: the first Half team
    keeps its Position, the other takes the opposite; the organizer may swap before
    confirming. Refuse any merge putting both on the same Position —
    `game_team_players` has a unique index on `(game_team_id, position)`.

## Settled (round 4)

25. **No notification is sent. This is a non-goal, not an omission.** Temba has no
    delivery channel at all — no email, push, or notification table; the only
    "something happened" surface is the pull page `/dashboard/invites`. Merge,
    posting and waitlist closure surface as **visible state** on pages the affected
    Users already open. No UI copy may promise a message. The design's "Both of them
    get a message" is not delivered; the real protection is structural — the seat
    stays leaveable until the Pool draw (decision 17).
26. **Both registration modes keep working.** The Pool draw takes complete Game
    teams and does not care how one was formed — seat join, Partner registration, or
    a complete Team on a `team_only` tournament. A `team_only` tournament simply
    never shows the Half team or merge flow.
27. **Legacy rows are left alone.** New surfaces key off `pool_count is not null`.
    A legacy Friendly tournament renders read-only with the plain Match list; no
    Pool table, Pool draw or Round strip. No backfill, no migration — the same line
    `friendly-only-ui` decision 16 drew.
28. **Posting the Pool draw also sets `registrationClosedAt`** when unset, so "can I
    join" has one answer in one column. `reopenRegistration` refuses once
    `draw_posted_at` is set.
29. **Only My Games and the Home carousel expand** a drawn tournament into per-Match
    rows. Group home and public pickup keep listing the tournament — someone
    browsing pickup wants open seats, not strangers' fixtures. After the draw a
    tournament has no open seats, so it leaves pickup on its own.
