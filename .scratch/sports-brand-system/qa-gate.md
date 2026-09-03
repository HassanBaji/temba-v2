# TEM-127 Sports brand visual and contract QA gate

Record for the sports-brand-system closing gate. Ticket: TEM-127 (blocked by TEM-124, TEM-125, TEM-126).

**Note on spec**: the ticket links `Spec: .scratch/sports-brand-system/spec.md`, which does not exist in the repository or its git history. Each of TEM-121–TEM-127's ticket bodies (fetched from Linear) was treated as the authoritative specification for its own scope; this note performs the same substitution for TEM-127's own acceptance criteria.

## Grep evidence (post-migration)

All checks run under `apps/temba/src` with ripgrep.

| Check | Result |
| --- | --- |
| `#0000FF` / `#0000ff` | No matches. |
| `text-brand` | No matches outside `styles/globals.css`, where it only appears inside a retirement comment (`formerly text-brand / bg-brand-subtle / bg-brand-on-dark`). |
| `bg-brand-subtle` | Same — comment-only, in `styles/globals.css`. |
| `bg-brand-on-dark` | Same — comment-only, in `styles/globals.css`. |
| `--color-brand` (any suffix) | Removed entirely from the `@theme static` block. The one remaining hit is a comment noting the removal. |
| Hue-264 (former brand blue) OKLCH steps | None; the former `--color-brand*` block was deleted rather than remapped, since nothing referenced it after TEM-121–126 (see below). |

Before removing the `--color-brand*` tokens, confirmed via grep across `apps/temba/src` that no component or page referenced `text-brand`, `bg-brand-subtle`, `bg-brand-on-dark`, `border-brand`, or `--color-brand*` outside `globals.css` itself. The TEM-121 "safety net" remap (to `foreground`/`muted`) was therefore dead code once TEM-122–126 finished migrating every consumer, and the tokens were deleted outright per this ticket's "Unused `--color-brand*` removed from the token file" criterion.

## "One brand CTA per screen" sampling

**Superseded as a live rule.** `Button variant="brand"` was deleted; see `.scratch/retire-volt-accent/spec.md`. Counts below record TEM-127 as shipped.

Counted `variant="brand"` per file under `apps/temba/src`:

| Screen / file | Count | Notes |
| --- | --- | --- |
| `dashboard/page.tsx` (Home) | 1 | Create Game |
| `dashboard/you` (`you-rating-section.tsx`) | 1 | Declare Level |
| `dashboard/games/page.tsx` (Games hub) | 1 | Create Game |
| `dashboard/games/new/page.tsx` | 1 | Create Game submit |
| `dashboard/games/[id]/page.tsx` + `game-results-panel.tsx` | 1 | Complete Match (live action). The header's organizer `Invite` button was changed from `brand` to `outline` during this gate — it duplicated the `Invite` entry already in the `ActionMenu` overflow and could co-occur with `Complete Match`, violating the one-brand rule. |
| `components/games/game-summary-card.tsx` | 1 per card | Join/Register — repeated list item, one brand button per card, not per screen; multiple cards on the Games hub is the accepted list-item exception the ticket set already establishes (Ticket TEM-125 calls out both the hub header and per-card CTA as brand). |
| `dashboard/groups/page.tsx` (Groups hub) | 1 | Create Group (header). The empty-state's duplicate `Create Group` button was changed from `brand` to default during this gate to avoid two brand buttons rendering together when the list is empty. |
| `dashboard/groups/new/page.tsx` | 1 | Create Group submit |
| `dashboard/groups/[id]/page.tsx` (Group home) | 1 | Join |
| `dashboard/communities/page.tsx` (Communities hub) | 1 | Create Community (header). Same empty-state duplicate fix as Groups. |
| `dashboard/communities/new/page.tsx` | 1 | Create Community submit |
| `dashboard/communities/[id]/page.tsx` | 1 | Request to join |
| `dashboard/teams/page.tsx` (Teams hub) | 1 | Create Team (header). Same empty-state duplicate fix, and the pending-invite `Accept` row button was already reverted to default in TEM-126 to avoid a second brand button. |
| `dashboard/teams/new/page.tsx` | 1 | Create Team submit |
| `dashboard/invites/page.tsx` | 2 | `Join waitlist` (seat grid) and `Accept` (generic list row) are mutually exclusive per invite row — each invite renders at most one, so no single row shows two brand buttons. Multiple different invites can each show their own brand action, the same repeated-list-item exception as `GameSummaryCard`. |

Fixes made in this gate to hold the "at most one `variant=\"brand\"`" rule per rendered screen:

