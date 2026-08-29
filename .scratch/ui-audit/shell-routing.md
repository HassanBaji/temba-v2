# Application Shell, Routing & Navigation Map

Investigation covered all 28 files under `apps/temba/src/app` plus shell, auth, invite, middleware, and sidebar primitives. Three distinct layout shells exist; the dashboard uses a shadcn sidebar pattern with per-page shell mounting.

---

## 1. Route inventory (`apps/temba/src/app`)

### Root & auth

| Route | File | Component type | Renders | Data / actions | Guards / redirects |
|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | **Server** (async) | Nothing visible — immediate redirect | `auth()` from Clerk | Authenticated → `/dashboard`; else → `/login` |
| `/login` | `src/app/login/page.tsx` | **Server** (async) | `AuthShell` → Clerk `<SignIn>` | Reads `searchParams.redirect_url`; passes `safeInternalRedirect` to Clerk | Middleware: signed-in users redirected to `redirect_url` or `/dashboard` |
| `/signup` | `src/app/signup/page.tsx` | **Server** (async) | `AuthShell` → Clerk `<SignUp>` | Same redirect_url pattern as login | Same middleware redirect when signed in |
| `/public` | `src/app/public/page.tsx` | **Server** | Immediate redirect | None | `redirect("/login")` in page **and** middleware |

**`/public/layout.tsx`** — Server layout, but effectively dead because the page always redirects:

```14:17:apps/temba/src/app/public/layout.tsx
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        {children}
      </main>
```

Imports `Geist` font but never applies it. Duplicates `globals.css` + `HydrateClient`/`TRPCReactProvider` (root layout already provides those).

**`src/app/logged-in.tsx`** — **Not a route** (App Router requires `page.tsx`). Exports a stub `<div>LoggedIn</div>`. **Zero imports** anywhere. Dead code.

---

### Dashboard (`/dashboard/*`)

**Shared layout** — `src/app/dashboard/layout.tsx` (Server):

```8:14:apps/temba/src/app/dashboard/layout.tsx
  return (
    <HydrateClient>
      <div className="bg-background text-foreground min-h-screen">
        {children}
      </div>
    </HydrateClient>
  );
```

No sidebar/header here. Every dashboard page wraps itself in `<DashboardShell>`.

Middleware protects all `/dashboard(.*)` via `auth.protect()`.

| Route | File | Type | Shell `title` | Primary tRPC queries / mutations |
|---|---|---|---|---|
| `/dashboard` | `dashboard/page.tsx` | **Client** | `"Home"` | `api.users.home.useQuery()` |
| `/dashboard/groups` | `dashboard/groups/page.tsx` | Client | `"Groups"` | `api.groups.mine.useQuery()` |
| `/dashboard/groups/new` | `dashboard/groups/new/page.tsx` | Client | `"Create Group"` | `createLoosePublic`, `createLoosePrivate` |
| `/dashboard/groups/[id]` | `dashboard/groups/[id]/page.tsx` | Client | dynamic group name | `groups.byId` + many conditional invite/join queries |
| `/dashboard/teams` | `dashboard/teams/page.tsx` | Client | `"My Teams"` | `teams.mine`, `teams.pendingInvites` |
| `/dashboard/teams/new` | `dashboard/teams/new/page.tsx` | Client | `"Create Team"` | `teams.create` |
| `/dashboard/teams/[id]` | `dashboard/teams/[id]/page.tsx` | Client | dynamic team name | `teams.byId` + invite/link mutations |
| `/dashboard/communities` | `dashboard/communities/page.tsx` | Client | `"Communities"` | `communities.mine` |
| `/dashboard/communities/new` | `dashboard/communities/new/page.tsx` | Client | `"Create Community"` | `communities.create` |
| `/dashboard/communities/[id]` | `dashboard/communities/[id]/page.tsx` | Client | dynamic community name | `communities.byId` + extensive admin queries |
| `/dashboard/venues` | `dashboard/venues/page.tsx` | Client | `"Venues"` | `venues.list`, `venues.listPendingLinkRequests` |
| `/dashboard/venues/new` | `dashboard/venues/new/page.tsx` | Client | `"Create Venue"` | `venues.create` |
| `/dashboard/venues/[id]` | `dashboard/venues/[id]/page.tsx` | Client | `"Venue"` | `venues.byId` + logo/court/archive mutations |

**Venues sub-layout** — `dashboard/venues/layout.tsx` (Client):

```7:9:apps/temba/src/app/dashboard/venues/layout.tsx
export default function VenuesLayout({ children }: { children: ReactNode }) {
  return <OperatorGate>{children}</OperatorGate>;
}
```

