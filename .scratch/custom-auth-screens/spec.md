# Custom sign-in and sign-up screens

Status: blocked-on-product-decision (the design changes the authentication strategy; see Open Questions 1)

Tickets: not yet published to Linear. Decomposition in Ticket Decomposition below; Phase 1 is publishable once Open Questions 1–3 are answered, Phase 2 only if the phone-first strategy is approved.

Design: [`design/auth-artboards.html`](./design/auth-artboards.html) — artboards `00a Welcome`, `00b Sign up`, `00c Verify number`, `00d Sign in`. Authoritative for pixels and copy.

Related: [onboarding-questionnaire](../onboarding-questionnaire/spec.md), [sports-brand-system](../sports-brand-system/spec.md), [redesign](../redesign/spec.md), [ADR-0010](../../docs/adr/0010-archivo-variable-font.md), [ADR-0012](../../docs/adr/0012-app-owned-onboarding-questionnaire.md).

## Problem Statement

`/login` and `/signup` render Clerk's prebuilt `<SignIn>` / `<SignUp>` drop-ins inside `AuthShell`. The drop-in is themed — `@clerk/ui/themes` `shadcn` plus a `variables` block in `app/layout.tsx`, and `@clerk/ui/themes/shadcn.css` imported at the top of `globals.css` — but it is still Clerk's markup, Clerk's layout, Clerk's copy and Clerk's component vocabulary. It cannot be made to match the Temba auth artboards, it does not use `components/ui/`, and it is the only surface in the App whose look is owned by a vendor.

The two screens are also the product's front door: they are the first thing a User invited by an Invite link sees, and they are the entry to the App-owned Onboarding questionnaire (ADR-0012).

We want Temba-owned components and design on those screens. Clerk stays the identity provider.

**The brief said "keep the same flow as now". The design does not keep the same flow.** That tension is the central unresolved question in this spec and is set out in Open Questions 1. Everything below is written so the visual work can proceed without pre-deciding it.

## Solution

Replace `<SignIn>` and `<SignUp>` with hand-built Temba forms driven by Clerk's `useSignIn` / `useSignUp` hooks, and take ownership of the auth sub-routes the drop-in used to serve under `/login/**` and `/signup/**`.

`/login` and `/signup` stay server components that resolve `redirect_url` exactly as today; each renders a new client form component instead of the drop-in. `AuthShell` is left alone for `/onboarding`; the new screens get their own chrome.

The work is phased. **Phase 1** rebuilds the screens in the design's visual language against the authentication strategy the Clerk instance already has. **Phase 2** — only if approved — migrates the identity model to phone-first passwordless as the artboards actually draw it. Phase 2 carries a schema migration and is blocked on it.

## The flow contract (must not change)

This is the part of the system that is **not** being redesigned, in either phase. Any ticket that breaks a line here is wrong.

### Routes

