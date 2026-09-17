# Groups list and Group home redesign

Status: ready-for-agent

Tickets (Linear, `ready-for-agent`), in dependency order:

- [TEM-214](https://linear.app/temba-app/issue/TEM-214) Extract `ResultMark`, add `FormStrip` and `LevelCell` — no blockers
- [TEM-215](https://linear.app/temba-app/issue/TEM-215) Derive W-L, form marks and next game — no blockers
- [TEM-216](https://linear.app/temba-app/issue/TEM-216) Rebuild Group home chrome — no blockers
- [TEM-217](https://linear.app/temba-app/issue/TEM-217) Redesign the Groups list — blocked by TEM-214, TEM-215
- [TEM-218](https://linear.app/temba-app/issue/TEM-218) Redesign Standing and Members — blocked by TEM-214, TEM-215, TEM-216
- [TEM-219](https://linear.app/temba-app/issue/TEM-219) Rebuild the Games tab on `GameSummaryCard` — blocked by TEM-214, TEM-216

Design source: Claude Design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`, file `Temba.dc.html`, screens **05 Groups list**, **06a Group detail — Standing**, **06b Group detail — Games**, **06c Group detail — Members**.

Owners this spec defers to, where they disagree:

- Game product behaviour: `.scratch/games-matches/spec.md`
- Game card visual contract: `.scratch/redesign/games-and-rankings-contract.md` §1.1–1.3
- Per-User Rating / Level / Level band: `.scratch/user-ratings/spec.md` (ADR-0009)
- Group home mobile chrome: `.scratch/group-home-mobile-chrome/spec.md`
- Group image (leading monogram on hub rows; optional file at create): `.scratch/group-image/spec.md`
- tRPC placement: `.cursor/rules/api-one-endpoint-per-file.mdc`

## Problem Statement

The Games hub was rebuilt on the Temba design canvas (`MatchHistoryCard`, `GameSummaryCard`, the `ink`/`paper`/`rule`/`dim` tokens, `font-expanded`, the `hatch` utility). The Groups surfaces were not. They are still the generic list-and-rows shell from the Tier-1 redesign.

`/dashboard/groups` renders `RowList` + `ListRow` with a monogram, the Community name, and a sport badge. It answers "which Groups am I in" and nothing else — not when you next play, not where you stand, not how you have been going. Pending Group invites live on a separate `/invites` route, so a player who was invited to a Group sees nothing about it on the Groups screen.

`/dashboard/groups/[id]` is a header, a three-cell `StatStrip`, an action bar, and three line-tabs over `RowList`s. The Standing tab is a leaderboard of `19 sets · 575 points · 25 Games` meta strings with trophy/medal/award icons — it ranks players but does not say how good they are or how they have been playing. The Games tab renders `GroupGameCard`, a second, simpler Game card that `.scratch/redesign/games-and-rankings-contract.md` §1.1 explicitly forbids ("`GameCard` is one component… **Forbid a second parallel Game card component.**"). The Members tab is name-over-games-count rows.

The design replaces all of this with Group surfaces that lead with the same facts the rest of the App now leads with: when you next play, where you stand, and what your form looks like.

## Solution

Rebuild both screens on the existing token system and the existing shared cards, and widen `groups.mine` and `groups.byId` to serve the facts the design draws. No new design system, no new Game card, no service layer.

Three pieces of derived data are new and are specified in §4: **W-L per Group member**, **Level band per Group member**, and **form marks** (the last five results as won / lost / not-played marks).

`GroupGameCard` is deleted. The Group Games tab renders the shared `GameSummaryCard` for Scheduled Games and a new compact `GroupPlayedRow` for the Played list.

### Decisions taken

| # | Decision | Rationale |
|---|---|---|
| D1 | Extend the endpoints rather than drop unbacked fields | Chosen over the Tier-1 "drop the field" precedent. The screens land as drawn. |
| D2 | Derive W-L per request from the Group's completed Matches; **no** new `group_members` counters, **no** migration, **no** backfill | Reuses `matchOutcome` (`~/server/games/match-outcome`), the same seam `listMyMatchHistory` uses. Avoids a second write path that can drift from the standing counters. |
| D3 | Retire `GroupGameCard`; the Group Games tab uses `GameSummaryCard` | Required by the Games contract §1.1, and it is what design 06b draws. |
| D4 | The hatched Level placeholder means **Provisional**, not "fewer than 10 rated matches" | The design's caption is mock copy. The domain's real rule is `isProvisional(phi)` (φ ≥ `PROVISIONAL_PHI_THRESHOLD`), ADR-0009. Inventing a 10-match rule would contradict the Rating spec. Caption copy changes accordingly — see §3.1. |
| D5 | Level band is read from `ratings` for `(member.userId, group.sport)` | `ratings` is unique on `(user_id, sport)` and every Group carries a `sport`. A Group with a null `sport`, or a member with no `ratings` row for it, shows the hatched placeholder. |
| D6 | The Groups list Invitations block reads `groups.pendingLookupInvites` and accepts through `groups.acceptLookupInvite` | Both already exist. `/dashboard/invites` is unchanged and stays the canonical Invites surface; this is an additional entry point, not a move. |
| D7 | Standing keeps its existing sort (`sortStandingMembers`: sets, then points, then games) | The design shows W-L and Level as columns, not as the ranking key. Changing the ranking key is out of scope and would move every player's position. |
| D8 | "Organizer" on the Members tab means: the Group creator, or — for a Club Group — a Community staff member | `isStaffRole` already exists in `~/server/games/access`. A Loose Group has exactly one Organizer, its creator. |
| D9 | The result mark SVG is extracted from `match-history-card.tsx` into a shared `ResultMark` | The design uses `#tembaWon` / `#tembaLost` / `#tembaNotPlayed` on four screens. A third inline copy would be duplication. The shared component adds the `not-played` variant the design draws. |

## 1. Groups list — `/dashboard/groups` (design 05)

One `Groups` title with a `plus` action, then three blocks in order: **your Groups**, **Invitations**, **Start a group**.

### 1.1 Group rows

A single bordered card (`border-rule rounded-[14px]`), one row per Group, hairline-divided. Each row carries:

- **Image** — leading `EntityMonogram` with the Group image URL, initials fallback. Specified in `.scratch/group-image/spec.md`. Do not reopen W-L, form, or next Game there.
- **Name** — 18px, semibold.
- **Meta** — `"{n} members, you are rank {r}"`. When the viewer has no standing position (no results yet), `"{n} members"`. Pluralise `member`.
- **Next game** — right-aligned, `font-expanded` weekday abbreviation over a 12px `next game` caption. Drawn from the Group's soonest upcoming Game. When there is none, the design draws a 52×44 hatched block instead — render `<span className="hatch" />` at that size with `aria-hidden`, and no caption.
- **Form strip** — the first row in the design carries the viewer's last five results as marks, with a right-aligned `your form here` caption. Render the strip on **every** row that has at least one result, not only the first; omit the whole line (caption included) when the viewer has no results in that Group.

The design's third row shows `"22 members, season starts 20 Sep"`. There is no season-start field in the schema and none is invented — that row renders the standard `"{n} members"` meta with the hatched next-game block.

The whole row is the link to `/dashboard/groups/{id}`.

### 1.2 Invitations

Rendered only when `groups.pendingLookupInvites` returns at least one row. A bordered card with a 13px `Invitations` header rule, then one row per invite: Group name over `Invited by {name}`, and a 40px outlined **Join** button that calls `groups.acceptLookupInvite`.

On success: toast, invalidate `groups.pendingLookupInvites` and `groups.mine`, and the Group appears in the list above. The button shows a pending state and is disabled while the mutation runs.

### 1.3 Start a group

Rendered only when `useCreateAccess().hasCreateAccess`. Title `Start a group`, the design's supporting copy, then the sport row: **Padel** as a filled ink button linking to `/dashboard/groups/new`, and **Football** as a hatched, non-interactive, `aria-disabled` tile. This matches the existing Padel-only gate (`.scratch/padel-only-ui/spec.md`) — Football is drawn as visibly unavailable, not as a working choice.

### 1.4 States

- **Loading** — a skeleton shaped like the row card (three rows), not `ListPageSkeleton`.
- **Error** — `ErrorState`, unchanged.
- **Empty** — when the viewer is in no Groups, the Group card is omitted entirely. Invitations and Start a group still render if they apply. When all three are absent, `EmptyState` as today.

## 2. Group home chrome — all three tabs (design 06a/b/c)

A single header block above a hairline, shared by the three tabs:

- Back chevron at 40×40 in a `border-rule rounded-[10px]` box, left. A 40×40 action box, right — `user-plus` opening the invites dialog on Standing and Members, `plus` linking to Game create on Games. The right box is omitted when the viewer has neither permission.
- Group name at 28px bold, `tracking-[-0.01em]`.
- Meta at 13px: `"{Sport}, {n} members, season since {Mon}"`, built from `sport`, `standing.memberCount`, and `createdAt`. Parts with no value are dropped, and the remainder joined with `", "`.
- **Segmented tab control** — one `border-rule rounded-[12px]` strip, three equal segments, the active one filled `bg-ink text-paper`. This replaces the current `variant="line"` `TabsList`. Keep the existing `Tabs` primitive, the `?tab=` query wiring (`groupHomeTabFromQuery` / `groupHomeTabQuery`), and the 44px minimum touch targets.

The existing mobile top bar (`GroupHomeTopBar`, collapse-on-scroll) and overflow menu stay as specified in `.scratch/group-home-mobile-chrome/spec.md`. The overflow menu keeps every item it has today; the header's right-hand box is an additional shortcut to the invites dialog, not a replacement for it.

`GroupHomeHeader`, `GroupHomeRecordStrip`, and `GroupHomeActionBar` are replaced by this header plus the per-tab content below. The CTA logic in `~/lib/group-home-cta` is unchanged and still drives which affordances appear — the join / create-game / invite actions move into the header box and the tab bodies rather than a standalone action bar row.

Soft-archive banners keep their current placement and copy, directly below the header.

## 3. Standing tab (design 06a)

### 3.1 The table

A bordered card with a 12px column header — `#`, `Player`, `W-L`, `Level` — then one row per member:

| Column | Width | Content |
|---|---|---|
| `#` | 26px | Position, `font-expanded`, 18px |
| Player | flex | Name, 15px. The viewer reads **You** and is semibold |
| W-L | 54px | `{wins}-{losses}`, `font-expanded`, right-aligned, tabular |
| Level | 56px | Level band label, `font-expanded`, right-aligned |

The viewer's row is inverted: `bg-ink text-paper`.

A member whose Rating is **Provisional**, or who has no `ratings` row for the Group's sport, gets a 44×20 hatched block in the Level column instead of a label. The footer caption reads **"Hatched level means the Rating is still Provisional"** (D4).

The existing `LeaderboardRow` and its trophy/medal/award `RankSlot` are retired for this surface. `sortStandingMembers` and `standingPosition` are unchanged (D7).

### 3.2 The stat pair

Below the table, a bordered card split in two by a hairline: `totalGamesPlayed` over `games played`, and an **awaiting score** count over `awaiting score`. Both `font-expanded` at 26px.

`awaiting score` is the number of the Group's Games whose Matches have started but carry no scored Set — derived in `groups.byId` using the existing `needs_results` derivation shape in `~/server/home/carousel-games.ts`. When the count is zero the cell still renders, showing `0`.

### 3.3 States

Non-member, and member-with-no-results, keep their current `EmptyState` copy and the create-first-game CTA. When there are members but no results, the table renders with W-L at `0-0` and the empty-state message above it, as today.

## 4. Games tab (design 06b)

Two sections, `font-expanded` 19px headings.

### 4.1 Scheduled

Renders `GameSummaryCard` — the same component the Games hub uses (D3). `GroupGameCard` is deleted.

This requires `groups.byId.upcomingGames` to carry the fields `GameSummaryCard` reads and the Group payload currently omits: `sides` (the seat roster, with `isViewer`), `canRegister`, `registrationMode`, `groupName`, and the Venue's `city`. Follow the shape `games.listMyGames` already returns; do not invent a second shape.

The Group name in the card footer is this Group — the design writes `Tuesday Crew, week 36`. There is no week number in the schema; render the Group name alone.

Seat-join and register from the card work exactly as they do on the Games hub, through `games.registerSeat` / `games.register`, invalidating `groups.byId` alongside the Games lists.

### 4.2 Played

A bordered card, one hairline-divided row per past Game:

- A `ResultMark` — won / lost / not-played, from the viewer's slot.
- The two team labels: the viewer's side on the first line (the viewer reads **You**), the opposing side plus the date on the second.
- Right: the set scoreline, `font-expanded`, tabular. When the Match has no score, an **Enter** affordance linking to the Game instead — the design draws this, and it is reachable because the row links to the Game either way.

A Game the viewer did not play in has no viewer slot: it renders the not-played mark, both team labels without a **You**, and the scoreline.

This needs `groups.byId.gameHistory` to carry per-slot members, scored sets, and the viewer's slot — the same fields `listMyMatchHistory` already computes. Extract the slot-and-outcome derivation into a shared module rather than copying it, since a second caller now exists.

`GroupPlayedRow` is a new component. It is a compact row, not `MatchHistoryCard`, which stays the Games-hub card.

### 4.3 States

Empty and Soft-archive copy are unchanged from `GroupGamesTab` today.

## 5. Members tab (design 06c)

A bordered card, one hairline-divided row per member:

- 40×40 monogram tile, `rounded-[10px]`. The viewer's tile is `bg-ink text-paper`; others are outlined.
- Name over a role/tenure caption: **Organizer** (D8), otherwise `"Member since {Mon}"` from `group_members.createdAt`. The viewer's name reads **You**, semibold.
- Four form marks (§6).
- Level band, 48px, right-aligned, `font-expanded` — hatched when Provisional (D4).

The member search input stays, on the same `groupHomeShowsMemberSearch` threshold.

Below the card, when the viewer can invite: the design's invite block — a heading, supporting copy, and a full-width ink **Share invite link** button opening the existing `GroupInvitesDialog`. The heading's "Nine seats open this month" is mock copy with no source; use a fixed heading (`Invite players`) and keep the design's second line. The current dashed `Invite members` footer button is replaced by this block.

## 6. Derived data

Three new derivations, all in `groups.byId` / `groups.mine`, all built from Matches the Group's Games already own.

### 6.1 W-L per member

For each member, count completed Matches on this Group's Games where the member sat on a slot, and tally `matchOutcome(...).result` against their slot. Draws count as neither a win nor a loss. Returns `{ wins, losses }`.

### 6.2 Form marks

The last five completed Matches for a User in a Group, newest last (left-to-right reads toward now, matching `home-recent-form`). Each mark is `won` / `lost` / `not-played`. A Match the member was seated on but which has no score is `not-played` — that is what the design's third mark variant is for. Fewer than five results render fewer marks; no padding.

`groups.mine` returns this for the viewer only. `groups.byId` returns it per leaderboard member.

### 6.3 Next game

`groups.mine` returns, per Group, the start time of the soonest upcoming Game, reusing `filterAndSortHomeUpcomingGames`. `null` when there is none.

### 6.4 Cost

`groups.mine` and `groups.byId` both grow a Match-and-Set read across the Group's Games. `groups.byId` already reads every Game with its Matches and Sets, so §6.1 and §6.2 add derivation over rows that are already loaded, not new queries. `groups.mine` does add a Games read across the viewer's Groups — batch it as one query over all Group ids, not one query per Group.

## 7. Shared components

| Component | Status | Notes |
|---|---|---|
| `ResultMark` | **Extract** from `match-history-card.tsx` to `~/components/temba/result-mark.tsx` | Add the `not-played` variant (outlined disc, hatched fill) drawn as `#tembaNotPlayed`. `MatchHistoryCard` imports it instead of its local copy — no visual change there. |
| `FormStrip` | **New**, `~/components/temba/form-strip.tsx` | Renders N `ResultMark`s at a given size. Used by the Groups list rows and the Members tab. |
| `LevelCell` | **New**, `~/components/temba/level-cell.tsx` | A band label or the hatched Provisional placeholder. Used by Standing and Members. Distinct from `LevelBandBadge`, which stays for the badge contexts that use it. |
| `GameSummaryCard` | **Reuse** | No changes beyond what already exists. |
| `GroupPlayedRow` | **New**, `~/components/groups/group-played-row.tsx` | §4.2. |
| `GroupGameCard` | **Delete** | D3. |
| `LeaderboardRow` | **Delete** | Verified: `group-standing-tab.tsx` is its only caller. |
| `GroupHomeHeader`, `GroupHomeRecordStrip`, `GroupHomeActionBar` | **Delete**, replaced by §2 | Their CTA inputs in `~/lib/group-home-cta` stay. |

## Non-goals

- No change to Standing's ranking key (D7).
- No change to the Rating algorithm, the Provisional rule, or how Level bands are computed.
- No `group_members` schema change, no migration, no backfill (D2).
- No season concept. "Season starts 20 Sep" and "week 36" in the design are mock copy with no source and are not built.
- No rating-delta chips on rows — same omission `MatchHistoryCard` already documents.
- No change to `/dashboard/invites`, the invite doors, Soft-archive behaviour, or any permission rule.
- No change to Community, Team, or Tournament screens. Design screens 07a–08a are out of scope.
- No service / repository / use-case layer, and no `server/groups/<verb>.ts` twins for these endpoints. Endpoint logic stays in the procedure file per `.cursor/rules/api-one-endpoint-per-file.mdc`; §6's derivations are shared modules only because two endpoints call them.
- No dark theme work beyond what the tokens already give.

## Risks

1. **`groups.byId` response size and query cost.** It already loads every Game with Matches, Sets, players, waitlist and teams; §4.1 adds seat rosters and §6 adds per-member derivation. Watch the payload on a Group with many Games — `GROUP_GAME_HISTORY_LIMIT` is 20 and should stay.
2. **`groups.mine` is a hot list query.** §6.2 and §6.3 make it substantially heavier. Must be one batched query, not N+1.
3. **Retiring `GroupGameCard` changes join behaviour on the Group Games tab** — cards become interactive (seat join, register) where they were previously navigation only. That is intended, but it is a behavioural change, not just a visual one, and needs the same invalidation discipline the Games hub uses.
4. **Form marks and W-L both depend on Match completion and confirmation** (ADR-0011). A Match awaiting result confirmation must not count as a win or a loss; it is `not-played`.

## Testing Decisions

- `groups.mine` and `groups.byId` endpoint tests extend the existing pglite suites (`byId.test.ts`), covering: viewer rank present and absent, next game present and absent, W-L with a draw, form with fewer than five results, form with an unscored Match, Provisional and missing-`ratings` Level, and the awaiting-score count.
- §6.1–6.3 derivations are pure functions in their own modules with unit tests — no database needed.
- Presentation helpers (header meta assembly, member tenure label, Organizer resolution) are pure functions under `~/lib/`, unit-tested, matching the existing `group-home-chrome.ts` convention.
- No snapshot tests on the new components.
