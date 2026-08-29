# TEM-72 Visual and accessibility QA gate

Record for the redesign closing gate. Spec: `.scratch/redesign/spec.md`. Ticket: TEM-72.

## Resolution items

### `tw-animate-css`

**Decision: restore the import and install the package.**

- `apps/temba/package.json` depends on `tw-animate-css@^1.4.0`.
- `apps/temba/src/styles/globals.css` line 3 is `@import "tw-animate-css";` (was commented).
- Animation utilities (`animate-in`, `fade-in-*`, `zoom-in-*`, `slide-in-from-*`) used by dialog, sheet, drawer, dropdown-menu, select, sonner, and auth-shell now resolve.

### Unused dependencies

**Decision: remove packages with zero app imports.**

Removed from `apps/temba/package.json` (and lockfile):

- `recharts`
- `@tanstack/react-table`
- `@dnd-kit/core`, `@dnd-kit/modifiers`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

Grep under `apps/temba` found no imports of these packages. A future Games/rankings slice can re-add them when needed.

### Retained unused primitives

Still present and typechecked:

- `apps/temba/src/components/ui/table.tsx`
- `apps/temba/src/components/ui/checkbox.tsx` (used by Games create)
- `apps/temba/src/components/ui/toggle.tsx`

## Grep evidence (post-fix)

| Check | Result |
| --- | --- |
| Hardcoded hex / Tailwind named colours in class strings (`bg-[#…]`, `slate-`, `violet-`, `emerald-`, `amber-`, `zinc-`, `gray-`) | No matches under `apps/temba/src` for themeable class strings. Clerk `appearance.variables` in `layout.tsx` keep intentional hex (`#0000FF` brand, secondary `#636363` for 6:1). Token file `globals.css` keeps design-system hex comments. |
| `hsl(var(--` against oklch tokens | No matches under `apps/temba/src`. |
| Hand-rolled `rounded-xl border` surface | No matches under `apps/temba/src` (sidebar inset `rounded-xl` alone remains a primitive layout class, not the card surface pattern). |
| Hand-rolled `<section className="space-y-3"><h3 className="text-lg …">` | No matches. Remaining `text-lg` is `DialogTitle` in `ui/dialog.tsx`. Games headings use `Section` or `text-title`. |
| Hand-rolled `divide-border … divide-y rounded-xl border` lists | No matches. Lists use `RowList` (including Games hub, Games home, Community requests, Venue requests, Group standing, Lookup invite panel, Venue search dialog). |
| `capitalize` on stored enums | No `capitalize` class under `apps/temba/src`. Community role select options are title-cased labels; Game match status uses `.replaceAll("_", " ")`. |

## Contrast

- Light `--muted-foreground: oklch(0.5 0 0)` on `--background: oklch(1 0 0)` and `--surface-raised: oklch(0.985 0 0)` — matches the redesign token table (6.01:1 on white).
- Clerk secondary / neutral variables set to `#636363` to match that muted target.
- Dark theme muted remains `oklch(0.708 0 0)` on dark surfaces.
- Typed badges use outline + text labels (not colour-only). Leaderboard ranks 1–3 use Trophy/Medal/Award icons plus numerals; viewer row uses `bg-brand-subtle` plus a text `You` badge.

## Reduced motion

`globals.css` includes `@media (prefers-reduced-motion: reduce)` that:

- disables transform (`transform: none !important`)
- caps transition duration at 100ms
- restricts `transition-property` to `opacity` only
- collapses animation duration

## Keyboard / structure / touch (spot-check)

- Bottom nav is `<nav aria-label="Primary">`; desktop rail exposes `role="navigation" aria-label="Primary"`.
- `ActionMenu` icon trigger has `aria-label` and min 44×44 targets.
- `PageHeader` provides the page `<h1>`; `Section` uses `<h2>`; AppShell content sits in `<main>`.
- Default `Button` / `Input` / `SelectTrigger` are `h-11` / `min-h-11` (TEM-70). Games detail organizer actions no longer use `size="sm"`.
- Dialogs/menus continue to restore focus via existing ResponsiveDialog / ConfirmDialog / ActionMenu behaviour.
- Forms use `FieldLabel` + `FieldError` / `FormErrorSummary` with `aria-invalid` / `aria-describedby` where wired in TEM-70.

## Surfaces fixed in this gate

- Games hub: `Section` + `RowList` / `ListRow` + `ErrorState` / `EmptyState` (removed `rounded-xl border` list and `text-lg` heading).
- Games home: organizer/register/invite blocks through `Card`; Matches / Registered / Waitlist through `Section` + `RowList`; load error through `ErrorState`.
- Team home: Members through `Section` (import restored).
- Community requests, Venue pending requests, Group standing, Lookup invite panel, Community link-Venue dialog: lists through `RowList`.
- Community members role select: drop `capitalize`; human-readable option labels.

## Screenshot set

Directory: `.scratch/redesign/screenshots/`.

### Blocker

Authenticated App routes and Clerk auth UI cannot be rendered in this Cloud Agent session:

- Server responses include `x-clerk-auth-reason: dev-browser-missing`.
- `curl` and headless Chrome against `/login`, `/signup`, `/`, and `/dashboard` return **500 Internal Server Error** (plain text body).
- Clerk development keys are present and are not placeholder strings; the failure is the missing Clerk browser handshake, not empty env.

Captured login/signup PNGs at 360 / 390 / 430 / 768 / 1024 / 1440 therefore show the Clerk 500 page only. They are kept as evidence of the blocker, **not** as visual sign-off of the redesigned surfaces.

### Unblocked follow-up

Re-shoot every redesign surface at those six widths after a real signed-in Clerk session is available (local browser or Cloud Agent with working Clerk `dev-browser` cookies). States to cover remain: loading, empty, populated, error — including Home with no Groups, empty Groups / Communities / Invites, incomplete Team, Soft-archived Community / Venue, and Operator denied.

No visual-regression harness or a11y CI was added (TEM-72 non-goal).

## Checks

All passed for TEM-72:

- `pnpm exec turbo run typecheck --filter=temba` — pass
- `pnpm exec turbo run lint --filter=temba` — pass (`✔ No ESLint warnings or errors`)
- `pnpm exec turbo run build --filter temba` — pass

## Non-goals respected

- No tRPC procedure / input / return / auth flag changes.
- No Games/rankings contract screens implemented.
- No dark-mode toggle.
- No automated a11y or visual-regression CI.
