# TEM-153 Delete Volt tokens and lime grep QA gate

Record for the retire-volt-accent closing gate. Ticket: TEM-153 (blocked by TEM-151, TEM-152). Spec: `.scratch/retire-volt-accent/spec.md`.

## Grep evidence (post-token deletion)

All checks run under `apps/temba` with ripgrep. Empty output is a pass.

| Check | Result |
| --- | --- |
| `volt` (case-insensitive) | No matches. |
| `volt-hover` / `volt-soft` / `volt-foreground` | No matches. |
| `bg-volt` | No matches. |
| `border-l-volt` | No matches. |
| `--color-volt` | No matches. Tokens deleted from `@theme static`, not aliased. |
| `#c8f135` / `#C8F135` | No matches. |
| `#B2DB25` / `#b3d928` / `#F2FBD5` / `#eef8c9` | No matches. |
| `variant="brand"` / `variant: "brand"` | No matches. Variant already deleted in TEM-152. |
| `#0000FF` / `#0000ff` | No matches. Blue brand did not return. |
| `--temba-volt*` | No matches. Never shipped; not added. |

`--chart-1` is `#0a0a0a` in `:root` and `#e5e5e5` (near-white gray) in `.dark`. Neither references `var(--color-volt)`. Token comments in `apps/temba/src/styles/globals.css` do not mention Volt Lime.

## Destructive red and Soft-archive gray (sampled in source)

Unchanged; sampled, not restyled:

- `--destructive` remains `oklch(0.577 0.245 27.325)` (light) / `oklch(0.704 0.191 22.216)` (`.dark`). `Button` `variant="destructive"` still uses `bg-destructive`. `ActionMenuItem` `variant="destructive"` still uses `text-destructive`. Leave / Soft-archive menu items on Community and Group home still pass `variant="destructive"`.
- Soft-archive stays muted gray + icon + copy: `SoftArchiveBanner` is `bg-muted` with an `Archive` icon and `text-muted-foreground` body. Hub rows still use outline `Soft-archived` badges.

## Occupancy filling / full vs open

`GameOccupancyCard` bar tones (TEM-151 remap; tokens here do not change them):

- open: `bg-foreground` (black fill on muted track)
- filling: `bg-warning`
- full: `bg-success`

Filling and full stay distinguishable from open.

## Contrast notes

Tokens sampled from `apps/temba/src/styles/globals.css` and `apps/temba/src/app/layout.tsx`. No lime pairing remains.

- Primary CTAs: `bg-primary` / `text-primary-foreground` → white `#FFFFFF` on `#0A0A0A` (~19:1).
- Clerk primary: `colorPrimary #0A0A0A`, `colorPrimaryForeground #FFFFFF` — white on black.
- Rail labels: `--sidebar-foreground #ffffff` on `--sidebar #0a0a0a` (~19:1).
- 12–13px meta (`text-meta`, `text-eyebrow`) still `text-muted-foreground` → `--muted-foreground: oklch(0.4 0 0)` against `--background #F6F6F3` / `--card #FFFFFF` (unchanged from TEM-127; ≥ 4.5:1).

`--primary` remains `#0A0A0A`. It is not mapped to lime. `--color-brand*` was not reintroduced.

## Screenshots

Not captured. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are empty in this Cloud Agent `.env` (`emptyStringAsUndefined` fails App env validation). No Clerk `dev-browser` session; `/login` and signed-in routes (Home, Games hub, Game home, Group Standing, You, invite accept) cannot be rendered here.

In place of screenshots (same fallback TEM-127 used):

- Grep sweep under `apps/temba` for the denylist above (artifact: `/opt/cursor/artifacts/tem-153-grep-gate.log`).
- Source sampling of destructive red, Soft-archive gray, occupancy filling/full vs open, Clerk appearance, and `--chart-1`.
- `typecheck`, `vitest`, and `next build` (below).

Re-shoot Home, Games hub, Game home, Group home Standing, You, login, and invite accept at 390 / 768 / 1024 / 1440 once a run has real Clerk development keys.

## Historical sports-brand gate

`.scratch/sports-brand-system/qa-gate.md` lime occupancy (~5–10%) and `variant="brand"` counts are marked historical and point at this spec. They are not a live gate.

`.scratch/sports-brand-system/spec.md` has a short banner that Volt Lime is superseded by `.scratch/retire-volt-accent/spec.md`.

## Checks

Run from repo root unless noted:

- `pnpm exec turbo run typecheck` — pass (`@repo/db`, `temba`)
- `SKIP_ENV_VALIDATION=1 pnpm exec turbo run lint` — `temba` fails with a pre-existing `@typescript-eslint/no-explicit-any` error in `src/components/ui/icons/temba-text-logo.tsx` plus unused-var warnings (`UserButton`, `hidePageTitle`, `Gauge`). Same failures on this branch before TEM-153 (verified via stash). Not caused by this ticket; not fixed here.
- `DATABASE_URL=postgresql://postgres:password@localhost:5432/temba SKIP_ENV_VALIDATION=1 pnpm test` (in `apps/temba`) — pass, 29 files / 196 tests
- `DATABASE_URL=… SKIP_ENV_VALIDATION=1 pnpm exec turbo run build --filter temba` — pass, all 20 routes compiled/prerendered

## Non-goals respected

- No tRPC, schema, route, or product-behavior changes.
- `--primary` not mapped to lime.
- `--color-brand*` / `#0000FF` not reintroduced.
- Sports-brand spec not rewritten beyond the supersession banner.
- No new tests whose only purpose is asserting CSS class names.
