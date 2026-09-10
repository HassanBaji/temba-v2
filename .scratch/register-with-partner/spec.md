# Register into a Game with a partner

Status: ready for tickets
Design source: `.scratch/design/register-with-partner/partner-flow-screens.html` (artboards `02b`, `03a`, `03d`, `03e`, `03f`, `03g`, `03h`)
Amends: `.scratch/individual-game-seats/spec.md` (seat model), the game-details redesign (Friendly chrome)

---

## 1. Problem

A User opening a Friendly game they can join has exactly one door: take one vacant Position for
themselves. If they already have someone to play with, they have to persuade that person to open the
App and grab the other seat before a stranger does.

The ask: let a User register **both** Positions on one side in a single action — themselves and a
named partner — with the partner's seat booked outright, no acceptance step.

---

## 2. Discovery findings

### 2.1 The server door already ships

This is not a new capability. `.scratch/individual-game-seats/spec.md` (TEM-77) specified and shipped
register-with-partner. Live today:

| Path | What it is |
| --- | --- |
| `apps/temba/src/server/api/routers/games/registerWithPartner.ts` | `games.registerWithPartner` — books a pair onto one fully vacant side |
| `apps/temba/src/server/api/routers/games/searchPartnerUsers.ts` | `games.searchPartnerUsers` — typeahead over Users allowed on this Game |
| `apps/temba/src/server/games/helpers/assert-can-register-with-partner.ts` | format / mode / registration-open / join-gate / already-on-game guards |
| `apps/temba/src/server/games/admit.ts` (`admitPair`) | shared Game admit branch for `party.kind === "pair"` |
| `apps/temba/src/server/games/seats.ts` (`insertIndividualPairOnVacantSide`, `firstFullyVacantSideIndex`, `assertFullyVacantSide`) | seat placement |

Its rules, as shipped:

- Friendly game **or** Friendly tournament, `registrationMode === "individual"` only.
- Both Users must pass the join gate and the Game Level range (distinct refusal copy per person —
  `LEVEL_RANGE_OUTSIDE_MESSAGE` vs `LEVEL_RANGE_PARTNER_MESSAGE`).
- Requires a **fully vacant side**; the caller names `sideIndex` and their own `position`, the
  partner takes the other Position. A half-full side is refused ("No fully vacant side; pick a seat").
- Game full → both Users are enqueued as two independent Waitlist rows that promote separately.
- No confirmation step exists anywhere in the schema or the code. The partner is seated on commit.

### 2.2 The UI door does **not** reach the screens the artboards depict

`PartnerRegisterCard` in `apps/temba/src/components/games/game-players-panel.tsx` is the only surface
for it — a legacy form (two `Select`s plus a typeahead). `GamePlayersPanel` renders **only on the
non-Friendly-chrome branch** of `apps/temba/src/app/dashboard/games/[id]/page.tsx` (line ~948), and
`showsFriendlyRoster("friendly_game", "individual") === true` sends every individual Friendly game
down the *other* branch.

**Net effect: on a Friendly game — the exact surface artboards `02b`/`03a` draw — register-with-partner
is currently unreachable.** The game-details redesign replaced that branch with
`FriendlyGameCtaBar` + `FriendlyGameJoinSheet` ("Pick your spot") and the partner entry point was not
carried across. It survives only on individual **Friendly tournaments**, which still use the tab
layout.

So the work is a UI feature, not a backend feature. The backend needs one new **read** door
(partner suggestions) and nothing else.

### 2.3 Relevant existing components

- `friendly-game-join-sheet.tsx` — the seat picker. Today it opens straight onto the 2×2 line-up.
- `friendly-game-cta-bar.tsx` + `~/lib/friendly-game-cta.ts` — sticky bottom bar, `FriendlyGameCtaFamily`.
- `friendly-game-details-hero.tsx`, `game-lineup-section.tsx`, `game-seat-grid.tsx` — the seat and
  line-up drawing, including the established hatch-is-decoration-only convention.
