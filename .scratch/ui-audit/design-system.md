# Design System & Component Library Audit

**Repo:** `/Users/hassanhaji/Documents/temba-v2/apps/temba`  
**shadcn config:** `/Users/hassanhaji/Documents/temba-v2/apps/temba/components.json` — style `new-york`, baseColor `neutral`, cssVariables `true`, `tailwind.config: ""` (CSS-first Tailwind v4)

---

## 1. `globals.css` — Full Token & Structure Report

**File:** `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/styles/globals.css` (130 lines)

### Imports & directives

| Line | Directive |
|------|-----------|
| 1 | `@import "tailwindcss";` |
| 2 | `@import "@clerk/ui/themes/shadcn.css";` |
| 3 | `/* @import "tw-animate-css"; */` — **commented out** |
| 5 | `@custom-variant dark (&:is(.dark *));` |
| 7–11 | `@theme { --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; }` |
| 13–49 | `@theme inline { … }` — maps semantic colors + radius scale to CSS vars |
| 51–86 | `:root { … }` — light theme |
| 88–120 | `.dark { … }` — dark theme |
| 122–129 | `@layer base { * { @apply border-border outline-ring/50; } body { @apply bg-background text-foreground; } }` |

**No `@plugin` directives.** No custom `@keyframes`. No custom utility classes beyond `@layer base`.

### Radius scale

| Token | Definition | Computed (from `--radius: 0.625rem` = 10px) |
|-------|------------|---------------------------------------------|
| `--radius` | `0.625rem` | **10px** |
| `--radius-sm` | `calc(var(--radius) - 4px)` | **6px** |
| `--radius-md` | `calc(var(--radius) - 2px)` | **8px** |
| `--radius-lg` | `var(--radius)` | **10px** |
| `--radius-xl` | `calc(var(--radius) + 4px)` | **14px** |

### `:root` (light) — all custom properties

Light theme is a **custom blue-tinted Temba shell** (not neutral shadcn defaults). Hue ~250 (blue).

| Token | Value |
|-------|-------|
| `--radius` | `0.625rem` |
| `--background` | `oklch(0.985 0.012 250)` |
| `--foreground` | `oklch(0.22 0.03 255)` |
| `--card` | `oklch(1 0.005 250)` |
| `--card-foreground` | `oklch(0.22 0.03 255)` |
| `--popover` | `oklch(1 0.005 250)` |
| `--popover-foreground` | `oklch(0.22 0.03 255)` |
| `--primary` | `oklch(0.55 0.14 250)` |
| `--primary-foreground` | `oklch(0.99 0.005 250)` |
| `--secondary` | `oklch(0.95 0.02 250)` |
| `--secondary-foreground` | `oklch(0.3 0.05 255)` |
| `--muted` | `oklch(0.95 0.015 250)` |
| `--muted-foreground` | `oklch(0.5 0.03 255)` |
| `--accent` | `oklch(0.94 0.03 250)` |
| `--accent-foreground` | `oklch(0.3 0.05 255)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` |
| `--border` | `oklch(0.9 0.02 250)` |
| `--input` | `oklch(0.9 0.02 250)` |
| `--ring` | `oklch(0.55 0.14 250)` |
| `--chart-1` | `oklch(0.55 0.14 250)` |
| `--chart-2` | `oklch(0.6 0.118 184.704)` |
| `--chart-3` | `oklch(0.45 0.1 255)` |
| `--chart-4` | `oklch(0.7 0.1 230)` |
| `--chart-5` | `oklch(0.65 0.12 210)` |
| `--sidebar` | `oklch(0.97 0.02 250)` |
| `--sidebar-foreground` | `oklch(0.22 0.03 255)` |
| `--sidebar-primary` | `oklch(0.55 0.14 250)` |
| `--sidebar-primary-foreground` | `oklch(0.99 0.005 250)` |
| `--sidebar-accent` | `oklch(0.93 0.03 250)` |
| `--sidebar-accent-foreground` | `oklch(0.3 0.05 255)` |
| `--sidebar-border` | `oklch(0.9 0.02 250)` |
| `--sidebar-ring` | `oklch(0.55 0.14 250)` |

### `.dark` — all custom properties

Dark theme is **achromatic neutral** (hue 0), except sidebar-primary retains blue tint.

