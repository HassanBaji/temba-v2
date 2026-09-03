Status: ready-for-agent

> **Volt Lime superseded.** Scarce Volt Lime, `Button variant="brand"`, volt tokens, and lime chrome in this document are retired by [`.scratch/retire-volt-accent/spec.md`](../retire-volt-accent/spec.md). Black/white sports surfaces, type, radius, Soft-archive gray, and destructive red here still apply.

# Sports brand system

Successor visual language to `.scratch/redesign/spec.md` §4–4.2 (blue-accent tokens). That document remains historical. This spec is visual language only: colours, typography, spacing, hierarchy, component styling, and design language. Product structure, routes, flows, APIs, and schema do not change.

Tickets (Linear, `ready-for-agent`): [TEM-121](https://linear.app/temba-app/issue/TEM-121/expand-sports-tokens-primary-black-volt-lime-beside-surfaces-and) Expand sports tokens → then parallel [TEM-122](https://linear.app/temba-app/issue/TEM-122/migrate-primitives-to-the-sports-brand) Migrate primitives ∥ [TEM-123](https://linear.app/temba-app/issue/TEM-123/migrate-chrome-rail-bottom-nav-authinvite-shells-clerk) Migrate chrome → then parallel [TEM-124](https://linear.app/temba-app/issue/TEM-124/restyle-home-and-you-to-the-sports-brand) Home and You ∥ [TEM-125](https://linear.app/temba-app/issue/TEM-125/restyle-games-surfaces-to-the-sports-brand) Games ∥ [TEM-126](https://linear.app/temba-app/issue/TEM-126/restyle-groups-standing-communities-venues-teams-and-invites) Groups through Invites → [TEM-127](https://linear.app/temba-app/issue/TEM-127/contract-leftover-blue-and-visual-qa-gate) Contract leftover blue and visual QA gate.

## Problem Statement

The shipped App already has consumer IA, shells, and primitives, but it still looks like a blue SaaS dashboard. `--primary` is `#0000FF`, so every default Button, default Badge, checked Checkbox, and selected calendar day is blue. The desktop rail fills the active item with pale blue. The page is pure white. Level bands are one outline pill. Soft-archive is amber. Nothing reads as a sports brand.

A signed-in User opening Temba should feel a premium athletic product: black and white do the work; Volt Lime means something is active, important, or happening. Mapping `--primary` to lime would lime-wash the App and violate that rule.

## Solution

Retune the existing token system and restyle existing primitives, chrome, and feature surfaces.

Black and white are Temba. Volt Lime is a scarce accent (~5–10% of UI), used only via explicit `volt` tokens and `Button variant="brand"`. `--primary` becomes near-black so shadcn defaults stay monochrome. The page background becomes off-white `#F6F6F3`; cards stay white with a hairline gray border and ~16px radius. The desktop rail becomes `#0A0A0A` with a small lime selected bar. Mobile bottom nav stays white with black active icons. Typography (already Geist + the type scale) carries hierarchy.

The interface must still look like Temba if every Volt Lime element were temporarily gray.

## User Stories

1. As a signed-in User, I want the App to look like a sports brand rather than a blue admin dashboard, so that Temba feels athletic and premium.
2. As a signed-in User, I want black and white to do most of the work, so that the UI stays quiet until I need to act.
3. As a signed-in User, I want Volt Lime only on the most important action and on small active indicators, so that lime means something is happening.
4. As a signed-in User, I want the page behind cards to be off-white and cards to be white, so that content sits on a calm surface.
5. As a signed-in User on a large screen, I want the desktop rail to be black with white labels and a small lime selected mark, so that navigation feels like sportswear chrome rather than a light SaaS sidebar.
6. As a signed-in User on a phone, I want the bottom nav to stay white with black active icons and gray inactive icons, so that my thumb bar stays light against the off-white page.
7. As a signed-in User, I want Create Game on Home and Games to be the lime action, so that starting a Game is the loudest control without a new nav slot.
8. As a signed-in User, I want Join, Register, or Confirm score to be lime when they are the screen’s one important action, so that I can act without hunting.
9. As a signed-in User, I want secondary actions (Cancel, See all, Retry, outline buttons) to stay black, white, or gray, so that the screen is not lime-washed.
10. As a signed-in User, I want page titles and the Home greeting to feel editorial (heavy black type, tight tracking), so that hierarchy comes from type, not colour.
11. As a signed-in User, I want important numbers (Level, rank, scores, occupancy) to be large and tabular, so that sports data reads like a match card.
12. As a signed-in User, I want sport, format, Open, Public, and role tags to be quiet black/white/gray, so that badges stop competing with the primary action.
13. As a signed-in User, I want my Level band (D3–A) to use a monochrome D/C/B/A ramp, so that skill is ranked without rainbow colours.
14. As a signed-in User on You, I want my Level summary on a dark surface with a large Level numeral, so that my skill face feels like a ranking card.
15. As a Group member, I want the standing strip on Group home to sit on a dark surface with large ranks, so that Standing feels like a sports ranking, not a metric tile.
16. As a Group member, I want my leaderboard row marked as mine with a lime left bar, a You label, and a quiet fill — not a lime wash — so that I can find myself without colour-only meaning.
17. As a signed-in User, I want positive Level or Standing movement (when shown) to use a lime chip with black `↑` and the delta, so that gains are visible and still pass contrast.
18. As a signed-in User, I want inputs to use a dark focus outline, so that focus is clear without a glowing lime ring.
19. As a signed-in User, I want cards to use a 16px radius, hairline gray border, and little or no shadow, so that the App feels restrained.
20. As a signed-in User, I want buttons and inputs at 10–12px radius and badges at 6–8px, so that nothing looks pill-washed.
21. As a visitor on login or signup, I want the left panel to stay dark with a small volt mark, and Clerk’s primary button to be lime with black text, so that auth feels on-brand.
22. As an invitee, I want the invite shell to use the same off-white page and white card, with Accept as the lime action, so that join flows match the App.
23. As a Community Owner or Admin, I want Soft-archive to stay obvious via icon and copy on a quiet gray surface, so that caution is clear without a second brand colour.
24. As a User facing a destructive action, I want Leave / Delete / Dissolve to stay red, so that safety is not flattened into gray.
25. As a keyboard User, I want a dark focus ring on light surfaces and a light ring on the dark rail, so that focus is visible in both contexts.
26. As a User with low vision, I want lime never used as white-on-lime or lime-on-white text, so that primary actions stay readable.
27. As a User who cannot rely on colour, I want selected nav to also use a filled icon, weight, and a bar, so that current location is not lime-only.
28. As an Operator, I want Venues to pick up the same tokens without new Operator IA, so that staff surfaces are not a leftover blue island.
29. As a User on Games hub, I want Join on a Game card to be lime and View to stay quiet, so that only the live action is accented.
30. As a User, I want the App to remain itself if lime is turned gray, so that brand is type, space, and contrast — not a single accent.

## Implementation Decisions

### What this is

A wide visual refactor of the existing Temba App design system. Expand tokens, migrate primitives and chrome, restyle feature surfaces in screenshotable batches, then contract leftover blue. No new libraries, folders, routes, or page architecture.

### Token architecture (central)

Do not map `--primary` to Volt Lime.

| Token | New value | Intended use |
|---|---|---|
| `--color-volt` | `#C8F135` | Explicit accent fill, 3px indicators, chart-1 |
| `--color-volt-hover` | `#B2DB25` | Brand button hover |
| `--color-volt-soft` | `#F2FBD5` | Tiny fills only (progress track, current-level mark). Never large panels |
| `--color-volt-foreground` | `#0A0A0A` | Text/icons on volt fills |
| `--primary` | `#0A0A0A` | Default Button, default Badge, Checkbox, calendar selected, Avatar badge |
| `--primary-foreground` | `#FFFFFF` | Text on default primary |
| `--ring` | `#0A0A0A` | Focus rings on light surfaces |
| `--background` | `#F6F6F3` | Page / `bg-background` |
| `--card` | `#FFFFFF` | Cards, bottom nav, mobile top bar |
| `--surface-raised` | `#FAFAF8` | Grouped/raised (`--temba-gray-50`) |
| `--foreground` | `#0A0A0A` | Primary text |
| `--muted-foreground` | `#737373` | 15px+ secondary. Meta/eyebrow 12–13px use `#404040` because `#737373` on `#F6F6F3` is ~4.4:1 |
| `--border` | `#E5E5E2` | Card and row hairlines |
| `--input` | `#D4D4D0` or `#E5E5E2` | Field border, darker than page, not a glow |
| `--sidebar` | `#0A0A0A` | Desktop rail |
| `--sidebar-foreground` | `#FFFFFF` | Rail labels |
| `--sidebar-accent` | `#171717` | Rail hover |
| `--sidebar-accent-foreground` | `#FFFFFF` | Rail hover/active text |
| `--sidebar-primary` | `#C8F135` | 3px selected bar only |
| `--sidebar-ring` | `#FFFFFF` | Focus on dark rail |
| `--destructive` | keep | Leave / Delete / Dissolve / errors |
| `--chart-1` | volt | When a chart ships |
| `--chart-2`…`--chart-5` | gray ramp | Never a second chroma |

Named palette (also as `--temba-*` on `:root` for documentation): black `#0A0A0A`, black-soft `#171717`, white `#FFFFFF`, background `#F6F6F3`, surface `#FFFFFF`, gray-50 `#FAFAF8`, gray-100 `#F1F1EE`, gray-200 `#E5E5E2`, gray-300 `#D4D4D0`, gray-500 `#737373`, gray-700 `#404040`, volt, volt-hover, volt-soft.

**Expand–contract for `--color-brand*`:** Ticket 01 adds `--color-volt*` and remaps `--primary` / `--ring` / `--background` / `--sidebar-*`. It remaps leftover `text-brand` to `text-foreground` and `bg-brand-subtle` to a **neutral** (`bg-muted` / gray-100), not volt-soft. `--color-brand` is not aliased to volt (that would make `text-brand` lime-on-white at ~1.3:1). Ticket 07 deletes unused `--color-brand*` once grep is clean.

**`.dark`:** retune to the same architecture (primary light-on-dark, ring light, volt unchanged). No toggle.

**Lime contrast:** `#C8F135` on white is ~1.3:1. Lime fill + `#0A0A0A` text is ~15:1 (AAA). Lime **text** is only allowed on dark surfaces. On light surfaces, positive movement is a lime **chip** with black `↑` + `+48`, never lime-coloured numerals on white.

### Button variants

Keep `default` / `destructive` / `outline` / `secondary` / `ghost` / `link`. Add:

- `brand`: `bg-volt text-volt-foreground hover:bg-volt-hover`, weight 600–700, `rounded-md` (10px). Never white text on volt.

`default` becomes black fill, white text (from `--primary`). That is the **standard** action. `brand` is opt-in.

**At most one `variant="brand"` control per screen.** Allowlist:

- Create Game (Home and Games hub PageHeader)
- Create Group / Community / Team when that is the page’s primary action
- Join / Register / Join waitlist on a Game card or Game home (not View)
- Confirm score / complete Match when that is the organizer’s primary act
- Save / submit on a create or edit form that is the page’s purpose
- Declare Level
- Accept invite
- Request to join when it is the only primary on Community/Group home
- Clerk Continue / Sign in / Sign up (appearance variables)

Denylist for brand: Cancel, See all, Retry, Sign in ghost, Approve/Reject pairs (Approve = `default`, Reject = destructive/outline), overflow ActionMenu, bottom-nav items, rail items.

GameSummaryCard Join/Register restyles to `variant="brand"` with 10–12px radius; View stays outline/ghost; no pill CTAs; no lime text.

### Volt Lime allowlist / denylist

**Allow (~5–10% of UI):**

- `Button variant="brand"`
- Clerk primary button
- Desktop rail 3px left selected bar
- Mobile bottom-nav 2px top selected bar (not the icon, not the label)
- Viewer Standing row 2–3px left bar (keep `You` label)
- Positive movement chip (black `↑` + delta on volt fill), when movement is shown
- Occupancy/progress fill if a 4px bar is added on existing occupancy (do not add a Progress primitive in this work)
- Small current-Level mark on the dark You Level card
- Auth left-panel geometric square
- `--chart-1` when a chart ships

**Never lime:**

- Default Button / Badge / Checkbox / calendar selected / Avatar online badge
- Page, card, or rail backgrounds
- Body, title, or link text on light surfaces
- Sport / format / Open / Public / role / Provisional / Soft-archived badges
- Entire Level-band fill (except optional 4px mark)
- Focus rings
- Tabs line indicator (stays black)
- Error / destructive
- Soft-archive banner
- Large `volt-soft` panels (`brand-subtle` replacement)

### Surfaces, cards, radius, spacing

- Page: `#F6F6F3`. Cards: `#FFFFFF`, `border 1px #E5E5E2`, `rounded-xl` (16px), shadow none or `shadow-xs`. Retune Card `elevated` away from `shadow-md`; Home hero and auth/invite cards become the same outlined language. Overlay shadows on Dialog/Drawer/Dropdown may stay.
- Keep: a bordered surface must not contain another bordered surface; RowList inside Card stays borderless.
- `--radius` stays `0.75rem`. Calc: sm 8 / md 10 / lg 12 / xl 16. Card uses `rounded-xl`. Badge uses `rounded-sm` (8px), not `rounded-full`.
- Spacing scale unchanged (4–48). Section gaps stay generous.

### Typography

Keep Geist and `--text-eyebrow` … `--text-display`. Shift weight, not scale:

- Home greeting (existing `Hi, {firstName}` line): editorial `text-h1`/`text-display`, weight 700–800, tracking `-0.02em`, black. Time-of-day Good morning/afternoon/evening from local clock is allowed as copy on that existing node; no new API. Optional second line in muted body (“Find your next game.”) is allowed; do not add sections.
- PageHeader h1: 700–800.
- Section h2: 600–700, black.
- Body 400–500. Secondary 15px+ `#737373`; 12–13px meta `#404040`.
- StatStrip values: at least `text-h2` tabular on dark ranking strips.
- Uppercase eyebrows stay spare via existing `text-eyebrow` + tracking. Do not uppercase body or buttons App-wide. Button labels may stay title case as they are today.

Glossary: say **Level**, **Rating**, **Standing**, **Level band**. Do not ship “Elo” in UI copy.

### Navigation

- AppRail: `bg-sidebar`. Wordmark white. Inactive muted on dark (light gray). Selected: white, `font-semibold`, filled/weight + 3px left `bg-volt`. Remove `bg-brand-subtle text-brand`. Hover `--sidebar-accent`. Tokens, not a class dump.
- BottomNav: white `bg-card`, hairline top `#E5E5E2`, drop `shadow-md`. Active: black filled icon + `font-semibold` + 2px `bg-volt` top bar. Inactive: `#737373`. Do not colour the icon or label lime. Do not add Create.
- MobileTopBar: `bg-card` (white) so it matches the bottom bar against the off-white page.

No new Create control in BottomNav. Five destination slots stay. The lime Create is the existing Create Game PageHeader action on Home and Games hub (`variant="brand"`). Analogous page-primary creates (Group, Community, Team) may be brand on that screen only. No FAB, no 6th slot.

### Levels, Standing, stats

- LevelBandBadge: D* outline on white; C* gray-100 fill; B* 2px black border; A inverse. Shows the real band string (C2, B1, A).
- You Level card: dark `#0A0A0A`, large white Level numeral, band badge, Provisional as gray. Optional 4px volt underline/dot for current band.
- Group home StatStrip: dark surface, light labels, large white numbers. Home career StatStrip and Game occupancy strip stay light (not every strip is a ranking hero).
- LeaderboardRow viewer: quiet gray-50 fill + volt left bar + `You` outline badge. Ranks 1–3 stay neutral chips + icons.

### Semantic / Soft-archive

`--destructive` unchanged. SoftArchiveBanner: muted / gray-100, heading black, body gray-700, TriangleAlert in foreground — not `--warning`. Badge `success`/`warning` unused on App surfaces; positive movement is a volt chip. `--warning` / `--success` may remain unused in CSS.

### Clerk and shells

- Clerk appearance: `colorPrimary #C8F135`, `colorPrimaryForeground #0A0A0A`, `colorBackground #FFFFFF`, `colorText #0A0A0A`, `colorTextSecondary` at least `#404040` so 13px secondary meets 4.5:1. `borderRadius` 0.75rem.
- AuthShell: left panel `#0A0A0A`; geometric square `bg-volt`. Form column `bg-background`. Card white outlined.
- InviteShell: same page/card language; Accept = `variant="brand"`.

### Charts and progress

No charting library. Occupancy stays `6/8` text unless a later ticket adds a 4px bar; if so, volt fill on gray track. `--chart-1` = volt for when a chart ships.

### Accessibility

- Lime fill always uses `#0A0A0A` text.
- Selected nav: bar + weight + filled icon; not colour alone.
- Movement: `↑`/`↓` plus chip; not colour alone.
- Focus: dark 3px ring on light; white ring on rail.
- Touch 44×44 stays.
- `prefers-reduced-motion` stays.
- `#737373` is not the 12–13px meta colour.

### Unchanged behavior

IA and routes; tRPC/Drizzle/Clerk auth logic; Games/Standing/Level/invite/Soft-archive rules; Geist/Lucide; type scale names and container tokens; primitive inventory; no nested bordered cards; no dark-mode toggle; no new Create nav control.

### What this supersedes

From `.scratch/redesign/spec.md` §4.1–4.2: blue `--color-brand` family; `--primary` / `--ring` / `--sidebar-primary` / `--chart-1` = blue; `--background` pure white; light `--sidebar`; `brand-subtle` as active nav and viewer-row fill; white text on primary; `--color-brand-text` as blue body accent; `--muted-foreground` as the only secondary (now split 500 vs 700 for size).

### Token mapping (old → new → use)

| Old | New | Use |
|---|---|---|
| `--color-brand` `#0000FF` | retired; `--color-volt` | Explicit accent only |
| `--color-brand-hover/active` | `--color-volt-hover` | Brand button hover |
| `--color-brand-text` | `--foreground` | No lime/blue body text |
| `--color-brand-on-dark` | `--color-volt` | Small mark on dark |
| `--color-brand-subtle` | `--muted` / gray-100 | Never large volt fill |
| `--primary` = brand | `--primary` = `#0A0A0A` | Default interactive chrome |
| `--primary-foreground` white | white | On black primary |
| `--ring` = brand | `--ring` = `#0A0A0A` | Focus |
| `--background` white | `#F6F6F3` | Page |
| `--card` white | white | Cards / mobile chrome |
| `--surface-raised` near-white | `#FAFAF8` | Raised grouping |
| `--border` | `#E5E5E2` | Hairlines |
| `--muted-foreground` `#636363` | `#737373` body; `#404040` meta | Secondary type |
| `--sidebar` light | `#0A0A0A` | Rail |
| `--sidebar-primary` blue | volt | Indicator only |
| `--success` on movement | volt chip | Positive delta |
| `--warning-subtle` banner | muted + copy | Soft-archive |
| `--chart-1` blue | volt | Future charts |

### Decision priority when uncertain

1. Typography
2. Spacing
3. Contrast
4. Black / white
5. Neutral gray
6. Volt Lime only if attention is required

Do not use colour to solve hierarchy problems that typography and spacing can solve.

### Dark regions (restyle only)

Desktop AppRail; AuthShell left panel (already dark; square → volt); You Level card; Group home standing StatStrip. Home greeting stays on the page background with editorial black type. Home next-Game card stays a white card. Do not invent new page architecture.

## Testing Decisions

Good tests assert **user-visible visual language**, not CSS variable names.

Highest seam: a signed-in User opens the App (Home, then Games, Group Standing, You, login) and sees an off-white black/white sports UI whose only chroma accent is Volt Lime on the primary action and small indicators.

- Existing unit/integration tests stay green. No new API tests.
- No visual-regression harness required (same as TEM-72).
- Closing gate like `.scratch/redesign/qa-gate.md`:
  - Grep: `#0000FF`, `#0000ff`, `text-brand`, `bg-brand`, `bg-brand-subtle`, `brand-on-dark`, leftover blue oklch hue 264
  - Grep: `bg-primary` only on default chrome, not as a lime stand-in
  - Contrast: lime CTAs black text; meta 12–13px on `#F6F6F3` ≥ 4.5:1; rail labels ≥ 4.5:1 on `#0A0A0A`
  - Volt occupancy ~5–10% on Home, Game home, Group Standing, You
  - One brand button per sampled screen
  - Screenshots at 390 / 768 / 1024 / 1440 for Home, Games hub, Game home, Group home Standing, You, login, invite accept
- Prior art: TEM-72 qa-gate, existing unit tests (do not couple to colours)

Approving this spec approves the Test seams in Testing Decisions.

## Out of Scope

- Product IA, routes, flows, backend, schema, permissions
- New components, libraries, charting, Create FAB / extra nav slot
- Dark-mode toggle; photography; motion redesign; icon set change
- New Level/Standing movement API (rules apply when deltas exist)
- Rainbow levels, extra brand accents, glass, gradients, glow
- Rewriting `.scratch/redesign/spec.md`

## Further Notes

### Risks

- **Lime-wash:** mapping `--primary` or `--color-brand` to volt paints every default Button, You invite Badge, Checkbox, and calendar day lime. Ticket 01 forbids that alias.
- **Contrast:** lime+white fails (~1.3:1). `text-brand` remapped to volt would fail Review/nav. Brand buttons must use `--color-volt-foreground`. `#737373` at 13px on `#F6F6F3` fails AA — meta uses `#404040`.
- **Clerk:** `colorPrimaryForeground` must be black; if Clerk ignores it, auth CTAs fail WCAG.
- **Dark rail vs light content:** `--sidebar` must not tint the main column. Main stays `bg-background` (`#F6F6F3`). Rail focus `--sidebar-ring` white, not black-on-black.
- **Leftover `#0000FF`:** Clerk hex, token comments, `bg-brand-on-dark` square, `hover:bg-brand-hover` on Badge. Ticket 07 greps these.
- **Elevated cards + shadows:** Home hero and GameSummaryCard elevation can keep a “SaaS card” look if Ticket 02 does not flatten elevation.
- **Pill CTAs:** Game Join `rounded-full` fights the radius lock unless Ticket 05 removes it.
- **Two Create Games:** Home and Games both brand is correct (different screens). Bottom nav must not also go lime.
- **Success toasts:** sonner check icons may still read green; keep functional, do not add a second brand green on surfaces.
- **Level copy:** UI must say Level / Level band, not Elo.

### Phased tickets

Seven tickets, expand–contract. Full bodies live in Linear as TEM-121 through TEM-127, with native `blocks` relations. Frontier at approval: TEM-121.

| Ticket | Title | Blocked by |
|---|---|---|
| [TEM-121](https://linear.app/temba-app/issue/TEM-121/expand-sports-tokens-primary-black-volt-lime-beside-surfaces-and) | Expand sports tokens (primary black, Volt Lime beside, surfaces and radius) | — |
| [TEM-122](https://linear.app/temba-app/issue/TEM-122/migrate-primitives-to-the-sports-brand) | Migrate primitives to the sports brand | TEM-121 |
| [TEM-123](https://linear.app/temba-app/issue/TEM-123/migrate-chrome-rail-bottom-nav-authinvite-shells-clerk) | Migrate chrome (rail, bottom nav, auth/invite shells, Clerk) | TEM-121 |
| [TEM-124](https://linear.app/temba-app/issue/TEM-124/restyle-home-and-you-to-the-sports-brand) | Restyle Home and You to the sports brand | TEM-122, TEM-123 |
| [TEM-125](https://linear.app/temba-app/issue/TEM-125/restyle-games-surfaces-to-the-sports-brand) | Restyle Games surfaces to the sports brand | TEM-122, TEM-123 |
| [TEM-126](https://linear.app/temba-app/issue/TEM-126/restyle-groups-standing-communities-venues-teams-and-invites) | Restyle Groups, Standing, Communities, Venues, Teams, and Invites | TEM-122, TEM-123 |
| [TEM-127](https://linear.app/temba-app/issue/TEM-127/contract-leftover-blue-and-visual-qa-gate) | Contract leftover blue and visual QA gate | TEM-124, TEM-125, TEM-126 |