`OperatorGate` checks `user.publicMetadata.operator === true`. Non-operators see dashboard shell with “You do not have access.” Venues nav item is also hidden for non-operators in sidebar.

**No** `loading.tsx`, `error.tsx`, or `not-found.tsx` anywhere under `src/app`.

---

### Invites (`/invites/*`)

All five invite routes share the same pattern: **Server page** → `InviteShell` → **Client accept component**. No `invites/layout.tsx`.

| Route | File | Accept component | Preview query | Accept mutation | Post-accept redirect |
|---|---|---|---|---|---|
| `/invites/team/email/[token]` | `invites/team/email/[token]/page.tsx` | `AcceptTeamEmailInvite` | `teams.previewEmailInvite` | `teams.acceptEmailInvite` | `/dashboard/teams/{id}` |
| `/invites/group/email/[token]` | `invites/group/email/[token]/page.tsx` | `AcceptGroupEmailInvite` | `groups.previewEmailInvite` | `groups.acceptEmailInvite` | `/dashboard/groups/{id}` |
| `/invites/group/link/[token]` | `invites/group/link/[token]/page.tsx` | `AcceptGroupInviteLink` | `groups.previewInviteLink` | `groups.acceptInviteLink` | `/dashboard/groups/{id}` |
| `/invites/community/email/[token]` | `invites/community/email/[token]/page.tsx` | `AcceptCommunityEmailInvite` | `communities.previewEmailInvite` | `communities.acceptEmailInvite` | `/dashboard/communities/{id}` |
| `/invites/community/link/[token]` | `invites/community/link/[token]/page.tsx` | `AcceptCommunityInviteLink` | `communities.previewInviteLink` | `communities.acceptInviteLink` | `/dashboard/communities/{id}` |

Server pages call `auth()` and pass `isSignedIn={Boolean(userId)}` plus `returnPath` from `~/lib/invite-paths`. **Not middleware-protected** — public URLs; accept requires Clerk sign-in inside the client component.

---

### API

| Route | File | Type | Purpose |
|---|---|---|---|
| `/api/trpc/[trpc]` | `src/app/api/trpc/[trpc]/route.ts` | Route handler (GET + POST) | tRPC `fetchRequestHandler`; context from request headers; dev error logging |

---

## 2. Root layout (`src/app/layout.tsx`)

```17:36:apps/temba/src/app/layout.tsx
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <ClerkProvider appearance={{ theme: shadcn }}>
          <TRPCReactProvider>
            {children}
            <Toaster />
          </TRPCReactProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
```

| Concern | Detail |
|---|---|
| **Font** | Google `Geist` → CSS var `--font-geist-sans`; wired in `globals.css` as `--font-sans` |
| **`<html>` classes** | Only `${geist.variable}` — **no** `dark` class, no theme toggle |
| **`<body>` classes** | None inline; `globals.css` applies `@apply bg-background text-foreground` |
| **Metadata** | Title: “Temba - the future of competitive sports”; favicon `/favicon.ico` |
| **Clerk** | `ClerkProvider` with `appearance={{ theme: shadcn }}` + `@clerk/ui/themes/shadcn.css` import |
| **tRPC** | `TRPCReactProvider` (client) wraps all pages |
| **Toaster** | `~/components/ui/sonner` — uses `useTheme()` from `next-themes`, but **no `ThemeProvider` is mounted** anywhere; theme defaults to `"system"` without a provider |

Theme tokens in `globals.css`: light blue-and-white shell (`:root`), full `.dark` palette defined but inactive unless `.dark` is added to an ancestor.

---

## 3. Auth gating: middleware + `logged-in.tsx`

### `src/middleware.ts`

```6:27:apps/temba/src/middleware.ts
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAuthRoute = createRouteMatcher(["/login(.*)", "/signup(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  // ... signed-in on /login|/signup → redirect to redirect_url or /dashboard
  if (req.nextUrl.pathname === "/public") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});
```

| Classification | Routes |
|---|---|
| **Protected** (Clerk `auth.protect()`) | `/dashboard` and all subpaths |
| **Auth routes** (redirect if signed in) | `/login`, `/signup` |
| **Explicit redirect** | `/public` → `/login` |
| **Public (no middleware gate)** | `/`, `/invites/*`, `/api/trpc/*`, static assets |

`/` does its own server-side redirect (not middleware). Invites are public at the edge; acceptance is gated in client components.

### `src/app/logged-in.tsx`

Stub only; not wired as a route or import. **Dead.**

---

## 4. Dashboard shell composition

### Architecture diagram