| Token | Value |
|-------|-------|
| `--background` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.985 0 0)` |
| `--card` | `oklch(0.205 0 0)` |
| `--card-foreground` | `oklch(0.985 0 0)` |
| `--popover` | `oklch(0.205 0 0)` |
| `--popover-foreground` | `oklch(0.985 0 0)` |
| `--primary` | `oklch(0.922 0 0)` |
| `--primary-foreground` | `oklch(0.205 0 0)` |
| `--secondary` | `oklch(0.269 0 0)` |
| `--secondary-foreground` | `oklch(0.985 0 0)` |
| `--muted` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.708 0 0)` |
| `--accent` | `oklch(0.269 0 0)` |
| `--accent-foreground` | `oklch(0.985 0 0)` |
| `--destructive` | `oklch(0.704 0.191 22.216)` |
| `--border` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.556 0 0)` |
| `--chart-1` | `oklch(0.488 0.243 264.376)` |
| `--chart-2` | `oklch(0.696 0.17 162.48)` |
| `--chart-3` | `oklch(0.769 0.188 70.08)` |
| `--chart-4` | `oklch(0.627 0.265 303.9)` |
| `--chart-5` | `oklch(0.645 0.246 16.439)` |
| `--sidebar` | `oklch(0.205 0 0)` |
| `--sidebar-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-primary` | `oklch(0.65 0.14 250)` |
| `--sidebar-primary-foreground` | `oklch(0.99 0.005 250)` |
| `--sidebar-accent` | `oklch(0.269 0 0)` |
| `--sidebar-accent-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-border` | `oklch(1 0 0 / 10%)` |
| `--sidebar-ring` | `oklch(0.556 0 0)` |

### `@theme inline` color mappings (Tailwind utility names)

All map `--color-*` → `var(--*)`: `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`, `chart-1`…`chart-5`, `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`.

**Note:** One sidebar variant uses `hsl(var(--sidebar-border))` in `sidebar.tsx:483` but tokens are **oklch**, not HSL triplets — potential styling bug for outline variant shadow.

---

## 2. Tailwind Config

| Item | Status |
|------|--------|
| `tailwind.config.*` | **None** in repo (0 files) |
| PostCSS | `/Users/hassanhaji/Documents/temba-v2/apps/temba/postcss.config.js` — `{ plugins: { "@tailwindcss/postcss": {} } }` |
| `@plugin` lines | **None active** (`tw-animate-css` commented in CSS) |
| Typography plugin | **Not installed** |

Animation utilities (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`) are used in UI components and `auth-shell.tsx:35` despite `tw-animate-css` being commented out — verify at runtime whether these resolve.

---

## 3. Typography

### Font loading

**Root layout** — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/layout.tsx`

```17:20:apps/temba/src/app/layout.tsx
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
```

```26:26:apps/temba/src/app/layout.tsx
    <html lang="en" className={`${geist.variable}`}>
```

- Font: **Geist Sans** via `next/font/google`
- CSS variable: `--font-geist-sans`
- Mapped in `@theme` as `--font-sans` stack
- **`font-sans` is never applied** to `<html>` or `<body>`; body only gets `bg-background text-foreground`
- No mono/serif fonts loaded

**Public layout** — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/public/layout.tsx:4` imports `Geist` but **does not use it** (dead import).

### De-facto type scale (frequency across `src/`)

| Class | Count | Share |
|-------|------:|------:|
| `text-sm` | **206** | 66.2% |
| `text-lg` | 34 | 10.9% |
| `text-2xl` | 26 | 8.4% |
| `text-xl` | 25 | 8.0% |
| `text-xs` | 14 | 4.5% |
| `text-base` | 4 | 1.3% |
| `text-3xl` | 1 | 0.3% |
| `text-4xl` | 1 | 0.3% |
| `text-5xl`–`text-9xl` | 0 | — |

**Total typed size usages: 311.** Small text (`text-sm` + `text-xs`) = **220 (70.7%)**. Yes — tiny/small text dominates.

### Font weights in use

| Class | Count |
|-------|------:|
| `font-medium` | 75 |
| `font-semibold` | 66 |
| `font-normal` | 7 |
| `font-bold` | 4 |

### App-level typography patterns (not component library)

