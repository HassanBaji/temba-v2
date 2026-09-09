Status: draft

# Game card side Join

This spec **amends** `.scratch/games-hub-tabs-and-cards/spec.md` stories **16–18** (roster is joinable; Join need not open a sheet first). It **keeps** stories **27–28** (non-CTA surface still opens Game home; Join / seat controls must not navigate).

It does not replace the hub spec. Unamended hub stories (tabs, list membership, waitlist, Americano Register, View/Details, Soft-archive) stay in force.

## Problem Statement

On the Games hub, an individual Friendly game card already shows who sits on each side, but those sides are display-only. Join is a separate footer **Join game** button that opens a Position picker. The roster is tall (`+` / Open chips at 46px), so time and Venue compete with empty seats. Users who already know which Game team they want still cannot join by tapping that side.

## Solution

On Games hub `GameSummaryCard` only, each **joinable side** (a Game team with at least one vacant Position) is a compact **Join** button. Tapping it one-taps the existing seat-register door for a resolved Position and stays on the list. A fully occupied side stays a small avatar cluster and is part of the card’s Game-home link. The footer **Join game** control is omitted on these joinable roster cards; Join waitlist, Register, Details, and Invite a player stay in the footer for other states.

Game details still uses the join sheet. Admit rules, Preferred Position (sheet pre-select, never auto-submit), schema, and list payloads do not change.

## User Stories

1. As a signed-in User on Games looking at an open individual Friendly game I can register for, I want each vacant side to look like a **Join** button, so that the roster itself is the call to action.

2. As that User, I want tapping a joinable side to seat me without opening a picker and without leaving the list, so that I join in one tap from the card.

3. As that User tapping a side that already has one occupant, I want to take the remaining Position and become that partner, so that the incomplete Game team completes.

4. As that User tapping a side where both Positions are vacant, I want to sit **left** if it is free, otherwise **right**, so that an empty side still has a deterministic one-tap seat.

5. As that User, I do not want the card shortcut to auto-submit my Preferred Position, so that Preferred Position remains a sheet default and not a silent rule.

6. As that User looking at a fully occupied side on a still-joinable Game, I want that side to show the two occupants and not be a Join button, so that I only join the side that still has a vacancy.

7. As a User who is already registered, seated, or waitlisted, I want vacant Positions on the card to stay non-join display (compact open slots, not Join), and the footer to stay **Details** or **Invite a player**, so that I cannot double-register from the roster.

8. As a User on a **full** individual Friendly game I may waitlist for, I want the compact occupied roster plus footer **Join waitlist** (one tap, no sheet), so that overflow still matches Game home and the hub spec.

9. As a User on a closed, cancelled, or Soft-archived Game shown on the hub, I want no Join on the sides and footer **Details** only, so that frozen doors stay frozen.

10. As a User tapping the non-Join card surface (time, Venue, occupied sides, footer meta), I want to open Game home, so that detail, invites, and organizer tools stay one tap away.

11. As a User tapping **Join** on a side, I want no navigation to Game home, so that join does not fight the list.

12. As a User scanning the card, I want the roster and sides to take less vertical space than today’s 46px chips, with occupied avatars smaller and time/Venue remaining the hero, so that the card is easier to scan.

13. As a User who uses a screen reader, I want each Join control named (for example **Join Team A** or **Join Team B, right, with Alex**), so that I do not rely on hatch or colour.

14. As a User whose seat-register succeeds, I want the existing success toast, to stay on the hub, and the card to refresh to a joined / View state, so that browsing continues.

15. As a User whose seat-register fails (conflict, closed, gate), I want the existing error toast and a refreshed list, so that a stale Join does not stay tappable.

16. As a User on an Americano, Friendly tournament, or team-only card, I want today’s reduced card and footer actions unchanged (Register / Join waitlist / Details, no Friendly 2v2 Join sides), so that only individual Friendly game gets side Join.

