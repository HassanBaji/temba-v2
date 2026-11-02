# Onboarding redesign: one phone door, a required name, an optional profile

Status: implemented on branch claude/temba-onboarding-redesign-9fb0e2; Clerk dashboard steps pending

Design: `Temba Sports Community App (15).zip` → `Sign up flow v2.dc.html` (rows `00` sign in / sign up and `01` complete profile) and `Home screen.dc.html` (the "Complete your profile" card). Authoritative for copy and layout.

Related: [custom-auth-screens](../custom-auth-screens/spec.md), [onboarding-questionnaire](../onboarding-questionnaire/spec.md), [ADR-0012](../../docs/adr/0012-app-owned-onboarding-questionnaire.md), [ADR-0041](../../docs/adr/0041-onboarding-asks-which-sports-a-user-plays.md), [ADR-0049](../../docs/adr/0049-phone-is-the-one-door-and-a-name-is-required.md).

## Problem

Sign-up asks for a username, a phone number and a password; sign-in is password-only with a phone or username. Nobody is asked their name, so a new User reaches Home as `@handle` and every list in the product shows whatever the webhook could scrape together. The Onboarding questionnaire (sports, Level, side) then blocks Home until it is answered, which is the wrong moment for a question the User can defer.

## Solution

1. **Sign in and sign up are one path.** Phone number → six-digit SMS code. A known number is signed in and lands on Home (or its `redirect_url`). A new number continues to **first name and last name**, then **a password**, then "You're in" with the profile checklist. Google stays as a provider. Username is gone from every form.
2. **First and last name are required.** Clerk requires them at sign-up (dashboard setting, human step). The `user` row gains `first_name` and `last_name`; `name` stays the display string, "First Last", falling back to the username (then email, phone, "Player") exactly as today, so every existing list keeps working. An existing User with no first or last name sees **Add your name** on Home until they add it.
3. **The questionnaire is optional.** Nothing gates `/dashboard` or the mobile tabs any more except the webhook race (`provisioning`). The questions move into one **Profile task**, "Pick your sports and level", in a **Profile checklist** with "Add a profile photo" and "Add and verify your email". The checklist is the "You're in" screen after sign-up, lives at Route `/onboarding` on web and `/complete-profile` on mobile, and sits under the Home header until every task is done or the User taps **Skip for now** (which collapses it to a one-line "Profile 2 of 5 · Show" chip on that device). Each task saves on its own and returns to the list.

Out of scope, deliberately: the design's "About you" (gender, date of birth, home area, nationality) and "When you play" (availability, seat alerts) tasks. Nothing in the product reads those fields yet; adding columns nobody consumes is a separate decision. Apple is drawn but not configured on the Clerk instance; Google is the only provider shipped.

## Flow contract

### Routes

| Web | Mobile | Screen |
| --- | --- | --- |
| `/` (signed out) | `/welcome` | Welcome: "Continue with phone", Google, terms microcopy |
| `/login` | `/sign-in` | Phone → code → (new number) name → password |
| `/signup` | — | Redirects to `/login` keeping `redirect_url` (Invite buttons still point here) |
| `/login/factor-two` | `/factor-two` | Second factor, unchanged |
| `/signup/continue` | `/continue` | OAuth sign-up missing requirements: first name, last name, phone, password. No username field |
| `/onboarding` | `/complete-profile` | Profile checklist. `?fresh=1` (mobile) / arrival from sign-up (web) shows the "You're in, {first name}." header |
| `/onboarding/name` | `/complete-profile/name` | First and last name |
| `/onboarding/photo` | `/complete-profile/photo` | Profile photo |
| `/onboarding/email` | `/complete-profile/email` | Email + code |
| `/onboarding/sports` | `/complete-profile/sports` | The questionnaire (sports, padel, football), ending back on the list |

`/login/reset-password` and `/reset-password` are removed: the SMS code is the way back in, and the password is the alternative on the code screen ("Sign in with password instead") for a known number.

### Clerk calls

Unified door, in order:

1. `signIn.create({ identifier: e164 })`. Success → `prepareFirstFactor({ strategy: "phone_code", phoneNumberId })` from `supportedFirstFactors`, then `attemptFirstFactor({ strategy: "phone_code", code })` → `setActive` → `redirect_url ?? /dashboard`. "Sign in with password instead" → `attemptFirstFactor({ strategy: "password", password })`. `needs_second_factor` → factor-two.
2. `form_identifier_not_found` → `signUp.create({ phoneNumber: e164, legalAccepted: true })` → `preparePhoneNumberVerification({ strategy: "phone_code" })` → `attemptPhoneNumberVerification({ code })` → `signUp.update({ firstName, lastName })` → `signUp.update({ password })` → `complete` → `setActive` → the checklist.

The web `/onboarding` keeps the `redirect_url` through every task so "Later, show me games" lands where the User was going. The dashboard gate (`dashboard-onboarding-gate.ts`) now redirects only while `provisioning`; `onboardingCompletedAt` no longer gates anything.

### Name

- Sign-up writes first and last name into Clerk; the `user.created` webhook copies them to `user.first_name` / `user.last_name` and builds `name`.
- `users.setName({ firstName, lastName })` writes the three columns for the caller. The clients call Clerk `user.update({ firstName, lastName })` first, then this door, so both sides agree before the `user.updated` webhook lands.
- The checklist reads `hasName` from the Clerk user (first and last both non-empty), the same source the header uses.

### Profile checklist (`@repo/domain/profile-checklist`)

Pure: `profileChecklist({ hasName, hasPhoto, hasVerifiedEmail, sportsDone })` returns `{ done, total, tasks }` where `tasks` are `name` (only when missing), `photo`, `email`, `sports`, each `{ id, title, description, done }`. `total` counts the two things done at sign-up (name, phone) plus the optional tasks, as the design's "2 OF 7" does. `name` is never dismissible: Skip for now hides the optional rows, never the name row.

### Removals

- Username field and identifier mode in every form, plus `IdentifierMode` and `resolveSignInIdentifier` helpers.
- `TermsConsent` checkbox: consent is the design's microcopy ("By continuing you confirm you are 16 or older and agree to the Terms and Privacy Policy") with `legalAccepted: true` on create.
- Forgot-password screens on both Apps.
- The blocking questionnaire render in `OnboardingGate` and the dashboard layout.

Lookup search still matches `username` server-side (legacy handles; API changes are additive only). Client placeholder copy says "Name or phone number".

## Human steps (Clerk dashboard, development then production)

1. User & authentication → Phone number: required, used for sign-in, verify at sign-up. Email: optional. **Username: off.** Name: required (first and last).
2. Sign-in options: enable **SMS verification code** as a first factor; keep Password enabled.
3. Legal: if "require express consent" is on, keep it; the forms send `legalAccepted: true`.
4. Google stays. Apple is not configured; the Welcome screen shows only Google until it is.

## Follow-ups (not in this branch)

- "About you" and "When you play" tasks (schema, screens, and the features that read them).
- `apps/console` staff view still compares managers to the viewer by username; new Users have none, so it says nothing about who the viewer is. Compare by Clerk id instead.
- `apps/web/scripts/record-flows.ts` signs in with a username and password.
