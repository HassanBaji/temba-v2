# Graphile Worker on Postgres is the job queue

**Status:** accepted.

Background work (payment charges and polls, hold expiry, refunds, Booking Notifications, the reconcile safety net) runs as Jobs on Graphile Worker, backed by the existing Postgres. The worker boots inside `apps/api` behind `WORKER_ENABLED` (default `true`); `API_ENABLED=false` runs the same image as a worker-only Railway service. Handlers live in `@repo/api` (`packages/api/src/jobs/`); the host holds only the worker boot, the env flags and the `pg` Pool, so ADR-0021 still holds.

`enqueue`, `enqueueAt` and `removeJob` issue `graphile_worker.add_job` and `remove_job` through the caller's Drizzle transaction, so a Job exists only if the transaction commits. The worker installs and upgrades the `graphile_worker` schema itself at boot (`runMigrations`); `drizzle-kit` is limited to the `public` schema so `db:generate` never diffs it.

## Considered options

1. pg-boss. Rejected: enqueueing inside a Drizzle (postgres.js) transaction needs a queue instance or adapter in the shared modules, and it polls where Graphile listens. Its built-in dead-letter queue is the feature given up.
2. BullMQ. Rejected: needs Redis, a new Railway service and a second failure domain.

## Consequences

- No dead-letter queue. A Job that exhausts `max_attempts` stays in `graphile_worker.jobs` with `last_error`; the handler wrapper logs `job_failed` (name, key, error) on the final attempt, and operators reschedule with `graphile_worker.reschedule_jobs`.
- A payload that fails its schema cannot be fixed by retrying, so the wrapper logs `job_failed` as permanent and completes the Job instead of throwing.
- Handlers throw only for retryable conditions. A definitive answer is recorded on the domain row and the handler returns.
- Tests: PGlite has no `graphile_worker` schema. `enqueue` writes through a `JobSink`; tests install `RecordingJobSink` with `setJobSink`. Handlers are plain `handle(db, payload, helpers)` functions called directly. The SQL path is checked once by hand against local Postgres: boot the API, run `begin; select graphile_worker.add_job('booking.reconcile', '{}'::json, job_key := 'manual'); rollback;` and confirm `graphile_worker.jobs` has no row.
