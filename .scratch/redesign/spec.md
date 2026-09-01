Status: ready-for-agent

## Problem Statement

Temba is a consumer padel product wearing an internal admin dashboard. The App is a shadcn sidebar template with five flat nav items, no active states, no max-width, and pages that hand-roll `rounded-xl border` roughly 46 times while `Card`, `Table`, `Tabs`, `Avatar`, `Drawer`, `DropdownMenu`, `Checkbox`, `Toggle` and `Breadcrumb` sit installed with zero app imports. `text-sm` is 66% of every sizing class in `src/`. Home leads with three database counters, one of which (`gamesPlayed`) is structurally always `0`. Group home spends most of a 390px viewport on four stacked single-metric cards. `user.image` exists on every User row and is rendered nowhere. Three shells disagree on brand: the dashboard is a pale blue wash, `auth-shell.tsx` is `bg-[#0f0a1f]` with violet and emerald blur orbs, `invite-shell.tsx` is a slate-to-emerald gradient, `public/layout.tsx` is `from-[#2e026d] to-[#15162c]`. Dark mode is fully tokenised and unreachable.

The result reads as a database viewer. Nothing on Home is a call to play. A player cannot tell at a glance when they next play, who they are playing with, or where.

Separately, the product's centre of gravity does not exist yet. Games are the reason a player opens Temba, and there is no Game route, no `Match` table, no registration, no rankings, and `games.create` is an empty stub (`apps/temba/src/server/api/routers/games.ts:52`). That work is already specified and ticketed in `.scratch/games-matches/spec.md` (TEM-35…TEM-43). This redesign must not re-specify it, must not block on it, and must leave a shaped hole for it.

## Solution

Two tiers, sequenced.

**Tier 1 — presentational redesign (phases 0–5, 7–8).** Rebuild the visual and navigational layer of every surface that exists today, on today's tRPC payloads. No change to API contracts, Drizzle schema, Clerk behaviour, authorization flags or domain logic. Where a redesign wants data that does not exist, the field is dropped from phase one and named in Tier 2 rather than invented.

Concretely: one token system (near-monochrome neutral surfaces, `#0000FF` as the single accent), a 15px body scale replacing the `text-sm` monoculture, three surface levels instead of a border around everything, a bottom tab bar below `lg` and a 240px rail above it with real active states, constrained content columns, and roughly twenty-seven shared primitives and utilities extracted from the duplication list in `.scratch/ui-audit/feature-pages.md` §13 so pages stop hand-rolling layout.

**Tier 2 — forward-looking phases (4 and 6), explicitly flagged.** The Games experience is a design contract handed to the already-approved `games-matches` tickets (TEM-35…TEM-43), not a new backend spec. Rankings, levels, player profiles and standing movement have no spec and no schema; this document states what they would need and stops there.

Approving this spec approves the Test seams in Testing Decisions and the cleanup list in §7.1.

---

## 1. Critique of the current UI

Verified against source and against the running App at 390px and 1440px (`.scratch/ui-audit/browser-audit.md`).

### 1.1 The shell is an admin dashboard, not a consumer app

`dashboard-shell.tsx` is the stock shadcn `SidebarProvider` + `SidebarInset` + `SiteHeader` template. At 1440px a ~288px sidebar (`--sidebar-width: calc(var(--spacing) * 72)`) holds five text links and a Clerk `UserButton`. At 390px that same sidebar becomes a 3/4-width `Sheet` behind a hamburger — so the primary navigation of a mobile-first sports app is two taps and a full-screen overlay away. There is no bottom navigation.

The pattern is wrong for the product. A player checking tonight's Game should reach any destination with one thumb tap.

### 1.2 No max-width anywhere

```203:209:apps/temba/src/components/dashboard-shell.tsx
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
```

Content is full-bleed inside the inset. In `.scratch/ui-audit/shots/d-detail-pages.png` a Standing leaderboard row stretches roughly 1150px to carry `#1 Yousif Mansoor` over `19 sets · 575 points · 25 Games` — two lines of 14px text with a metre of whitespace between the name and nothing. Only the four create/edit form pages opt into `max-w-lg` or `max-w-2xl` locally. `@container/main` is declared and no `@container` rule consumes it.

### 1.3 The page title is rendered twice

`site-header.tsx` renders `<h1 className="text-base font-medium">{title}</h1>`, and every page then renders its own `<h2 className="text-2xl font-semibold tracking-tight">` with the same string. `home-both.png` shows "Home" twice, roughly 20px apart. `d-groups-teams.png` shows "Groups" twice and "My Teams" twice. The header `h1` is also each page's only `h1`, so the real page title is an `h2` with no `h1` above it in the content column — a document-outline defect as well as a visual one.

### 1.4 `text-sm` monoculture

311 typed size usages across `src/`: `text-sm` 206 (66.2%), `text-xs` 14 (4.5%), everything else 91. 70.7% of sized text is 14px or smaller, and 14px is the default *body* size, not a secondary size. There is no scale — there is one size plus three heading sizes (`text-2xl` page title, `text-lg` section, `text-base` header). Every list row's primary and secondary text differ only by colour (`text-foreground font-medium` against `text-sm text-muted-foreground`), so nothing has visual rank.

### 1.5 Rectangles inside rectangles

`Card` has zero app imports. Instead `rounded-xl border` appears roughly 46 times, and it nests. `communities/[id]/page.tsx:526` opens a bordered `Groups` section; each Club Group inside it is another bordered card with its own `Open` button (`:557`); below that an inline `Create Club Group Public` form is a third bordered card with its own input and button. `m-detail-loaded.png` shows three levels of border at 390px. Community home is 1060 lines with eleven top-level `rounded-xl border` sections; Group home is 672 lines with nine.

### 1.6 Single-metric stat cards

```366:366:apps/temba/src/app/dashboard/groups/[id]/page.tsx
            <dl className="border-border bg-card grid grid-cols-1 divide-y rounded-xl border md:grid-cols-4 md:divide-x md:divide-y-0">
```

Below `md` this collapses to four stacked full-width rows. In `m-detail-loaded.png`, Position / Sets won / Points won / Games played consume roughly 280 vertical pixels — most of the fold — to deliver four integers. `Group stats` above it (`:346`) is a bordered card containing exactly one number, `Games played 0`. Home repeats the pattern with three cells (`dashboard/page.tsx:56`), and Team home with three.

### 1.7 Rows have no identity

`user.image` is on the `user` table and rendered in zero dashboard pages. Every list row — Groups, Communities, Teams, Invites, Community members, Standing leaderboards — is a name string over a meta string. `Avatar` (with `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup` and `AvatarGroupCount` already written) has zero imports. Venue logos exist (`venues.logoImageUrl`) and appear only as a bare 16×16 `<img>` on Community home. A Standing leaderboard of thirteen padel players is thirteen indistinguishable text rows.

### 1.8 Empty states come in two incompatible tiers

Home uses a bordered card with copy and a CTA (`dashboard/page.tsx:90-98`, `:142-150`). Groups, Communities, Teams and Invites use one line of muted text with no CTA and no container:

```42:46:apps/temba/src/app/dashboard/groups/page.tsx
        {groups.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You are not in any Groups yet.
          </p>
        ) : null}
```

`d-groups-teams.png` shows the consequence: a 1440px page whose entire content is one sentence of grey 14px text, top-left, with a `Create Group` button roughly 900px away in the opposite corner.

### 1.9 The user control is duplicated, and nav has no active state

Clerk's `UserButton` renders in `app-sidebar.tsx`'s `SidebarFooter` and again in `site-header.tsx` via `AuthHeaderControls`. Both are visible simultaneously at 1440px (`home-both.png`, bottom-left and top-right). `nav-main.tsx` never imports `usePathname` and never sets `isActive`, so `SidebarMenuButton`'s `data-[active=true]:bg-sidebar-accent` styling is dead code and the nav never tells you where you are (`m-nav-drawer.png`).

### 1.10 Header actions wrap and read ambiguously

Group home's header carries three buttons — `Leave Group`, `Community`, `Communities`. At 390px they wrap onto two rows (`m-detail-loaded.png`). `Community` and `Communities` differ by one character and go to different destinations. `Leave Group` is a destructive action given equal visual weight to two navigation links, with no confirmation step. There is no `Dialog`, `AlertDialog` or `Drawer` on any feature page, so `leave`, `delete`, `dissolve`, `unlinkVenue`, `clearLogo` and `softArchive` all fire on a single click.

### 1.11 Unused primitives, dead motion, unreachable dark mode

Zero app imports: `card`, `table`, `tabs`, `toggle`, `checkbox`, `drawer`, `dropdown-menu`, `avatar`, `breadcrumb`.

