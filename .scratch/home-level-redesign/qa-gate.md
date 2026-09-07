# TEM-172 Home redesign visual and accessibility QA gate

Record for the Home level redesign closing gate. Spec: `.scratch/home-level-redesign/spec.md`. Ticket: [TEM-172](https://linear.app/temba-app/issue/TEM-172/home-redesign-visual-and-accessibility-qa-gate). Style follows `.scratch/redesign/qa-gate.md` (TEM-72).

## Layout

- Live Home (`apps/temba/src/app/dashboard/page.tsx`) and the preview columns wrap content in `mx-auto w-full max-w-[420px]`.
- From 360px to 420px the column is the content width. Above 420px it stays 420px and centres inside the existing `AppShell` (`max-w-[var(--container-content)]` plus gutters).
- Desktop rail is retained: `AppRail` is `hidden … lg:flex` with `role="navigation"` `aria-label="Primary"`. Bottom nav is `lg:hidden`.

## Five tabs

`APP_NAV_SLOTS` is still five items: Home, Games, Groups, Communities, You (`apps/temba/src/components/layout/app-nav.tsx`). Bottom nav is `grid-cols-5`, paper, hairline top (`border-rule`), Lucide icons at 21px, 11.5px labels, `text-ink` when active and `text-muted-foreground` otherwise, with `env(safe-area-inset-bottom)`. Not reduced to four.

## Grep evidence

Run from repo root against `apps/temba/src`:

| Check | Result |
| --- | --- |
| Hardcoded hex in class strings (`bg-[#…]`, `text-[#…]`, `border-[#…]`, `from/to/via-[#…]`, `fill/stroke-[#…]`) | No matches |
| `faint` / `#9A9A9A` token | Only a comment in `styles/globals.css` forbidding it |
| `text-gray-` / `text-zinc-` / `text-slate-` / `text-neutral-` / `text-stone-` under Home (`components/home`, `app/dashboard/page.tsx`, `app/dashboard/design/home`) | No matches |
| `text-dim` on Home | Only on the black next-game block / seat captions / preview black hatch caption (dim is specified for ink surfaces) |
| Pre-existing `bg-gray-*` / `text-gray-*` on `components/temba/level-band-badge.tsx` | Outside Home; not introduced by this redesign |

Hatch stroke hex (`#dcdcdc`, `#333333`) lives in the CSS utility in `globals.css`, not in class strings, matching spec §2.3.

## Contrast table (WCAG 2.x relative luminance)

Computed in this gate (sRGB, `(L1+0.05)/(L2+0.05)`):

| Pair | Ratio | AA text (4.5:1) |
| --- | --- | --- |
| muted `#6E6E6E` on paper `#FFFFFF` | 5.10:1 | Pass |
| muted `#6E6E6E` on wash `#F4F4F4` | 4.64:1 | Pass |
| dim `#8E8E8E` on ink `#000000` | 6.41:1 | Pass |
| faint `#9A9A9A` on wash `#F4F4F4` (rejected, not shipped) | 2.56:1 | Fail |
| faint `#9A9A9A` on paper `#FFFFFF` (rejected, not shipped) | 2.81:1 | Fail |
| ink `#000000` on paper `#FFFFFF` | 21.00:1 | Pass |

Matches spec §2.1.

## Hatch accessibility

Every Home hatch surface is `aria-hidden`; meaning is in text:

| Surface | Decoration | Meaning |
| --- | --- | --- |
| Recent form empty slot | hatch `aria-hidden` | `sr-only` Not played / Won / Lost / Drawn per slot |
| Next-game open seat | hatch `aria-hidden` | `sr-only` Open seat; filled seats `sr-only` User name |
| Coming up bars | hatch / fill `aria-hidden` | `sr-only` Open seat / N open seats / All seats filled |
| Level chart unconfirmed region | hatch in `foreignObject` `aria-hidden` | single `role="img"` labelled e.g. "Level over N rated matches; not yet confirmed" |
| Provisional progress track | hatch track `aria-hidden` | caption "% of the way to {nextBand}" |
| Preview swatches and empty-form hatch | `aria-hidden` | adjacent captions |

## Keyboard focus

Visible `focus-visible:ring` on: header invites control, next-game primary/secondary and empty-state actions (`Button`), Coming up rows, Standing rows, bottom-nav tabs, desktop rail `SidebarMenuButton`. Recent form slots are not controls.

## Tabular figures and countdown

- `font-feature-settings: "tnum" 1` on `body` (`globals.css`).
- Explicit `tabular-nums` on Level value, kickoff time, countdown, recent-form record, all-time figures, Standing position.
- Countdown uses `min-w-[11ch] text-right tabular-nums` so 30s ticks do not shove the venue name. `formatHomeCountdown` returns null when the start is not in the future (no negative value).

## Motion

Exactly two Home mount animations, both in `HomeLevelBlock`:

1. Chart path `stroke-dashoffset` (800ms) after mount (`drawn`).
2. Progress fill `width` (700ms) after mount.

The existing `@media (prefers-reduced-motion: reduce)` block in `globals.css` forces `animation-duration: 0.01ms`, `transition-duration: 100ms`, and `transition-property: opacity`, which neutralises both. Shared `Button` `transition-all` is not a Home mount animation; the same reduced-motion rule restricts it.

## Screenshot set

Directory: `.scratch/home-level-redesign/screenshots/tem-172/`.

Attempted widths 360 / 390 / 430 / 768 / 1024 / 1440 on `/login`, plus `/dashboard/design/home` at 1440 and `/dashboard` at 390, via headless Chrome against `http://localhost:3000`.

### Blocker

Authenticated App routes and Clerk auth UI cannot be rendered in this Cloud Agent session:

- `curl` against `/login`, `/dashboard`, and `/dashboard/design/home` returns **500 Internal Server Error**.
- Clerk keys in `.env` are `pk_test_…` / `sk_test_…` (not empty and not `placeholder` literals). Failure matches TEM-72 / TEM-165: missing Clerk `dev-browser` handshake, not missing env.
- Captured PNGs show the unstyled "Internal Server Error" page only. They are kept as evidence of the blocker, **not** as visual sign-off of Provisional / confirmed Home or the 420px column.

### Unblocked follow-up

Re-shoot after a real signed-in Clerk session (local browser or Cloud Agent with working Clerk `dev-browser` cookies):

- Home at 360, 390, 430, 768, 1024, 1440 (column full-bleed below 420px; centred 420px column + rail at `lg`).
- Preview `/dashboard/design/home` Provisional and confirmed columns, plus empty scaffolds and hatch swatches.
- Keyboard tab order across header, next-game actions, Coming up rows, Standing rows, five tabs.
- `prefers-reduced-motion: reduce` — chart and progress fill must not visibly draw.

No visual-regression harness or a11y CI was added (same non-goal as TEM-72).

## Remediations in this gate

- Hatch elements that still carried meaning on the same node (open seats, progress track, Coming up bars) were split so hatch is `aria-hidden` and text is separate.
- Bottom nav restyled to paper + hairline, 21px icons, 11.5px labels, ink / muted; five slots unchanged.
- Confirmed Level closing line no longer says "rating".
- Countdown given a tabular min-width so ticks do not reflow.

## Checks

- `pnpm --filter temba exec vitest run` on Home tests (`users/home`, recent-form, level-chart, seats, countdown, state-line, fixture) — pass
- `pnpm exec turbo run typecheck --filter temba` — pass
- `pnpm exec turbo run build --filter temba` — pass (TEM-171; re-run after this gate)
- `pnpm exec turbo run lint --filter temba` — fails on pre-existing `temba-text-logo.tsx` `@typescript-eslint/no-explicit-any`; not introduced here
