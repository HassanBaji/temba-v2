# Onboarding questionnaire

Status: ready-for-agent

Tickets: not yet published to Linear. Decomposition in Ticket Decomposition below; publish in that order.

Related: [user-ratings](../user-ratings/spec.md), [level-band-display](../level-band-display/spec.md), [invite-lookup-and-link](../invite-lookup-and-link/spec.md), [padel-only-ui](../padel-only-ui/spec.md), [ADR-0009](../../docs/adr/0009-glicko-2-user-ratings.md), [ADR-0012](../../docs/adr/0012-app-owned-onboarding-questionnaire.md).

## Problem Statement

A new User finishes Clerk sign-up and lands on `/dashboard` knowing nothing about them beyond a name and an email. Two facts the product already needs are missing on day one.

**Level.** `ratings.selfDeclare` ships today and is the correct seeding door — it writes μ from a Level band midpoint at φ₀ = 350, sets `selfDeclaredAt`, and is refused after the first Rated Match. But its only entry point is a CTA buried on `/dashboard/you`, a page a new User has no reason to open. A User who never finds it has no Rating row at all, so Game Level range gates show them the "Declare one on You, or request to play" refusal, Home has no Level hero, and their first Rated Match seeds them at Level 3.0 / C2 by default whether or not that is anywhere near true. The seeding door exists and is unused at the one moment it is worth the most.

**Preferred side.** Every Friendly Game seat is a **Position** — left or right on a Game team. Players have a strong, stable preference about which side they play, and today the App has no idea. The seat grid offers left and right with no default, and no other User can see which side a partner wants before the pair is set.

Nothing in the product collects either fact, and there is no App-owned moment between Clerk account creation and `/dashboard` where it could.

## Solution

Add one App-owned step at Route `/onboarding`: an **Onboarding questionnaire** of exactly two questions.

1. **Preferred Position** — left, right, or either. A new nullable column on `user`. New product concept, deliberately named off the settled **Position** term.
2. **Level** — the existing `ratings.selfDeclare` mutation, unchanged, driven from a second questionnaire step instead of the You dialog.

Clerk's `<SignUp>` is not touched: no custom fields, no `unsafeMetadata`, no change to `signup/page.tsx` or its `redirect_url` handling. The gate lives in `dashboard/layout.tsx`, which redirects a User with `onboardingCompletedAt` null to `/onboarding?redirect_url=<where they were going>`. Invite routes (`/g/{code}`, `/gr/{code}`, `/invites/**`) sit outside `/dashboard` and stay ungated, so a User who signs up from a Game Invite link still accepts that invite first and meets the questionnaire only when the accept lands them on `/dashboard/games/{id}` — which is then their `redirect_url` out of onboarding.