- `/login` is the sign-in door. `/signup` is the sign-up door.
- Both accept `?redirect_url=<internal path>`.
- Both sanitise it through `~/lib/safe-internal-redirect` (`apps/temba/src/lib/safe-internal-redirect.ts`): relative paths only, no `//`, no `\`, no `@`. A refused value becomes `null`, never an error.
- Each screen cross-links to the other **carrying the sanitised `redirect_url`**. The design adds a third node — Welcome — and a Back arrow on `00b` / `00c`; `redirect_url` has to thread through all of them.

### Redirect semantics

Today the drop-ins receive `forceRedirectUrl={redirectUrl ?? undefined}` and `fallbackRedirectUrl={redirectUrl ?? "/dashboard"}`. The observable behaviour to preserve:

- A usable `redirect_url` wins, always.
- No `redirect_url` (or a refused one) lands on `/dashboard`.
- The redirect happens **after** the Clerk session is active, never before.

### Middleware (`apps/temba/src/middleware.ts`)

- `isAuthRoute = ["/login(.*)", "/signup(.*)"]`. A signed-in visitor to any path under those prefixes is redirected to `safeInternalRedirect(redirect_url) ?? "/dashboard"`. **The `(.*)` matters**: it already covers every sub-route the custom screens will add, so no matcher change is needed — but it also means a mid-flow sub-route must not be reachable once the session is active.
- `isProtectedRoute = ["/dashboard(.*)", "/onboarding(.*)"]` — unchanged.
- The matcher includes `"/__clerk/:path*"` — Clerk's proxy paths. **Keep it.** The hooks talk to the Frontend API through the same handshake the drop-in used.
- `/public` redirects to `/login` — unchanged.
- `nextWithPathname` sets `x-temba-pathname` — unchanged.
- **If Welcome takes over `/`** (Open Questions 2) that is the one middleware-adjacent change, and it lands in `app/page.tsx`, not in `middleware.ts`.

### Onboarding hand-off (ADR-0012)

- Sign-up does **not** send the User to `/onboarding` itself. The gate lives in `dashboard/layout.tsx` and reads Postgres via `~/lib/dashboard-onboarding-gate`.
- So the post-sign-up redirect target stays exactly what it is today (`redirect_url` or `/dashboard`); the gate then bounces an incomplete User to `/onboarding?redirect_url=<requested path>`.
- **Do not** add an `/onboarding` redirect to the sign-up form. Doing so would double-gate and would break the Invite-link landing path.
- The `user` row is created by the `user.created` webhook (`apps/temba/src/app/api/webhooks/route.ts` → `apps/temba/src/server/auth/sync-clerk-user.ts`). The gate already tolerates the race via `provisioning`. Custom sign-up must not try to create the row itself.

### Other Clerk entry points that must keep working

`SignInButton` / `SignUpButton` with `mode="redirect"` are used in `apps/temba/src/components/auth-header-controls.tsx`, `apps/temba/src/components/invites/accept-invite-flow.tsx` and `apps/temba/src/components/invites/accept-game-invite-link.tsx`. They resolve to `/login` and `/signup` through the Clerk instance's configured URLs, so they continue to work — but they must be re-checked once the drop-ins are gone, because they are the Invite-link entry path.

`UserButton` (`app-sidebar.tsx`, `dashboard/you/page.tsx`) is still a Clerk drop-in and **is not in scope**. It is the reason `@clerk/ui/themes`, the `clerkAppearance` block in `layout.tsx`, and the `@clerk/ui/themes/shadcn.css` import in `globals.css` must all stay.

## Implementation Decisions

### Clerk integration approach — `useSignIn` / `useSignUp` hooks

**Decision**: build the forms on `useSignIn`, `useSignUp` and `useClerk().setActive` from `@clerk/nextjs`, plus `AuthenticateWithRedirectCallback` for the OAuth return. This holds under both phases; only the strategy arguments change.

Verified against the installed tree:

- `@clerk/nextjs` 7.5.2 exports `useSignIn`, `useSignUp`, `useClerk`, `useAuth`, `useUser`, `AuthenticateWithRedirectCallback`, `isClerkAPIResponseError`, `isClerkRuntimeError` (re-exported from `@clerk/react` 6.9.1). These are the stable, documented public surface.
- `@clerk/ui` 1.16.1 describes itself in its own `package.json` as *"Internal package that contains the UI components for the Clerk frontend SDKs"*. Its subpaths are `.`, `./no-rhc`, `./entry`, `./internal`, `./themes`, `./themes/experimental`, `./themes/shadcn.css`, `./register`. It is the prebuilt component chunk the drop-ins lazy-load — **not** a composable primitive library. The only piece the App legitimately consumes is `./themes` (already used by `UserButton`) and `./themes/shadcn.css` (already imported). Reaching into `./internal` or `./entry` would couple Temba to Clerk's private API across minor versions.
- `@clerk/elements` — Clerk's actual composable primitives package — is **not installed** and is a separate beta line. Adding it would introduce a new library where a shipped one already solves the problem, which `.cursor/rules/project-standard.mdc` forbids.

**Trade-off**: the hooks give total markup control and zero new dependencies, at the cost of the App now owning every auth sub-state Clerk used to render for free — verification, second factor, password reset, OAuth callback, and the error vocabulary.

### Errors

Clerk failures arrive as `ClerkAPIError[]` on `err.errors`, each with `code`, `message`, `longMessage`, and `meta.paramName` naming the offending field. Narrow with `isClerkAPIResponseError`; anything else is an unexpected failure and gets a generic message.

Add `apps/temba/src/lib/clerk-auth-error.ts` mirroring the shape of the shipped `apps/temba/src/lib/form-mutation-error.ts` — same `SplitFormError` idea, same function names — so the forms read like every other form in the App:

- `splitClerkAuthError(err): { fieldErrors: Record<string, string>; globalMessage: string | null }` — keyed by `meta.paramName` (`identifier`, `phone_number`, `email_address`, `code`, `first_name`, …), falling back to a global message.
- `clerkFieldErrorMessage(err, field)`, `clerkGlobalErrorMessage(err)`.
- Reuse the existing `focusFormFailure` contract: focus the first errored input by element id, else focus the summary.

Codes that need Temba copy rather than Clerk's raw `longMessage`: `form_identifier_not_found`, `form_identifier_exists`, `form_code_incorrect`, `verification_expired`, `verification_failed` (the attempts-exhausted case — this is what the design's "three wrong tries" line is about), `too_many_requests`, `form_param_format_invalid` (a malformed phone number), and — only while passwords exist — `form_password_incorrect`, `form_password_pwned`.

Surface global errors through the existing `FormErrorSummary` (`apps/temba/src/components/ui/form-error-summary.tsx`) — it already has `role="alert"`, `tabIndex={-1}` and a focus ring, which is exactly the accessibility behaviour these hand-built forms need.

### Redirect threading

Every branch has to carry `redirect_url`, including the ones that leave the tab (OAuth) and the ones that come back on a different path (verification, reset). Put it in one pure, tested module rather than reconstructing query strings in six components.

Add `apps/temba/src/lib/auth-redirect.ts`:

- `authCrossLinkUrl(target: "/" | "/login" | "/signup", redirectUrl: string | null): string` — the Welcome / cross-link / Back-arrow hrefs, replacing the inline template literals now in both page files.
- `authCompleteUrl(redirectUrl: string | null): string` — `redirectUrl ?? "/dashboard"`; the single definition of the fallback.
- `ssoCallbackUrl(base: "/login" | "/signup", redirectUrl: string | null): string` — the `redirectUrl` passed to `authenticateWithRedirect`.

All take an **already-sanitised** value. Sanitising stays in the server components, at the boundary, exactly as it is today.

### Auth chrome — fork, do not mutate `AuthShell`

`apps/temba/src/components/auth/auth-shell.tsx` is used by `/login`, `/signup` **and** `/onboarding`.

**Decision (reinforced by the design)**: the new design lands as a new component (working name `apps/temba/src/components/auth/auth-screen.tsx`) used only by the auth routes. `AuthShell` stays exactly as-is and keeps serving `/onboarding`.

The artboards are 390px full-bleed mobile frames with edge-to-edge black on Welcome, a sticky bottom button stack, and a footer rule. `AuthShell` is a `lg:grid-cols-2` desktop split with a `max-w-md` elevated `Card` on the right. There is no version of the new design that is `AuthShell` with different colours. Forcing `/onboarding` through it would be an unreviewed visual change to a gated, ADR-0012 flow.

### The design — screen by screen

Read from `design/auth-artboards.html`. All four artboards are `width:390px; min-height:844px`, `border-radius:16px` frames. Copy below is verbatim from the file and is authoritative.

#### Shared vocabulary

| Element | Spec |
| --- | --- |
| Frame | 390px wide, 16px radius, `1px solid #E6E6E6` (white screens) or `1px solid #000` (Welcome) |
| Horizontal gutter | 26px |
| Header row | 22px top padding; 44px hit-area Back arrow (`lucide arrow-left`, 20px) pulled `margin-left:-10px`; right-aligned cross-link at 14px `#6E6E6E` |
| Screen heading | 32px, `wdth 100, wght 700`, `letter-spacing:-0.02em`, `line-height:1.05` |
| Sub-copy | 15px `#6E6E6E`, `line-height:1.5` |
| Field label | 13px `#6E6E6E`, 8px gap above the control |
| Control | 52px tall, 12px radius, 16px text, 16px horizontal padding; resting border `#E6E6E6`, focus/active border `#000` |
| Primary button | 52px, 12px radius, `#000` on `#FFF` text, 16px `wght 600`; hover `#2E2E2E` |
| Secondary/OAuth button | 52px, 12px radius, `1px solid #E6E6E6`, white ground, 15px `wght 600`; hover `#F4F4F4` |
| Divider | 1px `#E6E6E6` rules either side of a monospace 12px `OR` in `#9A9A9A` |
| Footer | `margin-top:auto`, `border-top:1px solid #E6E6E6`, 12–13px |

