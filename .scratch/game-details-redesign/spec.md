Status: ready-for-agent

Supersedes `.scratch/game-details-mobile-chrome/spec.md` (shipped in full as TEM-156–TEM-160, PR #91, building on PR #65 / `564de25`; its sticky Overview/Players/Results tabs are live on `dev` today). Amends `.scratch/redesign/games-and-rankings-contract.md` §1.5 "Game home layout" for the individual Friendly game case only. Scoped to individual-registration Friendly games only (`usesFriendlyChrome = showsFriendlyRoster(data.format, data.registrationMode)` in `apps/temba/src/app/dashboard/games/[id]/page.tsx`); Americano, Friendly tournament, and team_only Games keep their current tabbed page unchanged.

## Problem Statement

The Friendly-game details page (`apps/temba/src/app/dashboard/games/[id]/page.tsx`) states date, time, venue, and court twice — once in `FriendlyGameHomeHero`, again in `FriendlyGameOverviewPanel` under the "Overview" tab — and pushes every tab's content below the fold behind a sticky Overview/Players/Results tab bar (this tab structure shipped as TEM-156–TEM-160 / PR #91; it is not an unbuilt proposal, it is what is live now). The page also leaks its data model directly into player-facing copy: the cancel-Match confirm dialog reads "Cancel Match (cancels Game)?" because the schema has both a Match and a Game (ADR-0008) and the player only has a game. Green currently carries two unrelated meanings on this surface family (the game being open, and the viewer being in it), plus a third (occupancy "full") on a sibling component — all three should be a single hatch-and-text vocabulary, not colour.

Separately, the page has no representation for "the game happened and nobody has entered a result" — Home already models this for its own carousel (`HomeCarouselPhase = "upcoming" | "ongoing" | "needs_results"` in `apps/temba/src/server/home/carousel-games.ts`) but the game-details screen has no equivalent, so a played-but-unscored Friendly game looks identical to one still in progress. And there is no concept anywhere in the domain of more than one person agreeing a self-reported score is correct: `completeMatch` lets any one of the four seated Users, or the organizer, unilaterally finalize a result and immediately (same transaction) apply Glicko-2 rating changes to all four Users. `MatchStatusEnum.CONFIRMED` was declared in the schema and never read or written anywhere in the app — a stub for exactly this that was never wired up.

## Solution

Delete the Overview tab and the tab bar with it. Rebuild the page as one scrolling surface — hero → line-up → score → organiser actions, with a sticky bottom action bar — driven by a single `status` prop with three values the UI cares about (`upcoming` | `needs_results` | `final`; `cancelled` is handled separately, unchanged from today). One component tree renders all three states; a dev-only preview route exercises them side by side, matching the pattern `.scratch/home-level-redesign/spec.md` shipped at `/dashboard/design/home`.

Ship the near-monochrome design system this borrows entirely from the already-shipped Home redesign — `--color-ink/paper/rule/wash/dim/dimrule/raised`, the `.hatch`/`.hatch-on-ink` utilities, `font-expanded` (fixed `wdth` 115), global tabular figures — rather than re-deriving tokens from the original design brief, which both invents a `faint` token already rejected during the Home redesign for failing contrast, and describes `font-expanded` as a range where the shipped utility is fixed. Both conflicts are resolved below by following the already-shipped decision.

Add a new **Match result confirmation** step (ADR-0011, `CONTEXT.md`) between "a score is entered" and "the Match completes and rates": the User who enters the Set that first produces a Match result is confirmed automatically, each of the other three seated Users confirms once, and the last confirmation triggers the same complete-and-rate transaction `completeMatch` already runs — no separate manual tap for the common case. The organizer keeps a unilateral force-complete override for a Match where a player will not respond. This is what makes the "Needs a score" and "Final" footer copy true rather than aspirational.

"Report a wrong score" (Final-state organizer action) was presented as a product-risk decision needing explicit sign-off before being scoped in detail: two options were laid out, and the user chose **Option A — gated self-service reversal** over the safer support-routed-flag alternative. See "Resolved decision" below.

Approving this spec approves the `CONTEXT.md` glossary addition and `docs/adr/0011-match-result-confirmation.md` already written (see "Domain decisions" below), and the Test seams in Testing Decisions.

## Domain decisions (already settled — cite, don't re-derive)

- **Team/side/gap structure**: already solved by the existing read model. `byId.ts` returns `sides: [{ sideIndex, gameTeamId, left: SeatOccupant | null, right: SeatOccupant | null }]` via `listGameSides()` (`apps/temba/src/server/games/seats.ts`) for individual Friendly games. A `null` occupant on a real `sideIndex` row is a structural gap, not an inferred one — this already satisfies the acceptance criterion "the API must express which side each player is on, and which side has the gap." No schema change; only additive fields (below).
- **`needs_results` phase**: reuses the name and derivation shape already shipped for Home's carousel (`isHomeCarouselNeedsResults` in `apps/temba/src/server/home/carousel-games.ts`: not cancelled, window ended, not Americano, at cap, at least one Match not completed/cancelled), adapted to this screen's single Match. Not a new vocabulary.
- **Match result confirmation** (`CONTEXT.md`, added by this spec): "A seated User's acknowledgement that a Match's entered Sets are correct. The User who enters the Set that first produces a Match result is confirmed automatically; a Match only reaches completed, and only then rates, once every seated User on its two Game teams has confirmed. An Organizer may still force a Match to completed without full confirmation." A new `match_result_confirmations` table (matchId, userId, confirmedAt) tracks this — not `match.status`. `MatchStatusEnum.CONFIRMED` stays deliberately unused; see `docs/adr/0011-match-result-confirmation.md` for why (a stored Match status and a per-User act reading the same word is a collision, not a reuse). Editing a Set after some confirmations exist but before completed clears existing confirmations except the editor's own fresh one.

## Resolved decision — "Report a wrong score" ships as gated self-service reversal (Option A)

**"Report a wrong score"** (Final-state organizer action) implies reopening an already-completed, already-rated Match. Rating events store before/after μ/φ/σ per User per Match (`.scratch/user-ratings/spec.md`), so a clean rollback is only correct if none of the four Users has had a *later* Rated Match since — Glicko-2 updates are sequential, so restoring "before" values would also erase legitimate later changes if any of the four has played again. Two options were presented for explicit sign-off:

- **Option A — gated self-service reversal (chosen).** Enabled only when none of the four Users has a later Rated Match. If clean: restore all four Ratings to their stored before-values, delete the four rating events, clear `match_result_confirmations`, and drop `match.status` back to `pending` — which re-derives the existing `needs_results` phase (no second lifecycle invented) and re-enters the same confirmation flow (ADR-0011) from zero on the next score entry. If not clean: the action is refused/disabled with a message pointing to manual support — no cascading recompute across a User's later Matches is attempted.
- **Option B — support-routed flag (not chosen).** Would have written a `match_result_disputes` row with no automated reversal, deferring all correction outside the App. Rejected in favour of Option A: the user chose to accept the added scope (an eligibility check plus a reversal mutation) rather than ship a footer button whose copy promises correction it cannot perform.

Recorded in `docs/adr/0011-match-result-confirmation.md`. The ticket set below is written against Option A.

## Design tokens and primitives (already shipped — cite directly)

From `apps/temba/src/styles/globals.css`:

```css
@theme static {
  --color-ink: #000000;
  --color-paper: #ffffff;
  --color-rule: #e6e6e6;
  --color-wash: #f4f4f4;
  --color-dim: #8e8e8e;
  --color-dimrule: #2e2e2e;
  --color-raised: #1c1c1c;
}
@utility hatch {
  --hatch-stroke: #dcdcdc;
  --hatch-inset: var(--color-rule);
  background-image: repeating-linear-gradient(45deg, var(--hatch-stroke) 0 1px, transparent 1px 5px);
  box-shadow: inset 0 0 0 1px var(--hatch-inset);
}
@utility hatch-on-ink {
  --hatch-stroke: #333333;
  --hatch-inset: var(--color-dimrule);
}
@utility font-expanded {
  font-weight: 700;
  letter-spacing: -0.03em;
  font-variation-settings: "wdth" 115, "wght" 700;
}
```

**Resolved conflicts with the original design brief** (both follow the Home redesign's already-shipped, contrast-driven precedent rather than the brief):

1. The brief specifies a `faint #9A9A9A` tertiary text colour. No such token exists. It was proposed during the Home redesign and rejected — 2.56:1 on wash, 2.81:1 on paper, both failing WCAG AA (4.5:1). This screen reuses `text-muted-foreground` (`#6E6E6E`, retuned, 4.64:1 on wash / 5.10:1 on paper) everywhere the brief says "faint." No new colour token.
2. The brief specifies numerals "expanded to `wdth` 112–118" (a range). The shipped `font-expanded` utility is fixed at `wdth` 115 with no shipped instance at any other value. This screen reuses `font-expanded` as-is for every big numeral (hero time/result, Level, rating-impact figures) rather than introducing a variable-value utility with no current use case.

`font-feature-settings: "tnum" 1` is already global on `body` — no per-element `tabular-nums` class is required for correctness. Hatch is always `aria-hidden` decoration; meaning lives in adjacent `sr-only` text (established in `home-recent-form-row.tsx`, `game-seat-grid.tsx`, `home-seat-row.tsx`) — every hatched element on this screen follows the same pattern.

**Component precedents to reuse or adapt, not re-invent:**

- **Black hero** — `apps/temba/src/components/home/home-next-game.tsx` (`bg-ink text-paper rounded-xl p-[22px]`; NOT `home-level-block.tsx`, which is a white surface). Its time treatment (`font-expanded text-[56px] tabular-nums` + `text-dim` trailing meridiem), seat row, and two-button footer are the literal "same object" the brief refers to; this screen's hero reads as the same object at 54px, a deliberately close but not identical size, since the brief specifies 54px for this screen and Home's is 56px.
- **Live countdown** — `apps/temba/src/lib/home-countdown.ts`'s `formatHomeCountdown`/`formatHomeKickoff`, polled with a 30-second `window.setInterval` at the call site (established in `game-summary-card.tsx` and `home-next-game.tsx`). New lib work needed: the brief's "PM until 10:30" composite (start meridiem plus explicit end-time trailer) and "Played 2 days ago" (relative-past phrasing) do not exist in any current formatter — both are small additions to `apps/temba/src/lib/format-game-start.ts` or `home-countdown.ts`, not reuse.
- **W/L mark** — `apps/temba/src/components/home/home-recent-form-row.tsx`'s `FormSlot`: win is `bg-ink text-paper` solid fill with a white letter; loss is `border-ink bg-paper text-ink border-[1.5px]` outline with an ink letter; both carry a visually-hidden `sr-only` label distinct from the `aria-hidden` glyph. No existing component renders this at 46px standalone (form slots are 38px inline) — this screen introduces a standalone-sized variant of the same visual rule, not a new one.
- **Divided figure pair** — `apps/temba/src/components/home/home-all-time.tsx`'s `flex divide-x` row (`font-expanded text-[34px] tabular-nums` over `text-muted-foreground` labels, `divide-rule`/`border-rule`). This screen needs a light-surface 2-column version (Final-state duration/won-by pair) and a **new** black-surface version (`divide-dimrule`/`border-dimrule`, does not exist yet — small addition) for the Upcoming/Needs-a-score hero's price/duration pair.
- **Open-seat hatch** — `apps/temba/src/components/games/game-summary-card.tsx`'s `SeatChip`/`OpenFlag` (light-surface hatch, already renders a "vs"-divided roster) is the closest precedent for the Line-up section, but is a strict subset: it has no per-row subline, "You" tag, or Invite button, so it is a starting point, not a drop-in. `apps/temba/src/components/home/home-seat-row.tsx`'s `HomeSeat` (`hatch hatch-on-ink`, 60px, `+` glyph) is the black-surface precedent for the hero's own compact seat row, which is a distinct, smaller-detail element from the full Line-up section below the hero — the two must not repeat the same fact (e.g. the hero's "3 of 4 players in / One spot open" line and the Line-up section's open-slot row say the same fact at two levels of detail; state clearly in the ticket that the hero shows the summary and the Line-up section is where the gap is actionable, not a duplicate).

**Being deleted, name them explicitly:**

- `game-seat-grid.tsx`'s `VacantAvatar` (dashed-border circle) → `.hatch`.
- `game-occupancy-card.tsx`'s `bg-success`/`bg-warning` tone bar (green usage #1).
- `friendly-game-cta-bar.tsx`'s `"playing"` kind's `text-success` "You're playing" (green usage #2).
- `match-history-card.tsx`'s `Badge variant="success"/"destructive"` and `border-success`/`border-destructive` avatar rings for WON/LOST (green/red usage #3) → the ink-fill/ink-outline W/L mark.
- The whole `Tabs`/`TabsList`/`TabsTrigger` structure in `page.tsx` (~lines 761–913), `FriendlyGameOverviewPanel`, and the tab-state URL query param plumbing (`gameHomeTabFromQuery`/`gameHomeTabQuery`).

## `docs/design/home.md` — not authored

The original design brief cites `docs/design/home.md` as the design-system reference. It does not exist and was confirmed absent before this spec was written. The real, current source of truth is `.scratch/home-level-redesign/spec.md` (approved after seven rounds of grilling on 2026-09-07) plus the shipped code it produced, both cited throughout this spec. `docs/design/home.md` is not authored as part of this effort — canonicalizing a standalone design-system document is a separate, reasonable follow-up (the vocabulary now spans two features) but is out of scope here; flagged for the user rather than silently built or silently ignored.

## User Stories

1. As a User opening an individual Friendly game, I want one scrolling page — hero, line-up, score, organiser actions — with no tab control, so that I never see the same fact (date, time, venue, court) stated twice.
2. As a User, I want the page's visual state (Upcoming / Needs a score / Final) driven by one status prop on one component tree, so that the three states cannot drift into three different implementations.
3. As a User of an Upcoming Friendly game, I want a black hero with a live countdown (recomputed every 30 seconds), a 54px time with a "PM until 10:30" trailing format, venue and court, and a price/duration figure pair, so that the most important facts read at a glance.
4. As a User of an Upcoming Friendly game, I want a Line-up section showing both teams divided by a "vs" rule, each seated User as a 42px chip with name and a "side — level" subline, my own row marked "You", and an open slot rendered as a hatched "+" chip labelled "Open" with an Invite button on that row, so that I can act on a gap I am looking at without scrolling to the bottom bar.
5. As a User of an Upcoming Friendly game, I want a Score section with hatched, non-enterable set boxes and a footer note explaining scoring opens once the court is full, so that I understand why I cannot enter a result yet.
6. As a User of an Upcoming Friendly game, I want the bottom bar to say "You're in / One spot left to fill" with a black "Invite a player" action, so that my own status and the one action that matters are both in one place.
7. As a User whose Friendly game's window has ended with no result entered, I want the page to show a "Needs a score" state — hero still black, countdown replaced by "Played 2 days ago", figure pair replaced by "No score / Nobody has added one" — so that an outstanding action is visually distinct from a game still to come.
8. As a User in the Needs a score state, I want the Score section's boxes to stay hatched but become enterable, with a footer note explaining that anyone who played can add the score and the other three confirm before it counts towards their level, so that I understand both how to act and why it isn't final yet.
9. As a User in the Needs a score state, I want the bottom bar to say "Add the score / Counts once the others confirm" with a black "Add result" action, so that the one thing to do is unambiguous.
10. As the User who enters the Set that produces a Match result, I want my entry to count as my own confirmation automatically, so that I do not have to confirm my own submission separately.
11. As one of the other three seated Users, I want to confirm the entered result with one action, so that the Match only completes and rates once everyone seated has agreed.
12. As any of the four seated Users, I want to see who has and has not yet confirmed, so that I know whose action is outstanding.
13. As an organizer of a Match where a player will not respond, I want to force-complete the Match without full confirmation, so that a stuck game is not stuck forever.
14. As a User who edits a Set after some confirmations already exist, I want those confirmations cleared except my own fresh one, so that a changed score requires re-agreement rather than surviving on stale confirmations.
15. As an organizer in the Needs a score state, I want a single quiet "Mark as not played" action with the consequence line "No result is recorded and nobody's level changes," so that I can void a game that did not happen without any other destructive-action clutter on the page.
16. As a User of a Final Friendly game, I want the hero to flip to white with a hairline border, so that a finished game reads as history rather than competing visually with tonight's game.
17. As a User of a Final Friendly game, I want the result — a date/verdict top row, a 46px W or L mark beside the verdict word, set scores from my own perspective, venue with kickoff demoted to a subline, and a duration/won-by figure pair — to replace the time as the hero's content, so that nobody needs "9:00 PM" once the game is over.
18. As a User of a Final Friendly game, I want the Line-up section's winning team marked with a small solid-ink "Won" tag and no invite affordances, so that the roster reflects the result without repeating the score.
19. As a User of a Final Friendly game, I want the Score section's winning team boxes solid ink with a white numeral, the losing team's ink-outlined, and any set that was never played to stay hatched, so that a two-set win visibly means the third set never happened.
20. As a User of a Final Friendly game, I want a footer note reading "Confirmed by all four players on [date]. Nothing else needed," so that the confirmation step from the Needs a score state has a visible resolution.
21. As a User of a Final, rated Friendly game, I want a Rating impact block — my level change, my new level, and a standing sentence ("Still C2. Four more rated games and your level is confirmed.") — so that this screen is where the change on my Home level card gets explained.
22. As a User of a Final Friendly game, I want the bottom bar to say "Level updated / C2 · 2.9 after this game" with a ghost "Share result" action, so that the one relevant fact and the one optional action are both available without competing.
23. As an organizer of a Final Friendly game, I want a single quiet "Report a wrong score" action with the consequence line "The other three players are asked to check it again," so that a dispute has a clear, honest entry point that actually reopens the Match for correction when eligible (see "Resolved decision" for the eligibility rule and what happens when it is not met).
24. As any User, I want "Cancel game" (not "Cancel Match (cancels Game)") with the consequence line "Removes it from the calendar for all three players," so that destructive copy never leaks that a Game and a Match are different rows.
25. As any User, I want every destructive or editing action to live as a quiet, full-width text button at the very bottom of the page, above a hairline, never inside the Score section, so that these actions are discoverable but never in the way of the score itself.
26. As the organizer, I want "Edit game" and "Cancel game" to render only for me, so that only the organizer sees organizer-only actions.
27. As a non-organizer User, I want "Leave game" in that same bottom position instead, so that I have an equivalent, appropriately-scoped action.
28. As any User, I want no green anywhere on this screen — open state is hatch plus "One spot open" text, and my own status appears exactly once, in the bottom bar, so that green's two prior meanings (open, and "you're in") are not still competing with each other or with a third meaning ("full") on a sibling component.
29. As a developer, I want a dev-only preview route rendering all three states side by side from a fixture, so that the hatch/status logic can be checked without seeding a database (same pattern as `/dashboard/design/home`).
30. As a developer, I want the Set row count to come from `match.sets.length`, never a hardcoded 3, so that a Match with more or fewer sets renders correctly without a UI change.
31. As a keyboard User, I want visible focus on every button, including the per-row Invite button and the organizer's overflow controls, so that this screen is fully operable without a mouse.

## Implementation Decisions

- **Scope.** Individual-registration Friendly games only (`usesFriendlyChrome`). Americano, Friendly tournament, and team_only Games are unchanged — they keep the current `GameHomeHeader` + tabbed `GameOverviewPanel`/`GamePlayersPanel`/`GameResultsPanel` path. Do not touch that path in this ticket set.

- **Status prop.** New top-level status derivation, `"upcoming" | "ongoing" | "needs_results" | "final" | "cancelled"`, computed server-side on `byId.ts` for the Friendly game's one Match, reusing the exact logic shape of `isHomeCarouselNeedsResults`/`homeCarouselPhase` (`apps/temba/src/server/home/carousel-games.ts`) rather than inventing new derivation rules. The three UI states named in the design brief are Upcoming, Needs a score, and Final; `ongoing` (window started, match not yet ended) visually collapses into the Upcoming hero treatment (countdown may read "Starting now" / omit rather than a negative duration — small addition to `formatHomeCountdown` or a wrapping helper) — state this reconciliation in the ticket rather than silently dropping the case Home already distinguishes. `cancelled` keeps its current (out of scope for restyle) treatment.

- **`byId.ts` additive fields** (one door, one file — extend, do not create a parallel read endpoint):
  - `sides[].left/right` (`SeatOccupant`) gains `levelBand: string | null`, joined from the existing `ratings` table via the existing `apps/temba/src/server/ratings/level.ts` helpers (`bandWithHysteresis` or equivalent — do not reimplement the Level map). `null` when the seated User has no Rating yet; the Line-up subline omits the level clause entirely in that case (no placeholder text), consistent with the existing convention "until a field's source exists, omit the prop."
  - A `phase`/`status` field per above.
  - `matchResultConfirmation: { confirmedUserIds: string[], requiredUserIds: string[], viewerHasConfirmed: boolean }` (or equivalent shape) backing the "who's outstanding" and footer-note copy.
  - Viewer-scoped rating-impact fields for the Final state: `{ levelChange: number, newLevel: number, newLevelBand: string, isProvisional: boolean, ratedMatchesRemainingToConfirm: number | null }`, sourced from the viewer's `ratingEvents` row for this match plus the existing Level/band/Provisional helpers (`apps/temba/src/server/ratings/level.ts`) — do not reimplement. Scoped to the viewer only, not all four players.

- **Match result confirmation** (ADR-0011). New `match_result_confirmations` table: `matchId`, `userId`, `confirmedAt`; unique `(matchId, userId)`. New door `confirmMatchResult` (self-only; caller must be seated on either of the Match's two Game teams; Match must have a result — `outcome.result !== "none"` — and not already be completed or cancelled): inserts the caller's confirmation row. `scoreSet.ts` gains a side effect: the acting User's confirmation row is inserted alongside their Set write. When confirmation count reaches the required count (always 4 for a scorable Friendly Match, since scoring is already gated on `bothSlottedTeamsComplete`), the same transaction runs the existing `completeMatch`/`applyRatedMatch` effect — no separate manual "Complete Match" tap for this path. `completeMatch.ts` stays as the organizer's unilateral override (unchanged permission: organizer, any time). `scoreSet.ts` additionally clears existing confirmation rows for a Match (except the acting User's fresh one) whenever a Set's games-won values change after at least one confirmation already exists.

- **Wrong-score reversal (Option A).** New door (e.g. `reportWrongScore.ts`, organizer-only) reopens a completed, rated Friendly Match. Eligibility: clean only when this Match's rating event is the most recent Rated Match for all four seated Users (checked per User, not just the viewer). When clean, in one transaction: restore each of the four Ratings to the before-values stored on this Match's rating events; delete those four rating events; delete all `match_result_confirmations` rows for the Match; set `match.status` back to `pending`. No new status or phase is invented — dropping `status` to `pending` re-derives the existing `needs_results` phase (`byId.ts`, above) automatically, and Sets become editable again through the existing `assertMayWriteSets`/`assertMatchAllowsSets` gates (which already refuse writes only on completed/cancelled), so a fresh score entry re-enters the ADR-0011 confirmation flow from zero with no separate re-score UI needed. When not clean, the mutation refuses with a distinguishable reason. `byId.ts` gains a Final-phase-only eligibility read (e.g. `canReportWrongScore: { eligible: boolean; reason?: string }`) so the UI can render the disabled/support-routed state without a failed round-trip.

- **Existing doors reused as-is, no new permission logic:**
  - Invite affordances (Line-up per-row "Invite" button; Upcoming bottom bar "Invite a player") call the existing `createInviteLink`/`sendLookupInvite` doors, gated by the existing organizer-only `friendlyGameCanMintInvite`/`canMintInvite` (`apps/temba/src/lib/friendly-game-cta.ts`). The per-row button does not widen this to non-organizers — kept consistent with every other action on this screen being organizer-gated where the brief implies an organizer action, and flagged here as a resolved-by-precedent decision rather than a silent widening.
  - `vacantJoinSeats(sides)` (`apps/temba/src/lib/friendly-game-cta.ts`) computes open side+position for the Line-up section and the per-row Invite target.
  - "Mark as not played" (Needs a score, organizer-only) calls the existing `cancelMatch`/`cancel` door with new copy for this context. No new mutation: Friendly game Match-cancel already cascades to Game-cancel (ADR-0008), and a cancelled Match already produces no rating event (ADR-0009).
  - "Cancel game" (Upcoming, organizer-only) and "Leave game" (non-organizer) reuse the existing `cancel`/`leave` doors and `isOrganizer`/`canLeave` checks, with new copy only.
  - `game-edit-dialog.tsx` and `game-invites-dialog.tsx` are reused as-is for "Edit game" and invite flows.
  - "Report a wrong score" (Final, organizer-only) is new — see "Resolved decision" above; built against Option A (gated self-service reversal).

- **Broken deep links to fix.** `match-history-card.tsx`'s link to `` `/dashboard/games/${id}?tab=results` `` and `home-next-game.tsx`'s `needs_results`-phase link to the same query param both break once tabs are removed. Both become a plain link to `/dashboard/games/[id]` with no query param, since the Score section is always present on the page now.

- **`~/lib/friendly-game-cta.ts` rework.** `FriendlyGameCtaFamily` needs a `needs_results`-equivalent kind (or the union reworked around the new `status` prop) to drive the bottom bar and hero copy. This is lib-layer work with colocated tests, following the repo's established pattern (`apps/temba/src/lib/friendly-game-cta.test.ts` already exists) — not a component-only change.

- **Copy and permissions (global rules).** Every destructive action: plain label plus one consequence-for-others line. Destructive/editing actions render as quiet, full-width text buttons at the very bottom of the page above a hairline, never inside the Score section — this moves the existing inline "Cancel Match (cancels Game)" button out of `friendly-game-results-panel.tsx` entirely. Organizer sees Edit game / Cancel game (or Mark as not played / Report a wrong score, by state); everyone else sees Leave game in that position. No green anywhere on this screen; own status appears exactly once, in the bottom bar.

- **Reuse the design system, don't re-derive it.** `--color-ink/paper/rule/wash/dim/dimrule/raised`, `.hatch`/`.hatch-on-ink`, `font-expanded` (115 fixed), global `tnum`. New CSS needed: a black-surface divided-figure-pair variant (`divide-dimrule`/`border-dimrule`) for the hero's price/duration pair, since only the light-surface version (`home-all-time.tsx`) exists today.

- **Preview route.** `/dashboard/design/game-details`, dev-only (404s in production, matching `/dashboard/design/home`'s existing exclusion), rendering Upcoming / Needs a score / Final from a fixture (new `src/fixtures/game-details.ts`, following `src/fixtures/home.ts`'s pattern).

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist. Pure lib functions (`friendly-game-cta.ts`, the new phase/confirmation derivations, the new time-formatting additions) get colocated `*.test.ts` files per the existing convention (`friendly-game-cta.test.ts`, `home-countdown.test.ts`, `game-occupancy.test.ts` already exist in this style).

### Test seams

Highest seam: an authenticated User on an individual Friendly game sees one scrolling page with no tab control in all three states (Upcoming, Needs a score, Final), each rendered from the same component tree off one status prop; can invite into an open seat from the Line-up row; can enter a score in the Needs a score state and have it count as their own confirmation; can confirm someone else's entered score; sees the Match complete and rate only once all four seated Users have confirmed (or the organizer force-completes); sees a Rating impact block only in the Final state; sees no green anywhere; sees destructive actions only as quiet bottom-of-page text buttons gated correctly on organizer vs non-organizer role; and can operate every control, including per-row Invite, by keyboard with visible focus.

If you implement this spec, you implement these seams:

- Tab bar and Overview tab removed; hero → line-up → score → organiser actions renders as one scroll with a sticky bottom bar
- Status derivation (`upcoming`/`ongoing`/`needs_results`/`final`/`cancelled`) matches the existing Home carousel phase logic shape, adapted to one Match
- Upcoming: black hero, 30s-recomputed countdown, 54px time with "PM until X" trailing, price/duration figure pair, Line-up with hatched open-slot chip + per-row Invite, hatched non-enterable Score boxes, "You're in / One spot left to fill" bottom bar
- Needs a score: black hero, "Played N days ago", "No score / Nobody has added one" figure pair, enterable hatched Score boxes, "Add the score / Counts once the others confirm" bottom bar, single "Mark as not played" organizer action (existing cancel door, new copy)
- Match result confirmation: Set entry auto-confirms the entering User; each other seated User can confirm once; last confirmation auto-completes and rates; organizer force-complete override still works; editing a Set after partial confirmation clears stale confirmations
- Final: white hero with hairline border, W/L mark + verdict + set scores replacing time, duration/won-by figure pair, winning team "Won" tag in Line-up with no invite affordances, Score boxes solid-ink/outline per side with never-played sets staying hatched, "Confirmed by all four players on [date]" footer, Rating impact block (change/new level/standing sentence, viewer-scoped), "Level updated" bottom bar with ghost "Share result", single "Report a wrong score" organizer action (Option A: eligible-only reversal — restores all four Ratings, deletes the four rating events, clears confirmations, reopens the Match to `pending`/`needs_results`; disabled with a support-routing message when any of the four has a later Rated Match)
- "Cancel game" / "Leave game" copy fixes, consequence lines, bottom-of-page placement, organizer-vs-non-organizer gating, all reusing existing doors and permission checks with no new logic
- No green anywhere on the page; own status stated exactly once, in the bottom bar
- Broken `?tab=results` deep links (`match-history-card.tsx`, `home-next-game.tsx`) fixed to plain links
- Dev-only preview route renders all three states from a fixture; 404s outside development
- Set rows render from `match.sets.length`, never a hardcoded count
- Visible keyboard focus on every control, including per-row Invite and organizer overflow controls

Manual check: Americano, Friendly tournament, and team_only Game details pages are untouched. Existing invite, waitlist, seat-pick, move, and Soft-archive flows on this Game format still work.

### Modules under that seam

App: `apps/temba/src/app/dashboard/games/[id]/page.tsx` and every Friendly-chrome component listed under "being deleted" and "component precedents" above; `apps/temba/src/lib/friendly-game-cta.ts`, `home-countdown.ts`, `format-game-start.ts`, `game-occupancy.ts` (additive changes only). Server: `apps/temba/src/server/api/routers/games/byId.ts` (additive fields, including the Option A eligibility read), a new `confirmMatchResult` door (one file, per `.cursor/rules/api-one-endpoint-per-file.mdc`), `scoreSet.ts` (confirmation side effect), a new `reportWrongScore` door implementing the Option A eligibility check and reversal transaction. DB Package: `match_result_confirmations` table — migration only; the Option A reversal reuses existing `ratings`/`ratingEvents`/`match_result_confirmations` rows (delete/restore), no new table.

### Prior art

`.scratch/home-level-redesign/spec.md` for the whole design-system vocabulary, the preview-route pattern, and the "document the override inline" convention this spec follows twice (the `faint` token, the `font-expanded` range). `.scratch/individual-game-seats/spec.md` for `sides[]`/Position. `.scratch/user-ratings/spec.md` and ADR-0009 for rating events and Level/band helpers. ADR-0008 for the Game/Match split this spec's copy fixes are about. `.scratch/game-details-mobile-chrome/spec.md` for the tab structure being replaced.

## Out of Scope

- Americano, Friendly tournament, and team_only Game details pages (unchanged).
- `docs/design/home.md` as a standalone document (not authored; flagged as a reasonable separate follow-up).
- Cascading recompute when a wrong-score reversal is *not* eligible (any of the four Users has a later Rated Match) — that case routes to manual support, not an automated multi-Match replay.
- Any change to Glicko-2 math, weight blending, or idle-inflation rules (ADR-0009 untouched).
- A notification/reminder system for outstanding confirmations (no push/email nudge this slice; outstanding confirmations are visible only when a player opens the game).
- Dark mode (Home ships light-only; this screen follows the same constraint).
- Majority (rather than unanimous) confirmation.
- Any widening of invite-minting permission beyond the existing organizer-only rule.

## Further Notes

Glossary: root `CONTEXT.md` — **Match result confirmation** (added by this spec), **Match result**, **Rated Match**, **Organizer**, **Game**, **Match**, **Set**, **Game team**, **Position** (existing). Architecture: ADR-0008 (Game/Match split — the source of the copy leak this spec fixes), ADR-0009 (Glicko-2 — untouched, but the confirmation step changes *when* its rating write fires, not *how*), ADR-0011 (Match result confirmation, new, written alongside this spec). Design system: `.scratch/home-level-redesign/spec.md` and its shipped code — this spec's entire visual vocabulary is inherited from it, not reinvented. Standing contract: `.scratch/redesign/games-and-rankings-contract.md` §1.5, amended by this spec for the individual-Friendly-game case only.

## Implementation tickets (Linear)

All labelled `ready-for-agent`, native `blocks` relations, strict numerical/dependency order (one blocker each, a single chain — run with a fresh `implementer` per ticket via `orchestrator`).

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-176 Match result confirmation gates rating](https://linear.app/temba-app/issue/TEM-176/match-result-confirmation-gates-rating) | — |
| 2 | [TEM-177 Game-details read model: status phase, per-seat level, confirmation state, rating impact](https://linear.app/temba-app/issue/TEM-177/game-details-read-model-status-phase-per-seat-level-confirmation-state) | TEM-176 |
| 3 | [TEM-178 Dev-only preview route and fixture for game-details states](https://linear.app/temba-app/issue/TEM-178/dev-only-preview-route-and-fixture-for-game-details-states) | TEM-177 |
| 4 | [TEM-179 Delete the tab bar; status-driven hero for all three states](https://linear.app/temba-app/issue/TEM-179/delete-the-tab-bar-status-driven-hero-for-all-three-states) | TEM-178 |
| 5 | [TEM-180 Line-up section: teams, open-slot invite, You and Won tags](https://linear.app/temba-app/issue/TEM-180/line-up-section-teams-open-slot-invite-you-and-won-tags) | TEM-179 |
| 6 | [TEM-181 Score section: variable set rows, hatch states, confirm flow](https://linear.app/temba-app/issue/TEM-181/score-section-variable-set-rows-hatch-states-confirm-flow) | TEM-180 |
| 7 | [TEM-182 Rating impact block (Final phase only)](https://linear.app/temba-app/issue/TEM-182/rating-impact-block-final-phase-only) | TEM-181 |
| 8 | [TEM-183 Sticky bottom action bar for all three phases](https://linear.app/temba-app/issue/TEM-183/sticky-bottom-action-bar-for-all-three-phases) | TEM-182 |
| 9 | [TEM-185 Wrong-score reversal: eligibility check and reversal mutation](https://linear.app/temba-app/issue/TEM-185/wrong-score-reversal-eligibility-check-and-reversal-mutation) | TEM-183 |
| 10 | [TEM-184 Organiser actions footer: copy fixes, role gating, Mark as not played, Report a wrong score](https://linear.app/temba-app/issue/TEM-184/organiser-actions-footer-copy-fixes-role-gating-mark-as-not-played) | TEM-185 |

Frontier: **TEM-176** only. Do not implement until an implementer / orchestrator is asked to run the tickets. TEM-184/TEM-185 are built against Option A of the "Resolved decision" above (gated self-service reversal), chosen by the user over the safer Option B alternative.

## Comments