- `~/lib/preferred-seat.ts` (`preferredJoinSeat`) — seeds the picker from the viewer's Preferred Position.
- `LookupUserSelect` + `~/server/invites/search-lookup-users.ts` — the shipped person-picker primitives.

---

## 3. Resolved: what "a spot left on both sides" means

**Conclusion: "both sides" means the two _Positions_ — left and right — of ONE Game team. Registering
with a partner consumes both seats on a single side. It does not put the two Users on opposing sides.**

Stated as an assumption because the request phrase is ambiguous; here is why the code and the design
both settle it this way, and why the alternative reading is wrong.

1. **The glossary.** `CONTEXT.md` defines **Game team** as "one side on a Game: a complete Team, an
   ad-hoc pair of Users, or one User occupying one of two **Positions**". "Side" is the half of the
   court; "Position" is left/right within it. A partner in padel is your teammate, on your side of
   the net. Two Users on opposing sides are opponents, not partners.
2. **The design says it in words.** Artboard `02b Join sheet`, body copy: *"**Two seats on the same
   side are open**, so you can take one on your own or bring someone and register as a team."* The
   partner option's own subtitle: *"Both seats. You play as a team."*
3. **The design says it in pixels.** `03e Register team review` draws both players under one heading
   "Your team", labelled "C+, **left seat**" and "C, **right seat**" — the two Positions of one side —
   with a "Keep sides / Swap sides" toggle that swaps *which of the two* takes left. `03h Team
   confirmed` puts them in one row above a separate "**Other team** — 1 seat open" panel.
4. **The shipped code already does it.** `registerWithPartner.ts` calls `firstFullyVacantSideIndex`
   and `assertFullyVacantSide`, then `insertIndividualPairOnVacantSide(…, sideIndex, callerPosition)`
   which seats `userIds[0]` at `callerPosition` and `userIds[1]` at `otherPosition(callerPosition)` —
   same `sideIndex`, one `game_teams` row.

So the availability gate is: **offer the partner option only when at least one side has both of its
Positions vacant.** A Friendly game with two Users sitting on different sides has two free seats and
still cannot take a pair — that is correct, not a bug, and the UI must say so rather than fail on submit.