| Role | Typical classes | Example |
|------|-----------------|---------|
| Page title | `text-2xl font-semibold tracking-tight` | `dashboard/page.tsx:29` |
| Section heading | `text-lg font-semibold tracking-tight` | `dashboard/page.tsx:53` |
| Body / meta | `text-sm text-muted-foreground` | `dashboard/page.tsx:32` |
| Stat value | `text-2xl font-semibold tracking-tight` | `dashboard/page.tsx:61` |
| Header title | `text-base font-medium` | `site-header.tsx:14` |
| Auth hero | `text-4xl font-bold`, `text-3xl font-bold` | `auth-shell.tsx:16,21` |
| Invite headings | `text-xl font-semibold text-white` | invite components |

### Input mobile/desktop split

`input.tsx:11` — `text-base` default, `md:text-sm` on md+ (16px on mobile to prevent iOS zoom).

---

## 4. UI Components — Full Inventory

All at `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/components/ui/`

### `button.tsx`

**Exports:** `Button`, `buttonVariants`

**Default variant:** `default` | **Default size:** `default`

**Base classes:**
```
inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive
```

**Variants:**

| Variant | Classes |
|---------|---------|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `destructive` | `bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60` |
| `outline` | `border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50` |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50` |
| `link` | `text-primary underline-offset-4 hover:underline` |

**Sizes:**

| Size | Classes |
|------|---------|
| `default` | `h-9 px-4 py-2 has-[>svg]:px-3` |
| `xs` | `h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3` |
| `sm` | `h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5` |
| `lg` | `h-10 rounded-md px-6 has-[>svg]:px-4` |
| `icon` | `size-9` |
| `icon-xs` | `size-6 rounded-md [&_svg:not([class*='size-'])]:size-3` |
| `icon-sm` | `size-8` |
| `icon-lg` | `size-10` |

---

### `badge.tsx`

**Exports:** `Badge`, `badgeVariants` | **Default variant:** `default` | **No size variants**

**Base classes:**
```
inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden
```

**Variants:**

| Variant | Classes |
|---------|---------|
| `default` | `bg-primary text-primary-foreground [a&]:hover:bg-primary/90` |
| `secondary` | `bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90` |
| `destructive` | `bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60` |
| `outline` | `border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground` |
| `ghost` | `[a&]:hover:bg-accent [a&]:hover:text-accent-foreground` |
| `link` | `text-primary underline-offset-4 [a&]:hover:underline` |

---

### `avatar.tsx`

**Exports:** `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`

**Size prop (Avatar only):** `"default" | "sm" | "lg"` — default `"default"`

| Component | Base classes |
|-----------|-------------|
| `Avatar` | `group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6` |
| `AvatarImage` | `aspect-square size-full` |
| `AvatarFallback` | `bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs` |
| `AvatarBadge` | `bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex … rounded-full ring-2 select-none` + size-responsive rules |
| `AvatarGroup` | `*:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2` |
| `AvatarGroupCount` | `bg-muted text-muted-foreground ring-background relative flex size-8 … rounded-full text-sm ring-2 …` |

No CVA.

---

### `breadcrumb.tsx`

**Exports:** `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`

| Component | Base classes |
|-----------|-------------|
| `BreadcrumbList` | `text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5` |
| `BreadcrumbItem` | `inline-flex items-center gap-1.5` |
| `BreadcrumbLink` | `hover:text-foreground transition-colors` |
| `BreadcrumbPage` | `text-foreground font-normal` |
| `BreadcrumbSeparator` | `[&>svg]:size-3.5` |
| `BreadcrumbEllipsis` | `flex size-9 items-center justify-center` |

No CVA.

---

### `card.tsx`

**Exports:** `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent`

| Component | Base classes |
|-----------|-------------|
| `Card` | `bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm` |
| `CardHeader` | `@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6` |
| `CardTitle` | `leading-none font-semibold` |
| `CardDescription` | `text-muted-foreground text-sm` |
| `CardAction` | `col-start-2 row-span-2 row-start-1 self-start justify-self-end` |
| `CardContent` | `px-6` |
| `CardFooter` | `flex items-center px-6 [.border-t]:pt-6` |

No CVA. **Unused in app** (see §9).

---

### `checkbox.tsx`

**Exports:** `Checkbox`

**Base classes:**
```
peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50
```

---

### `drawer.tsx` (vaul)

**Exports:** `Drawer`, `DrawerPortal`, `DrawerOverlay`, `DrawerTrigger`, `DrawerClose`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`