17. As a User opening Game home from the card, I want the existing join sheet and lineup unchanged, so that Position picking on Game details is not redesigned by this slice.

18. As a User on Home or Group home, I want those surfaces unchanged, so that this Join shortcut stays on the Games hub card the request named.

19. As a User joining while another request is in flight on that Game, I want the side Join buttons disabled, so that double-submit is hard.

20. As a developer, I want a single Game summary card still grown via optional behaviour (no second Game card component), so that the redesign contract holds.

## Implementation Decisions

- **Surface:** Games hub lists that already render `GameSummaryCard` with `showsFriendlyRoster` sides. Do not grow Home’s next-Game hero, Group home’s reduced card, or Game details lineup.

- **No API / schema:** Hub rows already include two placeholder sides with `left` / `right` occupants. `onJoinSeat` already calls `registerSeat` with `{ gameId, sideIndex, position }`. Do not add a tRPC door, do not put Preferred Position on the list payload, do not change admit / occupancy / freeze.

- **Position resolution (pure helper, card-level):** For a side, if both Positions vacant → `{ sideIndex, position: "left" }`; if only left vacant → left; if only right vacant → right; if neither vacant → not joinable. Preferred Position is ignored on this shortcut.

- **When a side is a Join button:** `primaryAction === "join"` AND that side has at least one vacant Position AND `onJoinSeat` is provided. Otherwise the side is display-only.

- **Footer:** If the Friendly roster is shown and `primaryAction === "join"`, omit the footer Join game button. Keep Join waitlist, Register, Details, Invite a player. If `primaryAction === "join"` without a roster, keep today’s footer Join → sheet as a fallback.

- **Sheet:** `FriendlyGameJoinSheet` remains the Game details (and fallback) picker. Do not change its confirm flow, Preferred Position rules, or copy in this slice. The card’s roster Join path should not open it.

- **Link vs button:** Keep the absolute overlay `Link` plus `pointer-events-none` on the card body/footer, with `pointer-events-auto` only on interactive CTAs (side Join, waitlist, Register). Join buttons `type="button"` and stop the click from activating the overlay. Occupied / non-join roster is not a button.

- **Visual (structure, not pixel-perfection):**
  - Joinable side: one compact solid button, visible label **Join** (not **Join game**, not `+` / Open).
  - Partial joinable side: smaller occupant avatar (and first name / You) inside or beside that same button so the partner is visible.
  - Fully occupied side: two smaller avatars + first names / You; not a button.
  - Vacant Positions when the viewer cannot join: compact open slot, not labelled Join.
  - Tighten roster padding versus today’s 18px rule; occupied avatar size toward Home’s compact seat avatars; Join min-height about 36px so it stays tappable.
  - Keep the **vs** divider between the two sides.

- **Copy / a11y:** Visible **Join**; `aria-label` via existing Friendly side labels (Team A / Team B) plus remaining Position and partner name when partial. Pending: disable Join buttons on that card; do not rename both to Joining…. Success/error toasts stay on the hub page mutation.

- **Hub skeleton:** Match the compact roster height so loading placeholders do not flash the old 46px chips.

- **Architecture:** Logic stays in the card and in the existing `game-summary-cta` helper module. No service layer, no new component family, no twin `server/` verb file. One endpoint per file is unchanged because no new procedure is added.

- **Amendments to the hub spec (normative for this slice):**
  - Story 16: vacant sides are Join buttons; occupied seats are smaller avatars; empty chips are not the join affordance.
  - Story 17: primary Join for individual Friendly on the hub card is the vacant side, not a footer control that opens a picker.
  - Story 18: that Join calls seat-register directly with a resolved Position.
  - Stories 27–28: unchanged.

## Testing Decisions