`tw-animate-css` is commented out at `globals.css:3` while `animate-in`, `fade-in-0`, `zoom-in-95` and `slide-in-from-*` are referenced by `sheet.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `select.tsx`, `tooltip.tsx` and `auth-shell.tsx:35`. Those animations resolve to nothing today.

`.dark` is a complete 20-token palette; nothing ever adds `.dark` to an ancestor, and `sonner.tsx` calls `useTheme()` from `next-themes` with no `ThemeProvider` mounted anywhere in the tree. The `.dark` palette is also incoherent with `:root` — light is hue-250 blue-branded, dark is achromatic except `--sidebar-primary`.

`sidebar.tsx:483` reads `shadow-[0_0_0_1px_hsl(var(--sidebar-border))]` while `--sidebar-border` is an `oklch()` colour, not an HSL triple. That outline variant's shadow is broken.

### 1.12 Off-brand shells

Four visual identities in one App:

| Surface | Palette |
|---|---|
| Dashboard | `--background: oklch(0.985 0.012 250)`, `--primary: oklch(0.55 0.14 250)` — pale blue wash |
| `auth-shell.tsx` | `bg-[#0f0a1f]` plus `bg-violet-600/40`, `bg-emerald-500/30`, `bg-violet-500/20` blur orbs; form side `from-slate-50 to-slate-100` |
| `invite-shell.tsx` | `from-slate-950 via-slate-900 to-emerald-950`, card `bg-black/30`, pervasive `text-white/70` |
| `public/layout.tsx` | `from-[#2e026d] to-[#15162c]` (dead route) |

Plus `border-amber-500/30 bg-amber-500/10` as the Soft-archive banner at four call sites (`groups/[id]/page.tsx:306,318`, `communities/[id]/page.tsx:363,375`, `venues/[id]/page.tsx`), using Tailwind's named palette rather than a token.

### 1.13 Loading and error handling is thin

No `loading.tsx`, `error.tsx` or `not-found.tsx` anywhere under `src/app`. No `Suspense`. Detail pages skeletonise only the header, then the rest of the page pops in — `m-detail-loaded.png`'s right panel is two grey bars above an otherwise empty Community page. Every query error is `<p className="text-destructive text-sm">{error.message}</p>`, so a tRPC `NOT_FOUND` on a bad Group id renders as a sentence of red 14px text inside otherwise-normal chrome. Non-Operators reaching `/dashboard/venues` get full dashboard chrome and the single line "You do not have access to this area."

---

## 2. Proposed visual direction

**Temba should feel like a match card, not a report.**

Near-monochrome. White and near-black do the work; `#0000FF` appears only where the product wants the player to act, or to know that a row is *theirs*. Type carries hierarchy, not borders. Content sits in one confident column with generous vertical rhythm, wide enough to read and no wider. Faces and logos are present everywhere people are. Numbers that matter — a rank, a set score, a start time — are large, tabular and unapologetic; numbers that do not matter are not shown at all.

Adjectives, in priority order: **scannable, athletic, mobile-first, minimal, social, premium**. A player standing in a car park should be able to read tonight's Game in one glance.

Explicitly ruled out:

- **Generic SaaS dashboard aesthetics** — metric tiles, an "Overview" section, `dl`/`dt`/`dd` stat grids as a page's lead element.
- **Giant permanent sidebars.** The desktop rail is 240px and secondary; below `lg` there is no sidebar at all.
- **Pale-blue washes.** `--background` becomes pure white and the blue-tinted neutral ramp goes entirely.
- **Rectangles inside rectangles.** A bordered surface may not contain another bordered surface. Ever.
- **Excessive borders.** A card gets a border *or* a shadow, never both, and often neither.
- **Tiny text.** 12px is reserved for non-essential eyebrow labels; body is 15px.
- **Tiny top-right CTAs.** A mobile screen's primary action is full-width or thumb-reachable, never an 8px-tall `size="sm"` button in a corner.
- **Table-heavy layouts.** Standing leaderboards and lists are rows with identity, not `<table>`.
- **Wasted horizontal space.** Constrained columns; desktop earns its width with a second column or it does not take it.
- **Uniform visual weight.** Every screen has exactly one thing that is obviously most important.
- **Stock shadcn appearance.** Primitives are retuned — radius, density, weight, hover model — not consumed as shipped.
- **Neon and gaming aesthetics.** No glows, no gradients on interactive elements, no dark-by-default, no chroma competition. `#0000FF` is loud enough on its own.

---

## 3. Information architecture and navigation

### 3.1 What Temba's IA actually is

Today: `Home · Groups · Teams · Communities · Invites` (plus `Venues` for Operators), flat, no sections, no active state (`app-sidebar.tsx:26-56`).

Ranked by how often a real player touches each surface:

| Surface | Frequency | Nature |
|---|---|---|
| Games | Weekly → daily, once it exists | The product |
| Home | Every session | Aggregator |
| Groups | Weekly | Where you play; where Standing lives |
| Communities | Monthly | Community membership, staff admin, Venue |
| Invites | Episodic, count-driven | Inbox for Lookup invites |
| Teams | Rare | Partnership admin — create, invite one partner, link to a Community |
| Venues | Operator only | Staff catalogue tooling |

Two structural facts constrain any proposal:

1. **Games have no destination.** There is no `/dashboard/games` route, no Game home, and no register action. `games.listPublicPickup` is implemented and returns rows, but there is nowhere to click through to and nothing to do on arrival. A "Games" tab in phase one would be a list of dead rows.
2. **`.scratch/groups-communities-nav/spec.md` is approved and explicit:** "two sidebar items not tabs; Groups = membership; Communities = nested inventory of all Club Groups". Collapsing Groups and Communities into one destination with a segmented control would contradict a shipped contract. It is off the table.

### 3.2 What was rejected, and why

**`Home / Games / Groups / Explore / Profile`** (the direction suggested at brief time) fails on two of five slots:

- **Games** has no phase-one content, per §3.1.
- **Explore** has nothing to explore. The Directory page and its list procedure were deliberately deleted by `groups-communities-nav`, and `CONTEXT.md` keeps **Directory** as "A planned App list of live Community Public clubs. Not a shipped surface." Community Public is joinable by request *via the Community URL*; Community Private is Lookup invite or Invite link only. There is no browse corpus in the database and no procedure to build one. An Explore tab would be a permanent home in the primary nav for an empty state.

**Keeping today's five items as five tabs** (`Home / Groups / Teams / Communities / Invites`) fails differently: it spends two of five slots on Teams (configured once, then rarely revisited) and Invites (usually empty), and leaves no room for Games ever.

**Collapsing Groups and Communities into one "Clubs" tab with a segmented control** would free a slot and is defensible on its own merits — both are "who I play with" — but it directly contradicts `groups-communities-nav`. Rejected on contract grounds, not design grounds.

### 3.3 Recommendation

**Phase one — four tabs:**

```
Home  ·  Groups  ·  Communities  ·  You
```

**Phase two — five tabs, when `games-matches` (TEM-36) ships Game home:**

```
Home  ·  Games  ·  Groups  ·  Communities  ·  You
```

Build the bar with five-slot geometry from day one (equal flex, 20% slots) so adding Games is a data change, not a layout reflow. Reserve the slot with a feature-flag constant, not a rendered placeholder tab.

**Where everything lives:**

- **Home** — the aggregator, and the only surface with a pending-invite entry point. Next Game, upcoming Games, Standing, invites callout.
- **Groups** — unchanged destination (`/dashboard/groups`), redesigned. Group home hosts Standing, Games and Members as tabs.
- **Communities** — unchanged destination (`/dashboard/communities`), redesigned as the nested Club Group tree that `groups-communities-nav` specifies. Community home hosts Community info, Venue, Groups, Teams and role-gated staff panels.
- **You** — new surface at `/dashboard/you`, a personal hub. Hosts the identity header (avatar, name, username), **Teams**, **Invites** with a count, **Operator tools → Venues** only when `publicMetadata.operator === true`, and the Clerk account control. This is the single place the user control appears; the header duplicate is deleted.
- **Invites** — route `/dashboard/invites` stays exactly as it is. It loses its nav slot and gains two entry points: a Home card that renders only when the three pending-Lookup-invite queries total more than zero, and a permanent badged row on You. Rationale: a permanent tab for a usually-empty inbox spends a quarter of the primary nav on a surface most players see once. A count badge on You plus a conditional Home card covers the actual need — *tell me when something is waiting*.
- **Teams** — route `/dashboard/teams` stays. Reached from You, and contextually from Community home's Teams section. Rationale: a Team is exactly two Users and is configured once. Nothing about it is a weekly destination.
- **Venues** — Operator only, reached from You. `OperatorGate` and `venues/layout.tsx` are untouched; only the entry point moves, and the denied state gets a real design.
- **Settings and account** — Clerk's `UserButton` continues to own account management, mounted once, on You. No custom settings surface is invented.

**Breakpoint behaviour:**

| Width | Navigation | Content |
|---|---|---|
| < 1024px | Fixed bottom tab bar, five equal slots, 56px plus `env(safe-area-inset-bottom)`. Slim contextual top bar: back affordance on detail routes, title, at most one action. No hamburger, no `Sheet`. | Single column. Gutters 16px, 20px ≥ 430px, 24px ≥ 768px. |
| ≥ 1024px | 240px left rail, always visible, `collapsible="none"`, brand mark top, active item marked. No top bar — the page `h1` is the title. | `--container-content` (44rem) for detail and reading; `--container-wide` (64rem) where a second column earns it. |

**Trade-off, stated:** switching at `lg` (1024px) means a landscape tablet at ~1000px gets a bottom bar. The alternative — switching at `md` (768px) — gives a 768px viewport a 240px rail beside 528px of content, which is worse than a full-width single column with thumb-reachable nav. Recommendation: switch at `lg`. If a real tablet layout is wanted later, add an intermediate icon-only rail at `md` rather than moving this boundary.

**Active state is a requirement, not a nicety.** `usePathname` with prefix matching (`/dashboard/groups/*` marks Groups active), `aria-current="page"`, and a non-colour-only indicator: the bottom nav uses a filled icon, a `--brand` label and a 2px top indicator bar; the rail uses a `--brand-subtle` fill, a `--brand` icon and 600 weight.

**The mobile Sheet drawer is removed** once the bottom bar ships. `ui/sidebar.tsx` is kept as the desktop rail — it works, and rewriting it buys nothing — but it is not mounted below `lg`, so `SIDEBAR_WIDTH_MOBILE`, `openMobile`, `SidebarTrigger` and `useIsMobile`'s only consumer all fall out of the App's runtime path. Do not delete `ui/sidebar.tsx`.

---

## 4. Design system

Tailwind v4, CSS-first. Everything below lives in `apps/temba/src/styles/globals.css`. There is no `tailwind.config` and none is added. `components.json` already declares `baseColor: neutral`, which the new palette finally honours.

### 4.1 Brand colour: `#0000FF`, handled honestly

`#0000FF` is `oklch(0.452 0.3132 264.05)`. Measured contrast ratios (WCAG 2.x relative luminance):

| Pair | Ratio | Verdict |
|---|---|---|
| White text on `#0000FF` | **8.59:1** | Passes AA and AAA at every size |
| `#0000FF` text on white | **8.59:1** | Passes AA and AAA numerically |
| `#0000FF` on `#0A0A0A` (`--foreground`) | 2.30:1 | Unusable on dark; needs a lighter step |

So contrast is **not** the problem, and this redesign will not weaken the brand on a false premise. The real problems with a maximum-chroma blue are three, and none of them is a contrast ratio:

1. **Chromatic aberration at small sizes.** Short-wavelength light focuses in front of the retina and the fovea has very low S-cone density, so 13–15px pure-blue text on white looks soft and tiring regardless of its 8.59:1 ratio. This is a legibility failure the contrast formula does not model.
2. **No hover headroom.** At maximum chroma for its lightness there is no "more blue" to go to. Every state change must move lightness instead.
3. **Vibration in large fills.** A full-bleed `#0000FF` panel adjacent to neutral grey buzzes and reads cheap.

Therefore:

- **`#0000FF` at full strength is for solid fills with white text** — primary buttons, the active-tab indicator, the "you" marker on a Standing row, the invite count badge. Small, deliberate, and 8.59:1.
- **Inline blue *text* uses a reduced-chroma, matched-lightness step** so links and numerals stay crisp.
- **Hover and pressed states move down in lightness** along the same hue.
- **Large decorative surfaces use the pale tints, never the full-strength blue.**

```css
@theme {
  /* Brand — #0000FF is --color-brand; everything else derives on hue 264 */
  --color-brand:               oklch(0.452 0.3132 264.05); /* #0000FF · white text 8.59:1  */
  --color-brand-hover:         oklch(0.405 0.280  264.05); /* #0001DC · white text 10.31:1 */
  --color-brand-active:        oklch(0.360 0.250  264.05); /* #0000BD · white text 12.10:1 */
  --color-brand-text:          oklch(0.420 0.230  264.05); /* #0432C7 · on white  9.19:1   */
  --color-brand-on-dark:       oklch(0.700 0.160  264.05); /* light step for dark surfaces */
  --color-brand-subtle:        oklch(0.960 0.018  264.05); /* #ECF2FE · active nav, own row */
  --color-brand-subtle-border: oklch(0.900 0.045  264.05); /* #CFDEFD                      */
}
```

`--color-brand-on-dark` sits marginally outside sRGB at chroma 0.16 and measures roughly 6.5:1 against `oklch(0.16 0 0)`. TEM-52 must gamut-check it in a browser and reduce chroma until it is clean.

### 4.2 Neutrals and semantic colours

Achromatic. Hue and chroma are zero, which is what "black and white mostly" means and what `baseColor: neutral` already promised.

```css
:root {
  --background:           oklch(1     0 0);   /* #FFFFFF                       */
  --foreground:           oklch(0.145 0 0);   /* #0A0A0A · 19.8:1 on white     */
  --surface-raised:       oklch(0.985 0 0);   /* #FAFAFA · borderless level 1  */
  --card:                 oklch(1     0 0);
  --card-foreground:      var(--foreground);
  --popover:              oklch(1     0 0);
  --popover-foreground:   var(--foreground);
  --muted:                oklch(0.97  0 0);   /* #F5F5F5                       */
  --muted-foreground:     oklch(0.50  0 0);   /* #636363 · 6.01:1 on white     */
  --secondary:            oklch(0.97  0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --accent:               oklch(0.97  0 0);
  --accent-foreground:    oklch(0.205 0 0);
  --border:               oklch(0.922 0 0);   /* #E5E5E5                       */
  --input:                oklch(0.89  0 0);   /* darker than --border on purpose */

  --primary:              var(--color-brand);
  --primary-foreground:   oklch(1 0 0);
  --ring:                 var(--color-brand);

  --destructive:            oklch(0.577 0.245 27.325); /* unchanged from today */
  --destructive-foreground: oklch(1 0 0);
  --destructive-subtle:     oklch(0.968 0.020 27);
  --success:                oklch(0.520 0.130 155);
  --success-foreground:     oklch(1 0 0);
  --success-subtle:         oklch(0.965 0.025 155);
  --warning:                oklch(0.560 0.130 75);
  --warning-foreground:     oklch(1 0 0);
  --warning-subtle:         oklch(0.970 0.035 80);
}
```

`--muted-foreground` moves from shadcn-neutral's `oklch(0.556 0 0)` (4.74:1 — fails AAA and is marginal at 13px) to `oklch(0.50 0 0)` (6.01:1). Every secondary meta line in the App uses this token, so this one change fixes secondary-text contrast App-wide.

`--input` is deliberately darker than `--border` so a text field reads as an affordance rather than as a decorative box. Today they share one value.

`--warning-subtle` and `--warning` replace the four hardcoded `border-amber-500/30 bg-amber-500/10` Soft-archive banners.

**Never colour alone.** Every state communicated by colour also carries a label and, where space allows, an icon or dot. Game status is `Confirmed` with a filled dot, not a green pill. Soft-archive is a banner with an icon and a sentence. `destructive` buttons name what they destroy.

### 4.3 Level and rank colours

Rank treatment in phase one is **typographic and neutral**, because there is no level, rating or ELO anywhere in the Drizzle schema. `game_players.selfPerformanceRating` is the only rating-shaped column and it is neither written nor read.

- Positions render `tabular-nums`, `--muted-foreground`, 600 weight, in a fixed-width slot so ranks align down the column.
- Ranks 1–3 get a neutral filled chip (`--foreground` on `--muted`), differentiated by weight and a small icon — **not** by gold, silver and bronze.
- The signed-in User's own row gets a `--color-brand-subtle` background, a `--color-brand` left edge, and the literal text `You`. Colour is never the only signal.

A five-step level ramp (`--level-1` … `--level-5`) is deliberately **not** defined here. It belongs to the rankings phase (TEM-69) and depends on schema that does not exist. Defining it now would produce tokens with no consumer and a scale with no data behind it.

### 4.4 Typography

Geist Sans is already loaded via `next/font/google` and mapped to `--font-sans`, but `font-sans` is never applied — `<body>` only gets `@apply bg-background text-foreground`. Fix that first.

```css
@theme {
  --text-eyebrow: 0.75rem;   /* 12px */  --text-eyebrow--line-height: 1rem;
  --text-meta:    0.8125rem; /* 13px */  --text-meta--line-height:    1.125rem;
  --text-body:    0.9375rem; /* 15px */  --text-body--line-height:    1.375rem;
  --text-lead:    1.0625rem; /* 17px */  --text-lead--line-height:    1.5rem;
  --text-title:   1.1875rem; /* 19px */  --text-title--line-height:   1.625rem;
  --text-h2:      1.5rem;    /* 24px */  --text-h2--line-height:      1.875rem;
  --text-h1:      1.75rem;   /* 28px */  --text-h1--line-height:      2.125rem;
  --text-display: 2.25rem;   /* 36px */  --text-display--line-height: 2.375rem;
}
```

| Role | Token | Weight / tracking | Notes |
|---|---|---|---|
| Screen title | `text-h2` mobile → `text-h1` ≥ `lg` | 700 / `-0.02em` | The one `<h1>`, in the content column |
| Section heading | `text-title` | 600 / `-0.01em` | Replaces today's `text-lg` |
| Card / row title | `text-lead` | 600 | Game name, Group name, player name |
| Body | `text-body` | 400 | **Default.** Replaces `text-sm` as body |
| Secondary meta | `text-meta` | 400, `--muted-foreground` | The only legitimate small-text role |
| Eyebrow / stat label | `text-eyebrow` | 500, `0.06em`, uppercase | Stat captions, section kickers, relative day |
| Hero numeral | `text-display` | 700, `tabular-nums` | Start time, set score, rank |

Rules baked into acceptance criteria:

- `text-xs` is forbidden for anything a player must read. It survives only inside `Badge` and eyebrow labels.
- Body copy is `text-body` (15px). `text-sm` must not appear in new or redesigned markup.
- Every numeral that sits in a column or changes over time uses `tabular-nums`.
- `<input>` keeps its 16px-on-mobile behaviour (`input.tsx:11`'s `text-base md:text-sm` becomes `text-base md:text-body`) so iOS does not zoom on focus.

### 4.5 Spacing, containers, radius

Tailwind's `--spacing: 0.25rem` base is kept.

```css
@theme {
  --container-content: 44rem;  /* 704px  — detail pages, forms, reading column */
  --container-wide:    64rem;  /* 1024px — list plus aside, Home two-column    */
  --rail-width:        15rem;  /* 240px  — desktop nav rail (was 288px)        */
  --bottom-nav-height: 3.5rem; /* 56px, plus env(safe-area-inset-bottom)       */
  --radius: 0.75rem;           /* 12px, was 0.625rem                           */
}
```

Changing `--radius` to `0.75rem` propagates through the **existing** `@theme inline` calc chain — `--radius-sm: calc(var(--radius) - 4px)`, `-md: calc(var(--radius) - 2px)`, `-lg: var(--radius)`, `-xl: calc(var(--radius) + 4px)` — to **8 / 10 / 12 / 16px** with no edits to any of the 21 `ui/*` primitives. Pills, avatars and monograms use `rounded-full`.

Gutters: 16px below 430px, 20px from 430 to 767px, 24px from 768px, 32px from 1280px.

Vertical rhythm: 24px between sections on mobile, 32px from `md`. Inside a card: 16px on mobile, 20px from `md`.

Touch targets: every interactive element that matters on mobile is at least 44×44px, including list-row tap areas, bottom-nav slots, icon buttons and badge-shaped actions. `Button` gains `size="touch"` (h-11, 44px), used as the default for primary mobile actions; `size="sm"` (h-8) is barred from being a screen's primary action.

### 4.6 Surface levels and elevation

Three levels. **A surface gets a border or a shadow, never both. A bordered surface may not contain another bordered surface.**

| Level | Use | Style |
|---|---|---|
| 0 — Page | Page background | `--background`, no border, no shadow |
| 1 — Grouped | Lists, panels, stat strips, sections | `--surface-raised` fill with no border, *or* a hairline `--border` with no fill. Interior structure is `divide-y`, never a nested card. |
| 2 — Elevated | Bottom sheets, dropdowns, popovers, sticky bars, the Home hero | `--card` fill plus `--shadow-md`, no border |

```css
@theme {
  --shadow-xs: 0 1px 2px oklch(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px oklch(0 0 0 / 0.06), 0 1px 2px oklch(0 0 0 / 0.04);
  --shadow-md: 0 4px 12px oklch(0 0 0 / 0.08);
  --shadow-lg: 0 12px 32px oklch(0 0 0 / 0.12);
}
```

`@layer base { * { @apply border-border outline-ring/50; } }` stays as-is. `body` gains `font-sans antialiased` alongside `bg-background text-foreground`.

### 4.7 Iconography

**Lucide only.** `@tabler/icons-react` is removed from `apps/temba/package.json`.

Rationale: all 21 `ui/*` primitives already import from `lucide-react`; the shadcn registry assumes Lucide; Tabler is used in exactly two files (`app-sidebar.tsx`, `nav-main.tsx`) for six glyphs. Keeping both means two icon grids, two stroke weights and two bundles for six icons.

Sizes: 16px inline with text, 20px on rail nav and buttons, 24px on bottom nav. Stroke 2 (Lucide default) at 20 and 24, 1.75 at 16. Every standalone icon button carries `aria-label`; every decorative icon carries `aria-hidden`.

Nav mapping: `House` (Home), `Users` (Groups), `Building2` (Communities), `CircleUser` (You), `CalendarDays` reserved for Games. `Mail` for Invites, `MapPin` for Venues, a `UserRound` pair for Teams.

### 4.8 Components

Retune in place; do not fork. Every change below is to an existing `ui/*` file unless marked new.

**Button.** Add `size="touch"` (h-11, `text-body`). `default` becomes `bg-primary text-primary-foreground hover:bg-brand-hover active:bg-brand-active` — lightness-stepped, not the current `hover:bg-primary/90`, because alpha over white on a max-chroma blue produces a washed lavender. Keep `focus-visible:ring-[3px]`; it is already good and visible.

**Input, Select, Field, Label.** Keep. Token changes only, plus `--input` darkening. Start using `FieldError`, which is defined and never rendered.

**Card.** Adopt, with a CVA `variant`: `plain` (no border, no shadow — grouping only), `raised` (`--surface-raised`, no border), `outlined` (hairline, no fill), `elevated` (`--shadow-md`, no border). Base padding drops from `py-6 gap-6` to `p-4 gap-3`, `md:p-5 md:gap-4`. This is the single replacement for roughly 46 hand-rolled `rounded-xl border`.

**Badge.** Keep the pill shape. Add `size="sm"`, semantic `success` and `warning` variants, and a leading dot slot so a status carries a shape and not only a hue. Ban `capitalize`-ing raw enum values in markup — status, sport, role and type labels come from typed maps.

**Avatar.** Adopt unchanged, wrapped by `UserAvatar` and `AvatarStack` (which uses the existing `AvatarGroup` and `AvatarGroupCount`, overflowing at four).

**Tabs.** Adopt the `line` variant for in-page section switching. Triggers at least 44px tall, horizontally scrollable with `snap-x` below `sm`. Radix already wires `aria-controls` and roving focus.

**Navigation.** New `BottomNav` (fixed, `--bottom-nav-height` plus `env(safe-area-inset-bottom)`, level-2 elevation, five equal slots, active state per §3.3, `aria-current`). Existing `ui/sidebar.tsx` becomes the `lg`+ rail at `--rail-width` with `collapsible="none"`; `nav-main.tsx` gains `usePathname` prefix matching and passes `isActive`, which finally activates the primitive's existing `data-[active=true]` styling.

**Bottom sheets and dialogs.** `Drawer` (vaul, already installed) below `md`; add shadcn `dialog` for `md` and up — it sits on the already-installed `radix-ui` umbrella, so it is a new file and **not** a new npm dependency. Wrap both in one `ResponsiveDialog` so a confirm is written once. Every destructive mutation (`leave`, `delete`, `dissolve`, `unlinkVenue`, `revoke*`, `clearLogo`, `softArchive`) routes through it.

**DropdownMenu.** Adopt for header and row overflow actions, replacing the three wrapping buttons on Group home. Trigger is a 44px `MoreVertical` icon button with `aria-label`.

**Skeletons.** `Skeleton` stays. Every page gains a skeleton matching its final layout — same row heights, same section count — replacing header-only skeletons, plus `loading.tsx` per route segment.

**Empty and error states.** One `EmptyState` (icon, title, one sentence, at most one CTA) and one `ErrorState` (icon, title, message, retry). The two-tier split dies. `error.tsx` and `not-found.tsx` are added at the `dashboard` segment.

**Toasts.** `sonner` stays. `ThemeProvider` gets mounted so `useTheme()` inside `sonner.tsx` stops running provider-less. Copy convention: success states what happened (`Joined Tuesday Night Padel`), error surfaces the server message.

**Dark mode.** `.dark` tokens are rewritten to be coherent with the new neutral plus `#0000FF` system, using `--color-brand-on-dark` for accents. `ThemeProvider` is mounted with `defaultTheme="light"`. **No user-facing toggle in phase one.** Options considered: (a) delete `.dark` entirely — discards 20 tokens of work and the Clerk shadcn dark theme; (b) fix it and ship a toggle — a new surface with a doubled QA matrix, not the point of this redesign; (c) fix the tokens, mount the provider, ship no toggle. Recommendation is (c): it removes a latent bug, keeps dark mode one line away, and adds no surface.

**Motion.** `tw-animate-css` must be installed and the `globals.css:3` import uncommented, or the `animate-in` and `slide-in-from-*` classes in `sheet.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `select.tsx`, `tooltip.tsx` and `auth-shell.tsx` continue to do nothing — and this redesign starts using Drawer, Dialog and DropdownMenu heavily. This is the one new dependency proposed; see Open questions. Motion budget: 150–200ms, `ease-out` entering and `ease-in` leaving, `prefers-reduced-motion` respected. No motion on list-row hover beyond a background change.

### 4.9 Accessibility, as a system property

Not a ticket. Every ticket's acceptance criteria include the relevant subset:

- Semantic HTML: one `<h1>` per page in the content column, `<nav>` with `aria-label`, `<main>`, `<ul>`/`<li>` for lists, `<button>` for actions and `<a>` for navigation — never a `div` with `onClick`.
- Every interactive element reachable and operable by keyboard, in visual order, with the existing `focus-visible:ring-[3px]` ring visible against its own background.
- 44×44px minimum mobile touch targets on nav slots, primary actions, row tap areas and icon buttons.
- Text contrast at least 4.5:1 for body and 3:1 for 19px/600 and above. `--muted-foreground` at 6.01:1 and `--color-brand-text` at 9.19:1 both clear this.
- Never colour alone (§4.2).
- Form controls have an associated `<label>` or `FieldLabel`; errors are wired via `FieldError` and `aria-describedby`; `aria-invalid` is set.
- Live regions: toasts are already polite via sonner; async row actions announce their result.
- Skeleton containers carry `aria-busy`; icon-only buttons carry `aria-label`.
- `prefers-reduced-motion` disables transforms and caps opacity fades at 100ms.

---

## 5. Target experience per major screen

Each entry names what a player cares about, the 390px layout, what changes at 1024px and 1440px, and the loading, empty and error states. "Needs new data" marks anything deferred to Tier 2.

### 5.1 Home — `/dashboard`

Available today from `users.home`: `gamesPlayed`, `communitiesCount`, `groupsCount`, `upcomingGames[{ id, name, startTime, endTime, status, sport, groupId, groupName }]`, `standing[{ groupId, groupName, sport, position, memberCount }]`.

**What a player cares about:** When do I next play? Is anything waiting for me? Where do I stand?

**390px, in order:**

1. **Greeting line** — `text-meta`, `--muted-foreground`, first name from Clerk. One line, no card.
2. **Next Game hero** — level-2 elevated card, the single most important element on the screen. `text-eyebrow` relative day (`TONIGHT`, `TOMORROW`, `SAT 30 AUG`), `text-display` start time, Game name at `text-lead`, Group name, sport and status badges. Full-width. Tapping opens the Game once Games ship; until then it opens the Group (today's behaviour) and carries no fabricated primary action.
3. **Invites card** — renders only when the three pending-Lookup-invite queries total more than zero. `You have 2 invites waiting` plus `Review` → `/dashboard/invites`. Absent at zero; no empty state.
4. **Upcoming** — the remaining `upcomingGames` as a `RowList` of `GameSummaryCard` rows (relative day and time, Game name, Group, status). Capped at five with `See all`.
5. **Your standing** — `RowList` of Standing rows: Group name, sport badge, `#4 of 13` with `#4` at `text-lead` and `tabular-nums`.

**Counters are removed from Home.** `gamesPlayed` reads `user.numberOfGamesPlayed`, which nothing in the codebase increments — `.scratch/padel-teams/spec.md` deliberately deferred counter updates and `.scratch/games-matches/spec.md` restates "counters stay at zero". Rendering a permanently-`0` "Games played" metric as the lead element of the product's home screen is worse than rendering nothing. `communitiesCount` and `groupsCount` are navigational facts already visible as list lengths one tap away. If a compact identity strip is wanted later it belongs on **You**, not Home.

**≥1024px:** `--container-wide`, two columns. Left (~62%): hero then upcoming. Right (~38%): invites card then Standing. The hero becomes `md:grid-cols-[1fr_auto]` with the time block right-aligned. No new sections — the same content, better distributed. At 1440px the container does not grow; the page centres.

**States:** loading is a hero-shaped skeleton plus two row skeletons plus one row skeleton, matching final geometry. Error is `ErrorState` with retry. Fully empty (no Groups, no Games) is a single `EmptyState` — "You are not in any Groups yet" → `Groups` — not three separate empty cards as today.

**Needs new data (Tier 2):** Games available to join, Community activity, recent result, Standing movement (▲2 / ▼1). All named in TEM-69. Note that `games.listPublicPickup` already returns joinable public Games, but with no Game home and no register mutation those rows would be unclickable, so the surface is deliberately held to the Games phase.

### 5.2 Games and Game home — Tier 2

No route today. The design contract handed to `.scratch/games-matches/spec.md` (TEM-35…TEM-43):

**A Game card must communicate:** relative day and start time · Game name · Group, or `Pickup` when groupless · Venue and Court · format (Friendly game, Americano, Friendly tournament) · registration state (open, full, closed, cancelled) · spots (`6/8` with a 4px progress bar) · registered Users as an `AvatarStack` · level or skill band · price per player · exactly one primary action (`Register`, `Join waitlist`, `View`).

Field availability today:

| Field | Today | Source / owner |
|---|---|---|
| Name, start and end, status, sport, Group | Exists | `games` table via `users.home` and `listPublicPickup` |
| Venue and Court | **Broken** | `games.courtId` references `venues.id`, not `courts.id` (§7.2). Corrected on `Match` by TEM-40 |
| Format, open/full/closed, spots, Waitlist | Does not exist | `games-matches` (TEM-36, TEM-37) |
| Registered Users, avatars | Does not exist | `games-matches` Game-scoped pool (TEM-36, TEM-39) |
| Price per player | Game.`pricePerPlayerCents` | `.scratch/game-price-per-player/spec.md` (TEM-105). Surface when set; still no payments |
| Level or skill band | Does not exist anywhere | Rankings phase, TEM-69 |
| Set scores and Match result | Does not exist | `games-matches` Sets (TEM-41) |

Phase one therefore ships a **reduced `GameSummaryCard`** carrying only day and time, Game name, Group, sport and status — consumed by Home and Group home. The full card lands with the Games backend. It must be the same component with optional props, never a second component.

Game home layout (contract for TEM-36): header with the Game identity and one primary registration action; a Matches section listing each Match with its two Game teams, Court and Sets; organizer controls behind an `ActionMenu`; Waitlist below registered entries; Game Lookup invite and Game Invite link via `ResponsiveDialog`. Reuse `RowList`, `ListRow`, `StatStrip`, `AvatarStack`, `ConfirmDialog`, `EmptyState`.

### 5.3 Groups list — `/dashboard/groups`

**Cares about:** which Groups am I in, and which has something happening.

**390px:** `PageHeader` — `h1` "Groups", one line of description, `Create Group` as a full-width `size="touch"` button below the text on mobile and inline-end from `sm`. Then a `RowList` of `ListRow`: leading 40px `EntityMonogram`, title the Group name at `text-lead`, meta `Bahrain Padel Club · Club Group` or `Group outside a Community`, trailing a member count and `SportBadge`, plus `Soft-archived` where the parent Community is archived. The whole row is the tap target, at least 64px tall, chevron from `sm`.

Per `groups-communities-nav`, no user-facing copy says "Loose" — a Group with no Community reads as `Group outside a Community`.

**≥1024px:** `--container-content`. The list stays 704px and left-aligns under the title rather than stretching. `Create Group` sits inline with the `h1`. Unchanged at 1440px.

**States:** loading is four row skeletons at the real row height. Empty is `EmptyState` — Users icon, "No Groups yet", "Groups are where you play and where your Standing lives.", `Create Group`. Error is `ErrorState`.

### 5.4 Group home — `/dashboard/groups/[id]`

Currently 672 lines and nine bordered sections stacked vertically.

**Cares about:** where do I stand, what is next, who is in this Group.

**390px:**

1. **Header** — `EntityMonogram` plus Group name as the `h1`, meta line `Club Group · Bahrain Padel Club`, badges for sport, type and `Soft-archived`. The primary contextual action is one button (`Join` when `canJoin`, otherwise none). Everything else collapses into one `ActionMenu`: `Open Bahrain Padel Club`, `All Communities`, `Leave Group`, `Delete Group`. The relabelling removes the `Community` / `Communities` ambiguity. `Leave` and `Delete` are `destructive` items routed through `ConfirmDialog`.
2. **Your standing strip** — one `StatStrip`, four cells, one row: `#4 of 13` · `11 sets` · `468 pts` · `18 games`, each a `text-lead` `tabular-nums` value under a `text-eyebrow` label. Replaces four stacked cards *and* the separate one-metric `Group stats` card, which folds in as the Group's Games played. Roughly 280px of mobile height becomes roughly 72px.
3. **Tabs** — `Standing` / `Games` / `Members`, `line` variant, sticky under the top bar.
   - **Standing** — `LeaderboardRow` list: fixed rank slot with `tabular-nums`, 36px `UserAvatar`, name at `text-lead`, `11 sets · 468 pts · 18 games` at `text-meta`. Ranks 1–3 get a neutral chip. The signed-in User's row gets `--color-brand-subtle`, a `--color-brand` left edge and a `You` badge. Ordering is unchanged: sets won, then points won, then Games played, then name, per `server/standing/compare-standing.ts`.
   - **Games** — upcoming `GameSummaryCard` rows, then a `History` sub-heading with completed Games. Rows become links once Game home exists; until then they are non-interactive rows with no chevron and no cursor change, because a link to nowhere is worse than no link.
   - **Members** — `MemberRow` list with avatars.
4. **Soft-archive** — `SoftArchiveBanner` above the tabs when the Group's Community is Soft-archived, on `--warning-subtle`.
5. **Staff panels** — Lookup invites and Invite link move out of the vertical stack into a `ResponsiveDialog` opened from the `ActionMenu` (`Manage invites`), rendered by the shared `LookupInvitePanel` and `InviteLinkPanel`. Role gating (`canInviteClubPrivate`, `canManageInvites`) and every tRPC call are unchanged.

**≥1024px:** `--container-wide`, two columns. Left holds the tabs and their content. Right is a 280px sticky `aside` holding the stat strip, the Community card and staff actions. The header spans both. Unchanged at 1440px.

**States:** a full-page skeleton matching this geometry, not header-only. A tRPC `NOT_FOUND` renders `not-found.tsx`-style copy inside the shell instead of red body text. The non-member view keeps today's authorization behaviour with a proper `EmptyState` on the Standing tab.

### 5.5 Communities list — `/dashboard/communities`

`groups-communities-nav` locks this as the nested Club Group tree: every Community the User belongs to, with all its Club Groups nested whether joined or not, `Joined` markers, and no staff chrome.

**390px:** `PageHeader` plus `Create Community`. Each Community is a **level-1 `raised` card with no border** containing the Venue logo or an `EntityMonogram`, name at `text-lead`, `Public · Admin` meta, and sport badges — then a `divide-y` list of Club Group rows *inside the same surface*. No card-in-card. Nested rows indent 12px behind a subtle left rule and show name, `CommunityTypeBadge`/`GroupTypeBadge`, a `Joined` badge where the User is a member, and link to Group home. The Community name is its own link and does not wrap the nested rows, per that spec's story 20.

**≥1024px:** `--container-content`. A two-up grid only where every Community has two or fewer nested Groups; otherwise stay single-column so tree structure stays readable. Unchanged at 1440px.

**States:** loading is two Community-card skeletons with two nested rows each. A Community with no Club Groups shows one `No Groups yet` row inside its own card. An empty list is `EmptyState` with `Create Community`.

### 5.6 Community home — `/dashboard/communities/[id]`

Currently 1060 lines, eleven bordered sections, card-in-card-in-card, with an inline create-Club-Group form as a third-level card.

**390px:**

1. **Header** — Venue logo or `EntityMonogram` at 56px, name as the `h1`, `Public · padel · Your role: Admin`. One primary action by state (`Request to join`, or none). `Leave Community`, `Soft-archive`, `Unarchive` and `All Communities` sit in an `ActionMenu` with confirms on the destructive items.
2. **Venue block** — level 1: logo, Venue name, city, Court chips. `Unlink Venue` (Owner or Admin) lives in the block's own `ActionMenu`, confirmed. With no Venue link and `canRequestVenueLink`, a single `Link a Venue` action opens a `ResponsiveDialog` hosting the existing `searchLiveVenues` field and `requestVenueLink` flow, replacing an always-visible inline search field.
3. **Tabs** — `Groups` / `Teams` / `Members`, plus a fourth `Requests` tab **only** when `canManageJoinRequests || canManageTeamLinks`, carrying a count badge.
   - **Groups** — `ListRow` links. The `Open` buttons go; the row is the link.
   - **Teams** — `ListRow` with an `AvatarStack` of the two members.
   - **Members** — `MemberRow`; the Owner-only role `Select` stays inline, right-aligned on the row.
   - **Requests** — `RequestRow` for Community join requests and Team link requests: avatar, requester, what is being asked, `Approve` and `Reject`.
4. **Create Club Group** — moves from an inline nested card into a `ResponsiveDialog` launched from the Groups tab header. Same `createClubPublic` / `createClubPrivate` mutations, same padel-only submit, still no sport field per `.scratch/padel-only-ui/spec.md`.
5. **Staff invites** — `LookupInvitePanel` plus `InviteLinkPanel` in a `ResponsiveDialog` from the `ActionMenu`.
6. **Soft-archive** — `SoftArchiveBanner`.

**≥1024px:** `--container-wide`, two columns. Left holds the tabs; right is a sticky `aside` holding the Venue block, member count and staff actions. Unchanged at 1440px.

**States:** full-page skeleton matching geometry; `ErrorState` for query failure; `EmptyState` copy for an empty Members list, which today renders nothing at all.

### 5.7 Teams list — `/dashboard/teams`

Reached from **You**, and contextually from Community home.

**390px:** `PageHeader` — "Teams", "Partnerships you play as", `Create Team`. A `Pending invites` section first when `teams.pendingInvites` is non-empty, using `RequestRow` with an `Accept` action. Then a `RowList` of Team rows: an `AvatarStack` of the two members, or one avatar plus a dashed placeholder when the Team is incomplete; Team display name at `text-lead`; `Club Team · Bahrain Padel Club` or `Not linked to a Community`; an `Incomplete` badge when a seat is open; `18 games · 12 W · 6 L` at `text-meta`.

**≥1024px:** `--container-content`, single column. Empty is `EmptyState` — "A Team is a lasting partnership with one other player.", `Create Team`.

### 5.8 Team home — `/dashboard/teams/[id]`

Header with the pair's `AvatarStack`, Team name as the `h1`, `Padel · Club Team`, and an `ActionMenu` holding `Unlink from Community` and `Dissolve Team`, both confirmed. One `StatStrip` — `18 games` · `12 W` · `6 L` · win rate — replacing the three-card `md:grid-cols-3` grid. A `Members` list with a `Creator` badge. The Community link request and the partner Lookup invite each become one `ResponsiveDialog` driven from the `ActionMenu`. An incomplete Team leads with a single prominent `Invite your partner` action, because that is the only thing an incomplete Team is for.

### 5.9 Invites inbox — `/dashboard/invites`

Keep the route and the three-query merge (`communities.pendingLookupInvites`, `groups.pendingLookupInvites`, `teams.pendingInvites`) exactly as written. Redesign only: `PageHeader`, then a `RowList` of `ListRow` with a leading `UserAvatar` of the inviter, title the Community, Group or Team name at `text-lead`, meta `Group invite from Sara Fakhro`, trailing an `Accept` button at `size="touch"`. The invite kind is a typed badge, not a `capitalize`d enum string. Empty is `EmptyState` — "Nothing waiting", "Lookup invites to Communities, Groups and Teams show up here."

**Defect to fix while here:** the shared `acceptPending` flag currently disables *every* row's button while any accept is in flight. Only the acting row should show a pending state.

### 5.10 Venues (Operator) — `/dashboard/venues*`

Operator only, reached from **You**. The redesign is chrome-only; `OperatorGate` and `venues/layout.tsx` keep today's behaviour.

Index: `PageHeader`, then a `Requests` section of `RequestRow` for pending Venue link requests with a count badge, then the Venue catalogue as `ListRow` with logo, name, `city, country`, Court count and a `Soft-archived` badge.

Venue home: `--container-content`, `Section` for the edit form, logo and Courts. `deleteCourt`, `clearLogo` and `softArchive` route through `ConfirmDialog`. Court CRUD becomes an editable `RowList` rather than a bullet list plus loose inputs. Logo upload keeps its client-side JPEG/PNG/WebP and 2MB validation.

**The denied state gets designed.** `OperatorGate`'s current single line of body text inside full dashboard chrome becomes a centred `EmptyState` — Lock icon, "Operator access only", "Venue and Court curation is handled by Temba staff.", `Back to Home`. No redirect; today's behaviour is preserved.

### 5.11 Invite-accept flow — `/invites/{community,group,team}/link/[token]`

`InviteShell` loses the slate-to-emerald gradient, the `bg-black/30` card and the `text-white/70` copy. New shell: white page, centred column capped near 400px, Temba wordmark, and a level-2 card.

The card shows what you are joining with real identity — Community or Venue logo, name, type, and member count where the preview provides it — then one full-width `size="touch"` primary action. The signed-out state shows that same preview *above* Clerk's sign-in and sign-up buttons, so a player knows what they are signing in for. `forceRedirectUrl` behaviour is unchanged.

The three remaining link-accept components collapse into one `AcceptInviteFlow` parameterised by preview procedure, accept mutation, entity label and redirect path. States: loading skeleton → invalid or expired token → signed-out preview → accepting → error → redirect on success. Invite link semantics are unchanged per `.scratch/invite-lookup-and-link/spec.md` — each copy mints a token expiring six hours after mint, older tokens stay valid, no rotate and no revoke.

### 5.12 Auth — `/login`, `/signup`

`AuthShell`'s `bg-[#0f0a1f]` panel and its violet and emerald blur orbs go. New: from `lg`, a two-column split with a near-black `--foreground` panel carrying the Temba wordmark, one line of positioning copy in white, and a single `#0000FF` geometric accent — a rule, or the wordmark's dot. No gradients, no orbs, no photography placeholder. Below `lg`, a white single column with the wordmark above the card. The card is level 2 on white.

Clerk keeps rendering all auth UI. Its `appearance={{ theme: shadcn }}` is extended with the new brand variables so Clerk's primary button is `#0000FF` rather than the old `oklch(0.55 0.14 250)`. Positioning copy stays "competitive sports" per `.scratch/padel-only-ui/spec.md` story 26. The `animate-in fade-in slide-in-from-bottom-4 duration-500` at `auth-shell.tsx:35` either starts working — with `tw-animate-css` installed — or is removed; it must not remain a no-op.

---

## 6. Reusable components to create or refactor

Built on the duplication list in `.scratch/ui-audit/feature-pages.md` §13.

### 6.1 Existing shadcn primitives — adopt, retune, or leave

| Primitive | Decision |
|---|---|
| `card.tsx` | **Adopt and retune.** Add a `variant` CVA (`plain`, `raised`, `outlined`, `elevated`); reduce base padding. Replaces roughly 46 hand-rolled `rounded-xl border`. |
| `avatar.tsx` | **Adopt as-is**, wrapped by `UserAvatar` and `AvatarStack`. First consumer of `user.image`. |
| `tabs.tsx` | **Adopt** (`line` variant) on Group home and Community home. |
| `drawer.tsx` | **Adopt** as the `< md` half of `ResponsiveDialog`. |
| `dropdown-menu.tsx` | **Adopt** via `ActionMenu` for overflow actions. |
| `badge.tsx` | **Retune.** Add `size="sm"`, `success` and `warning` variants, and a dot slot. |
| `button.tsx` | **Retune.** Add `size="touch"`; hover and active step lightness instead of alpha. |
| `input.tsx`, `select.tsx`, `field.tsx`, `label.tsx` | **Keep.** Token changes only. Start rendering `FieldError`. |
| `skeleton.tsx`, `separator.tsx`, `sonner.tsx`, `tooltip.tsx`, `sheet.tsx` | **Keep unchanged.** |
| `sidebar.tsx` | **Keep and re-scope** to the `lg`+ rail. Do not rewrite. Fix the `hsl(var(--sidebar-border))` bug at `:483`. |
| `table.tsx` | **Do not adopt.** A Standing leaderboard as a `<table>` forces horizontal scroll at 390px; rows with avatars read better. Leave the file for a future Operator surface. |
| `breadcrumb.tsx` | **Delete.** Zero imports today; a two-level hierarchy with a bottom nav and a back affordance makes breadcrumbs noise. |
| `checkbox.tsx`, `toggle.tsx` | **Keep, unused.** No phase-one consumer; the likely consumers are Game filters. |

**Missing primitives genuinely needed: `dialog` only** — added from the shadcn registry on top of the already-installed `radix-ui` umbrella, so a new file and **no new npm dependency**. `accordion`, `popover`, `switch`, `textarea`, `radio-group`, `progress`, `calendar`, `toggle-group`, `command`, `scroll-area`, `chart`, `alert-dialog` and `form` are either unnecessary — a horizontal scroller is `overflow-x-auto snap-x`, an overflow menu is `DropdownMenu`, a confirm is `ResponsiveDialog` — or they belong to the Games and rankings phases. Do not install any of them speculatively.

### 6.2 New Temba components

Layout and chrome, `src/components/layout/`:

1. **`AppShell`** — replaces `DashboardShell`. Bottom nav below `lg`, rail from `lg`, `<main>` with container width by prop (`content` or `wide`).
2. **`BottomNav`** — five equal slots, safe-area inset, active state, `aria-current`.
3. **`AppRail`** — thin wrapper over `ui/sidebar` at `--rail-width` with `collapsible="none"`.
4. **`MobileTopBar`** — replaces `SiteHeader` below `lg`: back affordance on detail routes, title, at most one action. No hamburger, no `UserButton`.
5. **`PageHeader`** — `h1` plus description plus primary action; the single owner of page titles, which removes the duplicate-title defect in §1.3.
6. **`Section`** — heading at `text-title`, optional description, optional action, children. Replaces `<section className="space-y-3"><h3 …>` at roughly 20 sites.

Content, `src/components/common/`:

7. **`RowList`** — the `divide-y` container, replacing `divide-border border-border bg-card divide-y rounded-xl border` at roughly 8 sites.
8. **`ListRow`** — leading slot, title, meta, trailing slot, optional chevron; `asChild` for `Link`; at least 64px tall with a 44px minimum tap target. Replaces the row pattern on Groups, Communities, Teams, Venues, Invites, Home Games, Home Standing and nested Club Groups.
9. **`StatStrip`** — two to four compact metrics in one row, `text-eyebrow` label over `text-lead` `tabular-nums` value. Replaces Home's three-cell `dl`, Group home's four-cell `dl` plus `Group stats`, and Team home's three-cell `dl`.
10. **`EmptyState`** — icon, title, one sentence, at most one CTA. One tier, everywhere.
11. **`ErrorState`** — icon, title, message, retry.
12. **`UserAvatar`** — `{ name, image, size }` → `AvatarImage` with an initials `AvatarFallback`.
13. **`AvatarStack`** — overflow at four via `AvatarGroupCount`.
14. **`EntityMonogram`** — initials tile for Groups, Communities and Venues with no logo.
15. **`ResponsiveDialog`** — `Drawer` below `md`, `Dialog` from `md`, one API. Plus **`ConfirmDialog`** on top for destructive mutations.
16. **`ActionMenu`** — a `DropdownMenu` preset with a 44px `MoreVertical` trigger and `destructive` item styling.

Domain, `src/components/temba/`:

17. **`SportBadge`**, **`GameStatusBadge`**, **`RoleBadge`**, **`GroupTypeBadge`**, **`CommunityTypeBadge`** — typed label maps replacing scattered `<Badge variant="outline" className="capitalize">{enumValue}</Badge>`. Each pairs colour with text and, where meaningful, a dot or icon.
18. **`SoftArchiveBanner`** — one component for four call sites, on `--warning-subtle`.
19. **`LeaderboardRow`** — rank slot, avatar, name, metrics, `You` treatment.
20. **`GameSummaryCard`** — the phase-one reduced Game card, growing into the full Game card in the Games phase through optional props. One component, never two.
21. **`MemberRow`** — avatar, name, `RoleBadge`, optional trailing control such as the Owner-only role `Select`.
22. **`RequestRow`** — avatar, requester, what is asked, `Approve` and `Reject`. Four call sites: Community join requests, Team link requests, Venue link requests, Club Group Private invite list.
23. **`LookupInvitePanel`** and **`InviteLinkPanel`** — parameterised by tRPC namespace, replacing the near-identical invite blocks on Group home and Community home.
24. **`AcceptInviteFlow`** — one component for the three surviving Invite link accept routes.

Utilities, `src/lib/`:

25. **`format-game-start.ts`** — the function currently duplicated verbatim at `dashboard/page.tsx:11-20` and in `groups/[id]/page.tsx`. Adds `formatRelativeDay` (`Tonight`, `Tomorrow`, `Sat 30 Aug`) built on `Intl.DateTimeFormat`. **No `date-fns`.**
26. **`initials.ts`** — shared initials derivation for `UserAvatar` and `EntityMonogram`.
27. **`parse-optional-coord.ts`** — duplicated in `venues/new/page.tsx` and `venues/[id]/page.tsx`.

### 6.3 Dependencies — checked against the installed stack

Already installed and used where relevant: `radix-ui` (umbrella), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `vaul`, `sonner`, `next-themes`, `zod`.

| Package | Status | Decision |
|---|---|---|
| `tw-animate-css` | Not installed; import commented at `globals.css:3` | **Install** — the only proposed addition. Without it the `animate-in` and `slide-in-from-*` classes in five primitives are dead, and this redesign leans on Drawer, Dialog and DropdownMenu. See Open questions. |
| `react-hook-form` | Not installed | **Do not add.** `useState` plus `Field` plus native `<form onSubmit>` plus Zod at the tRPC boundary is the existing pattern across five create and edit pages, and it works. |
| `date-fns`, `dayjs` | Not installed | **Do not add.** `Intl.DateTimeFormat` covers every formatting need here. |
| `framer-motion` | Not installed | **Do not add.** CSS transitions plus `tw-animate-css` cover the motion budget. |
| `@tabler/icons-react` | Installed, 2 files, 6 glyphs | **Remove** (§4.7). |
| `recharts` | Installed, zero `src` imports | **Leave.** Its first real consumer is Standing-over-time in the rankings phase. |
| `@tanstack/react-table`, `@dnd-kit/*` | Installed, zero `src` imports | **Flag, do not act.** Removal is dependency hygiene outside this redesign. |
| `@radix-ui/react-label`, `-separator`, `-slot` | Installed alongside the `radix-ui` umbrella | **Flag, do not act.** Same reason. |

---

## 7. Exact files likely to be modified, grouped by phase

### Phase 0 — Tokens, icons, cleanup

- `apps/temba/src/styles/globals.css` — rewritten
- `apps/temba/src/app/layout.tsx` — `font-sans antialiased` on `<body>`, mount `ThemeProvider`, extend Clerk `appearance`
- `apps/temba/package.json` — drop `@tabler/icons-react`, add `tw-animate-css` pending approval
- `apps/temba/src/components/app-sidebar.tsx`, `nav-main.tsx` — Tabler → Lucide
- `apps/temba/src/components/ui/button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`, `sidebar.tsx` — token and variant retunes; fix `sidebar.tsx:483`
- **Delete:** `src/app/logged-in.tsx`; `src/app/public/page.tsx`; `src/app/public/layout.tsx`; `src/components/auth/otp-input.tsx`, `phone-input.tsx`, `auth-step-indicator.tsx`; `src/components/ui/breadcrumb.tsx`; `src/app/invites/community/email/[token]/page.tsx`, `src/app/invites/group/email/[token]/page.tsx`, `src/app/invites/team/email/[token]/page.tsx`; `src/components/invites/accept-community-email-invite.tsx`, `accept-group-email-invite.tsx`, `accept-team-email-invite.tsx`
- `apps/temba/src/middleware.ts` — see Open question 2 before touching the `/public` branch
- `apps/temba/src/lib/invite-paths.ts` — drop the three `*EmailInvitePath` helpers, keep the three `*InviteLinkPath` helpers
- **New:** `src/lib/format-game-start.ts`, `src/lib/initials.ts`, `src/lib/parse-optional-coord.ts`
- `src/app/dashboard/page.tsx`, `src/app/dashboard/groups/[id]/page.tsx`, `src/app/dashboard/venues/new/page.tsx`, `src/app/dashboard/venues/[id]/page.tsx` — consume the extracted utilities

### Phase 1 — Shell and navigation

- **New:** `src/components/layout/app-shell.tsx`, `bottom-nav.tsx`, `app-rail.tsx`, `mobile-top-bar.tsx`, `page-header.tsx`, `section.tsx`
- `src/components/dashboard-shell.tsx`, `site-header.tsx`, `app-sidebar.tsx`, `nav-main.tsx`, `auth-header-controls.tsx`
- **New:** `src/app/dashboard/you/page.tsx`
- Every `src/app/dashboard/**/page.tsx` — `DashboardShell` → `AppShell` plus `PageHeader`
- `src/hooks/use-mobile.ts` — verify remaining consumers once the mobile `Sheet` path is unreachable

### Phase 2 — Core primitives

- **New:** `src/components/common/row-list.tsx`, `list-row.tsx`, `stat-strip.tsx`, `empty-state.tsx`, `error-state.tsx`, `user-avatar.tsx`, `avatar-stack.tsx`, `entity-monogram.tsx`, `responsive-dialog.tsx`, `confirm-dialog.tsx`, `action-menu.tsx`
- **New:** `src/components/temba/sport-badge.tsx`, `game-status-badge.tsx`, `role-badge.tsx`, `group-type-badge.tsx`, `community-type-badge.tsx`, `soft-archive-banner.tsx`, `leaderboard-row.tsx`, `game-summary-card.tsx`, `member-row.tsx`, `request-row.tsx`
- **New:** `src/components/ui/dialog.tsx`
- **New:** `src/app/dashboard/loading.tsx`, `error.tsx`, `not-found.tsx`

### Phase 3 — Home

- `src/app/dashboard/page.tsx`

### Phase 4 — Games (Tier 2, flagged)

- `src/components/temba/game-summary-card.tsx` → the full Game card
- `src/components/layout/bottom-nav.tsx` — activate the reserved fifth slot
- **New:** `src/app/dashboard/games/**` — owned by `.scratch/games-matches/spec.md` (TEM-35…TEM-43), not by this spec
- `packages/db/src/schema/**` and `src/server/api/routers/games.ts` — owned by those tickets

### Phase 5 — Groups and Communities

- `src/app/dashboard/groups/page.tsx`, `groups/[id]/page.tsx`, `groups/new/page.tsx`
- `src/app/dashboard/communities/page.tsx`, `communities/[id]/page.tsx`, `communities/new/page.tsx`
- **New:** `src/components/groups/**`, `src/components/communities/**` — extracted feature components, mirroring how `src/components/invites/` is already organised
- **New:** `src/components/temba/lookup-invite-panel.tsx`, `invite-link-panel.tsx`

### Phase 6 — Rankings and profile (Tier 2, flagged, blocked)

- `packages/db/src/schema/**` plus a new migration; `src/server/api/routers/**`; `src/app/dashboard/you/**`; `src/styles/globals.css` for the level ramp — all blocked on TEM-69's rankings half being grilled into its own spec

### Phase 7 — Secondary screens

- `src/app/dashboard/teams/page.tsx`, `teams/[id]/page.tsx`, `teams/new/page.tsx`
- `src/app/dashboard/invites/page.tsx`
- `src/app/dashboard/venues/page.tsx`, `venues/[id]/page.tsx`, `venues/new/page.tsx`; `src/components/operator-gate.tsx`
- `src/components/auth/auth-shell.tsx`; `src/components/login-form.tsx`; `src/app/login/page.tsx`; `src/app/signup/page.tsx`
- `src/components/invites/invite-shell.tsx`; **new** `src/components/invites/accept-invite-flow.tsx`; **delete** `accept-community-invite-link.tsx`, `accept-group-invite-link.tsx`, `accept-team-invite-link.tsx`
- `src/app/invites/community/link/[token]/page.tsx`, `group/link/[token]/page.tsx`, `team/link/[token]/page.tsx`

### Phase 8 — Polish and QA

- Any file surfaced by the responsive, accessibility and visual-QA sweeps. No new files expected.

### 7.1 Cleanup folded into phase 0

| Item | Evidence | Action |
|---|---|---|
| `src/app/logged-in.tsx` | Not a route — App Router requires `page.tsx`. Exports `<div>LoggedIn</div>`. Zero imports. | Delete |
| `src/app/public/page.tsx`, `public/layout.tsx` | Page always `redirect("/login")`. Layout duplicates `globals.css` and the providers the root layout already supplies, imports `Geist` without applying it, and paints `from-[#2e026d] to-[#15162c]`. | Delete both. `CONTEXT.md` defines Route `/public` as "A stub path in the Temba App that redirects to login", and `groups-communities-nav`'s manual checks assert the redirect — so the middleware branch must survive. See Open question 2. |
| `src/components/auth/otp-input.tsx`, `phone-input.tsx`, `auth-step-indicator.tsx` | Zero imports. Legacy custom phone auth from before Clerk. `auth-step-indicator.tsx` also carries `bg-emerald-500` and `bg-violet-600`. | Delete |
| The three `email/[token]` invite routes and their `accept-*-email-invite.tsx` components | `CONTEXT.md`: Email invite is "Retired as a product door… Leftover Email invite URLs must not admit." The `previewEmailInvite`, `sendEmailInvite` and `acceptEmailInvite` procedures are gone from every router; the three components are already inert stubs rendering "Invite unavailable" on the old dark shell. | Delete routes and components. Deletion yields a 404, which satisfies "must not admit". |
| `invite-paths.ts` `communityEmailInvitePath`, `groupEmailInvitePath`, `teamEmailInvitePath` | Their only consumers are the routes above | Delete the three helpers; keep the three Invite link helpers |
| `console.log(user)` in `app-sidebar.tsx` | Reported by `shell-routing.md`; **already removed** in the working tree | No action |
| `formatGameStart` duplicated verbatim | `dashboard/page.tsx:11-20` and `groups/[id]/page.tsx` | Extract to `src/lib/format-game-start.ts` |
| `parseOptionalCoord` / `coordToInput` duplicated | `venues/new/page.tsx` and `venues/[id]/page.tsx` | Extract to `src/lib/parse-optional-coord.ts` |
| `ui/breadcrumb.tsx` | Zero imports; ruled out by §6.1 | Delete |
| `sidebar.tsx:483` `shadow-[0_0_0_1px_hsl(var(--sidebar-border))]` | Tokens are `oklch()`, not HSL triples, so the `outline` variant's shadow is broken | Fix to `var(--sidebar-border)` |

`teamDisplayName`, duplicated server-side in `communities.ts` and `teams.ts`, is **not** touched. It is domain logic with no visual payoff, and moving it risks behaviour for zero user-visible gain.

This cleanup is capped at TEM-53 and must not grow. If an item turns out to be load-bearing, leave it and note it rather than expanding the ticket.

### 7.2 Defects to flag, not necessarily fix here

**`game_team_players` has no migration.** The table is declared in `packages/db/src/schema/game-team-players.ts` and appears in **no** file under `packages/db/drizzle/` — verified across all 20 migrations. Drizzle believes the table exists; Postgres does not. Any query joining Game teams to Game players fails at runtime, and this blocked realistic Game seeding during the audit. `.scratch/games-matches/spec.md` reshapes exactly this area under TEM-35, so that ticket is the correct owner. Flagged here because if TEM-35 slips this is a live hazard that should be raised independently, not silently carried.

**`games.courtId` references `venues.id`, not `courts.id`.**

```43:43:packages/db/src/schema/games.ts
  courtId: uuid("court_id")
```
```68:68:packages/db/src/schema/games.ts
  court: one(venues, { fields: [games.courtId], references: [venues.id] }),
```

An ADR-0007 leftover. A Game can name a Venue but never a Court, so "Court 1" cannot appear on a Game card. `games-matches` explicitly corrects this on `Match` — "optional `courtId` referencing **Court** (the playing surface), not Venue — fix the ADR-0007 leftover" — under TEM-40. Owned there. Flagged here because it is the reason §5.2 lists Venue and Court as unavailable in phase one.

**`user.numberOfGamesPlayed` is never incremented.** Nothing in `src/` writes it. Both `.scratch/padel-teams/spec.md` and `.scratch/games-matches/spec.md` deliberately defer counter updates, and the latter states counters "stay at zero". Consequence: Home's lead metric is structurally `0`. Handled by removing it from Home (§5.1), not by writing counters.

---

## 8. Phased tickets

Twenty-one tickets, each sized for one implementer in one sitting. Full bodies live in Linear as TEM-52 through TEM-72, with native `blocks` relations carrying the dependency edges. Titles, one-line scopes and ordering only, below; the table is listed in publish order, which is a valid topological order.

| Ticket | Title | Phase | One-line scope | Blocked by |
|---|---|---|---|---|
| TEM-52 | Design tokens, type scale, and theme wiring | 0 | Rewrite `globals.css` with the neutral plus `#0000FF` palette, the eight-step type scale, containers, radius and shadows; apply `font-sans`; mount `ThemeProvider`; make `.dark` coherent | — |
| TEM-53 | Delete dead surfaces and extract duplicated formatters | 0 | Remove `logged-in.tsx`, `public/*`, three unused auth components, three retired Email invite routes and their stubs, `ui/breadcrumb.tsx`; extract `formatGameStart`, `initials` and `parseOptionalCoord`; fix `sidebar.tsx:483` | — |
| TEM-54 | Unify iconography on Lucide | 0 | Convert `app-sidebar.tsx` and `nav-main.tsx` to `lucide-react` and drop `@tabler/icons-react` from `package.json` | TEM-52 |
| TEM-55 | Surface and layout primitives: Card, PageHeader, Section, StatStrip | 2 | Retune `Card` with four surface variants; ship `Section` and `StatStrip`; establish the border-or-shadow-never-both and no-nested-bordered-surface rules | TEM-52 |
| TEM-56 | Badge and banner system: typed domain badges and SoftArchiveBanner | 2 | Typed `SportBadge`, `GameStatusBadge`, `RoleBadge`, `GroupTypeBadge`, `CommunityTypeBadge` replacing `capitalize`d enums; `SoftArchiveBanner` on `--warning-subtle` at four sites | TEM-52 |
| TEM-57 | App shell: bottom nav, desktop rail, active states, content widths | 1 | Build `AppShell`, `BottomNav`, `AppRail`, `MobileTopBar`, `PageHeader`; add active states and `aria-current`; constrain content; remove the duplicate page title and the duplicate `UserButton` | TEM-52, TEM-54 |
| TEM-58 | List primitives: RowList, ListRow, UserAvatar, AvatarStack, EntityMonogram | 2 | Ship the one row and one list container that replace roughly eight duplicated patterns, and render `user.image` for the first time | TEM-52, TEM-55 |
| TEM-59 | State primitives: EmptyState, ErrorState, skeletons, route boundaries | 2 | One empty and one error treatment App-wide; layout-matched skeletons; `loading.tsx`, `error.tsx` and `not-found.tsx` at the dashboard segment | TEM-55 |
| TEM-60 | ResponsiveDialog, ConfirmDialog, and ActionMenu | 2 | Add `ui/dialog.tsx`; wrap Drawer and Dialog in one API; route every destructive mutation through a confirm; ship the overflow action menu | TEM-52, TEM-55 |
| TEM-61 | You surface: profile hub for Teams, Invites and Operator tools | 1 | New `/dashboard/you` hosting identity, Teams, a badged Invites entry, Operator tools when `operator === true`, and the single Clerk `UserButton` | TEM-57 |
| TEM-62 | Auth and invite surfaces redesign | 7 | Bring both shells onto the token system, removing violet, emerald, slate and `#0f0a1f`; collapse three accept components into one `AcceptInviteFlow` | TEM-52, TEM-53, TEM-59 |
| TEM-63 | Home redesign on the existing payload | 3 | Next Game hero leads, conditional invites card, upcoming and Standing lists; remove the three counters; no API change | TEM-55, TEM-56, TEM-57, TEM-58, TEM-59 |
| TEM-64 | Groups list and Communities list redesign | 5 | Rebuild both lists on the new primitives; nested Club Group tree with no card-in-card; one `EmptyState` each | TEM-55, TEM-56, TEM-58, TEM-59 |
| TEM-65 | Group home redesign | 5 | One `StatStrip` for Standing, Standing/Games/Members tabs, one `ActionMenu` with confirms, staff invites into a dialog | TEM-55, TEM-56, TEM-58, TEM-59, TEM-60 |
| TEM-66 | Community home redesign | 5 | Tabs with a conditional Requests tab; Create Club Group and Venue link become dialogs; Venue block becomes one surface | TEM-56, TEM-58, TEM-59, TEM-60, TEM-64 |
| TEM-67 | Teams and Invites redesign | 7 | Rebuild all three surfaces; one `StatStrip` on Team home; `AvatarStack` pairs; fix the all-rows-disabled accept bug on the Invites inbox | TEM-56, TEM-58, TEM-59, TEM-60, TEM-61 |
| TEM-68 | Operator Venues redesign and access-denied state | 7 | Rebuild the Venue index and Venue home with confirms on destructive Court and logo actions; design the `OperatorGate` denied state | TEM-56, TEM-58, TEM-59, TEM-60, TEM-61 |
| TEM-69 | **[Games and rankings]** Design contract | 4, 6 | A written contract, not a screen: the full Game card and Game home layout for `games-matches` to build to, plus the level ramp and rankings schema the later phase would need | TEM-56, TEM-63, TEM-65 |
| TEM-70 | Forms and inputs pass, and shared invite panels | 5 | Labels, field-level errors and pending states across every form; extract `LookupInvitePanel`, `InviteLinkPanel` and `RequestRow` from their duplicated call sites | TEM-64, TEM-65, TEM-66, TEM-67, TEM-68 |
| TEM-71 | Responsive polish across all six breakpoints | 8 | Sweep 360, 390, 430, 768, 1024 and 1440px; add the deferred two-column desktop layouts; fix gutters, overflow and the navigation-mode boundary | TEM-62, TEM-63, TEM-64, TEM-65, TEM-66, TEM-67, TEM-68, TEM-70 |
| TEM-72 | Visual and accessibility QA gate | 8 | Contrast, keyboard, greyscale, reduced-motion and 44px audit across every surface; resolve `tw-animate-css` and the unused dependencies; re-shoot against seeded data | TEM-71 |

**Frontier at approval: TEM-52 and TEM-53**, which can start immediately and in parallel.

TEM-69 is the Tier-2 flagged phase and the only ticket that ships no code. Its Games half is a design contract for work already specified and ticketed in `.scratch/games-matches/spec.md`; the recommendation is to fold that contract into TEM-36 so Game home is built once rather than built and then restyled. Its rankings half is the only part of this redesign proposing new schema or procedures, and it must be grilled and given its own spec before anything in it is scheduled.

---

## Implementation Decisions

- Tier 1 changes presentation only. No tRPC procedure signature, input schema, return shape or authorization flag; no Clerk configuration; no Drizzle schema or migration is touched in phases 0–3, 5, 7 and 8.
- Tailwind v4 CSS-first stays. No `tailwind.config` is created. All tokens live in `@theme`, `:root` and `.dark` inside `apps/temba/src/styles/globals.css`.
- `--radius` moves to `0.75rem` so the existing `@theme inline` calc chain yields 8/10/12/16px without editing any primitive.
- Retune existing `ui/*` primitives in place. Do not fork a parallel component library. Do not add a shadcn primitive that has no phase-one consumer.
- `ui/sidebar.tsx` is kept and re-scoped, not rewritten. Its mobile `Sheet` path simply stops being reached; the file stays.
- One new npm dependency is proposed (`tw-animate-css`) and one is removed (`@tabler/icons-react`). Nothing else in `package.json` changes.
- `dialog` comes from the shadcn registry on top of the installed `radix-ui` umbrella — a new file, not a new dependency.
- Pages become compositions of shared primitives. `communities/[id]/page.tsx` (1060 lines) and `groups/[id]/page.tsx` (672 lines) decompose into feature components under `src/components/communities/` and `src/components/groups/`, mirroring how `src/components/invites/` is already organised. Query and mutation wiring moves with the markup; it is not rewritten.
- Every destructive mutation gains a confirmation step. This is a UX addition, not a logic change — the mutation, its input and its server behaviour are identical.
- Dark mode: fix the `.dark` tokens, mount `ThemeProvider` with `defaultTheme="light"`, ship no toggle.
- Games: this spec defines no Game schema, procedure or business rule. `.scratch/games-matches/spec.md` is the contract; TEM-69 supplies the visual contract that spec's UI stories build to.
- Rankings, levels and Standing movement: named, scoped, and deliberately not designed in detail. TEM-69's rankings half is a placeholder requiring its own grilled spec.
- Accessibility criteria are distributed into every ticket. There is no separate accessibility ticket.
- Copy uses `CONTEXT.md` vocabulary exactly: Community, Community Public, Community Private, Club Group, Loose Group, Club Group Public, Club Group Private, Loose Group Public, Loose Group Private, Directory, Team, Club Team, Loose Team, Game, Match, Set, Game team, Americano, Friendly tournament, Friendly game, Waitlist, Venue, Court, Operator, Owner, Admin, Member, User, Lookup invite, Invite link, Venue link, Venue link request, Community sports, Soft-archive. Per `groups-communities-nav`, "Loose" never appears in user-facing copy; a Group with no Community reads as `Group outside a Community`.
- Padel-only UI stays locked per `.scratch/padel-only-ui/spec.md`: no sport picker anywhere, and sport badges keep rendering the stored sport including `football` if a row exists.
- Groups and Communities stay two destinations per `.scratch/groups-communities-nav/spec.md`. No tab or segmented control collapses them.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behaviour: signed-in flows in the App at real viewport widths against realistic seeded data, plus `pnpm exec turbo run typecheck` and `pnpm exec turbo run build --filter temba` clean. Do not assert exact class strings or component file names except as those flows fail.

### Test seams

Highest seam (one): a signed-in User reaches every destination with one thumb tap at 390px, sees when they next play as the first thing on Home, reads a Group's Standing and their own position without scrolling past four single-metric cards, and completes every join, leave, invite and staff flow that works today — with no API, schema or authorization change, and with a neutral interface whose only accent is `#0000FF`.

If you implement this spec, you implement these seams:

- One token system; `:root` is achromatic; `--primary` is `#0000FF`; no hardcoded hex and no Tailwind named colour anywhere in `src/`
- Body text is 15px; `text-sm` and `text-xs` do not appear in redesigned markup outside `Badge` and eyebrow labels
- Bottom nav below `lg` with a working active state and `aria-current`; a 240px rail from `lg`; no hamburger; no duplicate `UserButton`; no duplicate page title; exactly one `<h1>` per page
- Content is width-constrained at every breakpoint; nothing is full-bleed at 1440px
- No bordered surface contains another bordered surface, on any screen
- Home leads with the next Game; there is no "Games played" counter; the invites card appears only when a Lookup invite is pending
- Group home's Standing is one strip; Standing, Games and Members are tabs; overflow actions are one menu; `Leave Group` and `Delete Group` confirm before firing
- Community home has no card-in-card; Create Club Group and staff invites are dialogs; role gating and every mutation behave exactly as before
- Every list carries an avatar, monogram or Venue logo; `user.image` renders
- One empty-state and one error-state treatment App-wide; the dashboard segment has `loading`, `error` and `not-found`
- Auth and invite shells use the token system; no violet, emerald, slate or `#0f0a1f` anywhere
- Every mobile primary action, nav slot, list row and icon button is at least 44×44px; every interactive element is keyboard reachable with a visible focus ring
- Dead surfaces are gone: `logged-in.tsx`, `public/*` React files, the three unused auth components, the three Email invite routes and their stubs, `ui/breadcrumb.tsx`
- `formatGameStart` and `parseOptionalCoord` exist once each
- Lucide is the only icon library; `@tabler/icons-react` is absent from `package.json`
- Every flow that works today still works: create, join and leave a Group; create, join and leave a Community; role changes; Community join request, Team link request and Venue link request decisions; Lookup invite send, revoke and accept; Invite link mint, copy and accept; Soft-archive and unarchive; Team create, invite, link and dissolve; Operator Venue and Court CRUD and logo upload; Invites inbox accept; Clerk login and signup; Invite link accept while signed out

Manual check at 360, 390, 430, 768, 1024 and 1440px, signed in as a seeded player and as an Operator, against `.scratch/ui-audit/tools/seed-dev-data.mjs` data (2 Communities, 4 Groups with 6–14 members and varied Standing, 10 Games across pending, confirmed, completed and cancelled, 3 Teams, 3 Community join requests, 10 synthetic Users with and without avatars) using `.scratch/ui-audit/tools/ui-audit-harness.html` — which must be copied into `apps/temba/public/` because it iframes same-origin routes. Route `/public` behaviour re-verified after §7.1, per Open question 2.

### Modules under that seam

`apps/temba/src/styles/globals.css`; `src/app/layout.tsx`; every `src/app/dashboard/**/page.tsx`; `src/app/login/page.tsx`, `src/app/signup/page.tsx` and `src/app/invites/**`; `src/components/**`; `src/lib/**`; `apps/temba/package.json`. `packages/db` and `src/server/**` are in the seam as **must not change** for Tier 1.

### Prior art

`.scratch/community/spec.md`, `.scratch/padel-only-ui/spec.md`, `.scratch/groups-communities-nav/spec.md`, `.scratch/games-matches/spec.md`: no runner, one authenticated product seam, manual Clerk and Route `/public` check. Investigation for this spec: `.scratch/ui-audit/browser-audit.md`, `shell-routing.md`, `design-system.md`, `feature-pages.md`, plus the six screenshots under `.scratch/ui-audit/shots/`.

## Out of Scope

- Any change to tRPC procedure signatures, inputs, return shapes or authorization in Tier 1
- Any Drizzle schema change or migration in Tier 1
- Fixing the missing `game_team_players` migration — owned by `games-matches` TEM-35; flagged in §7.2
- Repointing `games.courtId` at `courts.id` — owned by `games-matches` TEM-40; flagged in §7.2
- Writing `user.numberOfGamesPlayed`, `group_members` or `teams` counters, deferred by `padel-teams` and `games-matches`
- Re-specifying Game create, registration, Waitlist, Matches, Sets, Game teams, Game Lookup invites, Game Invite links or public pickup — `.scratch/games-matches/spec.md` (TEM-35…TEM-43) owns all of it
- Implementing rankings, ELO, levels or Standing history; TEM-69's rankings half needs its own spec first
- A public player-profile surface beyond the You hub
- A Directory or Explore browse surface — deliberately deleted by `groups-communities-nav`; `CONTEXT.md` keeps Directory as planned
- Collapsing Groups and Communities into one destination
- A user-facing dark-mode toggle
- Adding `react-hook-form`, `date-fns`, `dayjs`, `framer-motion`, or any shadcn primitive with no phase-one consumer
- Removing `recharts`, `@tanstack/react-table`, `@dnd-kit/*` or the legacy `@radix-ui/*` singletons — flagged, not actioned
- Moving `teamDisplayName` out of the two routers
- Payment or guest UI. Price per player display: `.scratch/game-price-per-player/spec.md` (TEM-105)
- Football pickers or any sport selection
- Coaching UI — the `coach`, `coaching_session` and `coaching_session_players` tables have zero UI and stay that way
- Notifications, push or email delivery
- Internationalisation or RTL
- A test runner or CI
- Server actions, or replacing tRPC
- Rewriting `ui/sidebar.tsx`, or replacing shadcn with another component library

## Further Notes

Glossary: root `CONTEXT.md` — authoritative, and recently changed so that **Game** is the parent event containing one or more Matches, and **Match** is a playable contest with two sides belonging to one Game. Architecture: ADR-0004 (optional Community parent), ADR-0005 (Community Soft-archive), ADR-0006 (Supabase Storage Venue logos), ADR-0007 (Courts evolved into Venues — the source of the `games.courtId` leftover), ADR-0008 (Game is the parent event). **No new ADR is proposed.** If TEM-69's rankings model is approved it will need one.

Related specs, all of which this document defers to rather than reopens: `.scratch/games-matches/spec.md` (Games, Matches, Sets, registration, Waitlist, Game invites — TEM-35…TEM-43), `.scratch/groups-communities-nav/spec.md` (two destinations, no Directory, no "Loose" in copy — TEM-14…TEM-17), `.scratch/padel-only-ui/spec.md` (no sport pickers — TEM-11…TEM-13), `.scratch/community/spec.md`, `.scratch/venues/spec.md`, `.scratch/padel-teams/spec.md`, `.scratch/invite-lookup-and-link/spec.md`.

Corrections applied to the investigation reports while verifying against source: `console.log(user)` is no longer present in `app-sidebar.tsx`; the sidebar has **five** nav items including `Invites`, not four; there are **six** invite routes (`community/email`, `community/link`, `group/email`, `group/link`, `team/email`, `team/link`) and **seven** files in `components/invites/`; the three `accept-*-email-invite.tsx` components are already inert stubs rendering "Invite unavailable", not live callers of deleted procedures, so deleting them is safe; `communities/[id]/page.tsx` is 1060 lines and `groups/[id]/page.tsx` is 672, not 1125 and 894; `@tanstack/react-table` is installed and was missing from the dependency inventory. Where `browser-audit.md` and the three static reports conflict, `browser-audit.md` wins, per its own corrections section.

Locked decisions (not a further grill): two tiers with Tier 1 presentational-only; four tabs in phase one with a reserved fifth Games slot; Invites and Teams demoted off the primary nav; Venues under You; bottom nav below `lg` and a 240px rail above; achromatic neutrals with `#0000FF` as the only accent; `#0000FF` at full strength for fills with white text and a reduced-chroma step for inline text; 15px body with an eight-step scale; `--radius: 0.75rem`; Lucide only; three surface levels with border-or-shadow-never-both and no nested bordered surfaces; retune shadcn in place; `dialog` added, `breadcrumb` deleted, `table` not adopted; no `react-hook-form` and no `date-fns`; dark tokens fixed with no toggle; the Home counters removed rather than backfilled; accessibility distributed across every ticket; Games and rankings deferred to explicitly flagged phases.

## Open questions

1. **`tw-animate-css`** — install it, restoring the `animate-in` and `slide-in-from-*` motion that five primitives already reference and that Drawer, Dialog and DropdownMenu need; or strip those classes from `sheet.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `select.tsx`, `tooltip.tsx` and `auth-shell.tsx`? **Recommendation: install.** It is a dev-time CSS package, it is what shadcn assumes, and stripping the classes means hand-writing keyframes for behaviour we want anyway. This is the only new dependency in the plan and it needs an explicit yes.

2. **Route `/public`** — §7.1 deletes `public/page.tsx` and `public/layout.tsx`. `CONTEXT.md` defines Route `/public` as "A stub path in the Temba App that redirects to login", and `groups-communities-nav`'s manual checks assert the redirect. Options: (a) delete both React files but **keep** the middleware redirect, so `/public` still 302s to `/login` with no dead files — **recommended**; (b) delete everything including the middleware branch and accept a 404, which requires a `CONTEXT.md` edit; (c) leave it entirely alone. Confirm (a).

3. **Bottom-nav breakpoint** — `lg` (1024px) as recommended, or `md` (768px)? At `md`, a 768px viewport gives 528px of content beside a 240px rail, which is worse than a full-width column with thumb-reachable nav. **Recommendation: `lg`.** Confirm you are comfortable with a bottom bar on a landscape tablet.

4. **The fifth tab before Games exist** — the bar is built with five-slot geometry and the Games slot dark until `games-matches` TEM-36 lands. The alternative is four evenly-spaced tabs that look better in phase one and reflow the whole nav later. **Recommendation: five-slot geometry from day one, four rendered.** Confirm.

5. **TEM-69 Games-half ownership** — should the Game card and Game home visual contract be a standalone redesign ticket, or folded into `games-matches` TEM-36 so one implementer builds Game home once, correctly, rather than building it and then restyling it? **Recommendation: fold into TEM-36**, keeping TEM-69 as the design-contract document that TEM-36 references.

6. **Rankings scope** — TEM-69's rankings half currently spans four separable products: a skill level or rating per User, a cross-Group ranking, Standing movement over time, and a player profile. Each needs different schema and different attribution rules, and all of them depend on Match completion, which `games-matches` deliberately leaves without counter updates. Which of the four is actually wanted, and should it become its own grilled spec before any of it is scheduled? **Recommendation: split it, grill it separately, and schedule nothing until Sets and Match completion (TEM-41) have shipped.**

7. **Removing "Games played" from Home** — this is the change most likely to read as a regression to a stakeholder scanning a changelog, even though `user.numberOfGamesPlayed` is structurally always `0` because nothing increments it. **Recommendation: remove it outright** rather than hiding it behind a `> 0` check, which would leave a metric that silently never appears. Confirm.

8. **Group monograms as permanent identity** — Communities and Venues have a real image path (`venues.logoImageUrl`, ADR-0006), so their rows can carry a logo. Groups have no image column at all and will not get one in Tier 1, so a Group row's only visual identity is an initials `EntityMonogram` plus a `SportBadge`. **Recommendation: accept monograms for Groups indefinitely** — a Group is named by its people, not branded — but confirm, because the alternative is a Tier-2 schema addition for Group avatars.

## Comments

_(none yet)_