Key classes:
- `DrawerOverlay`: `… fixed inset-0 z-50 bg-black/50` + animate-in/out
- `DrawerContent`: direction-aware positioning, `bg-background fixed z-50 flex h-auto flex-col`, max-h `[80vh]`, widths `w-3/4 sm:max-w-sm`
- `DrawerTitle`: `text-foreground font-semibold`
- `DrawerDescription`: `text-muted-foreground text-sm`

No CVA.

---

### `dropdown-menu.tsx`

**Exports:** 16 sub-components (Root through SubContent)

**DropdownMenuItem variant prop:** `"default" | "destructive"`, default `"default"`

Item base:
```
focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive … relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none …
```

Content base:
```
bg-popover text-popover-foreground … z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] … rounded-md border p-1 shadow-md
```

Shortcut: `text-muted-foreground ml-auto text-xs tracking-widest`

---

### `field.tsx`

**Exports:** `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLegend`, `FieldSeparator`, `FieldSet`, `FieldContent`, `FieldTitle`

**CVA — `fieldVariants`:** default orientation `"vertical"`

| Orientation | Key behavior |
|-------------|-------------|
| `vertical` | `flex-col [&>*]:w-full` |
| `horizontal` | `flex-row items-center` |
| `responsive` | vertical below `@md/field-group`, horizontal above |

**FieldLegend variant:** `"legend"` (default, `text-base`) | `"label"` (`text-sm`)

---

### `input.tsx`

**Exports:** `Input`

**Base classes:**
```
file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive
```

---

### `label.tsx`

**Exports:** `Label`

**Base classes:**
```
flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50
```

---

### `select.tsx`

**Exports:** 11 sub-components

**SelectTrigger size prop:** `"sm" | "default"`, default `"default"`

Trigger base (includes `data-[size=default]:h-9 data-[size=sm]:h-8`):
```
border-input … flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs … focus-visible:ring-[3px] …
```

SelectLabel: `text-muted-foreground px-2 py-1.5 text-xs`

---

### `separator.tsx`

**Exports:** `Separator` — default `orientation="horizontal"`, `decorative=true`

**Base:** `bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px`

---

### `sheet.tsx` (Radix Dialog)

**Exports:** `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`

**SheetContent props:** `side` default `"right"`, `showCloseButton` default `true`

Overlay: `fixed inset-0 z-50 bg-black/50` + fade animations  
Content: side-specific slide animations, `bg-background … shadow-lg`, widths `w-3/4 sm:max-w-sm`  
Close button: `ring-offset-background focus:ring-ring … absolute top-4 right-4 rounded-xs opacity-70 …`

---

### `sidebar.tsx`

**Exports:** 24 components + `useSidebar`

**Constants:** `SIDEBAR_WIDTH = "16rem"`, `SIDEBAR_WIDTH_MOBILE = "18rem"`, `SIDEBAR_WIDTH_ICON = "3rem"`

**CVA — `sidebarMenuButtonVariants`:** default variant `"default"`, size `"default"`

| Variant | Classes |
|---------|---------|
| `default` | `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground` |
| `outline` | `bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent … hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]` |

| Size | Classes |
|------|---------|
| `default` | `h-8 text-sm` |
| `sm` | `h-7 text-xs` |
| `lg` | `h-12 text-sm group-data-[collapsible=icon]:p-0!` |

Menu button base (long): `peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm … data-[active=true]:bg-sidebar-accent …`

**SidebarMenuSubButton size:** `"sm" | "md"`, default `"md"`

---

### `skeleton.tsx`

**Exports:** `Skeleton` — `bg-accent animate-pulse rounded-md`

---

### `sonner.tsx`

**Exports:** `Toaster` — wraps `sonner` with `useTheme()` from `next-themes`, Lucide icons, inline CSS vars for toast theming.

---

### `table.tsx`

