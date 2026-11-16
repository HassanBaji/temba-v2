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

## Operator directory

The Operator check reads the session's public metadata. To find every Operator (the Match dispute Notification), procedures read `user.is_operator`, which the Clerk webhook copies from `public_metadata.operator` on every `user.created` and `user.updated` (ADR-0081).

**One-time step after the `0119_user_is_operator` migration deploys.** Operators granted before it have the column false until Clerk next sends a `user.updated` for them. Run the backfill once against each environment, with that environment's `CLERK_SECRET_KEY` and `DATABASE_URL` in the shell or in `packages/api/.env`:

```bash
pnpm --filter @repo/api db:backfill-operators
```

It pages through every Clerk User and writes what Clerk says now, so it is safe to rerun, for example after a webhook outage.

## Padel Level recalculation: dry run

The dry run replays every padel Rated Match, Place award and Level override under the Declared band rules and reports per player what their Level would become (`.scratch/padel-declared-band-trust/spec.md`, section 9). It reads in one read-only, repeatable-read transaction and writes nothing. With `DATABASE_URL` in the shell or in `packages/api/.env`:

```bash
pnpm --filter @repo/api db:replay-padel-ratings
pnpm --filter @repo/api db:replay-padel-ratings -- --report padel-levels.csv
```

The report names the database host; counts players, Matches, events, overrides and awards; says how each Declared band was read back; lists the largest moves, band letter changes, players now outside an upcoming Game's Level range and every row placed by a stated rule (RQ-5, RQ-6, RQ-7); compares a baseline pass under the rules before the Declared band; and prints the load and compute time. It exits non-zero if the recalculation would change who is confirmed. `--report` writes one CSV row per player.

## Error codes

| HTTP | tRPC code           | When                                                                                                              |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 401  | `UNAUTHORIZED`      | No bearer token, an expired or malformed token, a token for a party that is not allowed, or a cookie-only request |
| 403  | `FORBIDDEN`         | Signed in but not allowed, for example a non-Operator calling Venue administration                                |
| 404  | `NOT_FOUND`         | The record does not exist or is not visible to the caller                                                         |
| 400  | `BAD_REQUEST`       | Input failed validation                                                                                           |
| 413  | `PAYLOAD_TOO_LARGE` | Body above the host's limit                                                                                       |