Practically, on a 4-seat Friendly game the gate reads "0 or 1 User registered, and if 1, they are not
alone on the side you would take". The precise predicate is `game.sides.some(s => s.left == null &&
s.right == null)`.

---

## 4. Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | **No partner confirmation.** `games.registerWithPartner` books both Positions on commit. The partner is seated, not asked. | User's explicit constraint. Matches shipped behaviour. |
| D2 | **No migration in this feature.** The seat tables already express the outcome. | See §5. |
| D3 | Partner path is offered on **individual Friendly games** (the Friendly-chrome page) only. | That is the surface the artboards draw and the surface where the door is currently missing. |
| D4 | The legacy `PartnerRegisterCard` **stays** in `game-players-panel.tsx`. | It is the only partner door for individual Friendly **tournaments**, which still use the tab layout. Removing it would silently retire a shipped capability. Retiring it is a separate, later decision. |
| D5 | **Waitlist-with-a-partner is not surfaced** in the new flow. The partner option is hidden when the Game is full; the CTA bar keeps its solo "Join waitlist". | The user's gate is "a spot left on both sides". Two unbound FIFO rows that promote separately is not "register with a partner" as the design frames it — the pair would be split. The `games.registerWithPartner` door keeps the branch; nothing calls it. |
| D6 | Cancellation of a partner registration is **unchanged**: leave frees only the leaver's Position (shipped). The remaining User keeps their seat and the Game team survives as incomplete. | Shipped semantics from `individual-game-seats`; nothing in the request or the artboards asks to change it. `03h`'s "Leave the game" maps to the existing `games.leave`. |
| D7 | **Ratings are unchanged.** A pair-registered Game team rates exactly like a Game team assembled seat-by-seat; Glicko-2 sees the same two Users on the same side. `03e`'s "Counts for rating — Yes, as a pair" is display copy over the existing behaviour, not a new rule. | No rating code is touched. |
| D8 | The caller picks **which side** implicitly (first fully vacant side) and **their own Position** explicitly, via `03e`'s Keep/Swap toggle. | The artboards never ask the User to choose a side — `03d` shows "2 seats open" and `03e` goes straight to seats. Sending `sideIndex` from the client is retained for the optimistic-conflict case; the UI just picks the first fully vacant one. |
| D9 | The `03d` row *"Invite by phone number — They join Temba, then confirm the seat"* is **not built**. | There is no phone-invite door in the product; `CONTEXT.md` records Email invite as retired and Lookup invite / Invite link as the two live channels. A partner must be an existing User. |

---

## 5. Domain model

**No schema change. No migration.**

Register-with-partner writes exactly what a pair of solo seat-joins would write:

```
game_teams        (game_id, side_index, team_id = NULL)   ← the ad-hoc pair, one row
game_players      (game_id, user_id)                       ← one row per User
game_team_players (game_team_id, game_player_id, position) ← left, right
```

Under D1 an admitted seat is unconditionally live, which is precisely what the current tables mean.
Adding nothing is also what keeps a future confirmation flow cheap:

**Future-proofing check (per the brief's "don't hard-code an always-confirmed assumption").** Nothing
in the schema says "confirmed". There is no boolean, enum value, or `NOT NULL` default that a later
confirmation feature would have to unwind. Adding `03f`/`03g` later is purely additive:

- a nullable `game_team_players.confirmed_at` (or a `game_seat_confirmations` table, mirroring the
  precedent set by `match_result_confirmations` in ADR-0011), plus
- a nullable `game_players.registered_by_user_id` if "who brought whom" is needed for the request
  copy and the both-seats-released-on-decline rule.

Both are `ADD COLUMN NULL` / `CREATE TABLE`. Existing rows read as "confirmed" by treating `NULL` as
legacy-confirmed or by backfilling `confirmed_at = created_at` in the same migration. No rewrite.

The temptation to add `registered_by_user_id` *now* is explicitly declined: with no confirmation and
no team-level cancellation (D6), nothing would read it, and a column nothing reads is a claim the
next engineer has to disprove.

### Glossary

`CONTEXT.md` gains one term, **Partner registration**, and the **Game admit** entry is widened to name
the pair. The exact edit is in `context-md-delta.md` beside this spec (see §11).

### ADR

`docs/adr/0013-partner-registration-books-both-seats.md` records D1 and D2 — the alternative
(hold both seats pending the partner's acceptance, per `03f`/`03g`) is designed and deliberately
deferred, and a later reader needs to know the omission was a choice.

---

## 6. tRPC doors

Convention: one procedure per file under `apps/temba/src/server/api/routers/games/`, logic in the
file, `index.ts` composes only (`.cursor/rules/api-one-endpoint-per-file.mdc`). No new
`server/games/<verb>.ts` twin. No service layer.

| Door | File | Change |
| --- | --- | --- |
| `games.registerWithPartner` | `routers/games/registerWithPartner.ts` | **Unchanged.** The new UI calls it as-is. |
| `games.searchPartnerUsers` | `routers/games/searchPartnerUsers.ts` | **Unchanged.** Backs the search field on `03d`. |
| `games.listPartnerSuggestions` | `routers/games/listPartnerSuggestions.ts` — **new** | The two default sections on `03d`. |
| `games.byId` | `routers/games/byId.ts` | **Unchanged.** The partner gate is derivable from `canRegister`, `format`, `registrationMode` and `sides`. |

### `games.listPartnerSuggestions` (new)

`protectedProcedure.query`, input `{ gameId: uuid }`.

Reuses `requireGame` + `assertCanRegisterWithPartner` (the same guard `searchPartnerUsers` uses) so
the door refuses for the same reasons the search door does — a caller who may not register with a
partner gets no suggestion list.

Returns two ordered sections:

```ts
{
  playedWithBefore: PartnerSuggestion[];  // sorted by most recent shared Game, desc
  fromYourGroups:   PartnerSuggestion[];  // Group members of this Game's Group, if any
}