**Exports:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`

| Component | Base classes |
|-----------|-------------|
| `Table` | `w-full caption-bottom text-sm` (wrapped in overflow container) |
| `TableRow` | `hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors` |
| `TableHead` | `text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap …` |
| `TableCell` | `p-2 align-middle whitespace-nowrap …` |
| `TableFooter` | `bg-muted/50 border-t font-medium …` |
| `TableCaption` | `text-muted-foreground mt-4 text-sm` |

---

### `tabs.tsx`

**Exports:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `tabsListVariants`

**CVA — `tabsListVariants`:** default variant `"default"`

| Variant | Classes |
|---------|---------|
| `default` | `bg-muted` |
| `line` | `gap-1 bg-transparent` |

List base: `rounded-lg p-[3px] group-data-[orientation=horizontal]/tabs:h-9 … inline-flex w-fit items-center justify-center … text-muted-foreground`

Trigger: complex multi-line class string with `text-sm font-medium`, active state `data-[state=active]:bg-background`, line variant underline via `after:` pseudo.

---

### `toggle.tsx`

**Exports:** `Toggle`, `toggleVariants` — defaults: variant `"default"`, size `"default"`

**Base:**
```
inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground … data-[state=on]:bg-accent data-[state=on]:text-accent-foreground … focus-visible:ring-[3px] …
```

| Variant | Classes |
|---------|---------|
| `default` | `bg-transparent` |
| `outline` | `border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground` |

| Size | Classes |
|------|---------|
| `default` | `h-9 px-2 min-w-9` |
| `sm` | `h-8 px-1.5 min-w-8` |
| `lg` | `h-10 px-2.5 min-w-10` |

---

### `tooltip.tsx`

**Exports:** `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` — default `delayDuration = 0`

Content: `bg-foreground text-background … rounded-md px-3 py-1.5 text-xs text-balance` + arrow

---

## 5. shadcn Primitives — Installed vs Missing

### Installed (21 files)

`avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `drawer`, `dropdown-menu`, `field`, `input`, `label`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `sonner`, `table`, `tabs`, `toggle`, `tooltip`

### Missing — likely needed for mobile-first redesign

| Component | Notes |
|-----------|-------|
| **accordion** | Collapsible sections on mobile |
| **alert** / **alert-dialog** | Inline errors, confirm destructive actions |
| **dialog** | Centered modals (Sheet/Drawer exist but differ) |
| **popover** | Anchored menus/tooltips with form content |
| **progress** | Loading/upload states |
| **scroll-area** | Constrained scroll regions |
| **toggle-group** | Segmented controls / filter chips |
| **command** | Search/command palette |
| **calendar** + **date-picker** | Scheduling (Games) |
| **form** | react-hook-form + zod integration wrapper |
| **radio-group** | Single-select options outside dropdown |
| **switch** | Boolean settings |
| **textarea** | Multi-line input |
| **input-otp** | Custom `otp-input.tsx` exists instead |
| **navigation-menu** | Marketing/top nav |
| **pagination** | List pagination |
| **carousel** | Mobile content swiping |
| **chart** | `recharts` installed but no shadcn Chart wrapper |
| **collapsible** | Expand/collapse without full accordion |
| **context-menu** | Long-press / right-click |
| **hover-card** | Preview on hover/tap |
| **menubar** | Desktop menu bar |
| **aspect-ratio** | Media layouts |
| **resizable** | Split panels |

**Already present:** sonner (toasts), drawer (mobile sheets), sheet (side panels), field (form layout), sidebar (nav shell).

---

## 6. UI-Related Dependencies

From `/Users/hassanhaji/Documents/temba-v2/apps/temba/package.json`:

| Package | Version | Status |
|---------|---------|--------|
| `class-variance-authority` | ^0.7.1 | Used (Button, Badge, Field, Tabs, Toggle, Sidebar) |
| `clsx` | ^2.1.1 | Used via `cn()` |
| `tailwind-merge` | ^3.4.1 | Used via `cn()` |
| `lucide-react` | ^0.574.0 | UI component icons (7 files) |
| `@tabler/icons-react` | ^3.36.1 | Sidebar nav icons only |
| `radix-ui` | ^1.4.3 | Unified Radix import in UI components |
| `@radix-ui/react-label` | ^2.1.7 | In package.json; components import from `radix-ui` |
| `@radix-ui/react-separator` | ^1.1.7 | Legacy dep |
| `@radix-ui/react-slot` | ^1.2.3 | Legacy dep |
| `vaul` | ^1.1.2 | Drawer |
| `sonner` | ^2.0.7 | Toasts (+ direct `toast()` in 16 app files) |
| `next-themes` | ^0.4.6 | Only in `sonner.tsx`; **no ThemeProvider** |
| `zod` | ^3.24.2 | Validation (no shadcn Form) |
| `recharts` | 2.15.4 | **Installed, unused in src** |
| `tailwindcss` | ^4.0.15 | Dev |
| `@tailwindcss/postcss` | ^4.0.15 | Dev |
| `@clerk/ui` | ^1.16.1 | Auth UI theme |
| `@clerk/nextjs` | ^7.5.2 | Auth |