#### `00a Welcome`

Full-black (`#000`) screen, white text.

- Header: Temba mark (26px, reversed — white disc, black arc) + `TEMBA` in **Sora 400, 19px, `letter-spacing:0.2em`**.
- 96px down: display headline **"Find a game,/fill the court,/keep the score."** at 48px, `wdth 112, wght 700`, `letter-spacing:-0.035em`, `line-height:0.96`, hard line breaks as drawn.
- Sub-copy: "Open games near you, your regular groups, and a level that follows your results." 15px `#8E8E8E`, `max-width:300px`.
- Live-preview strip: monospace 12px eyebrow "TONIGHT, KARBABAD 9:00 PM" in `#8E8E8E`, then a 4-column grid of 66px tiles, 10px radius. Three filled tiles on `#1C1C1C` showing initials (14px `wght 600`) over a level label (11px `#8E8E8E`); the fourth is a vacant slot — `1px solid #2E2E2E` with a 45° hatch (`repeating-linear-gradient(45deg,#000 0 4px,#2E2E2E 4px 5px)`) and the label "1 open".
- Bottom stack (`margin-top:auto`, 26px padding): white **"Create account"** primary, then outlined **"Sign in"** (`#000` ground, `1px solid #2E2E2E`, hover `#1C1C1C`), then centred 12px `#8E8E8E` microcopy "By continuing you agree to the Terms and Privacy Policy." with the two links underlined in `#FFF`.

**The preview strip is decorative, not live.** Do not wire it to real Games — it is a marketing device on a signed-out screen and would leak Game data. Ship it as fixed content or drop it; say which in the ticket.

#### `00b Sign up`

- Header: Back arrow left, "Sign in" cross-link right.
- Heading "Create account". Sub-copy **"We send a six digit code to confirm your number. No password to remember."**
- Fields, 18px apart: **Full name** (`type="text"`, placeholder "Mikael Karlsson"); **Mobile number** — a split control, whole group 52px with one border: a country segment (`+973` at 16px `wght 500` + `lucide chevron-down` 15px `#9A9A9A`, `border-right:1px solid #E6E6E6`) then a flexible `type="tel"` input. On this artboard the group border is `#000` (focused state).
- Primary **"Send code"**.
- `OR` divider, then **"Continue with Apple"** and **"Continue with Google"**.
- Footer rule: 12px `#9A9A9A` "By creating an account you agree to the Terms and Privacy Policy."

**There is no email field and no password field on this screen.**

#### `00c Verify number`

- Header: Back arrow only.
- Heading "Enter the code". Sub-copy "Sent to +973 3612 4408. **Change number**" (underlined, `#000`).
- **6-cell OTP**: `grid-template-columns:repeat(6,1fr)`, 8px gap, each cell 64px tall, 12px radius. Filled cells show the digit at 26px `wdth 112, wght 700, letter-spacing:-0.02em` with a `#E6E6E6` border. The active cell has a **2px `#000`** border and a 2px × 26px black caret. Cells past the cursor are hatched (`repeating-linear-gradient(45deg,#FFF 0 4px,#E6E6E6 4px 5px)`).
- Row below: "Resend code" (13px `#6E6E6E`) left, countdown **`0:24`** right in `wdth 112, wght 700`, `#000`.
- **"Verify" shown disabled**: `#E6E6E6` ground, `#9A9A9A` text, with centred 12px helper "Button unlocks at six digits".
- Footer rule: a 20px hatched swatch + 12px `#6E6E6E` **"Codes expire after ten minutes. Three wrong tries locks the number for an hour."**

That last line is a **claim about Clerk instance policy**, not about our code. Clerk owns code lifetime and attempt limits. Either configure the instance to match or change the copy — do not ship a promise we do not control.

#### `00d Sign in`

- Header: Back arrow left, "Create account" cross-link right.
- Heading "Sign in". Sub-copy "Use the number your groups know you by."
- One **Mobile number** split control (resting `#E6E6E6` border), placeholder "3612 4408".
- Primary **"Send code"**, then a centred underlined 14px text link **"Use email instead"**.
- `OR` divider, Apple and Google.
- Footer rule, `space-between`: "Invited to a group?" (13px `#6E6E6E`) / "Open the link" (13px `wght 600`, underlined).

"Use email instead" implies a second identifier path the artboards never draw. Treat the email screen as `00d` with the phone control swapped for an email input and the same "Send code" verb, unless the design says otherwise.

### Tokens — what already exists and what is new

