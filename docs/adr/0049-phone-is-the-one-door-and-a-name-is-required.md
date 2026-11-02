# Phone is the one door, a name is required, and onboarding is a checklist

**Status:** accepted. Amends ADR-0012 and ADR-0041: the Onboarding questionnaire no longer gates Home. Amended by ADR-0050: a known number signs in with its password and the SMS code is sent only on sign-up.

Sign-up asked for a username, a phone number and a password; sign-in took a password with a phone or username; the Onboarding questionnaire then blocked Home until it was answered. Nobody was asked their name, so a new User showed up as `@handle` wherever `user.name` had nothing better.

## Decision

- **Sign in and sign up are one path: phone number, then a six-digit SMS code.** A known number is signed in. A new number continues to first name, last name and a password, then to the Profile checklist. The password is the alternative on the code screen, and the way in when SMS is unavailable; there is no password reset, because the code is the way back in. Google stays as a provider; a Google sign-up still fills whatever Clerk reports missing (name, phone, password). **Username is gone from every form.** Clerk keeps the setting, and the dashboard turns it off; the `user.username` column stays as the legacy fallback and is still matched by Lookup search.
- **First and last name are required.** Clerk requires both at sign-up. `user` gains `first_name` and `last_name`, written by the `user.created` / `user.updated` webhook sync and by `users.setName`. `user.name` stays the string every list shows: "First Last" from `@repo/domain/user-display-name`, else the username, email, phone, then "Player", exactly as before, so no existing surface changes. An account without both names sees **Add your name** on Home until it adds them; the clients update Clerk first, then call `users.setName`, so the product does not wait on the webhook.
- **The Onboarding questionnaire is one Profile task, not a gate.** `dashboard/layout.tsx` and the mobile `OnboardingGate` redirect only while the `user` row is still provisioning. Sports, Level and side are answered from the **Profile checklist**, beside "Add a profile photo" and "Add and verify your email". The checklist is the "You're in" screen after sign-up, lives at `/onboarding` (web) and `/complete-profile` (mobile), and sits under the Home header until it is complete or skipped on that device. Every task saves on its own. `users.completeOnboarding` and `onboarding_completed_at` are unchanged; they now mean "the sports task is done".

**Considered Options**: keeping sign-up and sign-in as two doors (two screens that differ by one line, and a User who does not know whether they have an account picks wrong); a `display_name` column instead of two name columns (the product needs the first name alone for greetings and seat labels); keeping the questionnaire blocking with the new tasks optional (the Level question is exactly the one a new User cannot answer well on day one, and the first Rated Match seeds it anyway); storing Skip for now on the server (it is a per-device preference, and the Add your name row is never skippable).

## Consequences

- Clerk dashboard (development and production): phone number required and used for sign-in, SMS code enabled as a first factor, password kept, name required, username off, email optional. Until that is done the forms still work but Clerk will not require a name.
- `apps/web/scripts/record-flows.ts` still signs in with a username and password and needs a phone-and-password or test-OTP sign-in.
- The Venue console (`apps/console`) still tells the viewer apart from other managers by username. A new User has none, so it says nothing about who the viewer is; it should compare Clerk ids. Follow-up.
- The design's "About you" and "When you play" tasks are not built. Nothing reads gender, date of birth, home area or availability yet.