**Not installed:** `react-hook-form`, `date-fns`, `dayjs`, `framer-motion`, `embla-carousel-react`, `react-day-picker`, `tw-animate-css`, `@tailwindcss/typography`

**DnD (not UI primitives):** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`, `@dnd-kit/utilities`

---

## 7. Styling Helpers

### `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/lib/utils.ts`

Only helper:

```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

No other styling utilities in `src/lib/`. No shared variant maps outside UI components.

### `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/hooks/use-mobile.ts`

Breakpoint constant `768px` — used by Sidebar for mobile Sheet behavior. Not a styling helper per se.

---

## 8. Dark Mode

| Aspect | Finding |
|--------|---------|
| CSS tokens | `.dark` block fully defined (`globals.css:88–120`) |
| Variant | `@custom-variant dark (&:is(.dark *))` |
| ThemeProvider | **Not present** anywhere in repo |
| `html` class | Only `${geist.variable}` — **no `dark` class** |
| Toggle UI | **None** |
| `useTheme()` | Used in `sonner.tsx:14` only; without provider defaults to `"system"` but `.dark` never applied |
| `dark:` classes in app | `auth-shell.tsx:34,44` — unreachable without `.dark` on ancestor |

**Conclusion: Dark mode is defined in CSS but not reachable in the UI today.**

Light/dark token mismatch: light theme is blue-branded; dark theme is neutral gray with only sidebar-primary retaining blue.

---

## 9. Component Usage Analysis

Counts = **import statements** referencing `~/components/ui/<name>` across `src/` (includes internal UI cross-imports).

| Component | Import count | App usage |
|-----------|-------------:|-----------|
| **button** | 20 | Heavy — forms, actions, invites, auth |
| **skeleton** | 16 | Loading states across dashboard |
| **badge** | 9 | Status/sport labels |
| **input** | 11 | Forms, OTP, phone |
| **field** | 5 | New entity forms |
| **select** | 3 | Visibility/type/country code |
| **separator** | 3 | site-header + field + sidebar internal |
| **sidebar** | 4 | dashboard-shell, app-sidebar, nav-main + internal |
| **sonner** | 1 | root layout Toaster |
| **label** | 1 | field.tsx only |
| **sheet** | 1 | sidebar.tsx internal (mobile sidebar) |
| **tooltip** | 1 | sidebar.tsx internal |
| **avatar** | 0 | **Unused** |
| **breadcrumb** | 0 | **Unused** |
| **card** | 0 | **Unused** — pages use raw `rounded-xl border bg-card` |
| **checkbox** | 0 | **Unused** |
| **drawer** | 0 | **Unused** |
| **dropdown-menu** | 0 | **Unused** |
| **table** | 0 | **Unused** |
| **tabs** | 0 | **Unused** |
| **toggle** | 0 | **Unused** |

### In-app variant usage (Button)

Used: `outline` (dominant), `secondary`, `ghost`, implicit `default`  
**Never used:** `destructive`, `link`  
Sizes used: `sm` heavily; `icon` only in sidebar trigger

### In-app variant usage (Badge)

Used: `outline`, `secondary`  
**Never used:** `default`, `destructive`, `ghost`, `link`

### Direct `toast()` from sonner

16 files import `toast` directly (bypassing UI wrapper except root `<Toaster />`).

---

## 10. Ad-Hoc / One-Off Styling Offenders

### Hardcoded hex colors

| File:Line | Value |
|-----------|-------|
| `auth-shell.tsx:6` | `bg-[#0f0a1f]` |
| `public/layout.tsx:14` | `from-[#2e026d] to-[#15162c]` |

### Non-token palette (Tailwind named colors)