Cross-checked against `apps/temba/src/styles/globals.css`.

**Already shipped, use as-is** — every greyscale value in the design maps to an existing `@theme static` token:

| Design | Token |
| --- | --- |
| `#000000` | `--color-ink` |
| `#FFFFFF` | `--color-paper` |
| `#F4F4F4` | `--color-wash` |
| `#E6E6E6` | `--color-rule` |
| `#6E6E6E` | `--muted-foreground` |
| `#8E8E8E` | `--color-dim` |
| `#1C1C1C` | `--color-raised` |
| `#2E2E2E` | `--color-dimrule` |
| 12px radius | `--radius` / `rounded-lg` |
| 16px radius | `--radius-xl` |

Archivo variable with the `wdth` axis is already loaded — `apps/temba/src/app/fonts.ts` declares `axes: ["wdth"]` (ADR-0010). The `wdth 112` / `wght 700` settings the design uses are available today.

**Genuinely new, and each needs a decision:**

1. **`#9A9A9A`** — used for the `OR` label, the sign-up terms footer, the disabled Verify label, the "Button unlocks…" helper and the chevron. `globals.css` carries an explicit prohibition: *"Do not add faint (#9A9A9A) — 2.56:1 on wash."* The design uses it on white (3.05:1), which still fails WCAG AA for body text. **Recommendation**: render all of these in `--muted-foreground` (`#6E6E6E`) and accept the small contrast shift, except the genuinely non-text uses (the chevron glyph, the hatch stroke) where it is decorative. Do not add a `faint` token.
2. **48px and 32px type** — the ramp tops out at `--text-display` 36px and `--text-h1` 28px. The Welcome headline (48px) and the screen headings (32px) have no token. **Recommendation**: add `--text-hero: 3rem` and `--text-h1-lg: 2rem` to `@theme static` rather than one-off `text-[48px]` classes, since `sports-brand-system` owns the ramp.
3. **52px controls** — `Input` and `Button size="default"` are both `h-11` (44px) with `rounded-md` (10px). **Recommendation**: add a `size="auth"` variant to `button.tsx` (`h-13 rounded-lg text-base`) and a matching height/radius override on the auth inputs. Do not change the default sizes; every other surface in the App is built on 44px.
4. **Sora** — used only for the `TEMBA` wordmark. Not in `fonts.ts`. **Recommendation**: add it via `next/font/google` with a `--font-display` variable, weights 300/400 only, and use it nowhere but the wordmark.
5. **11px, 14px, 16px, 26px** type sizes have no token. Use the nearest existing (`--text-eyebrow` 12px, `--text-meta` 13px, `--text-body` 15px) unless the difference is load-bearing — the 26px OTP digit is, the 14px cross-link is not.

### Assets

The Temba mark in the design is a circular device, not the shipped `apps/temba/public/images/temba-text-logo.svg` wordmark. Two variants are used:

- `#tembaMarkReduction` — black disc, white arc `M6,50 C18,16 82,16 94,50`, stroke 6.
- `#tembaMarkReductionRev` — white disc, black arc (Welcome header, on black).

Both are trivial inline SVG. **Author them as one `apps/temba/src/components/ui/icons/temba-mark.tsx` with a `variant` prop**, following the existing `icons/temba-text-logo.tsx`. Do not import binaries for two circles and an arc. The richer `#tembaHatch` mark is not used on any auth artboard — skip it.

Lucide icons used: `arrow-left`, `chevron-down` — `lucide-react` is already a dependency.

### Desktop — the design does not cover it

There is no artboard above 390px, and today's `AuthShell` is explicitly a desktop split with a `bg-primary` brand panel carrying "Compete. Level up. Win."

**Recommendation**: centre the 390px frame on a `--color-wash` ground at every width, exactly as the canvas itself presents the artboards — `max-w-[390px] mx-auto`, frame border and 16px radius appearing only at `sm` and up, full-bleed below. It is honest to a mobile-first product and needs no invented layout.

**The cost, stated so nobody is surprised**: the desktop brand panel and its "Compete. Level up. Win." headline disappear from the auth screens. That copy survives nowhere else. If it should live on, it belongs on Welcome, and Welcome is a mobile frame too. This is a visible regression on desktop and needs sign-off (Open Questions 3).

### Auth sub-routes that must still work

With `routing="path"`, the drop-in registered sub-paths under `/login` and `/signup`. Route names confirmed by inspecting `@clerk/ui@1.16.1` `dist`: `sso-callback`, `factor-one`, `factor-two`, `verify-email-address`, `verify-phone-number`, `reset-password`, `reset-password-success`, `continue`, `verify`, `create`.

| State | Now | Phase 1 (current strategy) | Phase 2 (phone-first) |
| --- | --- | --- | --- |
| Sign-in first factor | `/login` | `/login` — `signIn.create({ identifier, password })` | `/login` — `signIn.create({ identifier: phone })` then `prepareFirstFactor({ strategy: "phone_code" })` |
| Strategy choice | `/login/factor-one` | Inline on `/login` | The "Use email instead" link |
| Second factor | `/login/factor-two` | Only if MFA is enabled | Same |
| Forgot password | `/login/reset-password` | `reset_password_email_code` → `attemptFirstFactor` → `resetPassword` | **Dissolves** — there is no password |
| Reset success | `/login/reset-password-success` | Folded into the reset step | n/a |
| OAuth handoff | `authenticateWithRedirect` | Same; `redirectUrl` = `/login/sso-callback?redirect_url=…` | Same, plus Apple |
| OAuth return | `/login/sso-callback`, `/signup/sso-callback` | One shared `AuthenticateWithRedirectCallback` component | Same |
| Sign-up code | `/signup/verify-email-address` | Email code, rendered as `00c` | `/signup/verify-phone-number` — `preparePhoneNumberVerification({ strategy: "phone_code" })` / `attemptPhoneNumberVerification` |
| OAuth missing fields | `/signup/continue` | `signUp.update()` for `missingFields` | Same, and this is where a phone or email gets collected after Apple/Google |
| Email link | `/login/verify`, `/signup/verify` | Only if email-link is enabled | Only if enabled |

