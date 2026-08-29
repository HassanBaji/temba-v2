# Games and rankings design contract (TEM-69)

Status: artefact only. This file ships no route, no page, no player-facing component, and no navigation item.

Owner of Game product behaviour: `.scratch/games-matches/spec.md`. Where this contract and that spec disagree, **that spec wins**. This file is the visual and interaction contract those tickets build to, plus a rankings placeholder that is **not buildable** until it has its own grilled spec and probably an ADR.

This branch already contains Games, Matches, Sets, Waitlist, and Game invites (TEM-35–TEM-43). The redesign spec was written immediately before that merge. Inspect the repository; do not re-specify Game create, registration, Waitlist, Match, Set, Game team, Game Lookup invite, Game Invite link, or public pickup.

## Recommendation (Open questions 5 and 6)

**.scratch/redesign/spec.md` Open question 5** — TEM-69 Games-half ownership. **Unresolved.** Recommendation: fold the Game card and Game home visual contract into [TEM-36](https://linear.app/temba-app/issue/TEM-36/friendly-game-create-register-game-home) so Game home is built once rather than built and then restyled. TEM-69 remains the design-contract document TEM-36 references.

**.scratch/redesign/spec.md` Open question 6** — Rankings scope. **Unresolved.** The rankings half currently spans four separable products (per-User rating or level, cross-Group ranking, Standing movement over time, player profile). Recommendation: split them, grill each separately, and schedule nothing until Sets and Match completion (TEM-41) have shipped.

---

# Part 1 — Games contract

## 1.1 `GameCard` is one component

`GameCard` is the same component as the reduced card Home and Group home already render (`apps/temba/src/components/games/game-summary-card.tsx`, currently named `GameSummaryCard`). Grow it with **optional props**. **Forbid a second parallel Game card component.**

Until a field's source exists, omit the prop. Do not fabricate Venue, Court, spots, registered players, price, or level.

## 1.2 Field list (priority order)

| Priority | Field | Required on full card | Notes |
|---|---|---|---|
| 1 | Relative day and start time | Yes | Eyebrow relative day (`Tonight`, `Tomorrow`, weekday date) plus local clock. |
| 2 | Game name | Yes | Fallback `Untitled Game`. |
| 3 | Group, or `Pickup` when groupless | Yes | Group name when `groupId` is set; the word **Pickup** when the Game has no Group. |
| 4 | Venue and Court | Optional | From the Match's Court, not from a Game-level Court. Unavailable until Match.courtId is a Court. |
| 5 | Format | Optional | **Friendly game**, **Americano**, **Friendly tournament** (`GameFormatBadge`). |
| 6 | Registration state | Optional | **open**, **full**, **closed**, plus **cancelled** as a Game-level door. Carried by text and shape, not colour alone. |
| 7 | Spots with progress | Optional | `6/8` plus a 4px track. Omit when caps are unknown. |
| 8 | Registered Users as `AvatarStack` | Optional | Game-scoped pool; overflow count as today. |
| 9 | Level band | Optional | Rankings only. Do not show until rankings schema exists. |
| 10 | Price per player | Optional | Columns `totalPrice` / `pricePerPlayer` exist and are unread. `games-matches` explicitly excludes payment. Do not surface. |
| 11 | Exactly one primary action | Yes when the row is a destination | `Register`, `Join waitlist`, or `View`. Home/Group reduced rows stay non-actions until Game home is the destination. |

Reduced (phase-one) props, already shipping: relative day and time, Game name, Group, sport, optional cancelled status. No chevron and no pointer cursor when `href` is omitted.

## 1.3 Field-availability table

| Field | Today on this branch | Source / owner |
|---|---|---|
| Name, window start/end, sport, Group | Exists | `games` via `users.home`, `groups.byId`, Game lists |
| Status as pending/confirmed/completed | Legacy Game status moved onto **Match** (`matches.status`) by TEM-35 / TEM-40 | `.scratch/games-matches/spec.md` |
| Cancelled | `games.cancelledAt` | TEM-36+ |
| Venue and Court | **Broken on the old Game row; corrected on Match** | When the redesign spec was written, `games.courtId` referenced `venues.id` (ADR-0007 leftover), not `courts.id`. TEM-35 renamed that table to `games_legacy` (constraint `games_legacy_court_id_venues_id_fk`). The new `games` table has **no** `courtId`. **Match.courtId** references `courts.id` (TEM-40). Venue and Court on a Game card therefore come from the Game's Matches, not from the Game row. |
| Format, open/full/closed, spots, Waitlist | Exists in schema after TEM-36 / TEM-37 | Do not re-specify; defer to `games-matches` |
| Registered Users, avatars | Game-scoped pool (TEM-36, TEM-39) | `game_players` + User image |
| Price per player | Columns exist, unread | `games-matches` excludes payment |
| Level or skill band | Does not exist | Rankings phase (this file, Part 2) |
| Set scores and Match result | Sets (TEM-41) | Match completion; counters stay at zero |

