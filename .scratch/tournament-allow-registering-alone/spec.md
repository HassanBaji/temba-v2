Status: ready-for-agent

Decisions: `.scratch/tournament-allow-registering-alone/decisions.md`

Tickets (Linear, `ready-for-agent`), in dependency order:

| # | Ticket | Blocked by |
|---|--------|-----------|
| 1 | [TEM-255](https://linear.app/temba-app/issue/TEM-255) Join with a partner on the tournament join sheet | — |
| 2 | [TEM-256](https://linear.app/temba-app/issue/TEM-256) Create: Allow registering alone vs With a partner only | — |
| 3 | [TEM-257](https://linear.app/temba-app/issue/TEM-257) Enforce partner-required occupancy | TEM-256 |
| 4 | [TEM-258](https://linear.app/temba-app/issue/TEM-258) Partner-required surfaces and Invite link landing | TEM-255, TEM-257 |

TEM-255 and TEM-256 may run in parallel.

Amends: `.scratch/friendly-tournaments/spec.md` + `decisions.md` (9, 26),
`.scratch/friendly-tournament-redesign/spec.md` (create “How people join”;
Start a team on your own), `.scratch/register-with-partner/spec.md` (D3/D4 —
Partner registration UI on tournaments), `.scratch/individual-game-seats/spec.md`
(leave / Waitlist on this flag), `.scratch/games-matches/spec.md` (tournament
create no longer offers `team_only`). Note on ADR-0013 (exception, not a
reversal). ADR-0017 / ADR-0018 stay closed.

## Problem Statement

A Friendly tournament organizer can only choose **Individual seats** or
**Complete Teams only**. Individual seats lets people join one Position at a
time, which is how Half teams form. Complete Teams only routes through a
persistent **Team**, which is the wrong partnership for most Groups: they want
pairs for this tournament, not a lasting Team.

Players already know the other door from Friendly games: **Join alone** or
**Join with a partner**. Partner registration books both Positions on one vacant
side as an ad-hoc Game team, and the partner is never asked. That door exists
on the tournament **server**, but the Pool-tournament join sheet does not offer
it, and the organizer has no way to require it.

## Solution

Replace the tournament create field with **How people join**: **Alone or with a
partner** (default) versus **With a partner only**. The choice is immutable.
New tournaments stay `registration_mode = individual`. The flag is **Allow
registering alone**.

**Alone or with a partner** is today’s individual tournament plus the
Friendly-game join sheet: Join alone (sit with someone, or start a Game team on
your own) and Join with a partner. Waitlist, Lookup, Invite-link seat-pick,
move, merge, and leave-only-the-leaver all stay.

**With a partner only** means every entry is Partner registration onto a fully
vacant side. No solo seats, no Half teams, no Waitlist, no Lookup, no moving
seats, no merge. Leave or kick before the Pool draw removes the whole Game
team. After the draw, freeze and organizer withdrawal stay as they are. An
Invite link can still be copied; opening it does not seat anyone.

This is not a matcher, not a persistent Team, and not a Friendly-game change.
Leftover Complete Teams tournaments keep Register Team.

## User Stories

### Creating a tournament

1. As an Organizer creating a Friendly tournament, I want **How people join**
   to offer **Alone or with a partner** and **With a partner only**, so that I
   am not asked to choose Complete Teams.
2. As an Organizer who does not touch that field, I want Alone or with a
   partner selected, so that Groups keep today’s fill-as-you-go seats unless
   they opt into pairs-only.
3. As an Organizer, I want With a partner only to mean Partner registration
   only — an ad-hoc Game team, not a Team — so that pairs can enter without
   creating a persistent partnership.
4. As an Organizer, I want that choice locked after create, so that the join
   door cannot change under people already in.
5. As an Organizer, I want a new tournament always stored as individual
   registration, so that Partner registration stays the pair path and Complete
   Teams is not reused for this flag.
6. As an Organizer, I want tournament create to refuse Complete Teams, so that
   the App cannot mint new `team_only` tournaments.
7. As a User of a leftover Complete Teams Pool tournament, I want Register Team,
   no Lookup, and two-consent Invite link unchanged, so that existing rows keep
   working without a migration.
8. As a User creating a Friendly game, I want that form and its join sheet
   unchanged, so that this flag is tournament-only.

### Taking a seat when registering alone is allowed

9. As a User on an allow-alone tournament, I want the join sheet to start with
   **Join alone** and **Join with a partner**, so that the doors match a
   Friendly game.
10. As a User choosing Join alone, I want Sit with someone and Start a team on
    your own, so that I can fill a Half team or start one.
11. As a User choosing Join with a partner, I want the existing partner picker
    and review, so that I book both Positions on a vacant side in one action.
12. As a User on an allow-alone tournament, I want Waitlist, Lookup, Invite-link
    seat-pick, move, merge, and leave-only-the-leaver to keep working, so that
    opting out of partner-required does not strip today’s tools.

### Taking a seat when registering alone is not allowed

13. As a User on a partner-required tournament, I want the join sheet to open
    on Pick a partner, so that I am not offered Join alone.
14. As a User there, I want Sit with someone, Start a team on your own, Take
    seat on the Teams list, and Join waitlist hidden, so that the page does not
    offer a door the server will refuse.
15. As a User, I want Partner registration onto a fully vacant side to succeed
    the usual way, so that a named pair can enter.
16. As a User, I want picking a single vacant Position refused, so that I
    cannot join alone onto an empty side or a Half team.
17. As a crafted client calling seat-register without a seat (today’s Waitlist
    path), I want that refused, so that a solo Waitlist row cannot form.
18. As a User calling Partner registration when the tournament is full, I want
    that refused rather than two Waitlist rows, so that a pair is not split on
    promote.
19. As a User arriving when every side is taken, I want no Join waitlist CTA,
    so that I wait until a side is actually free and then enter as a pair.
20. As a User, I want moving my seat refused, so that I cannot leave my partner
    as a Half team or sit alone on another side.
21. As a User on a vacant-side race, I want copy that does not tell me to Join
    alone, so that the fallback still matches partner-required.

### Leave, kick, merge, and the Pool draw

22. As a User leaving a partner-required tournament before the Pool draw, I
    want my whole Game team removed, so that my partner is not left as a Half
    team.
23. As that partner, I want to be unseated too, so that I can enter again with
    the same or another partner while registration is open.
24. As a User leaving, I want the confirm copy to say my partner is unseated
    too, so that I am not surprised they lost their seat.
25. As an Organizer kicking one User before the draw on a partner-required
    tournament, I want the same whole-Game-team removal and the same copy, so
    that kick matches leave.
26. As a User on an allow-alone tournament or a Friendly game, I want leave and
    kick to free only the leaver, so that ADR-0013 stays true there.
27. As a User after the Pool draw, I want self-leave still frozen and organizer
    kick still the withdrawal door, so that partner-required does not invent a
    new withdrawal product.
28. As an Organizer of a partner-required tournament, I want the merge banner
    and merge drawer hidden, so that I am not offered a Half-team tool that
    cannot apply.
29. As a crafted client calling merge on a partner-required tournament, I want
    that refused, so that a bug cannot assemble seats the organizer forbade.
30. As an Organizer, I want the early Pool draw still to need at least four
    complete Game teams and still to refuse while any Half team exists, so that
    the draw rule does not fork.

### Invites

31. As an Organizer of a partner-required tournament, I want Lookup send
    refused, so that a User-shaped invite cannot solo-seat someone.
32. As an Organizer, I want to still mint and share an Invite link, so that
    “anyone with the link” and Group-only sharing keep working.
33. As a User opening that Invite link, I want a preview of the tournament and
    no seat grid, so that I am not asked to pick a Position.
34. As a signed-in User opening that link, I want to land on Game home with
    Pick a partner open, so that the only join door is Partner registration.
35. As a crafted client calling Invite-link accept with or without a seat, I
    want that accept to refuse to seat me, so that the link is discovery, not
    a second admit kind.
36. As a User on an allow-alone tournament, I want Lookup and Invite-link
    seat-pick unchanged, so that partner-required does not leak onto the
    default.

### Honesty about what is not there

37. As a User, I want no copy calling this a Team or Complete Teams, so that I
    do not create a persistent partnership by joining a tournament.
38. As a User, I want no matcher, no pair-Waitlist, and no pair-move, so that
    partner-required is a gate on the existing Partner registration door.
39. As an unseated partner, I want no message claiming I was notified, so that
    the product does not invent a delivery channel.
40. As a User of a Friendly game, an Americano, or a leftover Complete Teams
    Game, I want those surfaces untouched, so that the blast radius is Pool
    tournaments created through tournament create.
41. As an operator, I want no conversion or backfill of existing rows, so that
    this change is not a data migration. Existing tournaments stay allow-alone
    by default.

## Implementation Decisions

### Glossary

Add **Allow registering alone** to CONTEXT.md: organizer flag on a Friendly
tournament, default yes; when no, entry is Partner registration only. Distinct
from `team_only` / Team. Not a new Game format. Not a `registration_mode` value.

Amend **Partner registration**: leaving still frees only the leaver’s Position
on Friendly games and on allow-alone tournaments. On a tournament that does not
allow registering alone, leave or kick **before the Pool draw** removes the
whole Game team.

Do not describe partner-required as a registration mode. Avoid “Complete Team”,
matcher language, and reusing Team copy.

### Schema

Boolean column on `games`: `allow_solo_register` / `allowSoloRegister`,
`NOT NULL DEFAULT true`. Existing rows stay allow-alone with no backfill.

Only `createTournament` may persist `false`. Friendly games, Americano, and
leftover `team_only` rows ignore the column. Not a third `registration_mode`
enum value. Format, public, mode, and this flag are immutable after create.
There is no edit door for it.

`createTournament` always stores `registration_mode = individual`. Drop
`team_only` from that input. Do **not** change `games.create` in this slice
(it already persists `individual` even when a crafted client sends
`team_only`).

Game get / home payload includes `allowSoloRegister` so the join sheet, Teams
list, merge banner, leave copy, and Invite landing can branch without a second
read.

### Predicate used by many doors

A Game is **partner-required** when it is a Pool tournament (`friendly_tournament`
with a non-null `poolCount`), `registrationMode === individual`, and
`allowSoloRegister === false`. Leftover `team_only` rows are never
partner-required.

That predicate is the same meaningful business rule on seat-register, Partner
registration (full), leave, kick, move, merge, Lookup send, Invite-link accept,
and Waitlist promote. Extract one shared helper those doors call. Do not add a
service layer. Do not put it in a router file that other server code then
imports.

### Occupancy when partner-required

- `registerSeat` (with or without a seat, including leftover occupy) refuses.
- `registerWithPartner` when there is remaining capacity behaves as shipped
  (fully vacant side, both Users pass the join gate and Level range, partner
  seated immediately — ADR-0013).
- `registerWithPartner` when full **refuses**. Do not enqueue two Waitlist
  rows.
- `moveSeat` refuses.
- `mergeHalfTeams` refuses.
- Lookup send refuses (same class of refusal as `team_only`).
- `acceptInviteLink` with or without a seat refuses to seat. The link stays
  mintable and shareable.
- Waitlist promote must not solo-seat a User row if one exists anyway.
- Pre-draw leave and kick remove the whole Game team (both Users), then do
  not promote a Waitlist (there is none). After the draw, freeze and organizer
  withdrawal stay as shipped.

Pool draw is unchanged: at least four complete Game teams; refuse while any
Half team exists.

### Create UI

Replace the Individual seats / Complete Teams segmented field. Labels:

- **How people join**
- **Alone or with a partner** (default, writes `allowSoloRegister: true`)
- **With a partner only** (writes `allowSoloRegister: false`)

Design preview for tournament create follows the same field. Do not keep a
hidden Complete Teams path on this form.

### Join UI

Extend the in-progress Pool-tournament join sheet. Do not replace it with a
parallel join product. Reuse the Friendly-game partner picker and review.

- **Allow-alone:** first step is Join alone / Join with a partner. Join alone
  keeps Sit with someone and Start a team on your own.
- **Partner-required:** skip that chooser; open Pick a partner. Hide Sit with
  someone, Start a team on your own, Take seat on the Teams list, Join
  waitlist, move UI, and the merge banner/drawer.
- Vacant-side race copy on partner-required must not say Join alone.
- Leave and kick confirm on partner-required, before the draw, say the partner
  is unseated too.

Hub cards: tournaments stay View (no side-join). Partner-required has no
Waitlist, so hub Join waitlist is hidden. Not a new door.

Invite landing: no seat grid, no auto-accept, no waitlist-from-accept.
Preview; signed-in CTA navigates to Game home with the partner sheet open.
They join only via `registerWithPartner`.

There are still no notifications. An unseated partner finds out by opening
the Game.

### App tRPC

One procedure per file. Logic stays in the existing doors
(`createTournament`, `registerSeat`, `registerWithPartner`, leave, kick,
`moveSeat`, `mergeHalfTeams`, Lookup send, `acceptInviteLink`). No twin
`server/<domain>/<verb>.ts` files. No new procedure unless a door is genuinely
missing — none is.

## Testing Decisions

A good test asserts **external behaviour** — a returned value, a refusal
reason, or a subsequent read — and never reaches for internal structure.
Tests run against a real database through the existing pglite helper, with no
mocks.

### Seam 1 — existing, reused unchanged

Exported endpoint functions against pglite, plus the exported input schema for
validation-only assertions. Prior art: `createTournament.test.ts`,
`tournament-seats.test.ts`, `registerWithPartner` tests, leave/kick tests,
`mergeHalfTeams.test.ts`, Invite-link accept tests, Lookup send tests.

Covered at this seam: create persists `allowSoloRegister` and always
`individual`; create refuses `team_only`; leftover `team_only` rows unchanged;
partner-required refuses `registerSeat` (with seat, without seat, leftover
occupy); Partner registration succeeds on a vacant side and refuses when full;
leave/kick before the draw delete both occupants; leave on allow-alone still
frees only the leaver; `moveSeat` and merge refuse; Lookup send refuses;
`acceptInviteLink` refuses to seat; Waitlist promote does not solo-seat;
Friendly-game create and join are untouched.

### Seam 2 — existing pure UI helpers

Join-sheet and CTA predicates (allow-alone chooser vs skip-to-partner; hide
Take seat / Waitlist / merge; leave copy; Invite landing does not request a
seat). Prior art: `tournament-join.test.ts`, `friendly-game-cta` tests,
`tournament-copy.test.ts`.

No new injectable seam. No component-tree tests as the source of truth.

## Out of Scope

- A matcher that pairs strangers.
- Pair-Waitlist or pair-move.
- Persistent Team register as a tournament create option.
- Changing Friendly-game create or join.
- Changing `games.create` (legacy tRPC).
- Migrating leftover `team_only` rows.
- Notifications.
- Reopening Pool draw, after-draw withdrawal, knockout, or ADR-0017 / ADR-0018.
- Reversing ADR-0013 for Friendly games or allow-alone tournaments.

## Further Notes

Partner registration already ships for individual Friendly tournaments. Pool
chrome dropped the legacy partner card, and the in-progress tournament join
sheet skips the Friendly-game chooser. Allow-alone work is a restore/extend of
that sheet, not a second admit kind.

`createTournament` is the only live App writer of `team_only`. Hiding Complete
Teams on that form retires **new** `team_only` Games from the App; leftover
rows remain.
