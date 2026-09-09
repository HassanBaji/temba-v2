# Custom sign-in and sign-up screens

Status: blocked-on-design (everything except the visual breakdown is ready-for-agent)

Tickets: not yet published to Linear. Decomposition in Ticket Decomposition below; publish in that order once the design section is filled in and the Open Questions are answered.

Related: [onboarding-questionnaire](../onboarding-questionnaire/spec.md), [sports-brand-system](../sports-brand-system/spec.md), [redesign](../redesign/spec.md), [ADR-0010](../../docs/adr/0010-archivo-variable-font.md), [ADR-0012](../../docs/adr/0012-app-owned-onboarding-questionnaire.md).

## Problem Statement

`/login` and `/signup` render Clerk's prebuilt `<SignIn>` / `<SignUp>` drop-ins inside `AuthShell`. The drop-in is themed — `@clerk/ui/themes` `shadcn` plus a `variables` block in `app/layout.tsx`, and `@clerk/ui/themes/shadcn.css` imported at the top of `globals.css` — but it is still Clerk's markup, Clerk's layout, Clerk's copy and Clerk's component vocabulary. It cannot be made to match the Temba auth artboards, it does not use `components/ui/`, and it is the only surface in the App whose look is owned by a vendor.

The two screens are also the product's front door: they are the first thing a User invited by an Invite link sees, and they are the entry to the App-owned Onboarding questionnaire (ADR-0012).

We want Temba-owned components and design on those two screens. Clerk stays the identity provider. **The flow does not change** — same routes, same redirect semantics, same middleware behaviour, same hand-off into `/onboarding`.

## Solution

Replace `<SignIn>` and `<SignUp>` with hand-built Temba forms driven by Clerk's `useSignIn` / `useSignUp` hooks, and take ownership of the auth sub-routes the drop-in used to serve under `/login/**` and `/signup/**`.

`/login` and `/signup` stay server components that resolve `redirect_url` exactly as today; each renders a new client form component instead of the drop-in. `AuthShell` is left alone for `/onboarding`; the new screens get their own chrome.

Everything a signed-out User can reach — password sign-in, OAuth, email-code verification, forgot-password and reset, second factor — is rebuilt on Temba components before the drop-in is removed.

## The flow contract (must not change)

This is the part of the system that is **not** being redesigned. Any ticket that breaks a line here is wrong.

### Routes