```
SidebarProvider (dashboard-shell.tsx)
├── AppSidebar (collapsible="offcanvas", variant="inset")
│   ├── SidebarHeader → Link "Temba" → /dashboard
│   ├── SidebarContent → NavMain (flat item list)
│   └── SidebarFooter → Clerk UserButton showName
└── SidebarInset
    ├── SiteHeader (title + SidebarTrigger + AuthHeaderControls)
    └── main content area (px-4 py-4 md:px-6 md:py-6)
```

### `dashboard-shell.tsx` — layout classes

```17:35:apps/temba/src/components/dashboard-shell.tsx
    <SidebarProvider
      style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={title} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
```

- **No max-width** on main content (full-bleed within inset).
- Form pages opt into `max-w-lg` or `max-w-2xl` locally.
- **Container query** `@container/main` on content wrapper (no `@container` rules found in shell files themselves).

### Navigation items — exact list and order

Defined in `app-sidebar.tsx`:

```25:52:apps/temba/src/components/app-sidebar.tsx
const navMain = [
  { title: "Home",        url: "/dashboard",              icon: IconHome },
  { title: "Groups",      url: "/dashboard/groups",         icon: IconUsersGroup },
  { title: "Teams",       url: "/dashboard/teams",          icon: IconUsers },
  { title: "Communities", url: "/dashboard/communities",    icon: IconBuildingCommunity },
];
const venuesNav = {
  title: "Venues", url: "/dashboard/venues", icon: IconMapPin,
};
```

**Information architecture:**
- Single flat group — no sections, labels, or nested items.
- Order: Home → Groups → Teams → Communities → (Venues, operators only).
- Operator check: `user?.publicMetadata.operator === true`.
- **No active-route highlighting** — `nav-main.tsx` does not use `usePathname` or `isActive`.
- Header `title` prop is set per page but is independent of nav selection.

### `site-header.tsx`

```7:18:apps/temba/src/components/site-header.tsx
    <header className="h-(--header-height) ... flex shrink-0 items-center gap-2 border-b ...">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 ..." />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <AuthHeaderControls />
        </div>
      </div>
    </header>
```

Server component with client island `AuthHeaderControls`.

### `auth-header-controls.tsx`

Signed-out: ghost “Sign in” + solid “Sign up” (Clerk redirect buttons). Signed-in: `UserButton`. **Duplicates** sidebar footer `UserButton` when in dashboard.

### `operator-gate.tsx`

Wraps venues routes; shows `DashboardShell` + skeleton or access-denied message before rendering children.

---

## 5. `app-sidebar.tsx` — current state + uncommitted diff

**Current file** (includes debug line):

```54:58:apps/temba/src/components/app-sidebar.tsx
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  console.log(user);
  const isOperator = user?.publicMetadata.operator === true;
  const items = isOperator ? [...navMain, venuesNav] : navMain;
```

Sidebar config:
- `collapsible="offcanvas"` (slides off-screen on desktop when collapsed).
- `variant="inset"` (passed from `dashboard-shell`).
- Header brand: `text-base font-semibold` “Temba”.
- Footer: `flex items-center gap-2 px-2 py-1` + `<UserButton showName />`.

**Git diff (uncommitted):** only addition of `console.log(user);` after `useUser()` — no functional/nav change.

---

## 6. Sidebar primitive (`ui/sidebar.tsx`) — behavior

### Constants

| Constant | Value |
|---|---|
| `SIDEBAR_COOKIE_NAME` | `"sidebar_state"` |
| `SIDEBAR_COOKIE_MAX_AGE` | 7 days |
| `SIDEBAR_WIDTH` | `16rem` (overridden by dashboard-shell to `calc(var(--spacing) * 72)`) |
| `SIDEBAR_WIDTH_MOBILE` | `18rem` |
| `SIDEBAR_WIDTH_ICON` | `3rem` |
| Keyboard shortcut | `Ctrl/Cmd + B` |

### Cookie persistence

Cookie is **written** on toggle (`document.cookie = sidebar_state=...`) but **never read on init**. `defaultOpen = true` always; collapsed state is not restored across sessions.

### Collapsible modes

`collapsible` prop: `"offcanvas"` | `"icon"` | `"none"`. App uses **`offcanvas`**.

- **Desktop (`md+`)**: fixed sidebar `hidden md:block` / container `md:flex`; offcanvas slides `left-[calc(var(--sidebar-width)*-1)]` when collapsed.
- **Mobile (`< md`, via `useIsMobile`)**: sidebar renders as **Sheet** (drawer), not fixed column:

```183:205:apps/temba/src/components/ui/sidebar.tsx
  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} ...>
        <SheetContent
          className="bg-sidebar ... w-(--sidebar-width) p-0 [&>button]:hidden"
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE }}
        >
```

- `SidebarTrigger` toggles `openMobile` on mobile, `open` on desktop.
- `SidebarInset` inset variant: `md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm`.

### Exported but unused in app shell

`SidebarRail`, `SidebarInput`, `SidebarMenuSub*`, `SidebarMenuSkeleton`, etc. — only core pieces used.

---

## 7. Invite shell (separate from dashboard)

```3:23:apps/temba/src/components/invites/invite-shell.tsx
export function InviteShell({ children }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white">Temba</Link>
          <p className="mt-2 text-sm text-white/60">Sign in with Clerk to continue...</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}
```

- **No** sidebar, header, or dashboard chrome.
- Dark gradient full-viewport center card (`max-w-md`).
- Accept components handle preview → sign-in prompt (Clerk buttons with `forceRedirectUrl={returnPath}`) → auto-accept on signed-in.

---

## 8. Auth shell components — usage

| Component | Path | Used? |
|---|---|---|
| `AuthShell` | `components/auth/auth-shell.tsx` | **Yes** — `/login`, `/signup` |
| `AuthStepIndicator` | `components/auth/auth-step-indicator.tsx` | **No imports** — dead (Phone/Verify/Done stepper) |
| `OtpInput` | `components/auth/otp-input.tsx` | **No imports** — dead |
| `PhoneInput` | `components/auth/phone-input.tsx` | **No imports** — dead (BH +973 only) |

### `AuthShell` layout (used)

```5:49:apps/temba/src/components/auth/auth-shell.tsx
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden ... lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Brand + marketing copy on dark #0f0a1f panel */}
      </div>
      <div className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-10 dark:from-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md ...">
          <div className="mb-8 text-center lg:hidden">{/* mobile Temba logo */}</div>
          <div className="rounded-2xl border ... p-6 ... md:p-8">
            {children}  {/* Clerk SignIn / SignUp */}
          </div>
        </div>
      </div>
    </div>
```

Breakpoints: `lg:` two-column split; mobile single column with top logo.

Login/signup pages are Server Components wrapping Clerk client widgets inside `AuthShell`.

---

## 9. Responsive / breakpoint helpers

### `src/hooks/use-mobile.ts`

```3:18:apps/temba/src/hooks/use-mobile.ts
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // matchMedia (max-width: 767px)
  return !!isMobile
}
```

**Only consumer:** `ui/sidebar.tsx` (mobile Sheet vs desktop fixed sidebar).

### Breakpoints used in shell/navigation (Tailwind defaults)

| Breakpoint | Where used |
|---|---|
| **`md` (768px)** | Sidebar desktop visibility; content padding `md:px-6 md:py-6`; inset margins; grid layouts in pages |
| **`lg` (1024px)** | AuthShell 2-col; header `lg:px-6 lg:gap-2` |
| **`sm` (640px)** | List row layouts in dashboard pages (not shell) |

No custom breakpoint hooks beyond `useIsMobile`.

---

## 10. Dead / unused shell & navigation artifacts

| Item | Status |
|---|---|
| `src/app/logged-in.tsx` | Dead — not a route, not imported |
| `src/app/public/*` | Effectively dead — always redirects to `/login` |
| `AuthStepIndicator`, `OtpInput`, `PhoneInput` | Dead — no imports (legacy custom phone auth) |
| `SidebarRail` and many sidebar subcomponents | Exported, unused in app |
| `ui/breadcrumb.tsx`, `ui/drawer.tsx` | Present, zero app imports |
| `next-themes` / `ThemeProvider` | Package installed; **not wired** in root layout |
| Sidebar cookie read | Cookie written, never restored on load |
| `console.log(user)` in `app-sidebar.tsx` | Debug leftover (uncommitted) |

---

## Summary for redesign spec

**Three shells today:**
1. **Dashboard** — shadcn sidebar (offcanvas desktop, Sheet mobile) + top header; admin-dashboard IA; light blue tokens; full-width content.
2. **Auth** — split marketing/form layout; Clerk handles all auth UI.
3. **Invite** — centered dark card; no app chrome.

**Nav IA:** 4 universal items + conditional Venues; flat; no active states; duplicate user controls (sidebar footer + header).

**Auth model:** Clerk middleware protects `/dashboard/*` only; invites and `/` are public at edge with in-page sign-in gates.

**Mobile:** Sidebar becomes off-canvas Sheet below 768px; hamburger via `SidebarTrigger` in header; no bottom tab bar.

[REDACTED]