type PartnerSuggestion = {
  id: string;
  name: string;
  image: string | null;
  levelBand: LevelBand | null;                  // sport-keyed, same derivation the seat grid uses
  preferredPosition: "left" | "right" | null;   // user.preferred_position; null = Either
  gamesTogether: number;                        // only on playedWithBefore
  ineligible: "already_on_game" | "waitlisted" | "level_range" | null;
};
```

- **Played with before** = Users who have shared a `game_teams` row with the caller on any prior Game,
  most-recent-shared-Game first, capped at 20.
- **From your groups** = members of `game.group_id` (when the Game belongs to a Group), minus anyone
  already in the first section, capped at 20. A groupless Game returns an empty section. A groupless
  non-public Game returns two empty sections (only the organizer passes the join gate, and they are
  the caller) — the same short-circuit `searchPartnerUsers` already makes.
- Users already on the Game or its Waitlist are **returned with `ineligible` set**, not filtered out —
  `03d` draws them as a greyed, hatched, non-selectable row reading "Already in this game". This is the
  one place the picker deliberately differs from `searchPartnerUsers`, which excludes them.
- `level_range` is set for a User outside the Game's Level range, so the picker can grey them before
  submit instead of failing on `LEVEL_RANGE_PARTNER_MESSAGE`. Reuse `userAllowedByLevelRange`.

Shared modules to **call, not reimplement**: `requireGame` / `assertUserPassesJoinGate`
(`~/server/games/access`), `assertCanRegisterWithPartner`, `gameHideRegisteredWaitlistedSelf`,
`userAllowedByLevelRange`, the Level-band derivation `byId.ts` already uses for per-seat bands.

---

## 7. UI

### Screen map

| Artboard | Where it lands | Status |
| --- | --- | --- |
| `02b Join sheet` | `friendly-game-join-sheet.tsx` — new first step: mode chooser | **new step**, sheet exists |
| `03a Game upcoming` | `friendly-game-details-hero.tsx` + `game-lineup-section.tsx` + `friendly-game-cta-bar.tsx` | ships; entry point only |
| `03d Pick a partner` | new `friendly-game-partner-picker.tsx` (step 2 of the same sheet) | **new** |
| `03e Register team review` | new `friendly-game-partner-review.tsx` (step 3) | **new** |
| `03f Waiting on partner` | — | **out of scope** (D1) |
| `03g Partner confirms` | — | **out of scope** (D1) |
| `03h Team confirmed` | booked variant of the existing hero + line-up on the Game details page | **new variant** |

### Flow

```
03a  Game detail, viewer canRegister
      └─ CTA bar "Join"  →  02b  How do you want to join?
                                  ├─ Join alone          → existing "Pick your spot" picker → games.registerSeat
                                  └─ Join with a partner → 03d Pick a partner
                                                             → 03e Register the team
                                                             → games.registerWithPartner
                                                             → 03h booked state on 03a
