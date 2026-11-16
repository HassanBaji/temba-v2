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

## Padel Level recalculation

The Level recalculation replays every padel Rated Match, Place award and Level override under the Declared band rules and rewrites the stored numbers to match (ADR-0098, `.scratch/padel-declared-band-trust/spec.md`, section 9). It runs once, after the Prove-it rule is deployed and before the Level check is. Every command needs `DATABASE_URL` in the shell or in `packages/api/.env`.

```bash
pnpm --filter @repo/api db:replay-padel-ratings                                  # dry run
pnpm --filter @repo/api db:replay-padel-ratings -- --report padel-levels.csv     # dry run with the per-player CSV
pnpm --filter @repo/api db:replay-padel-ratings -- --apply                       # write it
pnpm --filter @repo/api db:replay-padel-ratings -- --apply --carry-unplaced      # write it, carrying rows that cannot be recomputed
pnpm --filter @repo/api db:replay-padel-ratings -- --restore <run id>            # write a run's backup back
```

- **Dry run** (the default). Reads in one read-only, repeatable-read transaction and writes nothing. The report names the database host; counts players, Matches, events, overrides and awards; says how each Declared band was read back; lists the largest moves, band letter changes, how many players would be told, players now outside an upcoming Game's Level range and every row placed by a stated rule (RQ-5, RQ-6, RQ-7); compares a baseline pass under the rules before the Declared band; and prints the load and compute time. It exits non-zero if the recalculation would change who is confirmed. `--report` writes one CSV row per player.
- **`--apply`**. One transaction: takes `LOCK TABLE ratings IN EXCLUSIVE MODE` (waiting at most 5 seconds for it), loads, computes, then for every padel row whose values differ copies the whole row into `rating_replay_backups` under a new `rating_replay_runs` row and writes the replayed values. It writes only the columns of spec 9.5 (never Reliability, never the Level an override set) and inserts or deletes no row in `ratings`, `rating_events`, `king_place_awards` or `level_overrides`. Reads are not blocked; a Match completing meanwhile waits and is rated on the replayed values. In the same transaction each account holder whose padel Level changes on its two-decimal face, or whose band letter changes, gets one `level_recalculated` Notification that opens Ratings. It is written as already emailed, so no Notification email goes out, and Rating history gains no line; Unclaimed and Guest players get none. It prints the same report, then the run id. It refuses, writing nothing, while the recalculation would change who is confirmed, or while the report lists rows that cannot be recomputed (RQ-7) unless `--carry-unplaced` is passed. A second apply finds no difference, writes nothing and records no run.
- **`--restore <run id>`**. Writes every backed-up row back whole and removes the run, so every table holds its bytes from before the run, except `notifications`: the players told keep their `level_recalculated` Notification. It refuses once a padel Rated Match, Level override or Place award has been written after the run, or a recalculated Rating has moved since: after that the fix is forward, not back.

### Runbook for the production run

The owner, or a developer with the production database URL, ticks these in order. The Level check (TEM-475) may not deploy before the last one.

1. The Declared band start φ, the Prove-it rule, the recalculation and the recalculation's Notification are deployed to production and their migrations have run.
2. Run the size query below against production and note the counts.
3. Run the dry run against production: `pnpm --filter @repo/api db:replay-padel-ratings -- --report replay.csv`. Note the load and compute time it prints.
4. The owner reads the report: how many players move, the largest moves up and down, who changes band, how many players would be told, the baseline pass, the anomalies. "Players crossing the confirmation line" must be 0.
5. If the report lists rows that cannot be recomputed, the owner decides whether to pass `--carry-unplaced`.
6. Take a database backup on the host.
7. At a quiet hour, apply: `pnpm --filter @repo/api db:replay-padel-ratings -- --apply`. Note the run id. If the dry run's timing was more than a few seconds, pause the API's Job queue and rating doors first. If it stops on the lock timeout, nothing was written: run it again at a quieter moment.
8. Run the dry run again. It must report no rows that would change.
9. Open a few players' Ratings screens and Rating history and check them against the report.
10. Only now may the Level check deploy. The recalculation is not run again.

```sql
select
  (select count(*) from rating_events where sport = 'padel') as padel_events,
  (select count(distinct match_id) from rating_events where sport = 'padel') as padel_rated_matches,
  (select count(distinct user_id) from rating_events where sport = 'padel') as players_who_played,
  (select count(*) from ratings where sport = 'padel') as padel_ratings,
  (select count(*) from ratings where sport = 'padel' and self_declared_at is not null) as declared,
  (select count(*) from level_overrides where sport = 'padel') as padel_overrides,
  (select count(*) from king_place_awards where sport = 'padel') as place_awards,
  (select count(*) from rating_events where sport = 'padel' and reliability_part is not null) as events_with_reliability,
  (select count(*) from user_merges where summary -> 'ratingKeptBySport' ? 'padel') as merges_that_dropped_a_padel_rating,
  (select min(created_at) from rating_events where sport = 'padel') as first_padel_event;
```

What to expect afterwards: Levels players have already seen change with no Match behind the change; opponents' histories change too; Rating history is rewritten, not appended, and the old numbers are only in the backup; Notification emails, shared Result cards and shared Standing images already sent keep the old numbers.

## Error codes

| HTTP | tRPC code           | When                                                                                                              |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 401  | `UNAUTHORIZED`      | No bearer token, an expired or malformed token, a token for a party that is not allowed, or a cookie-only request |
| 403  | `FORBIDDEN`         | Signed in but not allowed, for example a non-Operator calling Venue administration                                |
| 404  | `NOT_FOUND`         | The record does not exist or is not visible to the caller                                                         |
| 400  | `BAD_REQUEST`       | Input failed validation                                                                                           |
| 413  | `PAYLOAD_TOO_LARGE` | Body above the host's limit                                                                                       |
