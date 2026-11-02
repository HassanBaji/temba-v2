# Sign-in is phone and password; the SMS code is sent only on sign-up

**Status:** accepted. Amends ADR-0049: a known number no longer receives a code.

ADR-0049 made the phone number the one door and sent a six-digit SMS code to every number, known or new, with the password as the alternative on the code screen. Every sign-in therefore cost an SMS, and a User with a password still waited for a text.

## Decision

- **A known number signs in with its password.** After the number, `signIn.create({ identifier })` succeeds and the door goes to a password step: `attemptFirstFactor({ strategy: "password" })`, then the second factor if Clerk asks for one. No code is sent and there is no "code instead" link. An account Clerk offers no password factor for is told to sign in with Google.
- **A new number is the only one that gets a code.** `form_identifier_not_found` switches to a sign-up on the same number: `preparePhoneNumberVerification({ strategy: "phone_code" })`, the code, then first and last name, then a new password, as before.
- The web `/login` form and the mobile sign-in screen share this step order: phone, then password (sign-in) or code, name, new password (sign-up). Back from any step returns to the number.

**Considered Options**: phone and password on one screen (the sign-up branch is discovered only after the number is checked, so a new User would be typing a password into a sign-in form); keeping the code as a sign-in fallback behind a link (every sign-in would still be one tap from an SMS, which is what this decision removes).

## Consequences

- There is still no password reset. ADR-0049 said the code was the way back in; that is no longer true for a known number, so a User who forgets their password has no self-serve way in. A reset flow would send a code, which this decision reserves for sign-up; that is a product call to make separately.
- The Clerk dashboard must keep the password enabled as a first factor. The SMS code stays enabled for sign-up verification.
- `apps/web/scripts/record-flows.ts` is unchanged: it already signs in with a password.