| File:Line | Classes |
|-----------|---------|
| `auth-shell.tsx:11–13` | `bg-violet-600/40`, `bg-emerald-500/30`, `bg-violet-500/20` (blur orbs) |
| `auth-shell.tsx:34` | `from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900` |
| `auth-step-indicator.tsx:14–16` | `bg-emerald-500`, `bg-violet-600` |
| `invite-shell.tsx:5` | `from-slate-950 via-slate-900 to-emerald-950` |
| `groups/[id]/page.tsx:398,410` | `border-amber-500/30 bg-amber-500/10` |
| `communities/[id]/page.tsx:383,395` | same amber warning pattern |
| `venues/[id]/page.tsx:278` | same amber warning pattern |
| Invite components (×5) | pervasive `text-white`, `text-white/70` |

### Repeated ad-hoc “card shell” (Card component bypassed)

~46 occurrences of `rounded-xl border` pattern, e.g.:

```
border-border bg-card … rounded-xl border
divide-border border-border bg-card divide-y rounded-xl border
```

Examples: `dashboard/page.tsx:56,90,100,142,152`, `groups/[id]/page.tsx` (13×), `communities/[id]/page.tsx` (9×).

### Arbitrary Tailwind values (notable, app + UI)

| File:Line | Value |
|-----------|-------|
| `phone-input.tsx:46` | `w-[110px]` |
| `auth-shell.tsx:35` | `animate-in fade-in slide-in-from-bottom-4 duration-500` |
| `checkbox.tsx:17` | `rounded-[4px]`, `ring-[3px]` |
| `button.tsx:8` | `ring-[3px]` |
| `tabs.tsx:29,67,70` | `p-[3px]`, `h-[calc(100%-1px)]`, `bottom-[-5px]` |
| `drawer.tsx:60–61,68` | `max-h-[80vh]`, `w-[100px]` |
| `dropdown-menu.tsx:45,233` | `min-w-[8rem]` |
| `select.tsx:79` | `h-[var(--radix-select-trigger-height)]`, `min-w-[var(--radix-select-trigger-width)]` |
| `sidebar.tsx:225,234–235,238,294,483` | calc widths, `w-[2px]`, shadow arbitrary |
| `tooltip.tsx:51` | `translate-y-[calc(-50%_-_2px)]`, `rounded-[2px]` |

### Inline `style={{…}}`

| File:Line | Purpose |
|-----------|---------|
| `dashboard-shell.tsx:18–22` | `--sidebar-width`, `--header-height` overrides |
| `sidebar.tsx:134–138` | `--sidebar-width`, `--sidebar-width-icon` |
| `sidebar.tsx:191–194` | mobile `--sidebar-width: 18rem` |
| `sidebar.tsx:630–633` | skeleton random `--skeleton-width` |
| `sonner.tsx:27–33` | toast CSS vars |

### Icon library split

- **Lucide:** UI primitives only (7 component files)
- **Tabler:** sidebar navigation (`app-sidebar.tsx`, `nav-main.tsx`)
- Redesign should unify or document dual-icon policy

---

## Summary for Redesign Spec

1. **Tokens:** Custom blue light theme + neutral dark; radius 10px base; oklch throughout.
2. **Tailwind v4 CSS-first** — no JS config; PostCSS-only pipeline.
3. **Typography:** Geist Sans loaded; **`text-sm` dominates (66%)**; page pattern is 2xl titles / lg sections / sm body.
4. **Component library:** 21 shadcn components; Button/Badge variants fully defined but app only uses subset; **Card/Table/Tabs/Toggle/Checkbox/Drawer/Dropdown/Avatar/Breadcrumb unused**.
5. **Layout pattern:** Dashboard uses ad-hoc bordered shells, not `<Card>`.
6. **Dark mode:** CSS ready, **not wired** — needs ThemeProvider + toggle.
7. **Gaps for mobile:** accordion, dialog, popover, switch, textarea, form, calendar, toggle-group, scroll-area, alert-dialog, command.
8. **Dependencies available without adding:** radix-ui umbrella, CVA, cn(), vaul, sonner, recharts (unused), zod, next-themes (partially wired).
9. **Animation risk:** `tw-animate-css` commented out but animate utilities referenced.
10. **Brand inconsistency:** Dashboard = blue tokens; auth/invite/public = violet/emerald/slate/hex gradients outside design system.

[REDACTED]