Two Clerk v7 behaviours to design around, not discover in QA:

1. **`setActive` is the commit point.** Nothing redirects until `status === "complete"` and `setActive({ session: result.createdSessionId })` has resolved. Redirect with `router.replace(authCompleteUrl(redirectUrl))` after it, not before.
2. **Session tasks.** v7 exports `RedirectToTasks`, `TaskChooseOrganization`, `TaskResetPassword`, `TaskSetupMFA`. If the instance has any session task configured, a session can come back active-but-pending and our redirect would strand the User. Pass `redirectUrl` to `setActive` so Clerk can route a pending task itself, and verify against the live instance.

### The email invariant — a hard blocker for Phase 2

`packages/db/src/schema/user.ts:38`:

```ts
email: text("email").notNull().unique(),
```

and `apps/temba/src/server/auth/sync-clerk-user.ts:112`:

```ts
const primaryEmail = clerkPrimaryEmail(clerkUser);
if (!primaryEmail) {
  throw new Error("Clerk user must have an email address");
}
```

A phone-only Clerk user has no email address. The `user.created` webhook would throw, the Postgres row would never be written, and the User would authenticate into an App where they do not exist — landing in `dashboard/layout.tsx`'s `provisioning` state **forever**, because the row is never coming. This is not a soft edge case; it is the design's primary path failing closed.

It is worse than the `throw`. Three things are coupled to email in that file:

- The column is `NOT NULL UNIQUE` in Postgres, so relaxing the guard alone does not help — it needs a Drizzle migration.
- `upsertUserFromClerk` falls back to `findFirst({ where: eq(user.email, email) })` as a **secondary identity key** when `clerkId` misses. With no email there is no fallback key; `phoneNumber` would have to take that role, and it is nullable-unique today.
- `displayName()` falls back to `email` when there are no names and no username. A phone-only User with a blank name would have nothing to fall back to — though `00b` collects Full name, so this is survivable.
- The comment at line ~104 records that **Lookup invite matches username, email, and primary phone**. Making email optional changes what a Lookup invite can find.

`sync-clerk-user.test.ts` covers this module and will need extending, not rewriting.

**Options**:

- **(a) Relax to phone-or-email.** Migration makes `email` nullable, adds a `CHECK (email IS NOT NULL OR phone_number IS NOT NULL)`, and promotes `phoneNumber` to a first-class identity key in the upsert. Correct for the design; touches the most-depended-on table in the schema. Every `user.email` read site needs an audit.
- **(b) Keep email mandatory, collect it at sign-up.** Adds an email field to `00b`, contradicting the artboard and its "No password to remember" promise.
- **(c) Phone for auth, email harvested later** via an onboarding step. Defers the migration but leaves a window where the row cannot exist — which is the failure above.

**Recommendation: (a)**, as its own ticket, landed and verified *before* any phone UI is built. (c) does not actually avoid the problem.

### Accessibility

Hand-built forms mean the things the drop-in did silently are now our job:

- Every input has a real `<label>` (via `Field` / `FieldLabel`). The artboards use visible 13px labels, so this is easy — keep them.
- Field errors render through `FieldError`, wired with `aria-describedby` + `aria-invalid`.
- Global errors use `FormErrorSummary` (`role="alert"`) and receive focus on failure via `focusFormFailure`.
- Submit buttons expose `disabled` + `aria-busy` and never allow a double-submit.
- **The OTP control is the main accessibility risk.** Six visual cells must not be six inputs. Build one real `<input>` — `inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength={6}`, one accessible name — with the six cells rendered as a decorative overlay driven by its value, and the input itself transparent and full-width above them. Paste of a 6-digit code must fill it in one go. Announce the disabled Verify state via the helper text tied with `aria-describedby`, not by the visual alone.
- The **countdown** (`0:24`) must not be an `aria-live` region — a per-second announcement is hostile. Render it `aria-hidden` and give "Resend code" an accessible name that reflects availability ("Resend code, available in 24 seconds" → "Resend code").
- The **country selector** is a `<button>` opening the existing `Select` or `Popover`, with an accessible name ("Country calling code, currently Bahrain +973"). It is not a `<div>`.
- Focus moves to the new step's heading when advancing to verification, so a screen-reader user is not left on a button that no longer exists.
- `autoComplete`: `name`, `tel`, `tel-national`, `email`, `one-time-code`.
- The Welcome preview strip is decorative: `aria-hidden="true"`.

### Component inventory

**Reused from `apps/temba/src/components/ui/`**: `button` (plus a new `size="auth"`), `input`, `field` (`Field`, `FieldLabel`, `FieldError`, `FieldGroup`), `label`, `separator`, `select` or `popover` (country picker), `skeleton`, `form-error-summary`. Plus `~/lib/utils` `cn`, `lucide-react`.

`input-group.tsx` was evaluated as a host for the phone control. It is structurally right — `InputGroupAddon align="inline-start"` + `InputGroupInput` gives exactly the split-control shape, and it already handles focus-within borders and `aria-invalid` — but it is hard-coded to `h-11 min-h-11` and `rounded-md`, against the design's 52px / 12px. **Use it, with a height and radius override**, rather than authoring a second split-control primitive. Note its `InputGroupAddon` `onClick` focuses the sibling input; that must not swallow the country button's click (it already guards with `closest("button")`).

**New primitives under `components/ui/`**:

- `otp-input.tsx` — the 6-cell code control, per the accessibility note. No new dependency: `input-otp` exists only as a transitive dep of `@clerk/ui` and must not be imported.
- `icons/temba-mark.tsx` — the circular mark, `variant: "reduction" | "reversed"`.