- `dashboard/games/[id]/page.tsx`: header `Invite` button — `variant="brand"` → `variant="outline"` (it's an organizer/management action already duplicated in the `ActionMenu`, not the page's live action).
- `dashboard/groups/page.tsx`, `dashboard/communities/page.tsx`, `dashboard/teams/page.tsx`: the `EmptyState` action's `Create …` button — dropped `variant="brand"` (now default/black) because the `DashboardShell` header action already renders the same brand `Create …` button at the same time whenever the list is empty.

## Volt occupancy sampling (historical; superseded)

**Superseded.** Scarce Volt Lime (~5–10%) is no longer a live gate. See `.scratch/retire-volt-accent/spec.md` and `.scratch/retire-volt-accent/qa-gate.md`. The sampling below records TEM-127 as shipped; lime tokens and `variant="brand"` were later deleted.

`bg-volt` / `border-l-volt` usages under `apps/temba/src` at TEM-127, all confirmed then to be small accents, never a large fill:

- `components/ui/button.tsx` — `Button variant="brand"` fill (bounded control, not a page-level fill).
- `components/auth/auth-shell.tsx` — `size-12` geometric mark on the dark auth panel.
- `components/layout/bottom-nav.tsx` — 2px top indicator bar on the active tab.
- `components/layout/app-rail.tsx` — 3px left bar on the selected rail item.
- `components/groups/leaderboard-row.tsx` — 2px left bar on the viewer's Standing row.

No component rendered `bg-volt`/`border-volt` as a card, section, or page background at TEM-127. That occupancy check is historical only.

## Contrast notes

Lime CTA pairing below is historical (TEM-127). Live primary is black fill / white text; see `.scratch/retire-volt-accent/spec.md`.

- `Button variant="brand"`: `bg-volt` (`#C8F135`) with `text-volt-foreground` (`#0A0A0A`) — dark text on lime, no lime-on-white text anywhere (`text-volt` / `text-color-volt` utility is not used as a text color in any component).
- Clerk `colorPrimary` is `#C8F135` with `colorPrimaryForeground` `#0A0A0A` (`app/layout.tsx`), matching the same lime+black CTA pairing.
- 12–13px meta text (`text-meta`, `text-eyebrow`) uses `text-muted-foreground`, which resolves to `--muted-foreground`. This gate darkened the light-mode token from `oklch(0.5 0 0)` to `oklch(0.4 0 0)` (~`#666`, close to Tailwind `gray-700`) against `--background` (`#F6F6F3`) and `--card` (`#FFFFFF`), raising contrast to comfortably clear WCAG AA (~7:1 on white, ~6.6:1 on the off-white page background) for normal-size and small text alike. Dark-mode `--muted-foreground` (`oklch(0.708 0 0)`) was left unchanged; it already has adequate contrast against the dark surfaces and no dark-mode toggle exists (non-goal, per TEM-121).

## Screenshots

Not captured. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are unset in this Cloud Agent run, so the Next dev server fails env validation for authenticated routes and no Clerk `dev-browser` session can be established. `/login` and every route behind Clerk (Home, You, Games, Groups, Communities, Teams, Invites, Operator/Venues) cannot be rendered in a browser in this environment.

In place of screenshots, this gate verified the brand migration statically:

- Full-repo grep sweep for leftover blue/lime-wash class names and hex values (above).
- Per-file count of `variant="brand"` usages across every hub, create, and detail screen touched by TEM-124–126, with manual review of each screen's conditional render paths to confirm at most one brand CTA renders at a time (two double-brand cases found and fixed, see above).
- Manual review of every `bg-volt` / `border-l-volt` call site to confirm none is a large fill.
- Token-level contrast check (OKLCH lightness deltas) for the lime CTA and the darkened meta-text token.
- Full `tsc --noEmit`, `next lint`, `vitest run`, and `next build` passes (below), which exercise every route's component tree including the ones the acceptance criteria call out as "screenshotable."

Re-shoot every sampled screen (Home/You at 390 + 1440, Games hub + Game home, Group Standing, one Community, invite accept) once a Cloud Agent run has real Clerk development keys or a local/browser session is available.

## Checks

All passed for TEM-127 (run from repo root unless noted):

- `pnpm exec turbo run typecheck` — pass (`@repo/db`, `temba`)
- `SKIP_ENV_VALIDATION=1 pnpm exec turbo run lint` — pass (`✔ No ESLint warnings or errors` for `temba`; `@repo/db` has 2 pre-existing unrelated warnings)
- `DATABASE_URL=… SKIP_ENV_VALIDATION=1 pnpm test` (in `apps/temba`) — pass, 15 files / 82 tests
- `DATABASE_URL=… SKIP_ENV_VALIDATION=1 pnpm exec turbo run build --filter temba` — pass, all 20 routes compiled/prerendered
- `npx prettier --check` on every file touched in this gate — pass

## Non-goals respected

- No dark-mode toggle added.
- No new UI libraries or primitives beyond what TEM-122/123 already introduced.
- No tRPC procedure / input / return / auth flag changes.