The questionnaire is **blocking with an escape hatch**: both questions have a no-commitment answer (**either**; **I don't know**), so no User is trapped, and there is no Skip button. Each step writes on submit, so a User who bails resumes where they left off.

Existing Users are backfilled as complete and never see the questionnaire. `/dashboard/you` gains a Preferred Position row and keeps the existing Declare Level CTA, so both answers stay editable (Level within the rules `user-ratings` already set: one declare, never after a Rated Match).

**No new rating model.** Self-declared seeding was decided in ADR-0009 and shipped. This slice moves *when* the existing door is offered. ADR-0009 is not amended. [ADR-0012](../../docs/adr/0012-app-owned-onboarding-questionnaire.md) records the placement decision (App step + Postgres completion flag, not Clerk custom fields).

Approving this spec approves the Test seams in Testing Decisions and the `CONTEXT.md` glossary additions in Glossary Additions, which ship in this planning commit.

## User Stories

### The questionnaire

1. As a User who has just created a Clerk account, I want to be taken to a two-question Onboarding questionnaire before I reach Home, so that the product knows my side and my Level from the first session.

2. As that User on step one, I want to choose **Left**, **Right**, or **Either**, so that I state which Position I like without being forced into a side I do not have.

3. As that User, I want **Either** to be a real answer and not a skip, so that "no preference" is recorded as a preference rather than as a blank.

4. As that User on step two, I want the same Level choices the You dialog offers — **D, D+, C, C+, B, B+, A** plus **I don't know** — so that onboarding and You do not ask the same question two different ways.

5. As that User, I do not want **PRO** in the picker, so that a reserved elite rung cannot be self-claimed (`level-band-display`, unchanged).

6. As that User, I want each step to save when I submit it, so that closing the tab between steps does not lose the answer I already gave.

7. As a User who closes the tab after step one and signs back in, I want to resume on step two with my Preferred Position already stored, so that I am not asked twice.

8. As a User who has answered both questions, I want the questionnaire marked complete and to be sent onward immediately, so that it never appears again.

9. As a User, I do not want a Skip button, so that "I don't know" and "Either" are the honest low-commitment answers rather than an empty profile.

10. As a User on the questionnaire, I want no other questions — no home Venue, no photo, no years-played, no club picker — so that signing up stays under a minute.

### Where it runs

11. As a User signing up with no `redirect_url`, I want to land on `/onboarding` and then on `/dashboard`, so that the default path is unchanged apart from the two questions.

12. As a User who clicked a Game Invite link at `/g/{code}` and signed up from it, I want to land back on that Game Invite page and accept it, so that the deep link I followed is not lost to onboarding.

13. As that User, once accepting redirects me into `/dashboard/games/{id}`, I want the questionnaire to appear then and return me to that Game when I finish, so that the invite and the questionnaire both complete.

14. As a User following a Community, Group, or Team Invite link, I want the same behaviour, so that every Invite door survives onboarding.

15. As a signed-out visitor opening `/onboarding` directly, I want to be sent to login, so that the route is protected like the dashboard.

16. As a User who has already completed the questionnaire and opens `/onboarding` directly, I want to be redirected to `/dashboard` (or my `redirect_url`), so that a completed questionnaire cannot be re-run.

17. As a User, I want the `redirect_url` on `/onboarding` sanitised by the existing `safeInternalRedirect`, so that onboarding is not an open-redirect door.

18. As a User whose Clerk `user.created` webhook has not landed yet, I want `/onboarding` to show a short "Setting up your account" wait state and retry, so that the first seconds after sign-up do not show an authorization error.

19. As that same User, I want the dashboard gate to send me to `/onboarding` rather than throw `UNAUTHORIZED` when my User row is missing, so that the webhook race has one place that handles it.

20. As a User, I want the Clerk `<SignUp>` component, its `signInUrl`, `forceRedirectUrl`, and `fallbackRedirectUrl` left exactly as they are, so that this slice does not change the auth surface.

### Existing Users

21. As a User who created my account before this slice shipped, I want to never see the questionnaire, so that a new wall is not put in front of people already using the App.

22. As that User, I want my Rating untouched — including still seeing the Declare Level CTA on You if I never declared — so that backfill does not seed a Level I did not choose.

23. As that User, I want my Preferred Position to stay unset until I set it, so that the App does not guess a side for me.

24. As that User, I want to set my Preferred Position on `/dashboard/you`, so that there is a door for me even though onboarding is behind me.

### Editing afterwards

25. As any User on `/dashboard/you`, I want a Preferred Position row showing my current answer (or "Not set") and letting me change it, so that a preference that changes is not frozen at signup.

26. As any User, I want Preferred Position to be freely re-editable with no once-only rule, so that it is not confused with the one-time Level declaration.

27. As a User who declared a Level in onboarding, I want the You Declare Level CTA to be gone and my Level shown instead, so that `ratings.me.canSelfDeclare` behaves exactly as `user-ratings` specified.

28. As a User who declared in onboarding and then plays, I want a second declare still refused, so that onboarding does not become a re-seeding loophole.

### Level seeding (unchanged behaviour, restated so it is not re-litigated)

29. As a User who declares **B** in onboarding, I want stored band **B3**, Level **4.55**, φ **350**, σ **0.06**, and `selfDeclaredAt` set, so that onboarding writes exactly what the You dialog writes.

30. As a User who answers **I don't know**, I want Level **3.0** / stored band **C2** / φ **350**, so that mid-ladder stays the default placement.

31. As a User who has just declared, I want to still be **Provisional**, so that a claimed Level never reads as a confirmed one (φ 350 > the 200 threshold).

32. As a User who declared far above my real ability, I want my first Rated Matches to move me a long way, so that an inflated claim is corrected fast rather than policed.

33. As a User, I want no anti-sandbagging machinery, Operator reset, or declaration review in this slice, so that the correction stays the Glicko-2 model itself.

34. As a developer, I want ADR-0009 left as written and no second seeding path invented, so that there is exactly one way a Rating is born from a declaration.

### Consuming Preferred Position

35. As a User joining a Friendly Game seat, I want the seat picker to pre-select the side matching my Preferred Position when that side is free, so that the answer I gave at signup does something.

36. As that User, I want the pre-selection always overridable and never enforced, so that Preferred Position is a default and not a rule.

37. As a User whose Preferred Position is **Either** or unset, I want no pre-selection, so that the picker behaves as it does today.

38. As a User, I do not want Preferred Position to appear on Game teams, Match history, admit rules, Level range gates, or the Lookup invite picker, so that a profile preference does not leak into Game state.

### Scope

39. As a User, I want no home Venue, favourite Community, playing frequency, hand, age, or availability question, so that the questionnaire does not grow past what a shipped surface consumes.

40. As a developer, I want no `user_profile` table, no Clerk `publicMetadata` mirror of the answers, and no service or repository layer, so that this stays two columns and three procedure files.

## Implementation Decisions

### Placement

- **App-owned step, not Clerk custom fields.** The questionnaire is Route `/onboarding` in the Temba App. `<SignUp>` gets no custom fields and no `unsafeMetadata`. Recorded as [ADR-0012](../../docs/adr/0012-app-owned-onboarding-questionnaire.md). Reasons: Preferred Position and Level are queried by the server (seat pre-selection, `ratings.me`, future matchmaking) and must not live only in Clerk; the Level question must call the existing `ratings.selfDeclare` rules, which Clerk cannot; and Clerk custom fields cannot express a two-step resumable flow.

- **The gate lives in `apps/temba/src/app/dashboard/layout.tsx`**, not in `middleware.ts`. `middleware.ts` runs on the edge runtime and cannot read Postgres; mirroring a completion flag into Clerk session claims to make the middleware gate possible would put the source of truth in two places for no gain. The layout becomes an `async` RSC that reads the caller's `user` row and `redirect()`s when `onboardingCompletedAt` is null. One indexed read per hard dashboard load; wrap the read in React `cache` so sibling RSCs on the same request share it.

- **`middleware.ts` changes are minimal.** Add `/onboarding(.*)` to `isProtectedRoute`. Do **not** add it to `isAuthRoute` (that would bounce signed-in Users straight back off it). Set a request header (`x-temba-pathname`, via `NextResponse.next({ request: { headers } })`) carrying `req.nextUrl.pathname` plus search, so the dashboard layout can build the `redirect_url`. Webhook and design-preview branches are unchanged.

- **Invite routes stay ungated.** `/g/{code}`, `/gr/{code}`, and `/invites/**` are outside `/dashboard` and get no gate. `accept-invite-flow.tsx` and `accept-game-invite-link.tsx` are **not modified**. A User arriving from an Invite link accepts first; the accept's `router.replace("/dashboard/...")` hits the gate, which carries that path through as `redirect_url`. This is the reason the gate is in the dashboard layout rather than a broad matcher: the invite must be accepted while its token is still live, and a broad gate would put a questionnaire between the User and a 6-hour token.

- **Route `/onboarding` reads `redirect_url` through `safeInternalRedirect`** (`~/lib/safe-internal-redirect`, shipped) and falls back to `/dashboard`. Do not write a second sanitiser.

### Data

- **Two columns on `user`** (DB Package, one Drizzle Kit migration):
  - `preferred_position` — new pgEnum `user_preferred_position` with values `left`, `right`, `either`. Nullable; null means unanswered.
  - `onboarding_completed_at` — `timestamp`, nullable; non-null means the questionnaire is done.

- **Do not reuse `game_position`.** That enum is `["left","right"]`, is Game-scoped, and gains a third value only for this. A separate enum keeps Position and Preferred Position from drifting into one type.

- **No `user_profile` table.** Two nullable columns on a row every door already loads beats a join for two fields. If a third and fourth profile question ever arrive with real consumers, that is the moment to reconsider — not now.

- **Not sport-keyed.** Left/right facing the net is padel/tennis shape and has no football analogue, so unlike `ratings` there is nothing to key. If a football surface ever needs a preference it is a different question and a different column. Noted rather than pre-built, matching `padel-only-ui`'s stance.

- **Backfill in the migration**: `update "user" set onboarding_completed_at = created_at where onboarding_completed_at is null`. Every existing User is complete on deploy; `preferred_position` stays null for all of them. No Rating rows are written by the backfill.

- **Nothing in Clerk metadata.** `sync-clerk-user.ts` is untouched — it must not clear or set either new column on `user.updated`, so verify the explicit `.set({...})` list stays as it is.

### API

Three new procedure files under `apps/temba/src/server/api/routers/users/`, each holding its own validation, authorization, rules, and database work, per `.cursor/rules/api-one-endpoint-per-file.mdc`. **No `server/users/<verb>.ts` twins. No service, repository, or use-case layer. No shared "onboarding" module** — nothing here is used by two hosts.

- `onboardingState.ts` → `users.onboardingState`. Query. Returns `{ preferredPosition, onboardingCompletedAt, canSelfDeclare, hasRating }` for the caller. Must tolerate a missing `user` row for the clerkId (webhook race) by returning a `provisioning: true` shape rather than throwing — so this procedure calls Drizzle directly on `ctx.userId` instead of `resolveAppUser`.
- `setPreferredPosition.ts` → `users.setPreferredPosition`. Mutation, input `{ preferredPosition: "left" | "right" | "either" }`. Writes the column. Idempotent, re-callable, not once-only. Used by both the questionnaire and the You row.
- `completeOnboarding.ts` → `users.completeOnboarding`. Mutation, no input. Refuses with `PRECONDITION_FAILED` when `preferredPosition` is null or the caller has no padel `ratings` row; otherwise sets `onboardingCompletedAt` if still null and returns. Idempotent.

- **`ratings.selfDeclare` is unchanged** — same file, same input, same rules, same errors. The questionnaire is a second caller of a shipped door, which is exactly the shared-glossary-module case the API rule allows. Do not fork a "declare during onboarding" variant, and do not relax the already-declared / already-rated refusals for onboarding.

- `usersRouter` in `routers/users/index.ts` composes the three new procedures alongside `home`. Composition only.

### UI

- **Route `/onboarding`** at `apps/temba/src/app/onboarding/page.tsx`, outside `/dashboard` and outside `DashboardShell` (no tab bar during onboarding). Reuse `AuthShell` if it fits the two-step layout; otherwise a plain centred container using existing layout primitives. Two steps with a "Step 1 of 2" affordance, Back on step two, no Skip.

- **Step one** is a radio group of Left / Right / Either, styled like the existing `DeclareLevelDialog` choice grid.

- **Step two** reuses `ASSIGNABLE_DISPLAY_LEVEL_BANDS` and `selfDeclareChoiceFromDisplay` from `~/lib/level-bands` — the single display-map module `level-band-display` established. Do not copy the label table into the onboarding page. If the choice grid is worth sharing between `DeclareLevelDialog` and the onboarding step, extract the **grid**, not a second map.

- **Resume** is derived from `users.onboardingState`: `preferredPosition` null → step one; set but `hasRating` false → step two; both present → call `completeOnboarding` and redirect.

- **You** (`/dashboard/you`) gains a Preferred Position `ListRow` in the existing `RowList`, showing `Left` / `Right` / `Either` / `Not set`, opening a small `ResponsiveDialog` that calls `users.setPreferredPosition`. `YouRatingSection` and the Declare Level CTA are unchanged.

- **Seat pre-selection** (`friendly-game-join-sheet.tsx` / `game-seat-grid.tsx`): when the caller's Preferred Position is `left` or `right` and that Position is free on the chosen side, pre-select it. Never auto-submit, never hide the other seat, never refuse a mismatched pick. `either`, unset, or an occupied seat → today's behaviour exactly. This ships in this batch (ticket 6): it is what makes Preferred Position do something on day one rather than sit stored and unread until matchmaking arrives.

### Not changed

`signup/page.tsx`, `login/page.tsx`, `AuthShell`, `api/webhooks/route.ts`, `sync-clerk-user.ts`, `resolve-app-user.ts`, `ratings/*`, `level-bands.ts`'s map, Glicko-2, Level, Level band, Provisional, hysteresis, Game Level range, Game admit, Invite doors, Position on `game_team_players`.

## Glossary Additions

**Applied to root `CONTEXT.md` in this planning commit.** The name `Preferred Position` is settled.

**Preferred Position** sits immediately after **Position** (so the pair reads together), and **Onboarding questionnaire** after **User**. The existing **Position** entry gains a reciprocal `_Avoid_` pointer back at Preferred Position.

**Preferred Position**:
A User's standing preference for Left or right, or Either. A default for the Game seat picker, not a Position itself.
_Avoid_: Position (that is the per-Game-team seat), side, hand, preferred side

**Onboarding questionnaire**:
The two questions a new User answers at Route `/onboarding` after Clerk sign-up and before Home: Preferred Position, and a one-time Level declaration. Blocking, with **Either** and **I don't know** as the low-commitment answers. Users who predate it are complete without answering.
_Avoid_: signup flow (that is Clerk's), profile setup, wizard, survey, onboarding (bare, when you mean this entity), Lookup invite

## Testing Decisions

### What a good test is

Assert product behaviour and the rows it persists on the existing Vitest + PGLite seams. Do not add a runner, CI, or E2E harness. Do not re-test Glicko-2, hysteresis, the display map, or `selfDeclare`'s refusals — `user-ratings` and `level-band-display` own those, and this slice must not change them. Do not write a test whose only purpose is that a procedure lives in its own file.

### Test seams

Highest seam: a new User finishes Clerk sign-up, is sent to `/onboarding`, answers Left/Right/Either and a Level band, lands on the page they were originally headed for, and never sees the questionnaire again — while an existing User never sees it at all and a Game Invite deep link still accepts.

If you implement this spec, you implement these seams:

- Migration: new columns exist; every pre-existing `user` row has `onboarding_completed_at` set and `preferred_position` null; no `ratings` rows created
- `users.onboardingState`: unanswered → step-one shape; position set, no Rating → step-two shape; both → complete; missing `user` row for the clerkId → `provisioning`, not a throw
- `users.setPreferredPosition`: writes each of `left` / `right` / `either`; re-callable; rejects any other value
- `users.completeOnboarding`: refused with no Preferred Position; refused with no padel Rating; sets the timestamp once; a second call is a no-op, not an error
- Onboarding step two calls existing `ratings.selfDeclare` and produces the same μ/φ/σ/band as the You dialog for the same choice (B → B3 / 4.55 / 350)
- "I don't know" → 3.0 / C2 / 350; the User is Provisional immediately after declaring
- Declare in onboarding then declare again on You → still refused
- Dashboard gate: incomplete User hitting `/dashboard/games/{id}` is redirected to `/onboarding?redirect_url=/dashboard/games/{id}` and returns there on finish
- Dashboard gate: complete User is not redirected; `/onboarding` opened by a complete User redirects out
- `redirect_url` of `//evil.com`, `/a\b`, or an `@` string is rejected by `safeInternalRedirect` and falls back to `/dashboard`
- Signed-out request to `/onboarding` goes to login
- Game Invite link accept still works for a signed-up, un-onboarded User (invite routes ungated)
- `sync-clerk-user` on `user.updated` does not clear `preferred_position` or `onboarding_completed_at`
- You: Preferred Position row shows `Not set` for a backfilled User, writes on save, and re-editing is allowed
- Seat picker: `left` pre-selects a free left seat; occupied left seat, `either`, and unset all leave today's behaviour; a mismatched manual pick is still accepted
- Preferred Position appears on no Game card, Match history row, admit check, or Level range gate

Prior art: `apps/temba/src/server/ratings/level.test.ts`, `apps/temba/src/lib/level-bands.test.ts`, `apps/temba/src/server/api/routers/users/home.test.ts`, and the PGLite helpers in `~/server/test/pglite`.

## Ticket Decomposition

Vertical slices, dependency order. Publish to Linear in this order so `blocks` relations can reference real ids. Label `ready-for-agent`.

**1. Preferred Position and onboarding completion on the User** — TEM-186
*What to build*: DB Package — pgEnum `user_preferred_position` (`left`, `right`, `either`); nullable `user.preferred_position` and `user.onboarding_completed_at`; one Drizzle Kit migration that backfills `onboarding_completed_at = created_at` for existing rows. Export from the schema index. No UI, no API.
*Acceptance criteria*: migration applies forward on a populated database; every pre-existing User is complete with a null Preferred Position; no `ratings` row is written; `sync-clerk-user` upserts still round-trip without touching either column.
*Blocked by*: —

**2. Onboarding state and write doors** — TEM-187
*What to build*: `users.onboardingState`, `users.setPreferredPosition`, `users.completeOnboarding` — one procedure per file under `routers/users/`, logic in the file, composed in `index.ts`. `onboardingState` tolerates a missing `user` row.
*Acceptance criteria*: the four `onboardingState` shapes; `setPreferredPosition` accepts the three values and is re-callable; `completeOnboarding` refuses without a Preferred Position or without a padel Rating and is idempotent; `ratings.selfDeclare` is byte-for-byte unchanged; no `server/users/<verb>.ts` file is added; no service or repository layer.
*Blocked by*: 1

**3. Route `/onboarding` runs the questionnaire** — TEM-188
*What to build*: `app/onboarding/page.tsx` — two steps (Preferred Position, then Level), resume from `users.onboardingState`, `redirect_url` through `safeInternalRedirect`, a provisioning wait state for the webhook race. Add `/onboarding(.*)` to `isProtectedRoute` in `middleware.ts`. Level choices come from `~/lib/level-bands`; step two calls existing `ratings.selfDeclare`.
*Acceptance criteria*: both steps save on submit and resume correctly; no Skip button; PRO absent; a complete User opening `/onboarding` is redirected out; a signed-out visitor goes to login; a hostile `redirect_url` falls back to `/dashboard`; no second label table.
*Blocked by*: 2

**4. Dashboard sends un-onboarded Users to the questionnaire** — TEM-191
*What to build*: `middleware.ts` sets an `x-temba-pathname` request header; `dashboard/layout.tsx` becomes an async RSC that reads the caller's onboarding state (React-`cache`d) and redirects to `/onboarding?redirect_url=<path>` when incomplete or when the `user` row is missing.
*Acceptance criteria*: incomplete User on any `/dashboard/**` path is redirected and returns to that exact path on finish; complete User is never redirected; a Game Invite link accepted by an un-onboarded User still succeeds and its `/dashboard/games/{id}` landing carries through as `redirect_url`; invite components are unmodified; the webhook race no longer surfaces as `UNAUTHORIZED`.
*Blocked by*: 3

**5. You shows and edits Preferred Position** — TEM-189
*What to build*: a Preferred Position `ListRow` on `/dashboard/you` with a `ResponsiveDialog` editor calling `users.setPreferredPosition`.
*Acceptance criteria*: shows `Left` / `Right` / `Either` / `Not set`; saves and re-saves; `YouRatingSection` and the Declare Level CTA are unchanged; a backfilled existing User can set a Preferred Position without ever seeing `/onboarding`.
*Blocked by*: 2

**6. Game seat picker defaults to Preferred Position** — TEM-190
*What to build*: pre-select the matching free seat in the Friendly Game join / seat surfaces from the caller's Preferred Position.
*Acceptance criteria*: `left` pre-selects a free left seat and `right` a free right one; occupied seat, `either`, and unset leave current behaviour; the pick is always overridable; nothing is auto-submitted; admit rules, Level range gates, and Game team state are untouched.
*Blocked by*: 2

## Out of Scope

- Clerk custom sign-up fields, `unsafeMetadata`, or any change to `signup/page.tsx` / `login/page.tsx` / `AuthShell`
- Any change to Glicko-2, μ/φ/σ, Level, Level band, the display map, hysteresis, Provisional, or ADR-0009
- A second seeding path, a wider or narrower φ for declared Levels, or a non-Provisional declared Rating
- Anti-sandbagging machinery, declaration review, Operator rating reset, smurf detection
- Re-onboarding or re-prompting existing Users; any Rating written by backfill
- Home Venue, favourite Community, playing frequency, dominant hand, age, availability, or any third question
- A `user_profile` table, a Clerk metadata mirror, or a service / repository / use-case layer
- `server/users/<verb>.ts` twins or an "onboarding" shared module
- Fallback provisioning of the `user` row from `currentUser()` when the webhook is late (the wait state covers it; a real fix is its own slice)
- Showing Preferred Position to other Users, on Game cards, in the Lookup invite picker, or in Match history
- Matchmaking, partner suggestion, or Game team auto-assignment from Preferred Position
- Football or any sport-keyed preference
- Middleware DB access, Node-runtime middleware, or Clerk session-claim customisation
- Analytics, funnel instrumentation, E2E harness, or CI beyond existing Vitest

## Settled Decisions

Three calls were put to the user and answered. Recorded here so they are not reopened; all three are folded into the body above.

1. **The name is `Preferred Position`.** It leans on the settled **Position** term so the relationship reads, and the `_Avoid_` lines on both entries carry the distinction. `Preferred side` and `Side preference` were rejected: they cannot be confused with a seat, but they also do not signal that the preference is about Positions. Applied to `CONTEXT.md` in this planning commit.

2. **Blocking, not dismissible.** The dashboard is gated until both questions are answered. Both have a zero-commitment answer (**Either**, **I don't know**), so nobody is trapped. A dismissible Home prompt was rejected: it cannot depress signup completion, but it leaves the long tail of Users with no Rating, which is the problem this slice exists to fix. Reversible in one ticket if completion data says otherwise.

3. **Ticket 6 ships in this batch.** Seat pre-selection is what makes Preferred Position do something on day one. Splitting it out would leave the answer stored and unread until matchmaking arrives.

## Further Notes

- **Why no new ADR for seeding.** The brief asked whether a self-declared Level should seed μ with a wider φ or sit beside a Provisional Rating. Inspection settled it: `ratings.selfDeclare` already seeds μ from the band midpoint at φ = φ₀ = 350, which is the widest φ the model has — there is nothing to widen. Because the Provisional threshold is φ > 200, a declared User is Provisional the moment they declare, so a declaration never reads as a confirmed Level. ADR-0009 anticipated this exactly; the questionnaire changes the entry point, not the model.

- **How a wrong declaration corrects.** φ = 350 means the first Rated Matches produce the largest step Glicko-2 will make, so an inflated or deflated claim is pulled toward reality within a handful of Matches, and Provisional stays visible while it happens. Self-declare is one-time and refused after any Rated Match, so a declaration cannot be used to reset after a bad run. The exposure is one Game: a User who declares D to slip under a `Game Level range` gate gets one Game before their Rating climbs out of it. That is judged acceptable for v1 and is why no anti-abuse machinery is specified.

- **Why the gate is not in middleware.** `clerkMiddleware` runs on the edge runtime; the Drizzle Postgres client is not available there. The only way to gate in middleware is a completion flag mirrored into Clerk session claims, which duplicates the source of truth and needs Clerk token customisation. The dashboard layout can read Postgres directly and already wraps every gated page.

- **Why invite routes are not gated.** Invite link tokens expire 6 hours after mint. Putting a questionnaire between a User and a live token risks the token expiring mid-onboarding. Accepting first and questioning second costs nothing, because the accept always lands the User inside `/dashboard`, where the gate is.

- **Rejected questionnaire items, and why.** Home Venue (no consumer — Directory is unshipped and pickup has no Venue filter); favourite Community or Group (Directory unshipped; joining is Invite-door-driven); profile photo (Clerk's `openUserProfile` already owns it on You); playing frequency, years played, dominant hand, age, availability (no shipped surface reads them). Preferred Position passes the same test only because the seat picker consumes it — see ticket 6.

- **Known limitation.** A User who declares a Level in onboarding and immediately regrets it has no undo, because `selfDeclare` is one-time by `user-ratings` design. Onboarding makes that irreversible choice at the least-informed moment in a User's life on the platform. Mitigated by "I don't know" being a first-class answer, and by φ = 350 making the declaration cheap to correct through play. If this proves painful, the fix is a re-declare window in `user-ratings`, not a special case here.