**New under `components/auth/`**: `auth-screen.tsx` (frame), `welcome-screen.tsx`, `sign-in-form.tsx`, `sign-up-form.tsx`, `verify-code-form.tsx`, `phone-field.tsx`, `oauth-buttons.tsx`, `sso-callback.tsx`, `resend-countdown.tsx`, plus `forgot-password-form.tsx` and `second-factor-form.tsx` while passwords/MFA exist.

**New under `lib/`**: `auth-redirect.ts`, `clerk-auth-error.ts`, `resend-countdown.ts` (pure timer maths), and — Phase 2 — `phone-number.ts` (country codes, E.164 formatting). All with `.test.ts` siblings.

### Not changed

- `apps/temba/src/lib/safe-internal-redirect.ts`
- `apps/temba/src/middleware.ts` (no matcher or route-list edit expected)
- `apps/temba/src/lib/dashboard-onboarding-gate.ts`, `~/lib/onboarding-step.ts`, `app/onboarding/page.tsx`, `OnboardingQuestionnaire`
- `apps/temba/src/components/auth/auth-shell.tsx`
- `UserButton`, and therefore the `clerkAppearance` block in `app/layout.tsx`, the `@clerk/ui` dependency, and the `@clerk/ui/themes/shadcn.css` import
- Default `Button` / `Input` sizing for every non-auth surface
- Any tRPC router — this feature adds no endpoint

## Testing Decisions

The App has no component-test harness: all 63 tests are Vitest over pure modules, 30 of them `src/lib/*.test.ts`. Follow that; do not introduce Playwright or Testing Library.

**Test seams**:

- `lib/auth-redirect.test.ts` — cross-link building with and without `redirect_url`; the `/dashboard` fallback; SSO callback URL construction; a `null` value never producing a `redirect_url=` param.
- `lib/clerk-auth-error.test.ts` — `meta.paramName` splits to a field error; no paramName splits to a global message; a non-Clerk error yields the generic message; the mapped-copy table.
- `lib/resend-countdown.test.ts` — remaining-seconds maths, the `0:24` format, the availability boundary at zero.
- `lib/phone-number.test.ts` (Phase 2) — E.164 assembly, national-format display, rejection of malformed input.
- `server/auth/sync-clerk-user.test.ts` (Phase 2) — extend for the phone-only payload, the phone-as-identity-key fallback, and the "neither email nor phone" rejection.

Everything else is manual verification against a Clerk development instance, named in each ticket's criteria.

## Ticket Decomposition

Two phases. **Phase 1 is publishable once Open Questions 1–3 are answered. Phase 2 only if the phone-first strategy is approved.** Publish to Linear in this order so `blocks` relations can reference real ids. Label `ready-for-agent`.

### Phase 1 — Temba-owned auth screens on the current strategy

**1. Auth redirect and Clerk error helpers**
*What to build*: `lib/auth-redirect.ts` and `lib/clerk-auth-error.ts` with Vitest siblings. Rewire the existing `login/page.tsx` and `signup/page.tsx` cross-link template literals to use them. No visual change, drop-ins still rendering.
*Acceptance criteria*: both modules are pure and take an already-sanitised value; tests cover the listed cases; `/login` and `/signup` behave byte-for-byte as before including the cross-link query string; `safe-internal-redirect.ts` untouched; no new dependency.
*Blocked by*: —

**2. Auth design tokens and control sizing**
*What to build*: `--text-hero` and `--text-h1-lg` in `@theme static`; a `size="auth"` variant on `button.tsx`; the Sora display font in `fonts.ts` behind a `--font-display` variable; `icons/temba-mark.tsx`. Resolve the `#9A9A9A` question per the Tokens section. No screens yet.
*Acceptance criteria*: every existing surface renders unchanged — default `Button` and `Input` are still `h-11`; no `faint` colour token is added; Sora loads only for the wordmark and does not become `font-sans`; the mark renders in both variants at 26px and 34px; `pnpm exec turbo run typecheck` and `build --filter temba` pass.
*Blocked by*: 1

**3. Auth screen frame**
*What to build*: `components/auth/auth-screen.tsx` — the 390px frame, header row with optional Back arrow and cross-link, 26px gutters, `margin-top:auto` footer slot, centred on `--color-wash` at all widths per the Desktop decision. `/login` and `/signup` render the drop-ins inside it.
*Acceptance criteria*: matches the artboard chrome at 390px; full-bleed below `sm`, framed above; no horizontal scroll at 320px; `AuthShell` unmodified and `/onboarding` visually unchanged; light and dark both render; the desktop brand panel's removal is visible and signed off.
*Blocked by*: 2

**4. Welcome screen**
*What to build*: `components/auth/welcome-screen.tsx` per `00a`, mounted at whichever route Open Questions 2 settles. The preview strip is fixed decorative content, `aria-hidden`, wired to nothing. Both buttons carry `redirect_url` through `authCrossLinkUrl`.
*Acceptance criteria*: headline, sub-copy, tile grid, hatched vacant tile and button stack match the artboard; no Game, User or Venue data is fetched or rendered; "Create account" and "Sign in" preserve `redirect_url`; a signed-in visitor never sees it; the Terms and Privacy links resolve.
*Blocked by*: 3

**5. OTP code input primitive**
*What to build*: `components/ui/otp-input.tsx` — one real input, six decorative cells, per the accessibility note. Plus `components/auth/resend-countdown.tsx` and `lib/resend-countdown.ts`.
*Acceptance criteria*: keyboard entry, backspace and arrow navigation work; pasting six digits fills every cell in one action; exactly one element is focusable and it has one accessible name; the active-cell caret and hatched unfilled cells match the artboard; the countdown is not announced per second but "Resend code"'s accessible name reflects availability; `input-otp` is not added as a dependency.
*Blocked by*: 3