```

One `ResponsiveDialog`, stepped — not three routes. `FriendlyGameJoinSheet` already owns the
sheet/drawer, the pending state and the price footer; the partner path is two more steps inside it.
Back from `03d` returns to `02b`; back from `03e` returns to `03d`.

### `02b` — mode chooser

Two stacked option buttons, matching the artboard: outlined "Join alone / One seat. Someone else
takes the other." over solid-ink "Join with a partner / Both seats. You play as a team.", each with
the two-seat mini-diagram (solid + hatched) beneath.

Gate: the partner button renders **only** when the viewer may take a pair — `canRegister`, individual
Friendly game, and at least one fully vacant side. When there is no fully vacant side the sheet skips
the chooser entirely and opens straight onto the existing seat picker, exactly as it does today, so a
half-full Game gains no dead-end.

Put the predicate in a pure lib next to its siblings — `~/lib/friendly-game-partner.ts`, unit-tested
like `friendly-game-cta.ts`. Do not add a server field for it.

**Copy correction, required:** the artboard's eyebrow on the partner button reads *"PARTNER CONFIRMS,
SEATS HELD 12 H"*, and `03d` reads *"Your partner confirms before the team is on the sheet."* Both
describe `03f`/`03g`, which are not being built. Under D1 the copy must say the opposite —
"BOTH SEATS BOOKED NOW" / "You register both seats. Your partner is in straight away." Shipping the
artboard's words would be a lie to the user.

Also drop the artboard's footnote *"Joining alone still lets you ask for a partner later, up to the
day before"* — there is no ask-for-a-partner-later feature.

### `03d` — Pick a partner

Header: close, "N seats open" chip, "Pick a partner", corrected subtitle. Then the Game summary row
(time / venue / price — reuse the existing summary primitives).

Sections from `games.listPartnerSuggestions`: **Played with before** ("Sorted by last game") and
**From your groups** (subtitle lists the Group name). Rows: avatar, name, and a meta line the design
composes as "C, plays right. 9 games together" — Level band, Preferred Position, `gamesTogether`.
Selection is single, radio-style, per the artboard's check circle. `ineligible` rows are greyed,
hatched and non-selectable with the reason as their meta line.

A search field falls back to `games.searchPartnerUsers` for anyone not in the two sections. Reuse
`LookupUserSelect`'s search behaviour where it fits rather than re-implementing debounce/pending.

Sticky footer: "Continue with {name}" + caption "No seat is taken until you register the team."

Deviations from the artboard: no "Invite by phone number" row (D9); no "Free Sat morning" availability
line (no such concept); no won-count in the meta line (see §9).

### `03e` — Register the team

Header: back, "Step 2 of 2", "Register the team", and the Game line ("Sat 20 Sep, 9:00 AM at {venue}.
Two seats, one for each of you.").

- **Your team**: two cards side by side — you and the partner — each with avatar, name, Level band and
  the seat they will take ("left seat" / "right seat").
- **Keep sides / Swap sides** segmented toggle. This is the only seat control, and it maps to the
  caller's `position` on the mutation. Seed it from the viewer's Preferred Position via the existing
  `preferredJoinSeat` convention, and if the partner has the opposite Preferred Position, seed so both
  are satisfied. Preference is a default, never a rule.
- **Detail rows**: Organizer, Price per player ("{price} each" — reuse `formatPricePerPlayerCents`),
  Counts for rating, Level ("{range}, you both fit"). Skip any row whose data is unset rather than
  printing a placeholder.
- Footer: "Register us as a team" → `games.registerWithPartner({ gameId, partnerUserId, sideIndex,
  position })` where `sideIndex` is the first fully vacant side.
- Caption: **not** the artboard's "Sofia gets a request now. If she declines, both seats go back." —
  under D1 it must read "Both seats are booked straight away."

Errors: `games.registerWithPartner` refusals surface in the sheet, not as a bare toast — particularly
`CONFLICT` when the side was taken between opening the sheet and submitting (re-fetch and drop back to
`03d`/`02b`), and the two distinct Level-range messages.

### `03h` — booked state

After success the sheet closes and the Game details page shows the pair. Most of `03h` already exists;
what is new:

- Hero eyebrow + title become "You and {partner}" with a seats-booked cue when the viewer is seated
  next to someone on their side. Today the hero shows the Game name for everyone.
- Seat cards under the hero carry the Position label ("Left seat" / "Right seat"). The artboard's
  "Confirmed 9:41 AM" has no analogue and is dropped (D1).
- The "Other team — 1 seat open" panel is the existing `game-lineup-section` opposing-side rendering.
- "Leave the game" is the existing `games.leave` (D6). "Message Sofia", "Pay 100 kr", "Cancel by
  Fri 19 Sep" and the calendar-add action are not product surfaces and are not built.

---

## 8. What the design shows that we are deliberately not building

| From the artboards | Why not |
| --- | --- |
| `03f Waiting on partner`, `03g Partner confirms`, "seats held 12 h", "if she declines both seats go back" | D1. Explicitly deferred; §5 keeps the migration path open. |
| "Invite by phone number" (`03d`) | D9 — no such door exists. |
| "Message {partner}" (`03h`) | No messaging in the product. |
| "Pay 100 kr", "unpaid", "Cancel by …" (`03h`) | Price per player is display-only by definition (`CONTEXT.md`); there is no payment or cancellation-deadline model. |
| "Free Sat morning" (`03d`) | No availability model. |
| "9 games together, **6 won**" (`03d`) | Games-together ships; the won half does not — see §9. |
| Waitlist-with-a-partner | D5. |

---

## 9. Open questions

1. **Win record in the `03d` meta line.** "9 games together, 6 won" needs each shared Game team's
   Match results joined per pair, on a picker that renders on open. Games-together is a
   `game_team_players` self-join; the win count pulls in `matches`/`match_sets` and the completed/
   cancelled rules. Shipping count-only first and adding the record once the query is measured is the
   recommendation, but if the record is considered load-bearing for choosing a partner, say so and it
   moves into ticket 2.
2. **Should the partner option appear when the viewer is already seated?** A seated User with a
   still-empty side arguably wants to bring two friends, or fill the seat beside them. The shipped
   door refuses a caller who is already on the Game (`assertCanRegisterWithPartner`), and `03a`'s
   seated state offers "Invite a player" instead. Left as-is; flagging that "invite the person next to
   me" is the natural follow-up ask.
3. **Retiring `PartnerRegisterCard`.** It survives only for individual Friendly tournaments (D4). If
   Friendly tournaments are moving to the Friendly chrome, this flow should be generalised rather than
   duplicated — worth confirming before ticket 1 starts.

---

## 10. Risks

- **Copy drift.** Three artboards state a confirmation contract the build does not honour. Every
  string lifted from `02b`, `03d`, `03e`, `03h` must be re-read against D1. This is the single most
  likely defect.
- **Race on the vacant side.** The gate is computed when the sheet opens; the side can fill while the
  User picks a partner. `assertFullyVacantSide` refuses correctly on the server — the UI must recover
  gracefully rather than dead-end (see `03e` errors).
- **Suggestion query cost.** `listPartnerSuggestions` runs a self-join over `game_team_players` plus a
  Group-member fetch plus per-User Level-band and Level-range checks, on sheet open. Cap both sections
  and check the plan before the picker ships.
- **Scope creep from `03h`.** The artboard carries payments, messaging and a cancellation deadline.
  Ticket 4 must stay a hero/line-up variant.

---

## 11. Domain doc changes shipping with this spec

- `CONTEXT.md`: add **Partner registration**; widen **Game admit** to name the ad-hoc pair.
  **Not yet applied** — the exact edit is in `context-md-delta.md` beside this spec. It was applied
  once and lost when this worktree was deleted mid-session; apply it before ticket 1.
- `docs/adr/0013-partner-registration-books-both-seats.md`: written.

---

## 12. Tickets

Implement in order. Each is a vertical slice — read model, door, UI, tests.

| # | Ticket | Blocked by |
| --- | --- | --- |
| 1 | [TEM-207 Join sheet offers "Join alone" or "Join with a partner"](https://linear.app/temba-app/issue/TEM-207/1-join-sheet-offers-join-alone-or-join-with-a-partner) | — |
| 2 | [TEM-208 "Pick a partner" picker with played-with and group suggestions](https://linear.app/temba-app/issue/TEM-208/2-pick-a-partner-picker-with-played-with-and-group-suggestions) | TEM-207 |
| 3 | [TEM-209 "Register the team" review step with Keep/Swap sides](https://linear.app/temba-app/issue/TEM-209/3-register-the-team-review-step-with-keepswap-sides) | TEM-208 |
| 4 | [TEM-210 Booked-with-a-partner state on Game details](https://linear.app/temba-app/issue/TEM-210/4-booked-with-a-partner-state-on-game-details) | TEM-209 |

Ticket 1 is shippable on its own: it restores a reachable partner door on Friendly games using the
already-shipped mutation and search. Tickets 2–4 replace each step with its designed screen.