- Test **external behaviour**, not CSS pixels. Do not snapshot the card.
- **Primary seam:** a pure helper that maps one side → `{ sideIndex, position } | null` (empty → left; partial left occupied → right; partial right occupied → left; full → null). Prior art: `game-summary-cta.test.ts`.
- **CTA wiring:** when roster + join, footer Join game is absent; waitlist/register/view footer labels unchanged (`gameCardActionLabel` still returns **Join game** for the unused join verb). Prior art: same test file.
- **Do not** add a PGLite test whose only point is “Join lives on the card.” Admit / `registerSeat` already covered. Do not assert sheet-open on hub roster Join.
- Optional component test only if the repo already tests this card (it does not today); prefer the helper + existing CTA tests over a new RTL suite.
- Manual / hub check: My Games and Public individual Friendly cards; overlay Link still opens Game home from time/Venue/occupied side; Join does not navigate; Americano/tournament cards unchanged.

## Out of Scope

- Game details lineup and `FriendlyGameJoinSheet` redesign (including Preferred Position pre-select, which is specified elsewhere and not shipped in the sheet today)
- Home next-Game hero / `HomeSeatRow` join
- Group home `GroupGameCard`
- Friendly tournament N×2 grid join on the card
- Americano pool join beyond today’s footer Register / Join waitlist
- Team-only Team picker on the card
- Schema, new tRPC doors, admit / Waitlist / freeze / occupancy rule changes
- Auto-submitting Preferred Position from the list
- Opening a side-scoped picker for empty sides
- Nested `<button>` inside a wrapping `<Link>` (forbidden; keep overlay Link)
- Price, filters, payment

## Further Notes

- Domain vocabulary: Game, Friendly game, Position (left/right), Game team, side, Waitlist, Game admit, Preferred Position. Avoid “event”, “club” for Community, “match” for Game.
- Parent hub spec: `.scratch/games-hub-tabs-and-cards/spec.md`. Seats: `.scratch/individual-game-seats/spec.md`. Preferred Position: `.scratch/onboarding-questionnaire/spec.md` stories 35–37. Design contract: one Game card, optional props (`.scratch/redesign/games-and-rankings-contract.md`).
- Shipped footer copy is **Join game**; this slice’s side CTA visible label is **Join** as requested. Game details confirm remains **Join game**.
- Two Users tapping the same empty side both resolve to left; the second gets the existing conflict toast and a refresh, then can tap the now-partial side for right. Acceptable; same class of race as two people picking the same Position in the sheet.
- Linear was not authenticated in the planning session, so the implementation ticket was not published. Draft ticket:

  **Title:** Join an individual Friendly game from the vacant side on the Games hub card

  **What to build:** On Games hub My Games and Public, an open individual Friendly game card lets the User join by tapping a compact **Join** button on a vacant side. That tap seats them through the existing seat-register door and leaves them on the list. Occupied sides stay small avatars and still open Game home. Footer Join game goes away on those joinable roster cards; waitlist / Register / Details stay.

  **Blocked by:** None (can start immediately).

  **Acceptance criteria:**
  - Joinable vacant side (empty or one occupant) is a real **Join** button, smaller than today’s 46px chips, with an accessible name (Team A/B, remaining Position and partner when partial).
  - Empty side one-taps left then right; partial side one-taps the remaining Position; Preferred Position is not auto-submitted.
  - Fully occupied sides are not Join controls; tapping them (or time/Venue) opens Game home.
  - Tapping Join does not navigate; success/error keep existing toasts, stay on the list, and refresh queries.
  - Footer **Join game** is omitted when the Friendly roster is shown and the primary action is join; **Join waitlist** / **Register** / **Details** / **Invite a player** still appear in the matching states.
  - Americano, Friendly tournament, team-only, already-in, closed, archived, and Game details join sheet are unchanged.
  - Overlay Link + `pointer-events-auto` on Join only (no nested button inside a wrapping link). Join min-height stays a usable tap target (~36px).
  - Helper tests cover empty / partial / full Position resolution. No new tRPC, schema, or admit changes.