**6. Shared OAuth callback route**
*What to build*: `components/auth/sso-callback.tsx` wrapping `AuthenticateWithRedirectCallback`, plus `app/login/sso-callback/page.tsx` and `app/signup/sso-callback/page.tsx`, and `components/auth/oauth-buttons.tsx` for the providers the instance actually has enabled.
*Acceptance criteria*: an OAuth round trip completes the session; `redirect_url` survives it; a refused value lands on `/dashboard`; a sign-up round trip needing more fields routes to `/signup/continue`; `isAuthRoute` still bounces a signed-in visitor off these paths; only enabled providers render.
*Blocked by*: 3

**7. Custom sign-in on `/login`**
*What to build*: `sign-in-form.tsx` in the `00d` layout against the current strategy — identifier field, primary action, OAuth block, footer rule. `setActive`, then redirect via `authCompleteUrl`. Errors through `clerk-auth-error` + `FormErrorSummary`. Remove `<SignIn>` from `app/login/page.tsx`, keeping its server-component shape.
*Acceptance criteria*: sign-in reaches `/dashboard`; with `?redirect_url=/dashboard/games/x` it reaches that path; a hostile value falls back to `/dashboard`; a bad credential shows Temba copy on the right field and moves focus; the button is busy-and-disabled during the request and double-submit is impossible; the cross-link and Back arrow carry `redirect_url`; keyboard-only sign-in works end to end; `SignInButton mode="redirect"` from the header and both Invite components still land here and complete.
*Blocked by*: 6

**8. Custom sign-up on `/signup` with code verification**
*What to build*: `sign-up-form.tsx` in the `00b` layout and `verify-code-form.tsx` in the `00c` layout, reusing the OTP primitive for the **email** code under the current strategy. `app/signup/continue/page.tsx` for post-OAuth `missingFields`. Remove `<SignUp>` from `app/signup/page.tsx`.
*Acceptance criteria*: an account is created, the code step verifies, `setActive` runs, and the User lands on `redirect_url` or `/dashboard` — **not** `/onboarding`; the `dashboard/layout.tsx` gate then routes them to the questionnaire and finishing returns them to the original path; the `user.created` webhook still writes the row and `provisioning` still covers the race; an already-registered identifier shows Temba copy on the right field; a wrong code is retryable and resend works after the countdown; "Change number"/"Change email" returns to the previous step with the value intact; `redirect_url` survives create → verify → complete.
*Blocked by*: 7, 5

**9. Sign-in recovery**
*What to build*: `forgot-password-form.tsx` at `/login/reset-password`, and `second-factor-form.tsx` at `/login/factor-two` only if MFA is enabled. Skipped entirely if Phase 2 is approved and passwords are being retired.
*Acceptance criteria*: a full reset reaches `authCompleteUrl` with `redirect_url` preserved across all three steps; expired or wrong codes show Temba copy and allow retry without restarting; resend and rate-limit errors are readable; focus moves to each new step's heading.
*Blocked by*: 8

**10. Retire the drop-in surface and sweep the route shape**
*What to build*: walk every path under `/login/**` and `/signup/**` the old drop-in served; add handling or a deliberate redirect for any that now 404. Confirm what drop-in config `UserButton` still needs.
*Acceptance criteria*: `@clerk/ui` stays a dependency and `UserButton` still renders themed on `/dashboard/you` and in `app-sidebar`; the `shadcn.css` import and `clerkAppearance` block are either documented as still needed or removed with `UserButton` verified after; every sub-path in the sub-route table renders a Temba screen or redirects — none 404s; a signed-in visitor is bounced off all of them; `middleware.ts` unchanged; typecheck and build pass; no `<SignIn>` or `<SignUp>` import remains in `src/`.
*Blocked by*: 9

### Phase 2 — phone-first passwordless (only if approved)

**11. Allow email-less Users**
*What to build*: a Drizzle migration making `user.email` nullable with a `CHECK (email IS NOT NULL OR phone_number IS NOT NULL)`; `sync-clerk-user.ts` reworked to accept a phone-only payload, use `phoneNumber` as the secondary identity key when `clerkId` misses, and reject only when both identifiers are absent; `displayName()` fallback chain extended. Extend `sync-clerk-user.test.ts`. Audit every `user.email` read site, Lookup invite search included. **No UI.**
*Acceptance criteria*: the migration applies forward on a populated database and no existing row changes; a phone-only `user.created` payload writes a row; a phone-only `user.updated` for an existing row matches on phone and does not duplicate; a payload with neither identifier is rejected with a clear error; email and phone uniqueness both still hold; Lookup invite still finds Users by username, email and phone, and its behaviour for an email-less User is defined and tested; `dashboard-onboarding-gate`'s `provisioning` path is unaffected.
*Blocked by*: 10

**12. Phone number field and formatting**
*What to build*: `lib/phone-number.ts` (country list, E.164 assembly, national display) and `components/auth/phone-field.tsx` on `InputGroup` with the height and radius overrides, the country button opening the existing `Select`, per the `00b` / `00d` artboards.
*Acceptance criteria*: the control matches the artboard at 52px / 12px radius with the correct resting and focused borders; the country button is a real button with an accessible name and is keyboard-reachable; the group shows one focus ring, not two; `aria-invalid` propagates to the group border; E.164 output is correct for every listed country; malformed input is rejected before the Clerk call.
*Blocked by*: 11

