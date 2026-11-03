# A forgotten password is reset with an SMS code

**Status:** accepted. Amends ADR-0050: the SMS code is also sent on "Forgot password?".

ADR-0050 made a known number sign in with its password and reserved the six-digit SMS code for sign-up. It left a User who forgot their password with no self-serve way back in and named that a product call to make separately. This is that call.

## Decision

- **"Forgot password?" sits on the password step, beside "Change number".** It is a step inside the one door, not a page of its own: the number is already known from `signIn.create`, so nothing is typed again.
- **The reset is a code, then a new password.** `prepareFirstFactor({ strategy: "reset_password_phone_code", phoneNumberId })` texts the code to the number Clerk lists among the sign-in's first factors. `attemptFirstFactor` with the code moves the sign-in to `needs_new_password`; `resetPassword({ password, signOutOfOtherSessions: true })` saves the new password and signs the User in, through the second factor if Clerk asks for one. The new-password step uses the same field, minimum length and strength meter as sign-up.
- **Other devices are signed out.** A reset is most often made because the old password may be known to someone else, so every other session ends with it. The step says so.
- **Back from the code returns to the password step; Back from the new password returns to the number.** The code is spent once verified, as on sign-up.
- The web `/login` form and the mobile sign-in screen share these steps.

**Considered Options**: a separate `/login/reset-password` page (a second place to type the number, and the retired Clerk route of that name already redirects to `/login`); letting the code sign the User in without a new password (that is the code-as-sign-in ADR-0050 removed, and leaves the forgotten password in place); keeping other sessions signed in (the one case where a reset is for security would then do nothing for it).

## Consequences

- ADR-0050's "there is still no password reset" no longer holds. Every sign-in is still free of SMS; only sign-up and a reset send a code.
- The Clerk dashboard must keep the SMS code enabled for password reset as well as sign-up verification; the password stays the first factor.
- An account with a password but no reset factor (none today, since the phone number is required) sees the generic error on "Forgot password?" and can sign in with Google.