## 1.4 `game_team_players` runtime hazard

`packages/db/src/schema/game-team-players.ts` declares table `game_team_players`. TEM-35 owns the Game/Match rename and Game lists.

Inspected on this branch:

- The Drizzle snapshot `packages/db/drizzle/meta/0020_snapshot.json` includes `public.game_team_players`.
- **No** `CREATE TABLE "game_team_players"` exists under `packages/db/drizzle/*.sql` (including `0020_game_parent_and_matches.sql`).

If TEM-35's migration set is incomplete in an environment that applies SQL files only, the schema module and the database can diverge. Treat that as a runtime hazard. Do not fix the migration in this ticket.

## 1.5 Game home layout (contract for TEM-36)

Order of sections. Each reuses an existing primitive.

1. **Identity header** — Game name as the page's only `<h1>`, format and registration badges, Group or Pickup, window. One primary registration action (`Register` / `Join waitlist` / leave). Overflow in `ActionMenu`. Primitives: `PageHeader` or entity header + `Button` + `ActionMenu` + `ConfirmDialog` for leave/kick/cancel.
2. **Matches** — each Match with its two **Game teams**, **Court**, and **Sets**. Primitive: `Section` + `RowList` / `ListRow`. Empty: `EmptyState` (a Game with no Matches is valid for Americano and for a Friendly tournament before the organizer adds any).
3. **Organizer controls** — close/reopen, kick, cancel, cap, window, assign Courts/sides. Behind `ActionMenu`, confirms on destructive verbs via `ConfirmDialog`.
4. **Waitlist** — below registered entries, unbounded FIFO. Primitive: `RowList` + `ListRow`.
5. **Game Lookup invite and Game Invite link** — `ResponsiveDialog` from the `ActionMenu`. Same mint-on-copy six-hour token rules as other Invite links. Do not re-specify.

Also reuse `StatStrip` (caps / registered counts when available), `AvatarStack` (registered Users), `EmptyState`, `ErrorState`.

## 1.6 States a Game surface must express

Registration doors (text + shape, greyscale-distinguishable):

- **open** — under cap; Register is the primary action.
- **full** — at cap; Join waitlist is the primary action.
- **closed** — organizer closed; join doors refused.
- **cancelled** — Game `cancelledAt` set; join doors refused. Not the same as closed.

Perspectives:

- **registered** — already in the Game pool or on a Game team.
- **waitlisted** — on the Waitlist.
- **organizer** — sees ActionMenu controls.
- **viewer** — can read what authorization allows; no organizer chrome.

Other:

- **Soft-archived Club Group Game** — stays visible; join, Waitlist, and Game invites are closed (TEM-43). `SoftArchiveBanner`. Not a missing page.
- **Game with no Matches** — Americano this slice, or Friendly tournament before Matches exist. Matches section is an `EmptyState`, not a hidden tab.

Match result (when TEM-41 Sets exist): carried by set scores and a completed/pending label, not by green/red fills alone. Every Game and Match status must remain distinguishable in greyscale (label + shape/dot, same system as `GameStatusBadge`).

## 1.7 Navigation activation

Constant: `SHOW_GAMES_NAV_ITEM` in `apps/temba/src/components/layout/app-nav.ts` (introduced in TEM-57).

When flipped to `true`:

- The Games slot becomes the **second of five** items (Home, Games, Groups, Communities, You).
- `APP_NAV_SLOTS` already holds five entries; the bottom nav is `grid-cols-5` with an empty Games cell while the flag is false.
- Geometry of the bar **does not change** when the slot lights: same five columns, same `--bottom-nav-height` and `--rail-width`.

Do not flip the flag in this ticket.

---

# Part 2 — Rankings contract (not buildable)

**Nothing in this part is scheduled.** No `--level-*` token may be added to `apps/temba/src/styles/globals.css` until rankings schema exists. No level, rating, or ELO exists in the schema today. `game_players.self_performance_rating` was a leftover integer that **TEM-35 dropped** (`DROP COLUMN` in `0020_game_parent_and_matches.sql`); it was neither written nor read as a ranking. Do not revive it as a skill level.

