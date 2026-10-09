# @repo/api

tRPC routers, procedures and shared server modules. The Package is host-neutral: the host App (`apps/api`) verifies the session and passes `{ userId, getPublicMetadata }` into the context.

## Token contract

Both the Web App and the Mobile App authenticate the same way.

- **Header.** `Authorization: Bearer <Clerk session token>`. The Web App takes the token from Clerk's `getToken()`; the Mobile App takes it from the Clerk Expo SDK. Cookies are ignored. Setting `ACCEPT_SESSION_COOKIE=true` on the API re-enables the Clerk `__session` cookie for one release as a rollback; leave it `false`.
- **Lifetime.** A Clerk session token lives about 60 seconds. Clients ask `getToken()` before every request and never store the token themselves.
- **Refresh.** The API never refreshes a token. The Clerk SDK in the client mints a fresh one from the long-lived client session. A client that gets `UNAUTHORIZED` calls `getToken()` once more and retries once; if that also fails, the session has ended and the client signs out.
- **Authorized parties.** A token that carries an `azp` claim must match `WEB_ORIGIN` or one of the comma-separated `AUTHORIZED_PARTIES`. Tokens without `azp` (the Expo SDK) pass.
- **Verification.** `CLERK_JWT_KEY` (optional) verifies tokens without a network call. Without it, `@clerk/backend` fetches the instance's JWKS.
- **Public metadata.** `ctx.getPublicMetadata()` calls Clerk at most once per request, and only when a procedure asks (the Operator check).

## Error codes

| HTTP | tRPC code           | When                                                                                                              |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 401  | `UNAUTHORIZED`      | No bearer token, an expired or malformed token, a token for a party that is not allowed, or a cookie-only request |
| 403  | `FORBIDDEN`         | Signed in but not allowed, for example a non-Operator calling Venue administration                                |
| 404  | `NOT_FOUND`         | The record does not exist or is not visible to the caller                                                         |
| 400  | `BAD_REQUEST`       | Input failed validation                                                                                           |
| 413  | `PAYLOAD_TOO_LARGE` | Body above the host's limit                                                                                       |