- `/login` is the sign-in door. `/signup` is the sign-up door.
- Both accept `?redirect_url=<internal path>`.
- Both sanitise it through `~/lib/safe-internal-redirect` (`apps/temba/src/lib/safe-internal-redirect.ts`): relative paths only, no `//`, no `\`, no `@`. A refused value becomes `null`, never an error.
- Each screen cross-links to the other **carrying the sanitised `redirect_url`** (`/signup?redirect_url=…` and `/login?redirect_url=…`).

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

**Decision**: build the forms on `useSignIn`, `useSignUp` and `useClerk().setActive` from `@clerk/nextjs`, plus `AuthenticateWithRedirectCallback` for the OAuth return.

Verified against the installed tree:

- `@clerk/nextjs` 7.5.2 exports `useSignIn`, `useSignUp`, `useClerk`, `useAuth`, `useUser`, `AuthenticateWithRedirectCallback`, `isClerkAPIResponseError`, `isClerkRuntimeError` (re-exported from `@clerk/react` 6.9.1). These are the stable, documented public surface.
- `@clerk/ui` 1.16.1 describes itself in its own `package.json` as *"Internal package that contains the UI components for the Clerk frontend SDKs"*. Its subpaths are `.`, `./no-rhc`, `./entry`, `./internal`, `./themes`, `./themes/experimental`, `./themes/shadcn.css`, `./register`. It is the prebuilt component chunk the drop-ins lazy-load — **not** a composable primitive library. The only piece the App legitimately consumes is `./themes` (already used) and `./themes/shadcn.css` (already imported). Reaching into `./internal` or `./entry` would couple Temba to Clerk's private API across minor versions.
- `@clerk/elements` — Clerk's actual composable primitives package — is **not installed** and is a separate beta line. Adding it would introduce a new library where a shipped one already solves the problem, which `.cursor/rules/project-standard.mdc` forbids.

**Trade-off, stated plainly**: the hooks give total markup control and zero new dependencies, at the cost of the App now owning every auth sub-state Clerk used to render for free — verification, second factor, password reset, OAuth callback, and the error vocabulary. That ownership cost is the bulk of this spec and the reason the ticket set is seven slices rather than two.

### Errors

Clerk failures arrive as `ClerkAPIError[]` on `err.errors`, each with `code`, `message`, `longMessage`, and `meta.paramName` naming the offending field. Narrow with `isClerkAPIResponseError`; anything else is an unexpected failure and gets a generic message.

Add `apps/temba/src/lib/clerk-auth-error.ts` mirroring the shape of the shipped `apps/temba/src/lib/form-mutation-error.ts` — same `SplitFormError` idea, same function names — so the forms read like every other form in the App:

- `splitClerkAuthError(err): { fieldErrors: Record<string, string>; globalMessage: string | null }` — keyed by `meta.paramName` (`identifier`, `password`, `email_address`, `code`, …), falling back to a global message.
- `clerkFieldErrorMessage(err, field)`, `clerkGlobalErrorMessage(err)`.
- Reuse the existing `focusFormFailure` contract: focus the first errored input by element id, else focus the summary.

Codes that need Temba copy rather than Clerk's raw `longMessage` (final list to be confirmed against the design): `form_identifier_not_found`, `form_password_incorrect`, `form_identifier_exists`, `form_code_incorrect`, `verification_expired`, `form_password_pwned`, `session_exists`, `too_many_requests` / rate limiting.

Surface global errors through the existing `FormErrorSummary` (`apps/temba/src/components/ui/form-error-summary.tsx`) — it already has `role="alert"`, `tabIndex={-1}` and a focus ring, which is exactly the accessibility behaviour these hand-built forms need.

### Redirect threading

Every branch has to carry `redirect_url`, including the ones that leave the tab (OAuth) and the ones that come back on a different path (verification, reset). Put it in one pure, tested module rather than reconstructing query strings in five components.

Add `apps/temba/src/lib/auth-redirect.ts`:

- `authCrossLinkUrl(target: "/login" | "/signup", redirectUrl: string | null): string` — the cross-link, replacing the inline template literals now in both page files.
- `authCompleteUrl(redirectUrl: string | null): string` — `redirectUrl ?? "/dashboard"`; the single definition of the fallback.
- `ssoCallbackUrl(base: "/login" | "/signup", redirectUrl: string | null): string` — the `redirectUrl` passed to `authenticateWithRedirect`, i.e. the sub-route the OAuth provider returns to, with `redirect_url` preserved on it.

All three take an **already-sanitised** value. Sanitising stays in the server components, at the boundary, exactly as it is today.

### Auth chrome — fork, do not mutate `AuthShell`

`apps/temba/src/components/auth/auth-shell.tsx` is used by `/login`, `/signup` **and** `/onboarding`.

**Decision**: the new design lands as a new component (working name `apps/temba/src/components/auth/auth-screen.tsx`) used only by `/login` and `/signup`. `AuthShell` stays exactly as-is and keeps serving `/onboarding`.

Why: the brief and the artboards cover sign-in and sign-up only. Onboarding is a different surface with a different job — it runs *after* authentication, it is a two-step questionnaire, and its layout was settled under ADR-0012. Reskinning it as a side effect of an auth-visual change would be an unreviewed product change on a gated flow. Converging the two shells later is a deliberate follow-up, not a freebie.

If the artboards turn out to specify chrome that is visibly identical to `AuthShell`'s, collapse the two in a follow-up rather than widening this ticket set.

### Auth sub-routes that must still work

With `routing="path"`, the drop-in registered sub-paths under `/login` and `/signup`. Route names confirmed by inspecting `@clerk/ui@1.16.1` `dist`:

`sso-callback`, `factor-one`, `factor-two`, `verify-email-address`, `verify-phone-number`, `reset-password`, `reset-password-success`, `continue`, `verify`, `create`.

The custom implementation must cover every state behind those, whether or not it keeps the same URL:

| State | Where it lives now | Custom implementation |
| --- | --- | --- |
| Sign-in first factor (password) | `/login` | `/login` — `signIn.create({ identifier, password })` |
| Sign-in strategy choice | `/login/factor-one` | Inline on `/login` if the design shows one strategy; a step otherwise |
| Second factor (TOTP / SMS) | `/login/factor-two` | `/login/factor-two` — `prepareSecondFactor` / `attemptSecondFactor`. **Only required if MFA is enabled on the instance — see Open Questions** |
| Forgot password | `/login/reset-password` | `/login/reset-password` — `signIn.create({ strategy: "reset_password_email_code" })`, then `attemptFirstFactor`, then `resetPassword` |
| Reset success | `/login/reset-password-success` | Folded into the reset step; do not add a route for a confirmation line |
| OAuth handoff | `signIn.authenticateWithRedirect` | Same call; `redirectUrl` = `/login/sso-callback?redirect_url=…` |
| OAuth return | `/login/sso-callback`, `/signup/sso-callback` | One shared client component rendering `<AuthenticateWithRedirectCallback>` with the right continue/complete URLs |
| Sign-up email code | `/signup/verify-email-address` | `/signup/verify-email-address` — `prepareEmailAddressVerification` / `attemptEmailAddressVerification` |
| Sign-up phone code | `/signup/verify-phone-number` | Only if phone sign-up is enabled — see Open Questions |
| OAuth sign-up missing fields | `/signup/continue` | `/signup/continue` — `signUp.update()` for whatever `missingFields` / `unverifiedFields` reports |
| Email link | `/login/verify`, `/signup/verify` | Only if email-link is an enabled strategy — see Open Questions |

Two Clerk v7 behaviours to design around, not discover in QA:

1. **`setActive` is the commit point.** Nothing redirects until `status === "complete"` and `setActive({ session: result.createdSessionId })` has resolved. Redirect with `router.replace(authCompleteUrl(redirectUrl))` after it, not before.
2. **Session tasks.** v7 exports `RedirectToTasks`, `TaskChooseOrganization`, `TaskResetPassword`, `TaskSetupMFA`. If the instance has any session task configured, a session can come back active-but-pending and our redirect would strand the User. Pass `redirectUrl` to `setActive` so Clerk can route a pending task itself, and verify against the live instance.

### Accessibility

These are hand-built forms now, so the things the drop-in did silently become our job:

- Every input has a real `<label>` (via `Field` / `FieldLabel`) — placeholder-as-label is not acceptable, whatever the artboard shows.
- Field errors render through `FieldError` and are wired with `aria-describedby` + `aria-invalid`.
- The global error uses `FormErrorSummary` (`role="alert"`) and receives focus on failure via `focusFormFailure`.
- Submit buttons expose a busy state (`disabled` + `aria-busy`) and never let a double-submit through — Clerk will reject the second attempt with a confusing code.
- The verification code input is a single labelled field with `inputMode="numeric"` and `autoComplete="one-time-code"`. Do not build a six-box splitter unless the design demands it; if it does, it still needs one accessible name and paste support.
- `autoComplete` set correctly throughout: `username`/`email`, `current-password`, `new-password`, `given-name`, `family-name`.
- Password reveal, if the design has one, is a `<button type="button">` inside `InputGroup` with `aria-pressed` and an accessible name that changes.
- Focus moves to the new step's heading when the form advances to verification / second factor, so a screen-reader user is not left on a button that no longer exists.

### Component inventory

**Reused from `apps/temba/src/components/ui/`** — no new primitives: `button`, `input`, `input-group` (`InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupInput`) for the password reveal, `field` (`Field`, `FieldLabel`, `FieldError`, `FieldGroup`), `label`, `checkbox`, `separator`, `card`, `skeleton`, `form-error-summary`, `icons/temba-text-logo`. Plus `~/lib/utils` `cn`, `~/lib/page-layout` `pageGutterX`, `lucide-react` for icons, `sonner` only if the design calls for a toast.

**New, all under `apps/temba/src/components/auth/`**:

- `auth-screen.tsx` — the new chrome (replaces `AuthShell` on these two routes only)
- `sign-in-form.tsx` — first factor, OAuth buttons, cross-link
- `sign-up-form.tsx` — account creation, OAuth buttons, cross-link
- `verify-email-code-form.tsx` — the sign-up code step
- `forgot-password-form.tsx` — request code, verify, set new password
- `second-factor-form.tsx` — only if MFA is enabled
- `oauth-buttons.tsx` — shared by sign-in and sign-up; provider list driven by the design
- `sso-callback.tsx` — shared `AuthenticateWithRedirectCallback` wrapper

**New under `apps/temba/src/lib/`**: `auth-redirect.ts`, `clerk-auth-error.ts` (both pure, both with `.test.ts` siblings).

### Design breakdown — BLOCKED

**The design canvas could not be read in this planning session.** The `DesignSync` tool is not present in this session's tool set (confirmed by three `ToolSearch` queries; only Linear, `WebFetch`/`WebSearch`, `Monitor`, `SendMessage`, `TaskStop`, `ExitWorktree`, `NotebookEdit` are available). No `.dc.html` exists anywhere in the Workspace, and `Artifact action:"list"` with `scope:"all"` returns nothing.

So this section is a placeholder. **Do not start ticket 2 or later until it is filled in.** What it must contain, per artboard:

- Layout at mobile / `md` / `lg`, including whether the split brand panel survives
- The exact field set on each screen and their order
- Whether OAuth buttons appear, which providers, above or below the divider
- Copy: headings, sub-copy, labels, placeholders, button text, cross-link text, legal/terms line
- Error, empty, loading and disabled states
- The verification-code step's treatment
- Forgot-password entry point and screen
- Type ramp, spacing and colour, resolved against `apps/temba/src/styles/globals.css` tokens and `docs/adr/0010-archivo-variable-font.md`. Where the artboards are silent, the shipped design system wins — do not invent tokens.

**Assets**: the repo already ships `apps/temba/public/images/temba-text-logo.svg` and its React wrapper `apps/temba/src/components/ui/icons/temba-text-logo.tsx`. If the artboards use the lockup, mark, or app icon from the design project's `uploads/`, those SVGs come into `apps/temba/public/images/` and, if they need to be inlined or recoloured, get a wrapper under `apps/temba/src/components/ui/icons/` following the existing one. List the exact files here once the design is readable.

### Not changed

- `apps/temba/src/lib/safe-internal-redirect.ts`
- `apps/temba/src/middleware.ts` (no matcher or route-list edit is expected; if a ticket wants one, that is a signal something is wrong)
- `apps/temba/src/lib/dashboard-onboarding-gate.ts`, `apps/temba/src/lib/onboarding-step.ts`, `apps/temba/src/app/onboarding/page.tsx`, `OnboardingQuestionnaire`
- `apps/temba/src/server/auth/sync-clerk-user.ts` and its webhook route
- `apps/temba/src/components/auth/auth-shell.tsx`
- `UserButton`, and therefore the `clerkAppearance` block in `app/layout.tsx`, the `@clerk/ui` dependency, and the `@clerk/ui/themes/shadcn.css` import in `globals.css`
- Any tRPC router — this feature adds no endpoint

## Testing Decisions

The App has no component-test harness: all 63 tests are Vitest over pure modules, 30 of them `src/lib/*.test.ts`. Follow that, do not introduce Playwright or Testing Library for this.

**Test seams** (pure, unit-tested):

- `lib/auth-redirect.test.ts` — cross-link building with and without `redirect_url`; the `/dashboard` fallback; SSO callback URL construction; that a `null` (already-refused) value never produces a `redirect_url=` param.
- `lib/clerk-auth-error.test.ts` — a `ClerkAPIError[]` with `meta.paramName` splits to a field error; one without splits to a global message; a non-Clerk error yields the generic message; the mapped-copy table.

**Manual verification** is the acceptance gate for the flows themselves, against a Clerk development instance, and every ticket's criteria below name the walk-through. There is no automated coverage of Clerk's network calls and this spec does not add a mock layer for them.

## Ticket Decomposition

Vertical slices, dependency order. Publish to Linear in this order so `blocks` relations can reference real ids. Label `ready-for-agent`.

**1. Auth redirect and Clerk error helpers**
*What to build*: `apps/temba/src/lib/auth-redirect.ts` and `apps/temba/src/lib/clerk-auth-error.ts` with Vitest siblings. Rewire the existing `login/page.tsx` and `signup/page.tsx` cross-link template literals to use `authCrossLinkUrl` / `authCompleteUrl`. No visual change, drop-ins still rendering.
*Acceptance criteria*: both modules are pure and take an already-sanitised redirect value; tests cover the cases listed under Testing Decisions; `/login` and `/signup` behave byte-for-byte as before, including the cross-link query string; `safe-internal-redirect.ts` is untouched; no new dependency.
*Blocked by*: —

**2. Auth screen chrome**
*What to build*: `apps/temba/src/components/auth/auth-screen.tsx` per the artboards, built from `components/ui/` and `globals.css` tokens. Any brand SVG the design needs, added under `apps/temba/public/images/` (plus an icon wrapper if it must be inlined). `/login` and `/signup` render the drop-ins inside the new chrome; `/onboarding` still renders `AuthShell`.
*Acceptance criteria*: matches the artboards at mobile, `md` and `lg`; no new colour, radius, shadow or type token; `AuthShell` is unmodified and `/onboarding` is visually unchanged; light and dark both render; no horizontal scroll at 320px.
*Blocked by*: 1. **Also blocked on the design section being filled in.**

**3. Shared OAuth callback route**
*What to build*: `apps/temba/src/components/auth/sso-callback.tsx` wrapping `AuthenticateWithRedirectCallback`, plus `app/login/sso-callback/page.tsx` and `app/signup/sso-callback/page.tsx`. Both read and sanitise `redirect_url` and pass the right continue / complete URLs. Rendered inside `AuthScreen` with a loading state.
*Acceptance criteria*: an OAuth round trip started by hand lands back on the callback and completes the session; `redirect_url` survives the round trip and is honoured; a refused `redirect_url` lands on `/dashboard`; a sign-up round trip that needs more fields routes to `/signup/continue` rather than erroring; middleware's `isAuthRoute` still bounces an already-signed-in visitor off these paths.
*Blocked by*: 2

**4. Custom sign-in on `/login`**
*What to build*: `sign-in-form.tsx` — identifier + password on `useSignIn`, `setActive`, redirect via `authCompleteUrl`; OAuth buttons via `authenticateWithRedirect` if the design shows them; errors through `clerk-auth-error` + `FormErrorSummary`; the accessibility list above. Remove `<SignIn>` from `app/login/page.tsx`; the page stays a server component and keeps its `searchParams` / sanitise / cross-link shape.
*Acceptance criteria*: password sign-in reaches `/dashboard`; with `?redirect_url=/dashboard/games/x` it reaches that path instead; a hostile `redirect_url` falls back to `/dashboard`; a wrong password shows Temba copy on the password field and moves focus there; an unknown identifier shows a global message and focuses the summary; the submit button is busy-and-disabled during the request and a double-submit is impossible; the cross-link to `/signup` carries `redirect_url`; keyboard-only sign-in works end to end; `SignInButton mode="redirect"` from the header and both Invite components still land here and still complete.
*Blocked by*: 3

**5. Sign-in recovery: forgot password and second factor**
*What to build*: `forgot-password-form.tsx` at `/login/reset-password` (request code → verify code → set new password → `setActive` → redirect), and `second-factor-form.tsx` at `/login/factor-two` **only if MFA is enabled on the instance**. Entry point to forgot-password placed per the design.
*Acceptance criteria*: a full reset from `/login` reaches `authCompleteUrl` with `redirect_url` preserved across all three steps; an expired or wrong code shows Temba copy and lets the User retry without restarting; a resend is available and rate-limit errors are readable; focus moves to each new step's heading; if MFA is not enabled, this ticket ships the reset flow only and records that in the spec.
*Blocked by*: 4

**6. Custom sign-up on `/signup` with email verification**
*What to build*: `sign-up-form.tsx` on `useSignUp` with the design's field set, OAuth buttons, and the terms line if present; `verify-email-code-form.tsx` at `/signup/verify-email-address`; `app/signup/continue/page.tsx` handling `missingFields` / `unverifiedFields` after OAuth. Remove `<SignUp>` from `app/signup/page.tsx`, keeping its server-component shape.
*Acceptance criteria*: a new account is created, the code step verifies, `setActive` runs, and the User lands on `redirect_url` or `/dashboard` — **not** on `/onboarding`; the `dashboard/layout.tsx` gate then sends the incomplete User to `/onboarding?redirect_url=…` and finishing returns them to the original path; the `user.created` webhook still writes the row via `sync-clerk-user` and the `provisioning` wait state still covers the race; an already-registered email shows Temba copy on the email field; a wrong code is retryable and a resend exists; `redirect_url` survives create → verify → complete; the cross-link to `/login` carries it; an Invite-link User who signs up still reaches the Invite's `/dashboard/**` landing.
*Blocked by*: 5

**7. Retire the drop-in surface and sweep the route shape**
*What to build*: remove any now-dead drop-in configuration that `UserButton` does not need, confirm what must stay, and walk every path under `/login/**` and `/signup/**` that the old drop-in served. Add explicit handling or a deliberate redirect for any that now 404. Update `AGENTS.md` / `CONTEXT.md` only if a term genuinely changed.
*Acceptance criteria*: `@clerk/ui` stays a dependency and `UserButton` still renders themed on `/dashboard/you` and in `app-sidebar`; the `@clerk/ui/themes/shadcn.css` import and the `clerkAppearance` block are either still needed (documented) or removed with `UserButton` verified after; every sub-path in the sub-route table either renders a Temba screen or redirects to `/login` / `/signup` — none 404s; a signed-in visitor is bounced off every one of them by `isAuthRoute`; `middleware.ts` is unchanged; `pnpm exec turbo run typecheck` and `pnpm exec turbo run build --filter temba` pass; no `<SignIn>` or `<SignUp>` import remains in `src/`.
*Blocked by*: 6

## Out of Scope

- `UserButton` and the `/dashboard/you` account surface — still a Clerk drop-in, deliberately
- Any change to `/onboarding`, `AuthShell`, `OnboardingQuestionnaire`, or ADR-0012's gate
- Any change to `safe-internal-redirect`, the middleware route lists or its matcher
- The `user.created` / `user.updated` webhook and `sync-clerk-user`
- Adding `@clerk/elements`, or reaching into `@clerk/ui/internal` or `@clerk/ui/entry`
- New auth strategies, new OAuth providers, MFA enrolment, passkeys, or waitlist — this feature reskins what the instance already offers, it does not extend it
- A component-test harness (Testing Library / Playwright)
- Organisations, `OrganizationSwitcher`, session tasks beyond not breaking them
- Any tRPC endpoint

## Open Questions

These need a decision before ticket 2 starts. Several can only be answered from the Clerk Dashboard or the artboards.

1. **The design itself.** `DesignSync` was unavailable this session. The Design breakdown section is empty and tickets 2 onward are blocked on it.
2. **Which sign-in strategies are enabled on the Clerk instance?** Password? Email code? Email link? Username as identifier? Phone? The sub-route table has three conditional rows hanging on this, and the sign-in form's field set depends on it.
3. **Which OAuth providers, if any?** Determines `oauth-buttons.tsx` and whether ticket 3 is on the critical path at all.
4. **Is MFA enabled?** Determines whether `/login/factor-two` is built in ticket 5 or dropped.
5. **Are any Clerk v7 session tasks configured?** If so, `setActive` needs a `redirectUrl` and the post-auth redirect has a branch the current drop-in was handling invisibly.
6. **What does sign-up actually collect?** First/last name, username, terms acceptance — Clerk instance config and the artboard must agree, and `sync-clerk-user` already reads `username`, primary email and primary phone off the webhook payload.
7. **Does the design cover the non-happy screens** — verification, forgot-password, reset, SSO callback loading, error states? If not, they follow the shipped design system and that decision should be recorded here rather than left to each implementer.
8. **Does the artboard chrome differ from `AuthShell`?** If it is effectively the same, the fork decision above should be revisited before ticket 2 rather than after.