**13. Phone-first sign-up and sign-in**
*What to build*: switch `sign-up-form.tsx` to `signUp.create({ phoneNumber, firstName, lastName })` → `preparePhoneNumberVerification({ strategy: "phone_code" })`, `verify-code-form.tsx` to `attemptPhoneNumberVerification`, and `sign-in-form.tsx` to `identifier: phone` + `prepareFirstFactor({ strategy: "phone_code" })`. Add the "Use email instead" branch. Retire the password field and, with it, ticket 9's reset flow. Reconcile the "ten minutes / three tries" footer copy with the instance's actual policy.
*Acceptance criteria*: a phone-only account is created end to end and its Postgres row exists before the User reaches `/dashboard`; `redirect_url` survives every step; "Use email instead" reaches a working email path; existing email/password Users can still sign in through it; the footer copy matches configured Clerk policy or has been changed to match; no password field remains; an SMS delivery failure surfaces a readable error rather than a silent hang.
*Blocked by*: 12

## Out of Scope

- `UserButton` and the `/dashboard/you` account surface — still a Clerk drop-in, deliberately
- Any change to `/onboarding`, `AuthShell`, `OnboardingQuestionnaire`, or ADR-0012's gate
- Any change to `safe-internal-redirect`, the middleware route lists or its matcher
- Wiring the Welcome preview strip to real Games — it is decorative
- A desktop-specific auth layout
- Adding `@clerk/elements`, `input-otp`, or reaching into `@clerk/ui/internal`
- MFA enrolment, passkeys, waitlist, organisations
- A component-test harness
- Any tRPC endpoint
- Artboard `01 Home` and everything after it in the canvas file

## Open Questions

### 1. The design changes the authentication strategy — the brief said not to

The artboards are **phone-first passwordless SMS OTP** with Apple and Google. There is no password field anywhere. Email appears once, as a secondary "Use email instead" link on `00d`. `00b`'s own sub-copy says "No password to remember."

The brief said "keep the same flow as now". These cannot both be honoured. Options:

- **(a) Build the design as drawn.** Adopt phone-first passwordless. Highest fidelity. Requires the schema migration (ticket 11), Clerk instance reconfiguration to enable `phone_code`, SMS delivery cost and country coverage for `+973`, and a story for every existing User whose identity is an email.
- **(b) Keep the current strategy, adopt the visual language.** Black-and-white system, 52px controls, 12px radius, the type ramp, the OTP treatment reused for the existing email code. Honours "same flow" exactly. Loses fidelity precisely where the artboards are most specific — `00b` and `00d` become screens the design never drew.
- **(c) Phased: (b) now, (a) as a separately approved feature.** Phase 1 above is (b); Phase 2 is (a).

**Recommendation: (c).** The user's own constraint governs the current change, and the identity migration is a real product decision with cost and an existing-User story — not something to infer from an artboard. Phase 1 delivers the visual ask in full and leaves every Phase 2 door open, because the frame, tokens, OTP control, countdown and OAuth block are all strategy-independent. Put (a) to the user explicitly as its own decision.

### 2. `00a Welcome` has no route today

`app/page.tsx` currently redirects: signed-in to `/dashboard`, signed-out to `/login`. Options: mount Welcome at `/` in place of the signed-out redirect; give it a new `/welcome`; or drop it.

**Recommendation: replace the signed-out redirect at `/`.** `/` already exists solely to route the signed-out visitor somewhere, Welcome is exactly that screen, and it needs no new route, no middleware change (`/` is not in `isAuthRoute` or `isProtectedRoute`) and no new entry in the sub-route sweep. The signed-in redirect to `/dashboard` stays. Confirm that nothing depends on `/` redirecting to `/login` — `Route /public` redirects to `/login` directly and is unaffected.

### 3. There is no desktop artboard

Today's `AuthShell` is a `lg:grid-cols-2` split with a brand panel carrying "Compete. Level up. Win.", which survives nowhere else in the App.

**Recommendation: centre the 390px frame at all widths** (see the Desktop section) and accept losing the panel. If that copy matters, it needs a home on Welcome — but Welcome is a mobile frame too, so that is a design request, not an implementation choice.

### 4. `user.email` is `NOT NULL UNIQUE` — Phase 2 cannot ship without a migration

Detailed under "The email invariant" above, with options (a)/(b)/(c). **Recommendation: (a)** — nullable email with a phone-or-email `CHECK`, phone promoted to a secondary identity key, landed and verified as ticket 11 before any phone UI is built. This is the single largest risk in the feature and it sits in the most-depended-on table in the schema.

### 5. `#9A9A9A` is explicitly prohibited in `globals.css`

*"Do not add faint (#9A9A9A) — 2.56:1 on wash."* The design uses it for the `OR` label, terms footers, the disabled Verify label and helper text — all real text, at 3.05:1 on white, still below WCAG AA.

**Recommendation**: render all text uses in `--muted-foreground` (`#6E6E6E`) and keep `#9A9A9A` only for the decorative chevron and hatch strokes. Do not add a `faint` token. Needs the designer's acknowledgement that these read slightly darker than drawn.

### 6. "Codes expire after ten minutes. Three wrong tries locks the number for an hour."

Code lifetime and attempt limits are Clerk instance policy, not App code. **Either configure the instance to match this copy or change the copy.** Do not ship a promise we do not control. Same for the `0:24` resend window, which must not be shorter than Clerk's own resend rate limit or the button will unlock into an error.

### 7. Which providers, strategies and policies does the Clerk instance actually have?

Still unanswered and still gating: enabled sign-in strategies (password? email code? username? phone?); **is Apple configured** — the design shows it and it needs an Apple Developer account, an unlike-Google setup; is MFA on (decides ticket 9's second half); are any v7 session tasks configured (decides whether `setActive` needs a `redirectUrl`).

### 8. What does sign-up collect, and does Clerk agree?

`00b` collects **Full name** and **Mobile number**. Clerk's instance config must have name enabled and required, phone as an identifier, and email not required — and `sync-clerk-user` reads `username`, primary email and primary phone off the webhook payload. All four have to line up before ticket 8 or 13.