`.scratch/padel-teams/spec.md` and `.scratch/games-matches/spec.md` both deliberately leave User, Group, and Team counters at zero. Rankings depend on Sets and Match completion from TEM-41. Rankings work requires its **own grilled spec** and probably an ADR before scheduling.

## 2.1 Four candidate products (none exists)

| Product | Would need (none of this exists) |
|---|---|
| Per-User rating or level | Table e.g. `user_ratings` (`user_id`, `sport`, `rating` numeric, `level` smallint 1–5, `updated_at`). Procedure e.g. `users.rating`. Write path after completed Matches. |
| Cross-Group ranking | Table e.g. `sport_rankings` or a query over `user_ratings` with positions. Procedure e.g. `users.leaderboard`. Attribution rules (which Games count) are unspecified. |
| Standing movement over time | Table e.g. `standing_snapshots` (`group_id`, `user_id`, `position`, `captured_at`) or an event log. Procedure e.g. `groups.standingHistory`. Home's ▲2 / ▼1 needs this. |
| Player profile | Procedure e.g. `users.profile` aggregating rating, form, Groups, Teams. No profile route is in this redesign. |

Do not implement any of those tables, columns, or procedures here.

## 2.2 Level and rank ramp (artefact values only)

Do **not** add these to `globals.css`.

`--background` on light is `oklch(1 0 0)`. Text-on-background pairs use L ≤ 0.38 so contrast is at least **4.5:1** (measured against white; these L values are in the 7:1 class). Fill chips use a pale wash; the **text token** sits on that fill and must also meet 4.5:1 against the fill.

No level is identified by colour alone. Pair each with a **label** (`Level 1` … `Level 5`) and a **shape**.

| Token | oklch | Use | Shape | Label |
|---|---|---|---|---|
| `--level-1-text` | `oklch(0.38 0.08 250)` | Text on `--background` and on `--level-1-fill` | Circle | Level 1 |
| `--level-1-fill` | `oklch(0.94 0.025 250)` | Chip fill | | |
| `--level-2-text` | `oklch(0.38 0.08 200)` | Same | Rounded square | Level 2 |
| `--level-2-fill` | `oklch(0.94 0.025 200)` | Chip fill | | |
| `--level-3-text` | `oklch(0.36 0.08 155)` | Same | Diamond | Level 3 |
| `--level-3-fill` | `oklch(0.94 0.025 155)` | Chip fill | | |
| `--level-4-text` | `oklch(0.36 0.09 75)` | Same | Hexagon | Level 4 |
| `--level-4-fill` | `oklch(0.94 0.03 75)` | Chip fill | | |
| `--level-5-text` | `oklch(0.35 0.08 20)` | Same | Pentagon | Level 5 |
| `--level-5-fill` | `oklch(0.94 0.025 20)` | Chip fill | | |

Approximate contrast vs `--background` `oklch(1 0 0)`: text tokens L 0.35–0.38 yield **≥ 7:1**. Text vs matching fill (L 0.94, chroma ≤ 0.03): **≥ 4.5:1**. Re-measure in a contrast tool before adding to CSS.

Greyscale: shapes and the numeric label remain when chroma is removed.

## 2.3 `LeaderboardRow` extension

Existing row (TEM-65): fixed rank slot (`tabular-nums`, ranks 1–3 as a neutral chip with icon + weight), `UserAvatar`, name at `text-lead`, sets / points / Games at `text-meta`, **You** treatment (`bg-brand-subtle`, `border-l-brand`, literal text `You`).

Add **without displacing** those:

- **Level** — shape + `Level n` immediately after the avatar, before the name block.
- **Recent form** — `FormBadge` at the end of the meta line, after the stored counters.

Do not replace the rank slot with a level colour. Do not drop the You treatment.

## 2.4 `FormBadge`

Compact recent-**Match**-outcome indicator.

- Maximum length: **5** completed Matches, newest at the right (or left — pick one in the rankings spec; default newest-right).
- Each outcome is a letter, not only a coloured cell: **W**, **L**, **D** (draw, Sets allow draws).
- Optional pale fill behind the letter; the letter is required so greyscale still reads.
- Fewer than 5 results: render only the Matches that exist; do not fabricate placeholders as wins.
- Zero results: omit the badge.

No Match-result history exists until TEM-41 completion writes something other than zeroed counters. `FormBadge` has no data source today.

---

# Glossary

Terms match root `CONTEXT.md`: **Game**, **Match**, **Set**, **Game team**, **Waitlist**, **Americano**, **Friendly tournament**, **Friendly game**, **Court**, **Venue**.
