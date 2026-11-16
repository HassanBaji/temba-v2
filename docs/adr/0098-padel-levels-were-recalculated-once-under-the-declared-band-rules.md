# Padel Levels were recalculated once under the declared-band rules

**Status:** accepted. Spec: `.scratch/padel-declared-band-trust/spec.md`, section 9. Amends [ADR-0070](./0070-a-padel-level-weighs-the-partner-and-reads-from-one.md) ("New Matches only"): this is the one replay.

ADR-0096 made a padel declaration set the starting φ, and ADR-0097 made a declared C or above lose more at its own level until confirmed. Both apply only from their deploy, so every existing player would keep a Level built under the old rules beside new players built under the new ones. The owner chose to bring existing players in line with a full replay of history.

## Decision

- **Every padel Rating is recomputed from the start, once**, as if ADR-0096 and ADR-0097 had always been in force, and the stored numbers are rewritten to match: each player's μ, φ, σ, band, `last_rated_at` and recovered Declared band, and the before and after of every padel Rated Match, Place award and Level override row.
- **Today's formula for every Match**, including Matches rated before ADR-0070. Older formulas are not applied by date. The report's baseline pass (φ 350, no Prove-it rule) says how much of each move comes from the formula reaching old Matches and how much from the new rules.
- **The ledger is the input.** A Match is replayed if and only if it has padel `rating_events` rows today. Each player starts from the Declared band read back from the first row of their history. Where the ledger does not hold enough, a stated rule applies and the report lists the row: a start μ that is no band midpoint is kept and its band becomes the Declared band (RQ-5); a seat whose history an Unclaimed player merge deleted plays as a Guest player (RQ-6); a row that cannot be recomputed is carried over by its stored move (RQ-7), and the apply needs `--carry-unplaced` to proceed. The Reliability loss factor of an event older than ADR-0097 is derived once from `reliability_part` and stored.
- **Kept as they were**: which Matches counted, who won, every Game, Match, Set and Standing, who is confirmed, Reliability, every football Rating and Group Tier, and the Level each Level override set (μ and band; its φ is re-capped from the replayed φ).
- **Closed Seasons are re-read.** Their By level tables and Most improved are derived from the ledger on every read and nothing was stored at close, so they follow the recalculated values. Places and points never read a Level.
- **One transaction under a table lock.** The apply takes `LOCK TABLE ratings IN EXCLUSIVE MODE` before it reads, so every rating writer waits and is then rated on the recalculated values; reads are not blocked. It writes only rows whose values differ, copying each one whole into `rating_replay_backups` under a `rating_replay_runs` row first. A second run finds no difference and records nothing. `--restore <run id>` writes the backup back and refuses once anything has rated on top of the run.
- **It runs once**, after the Prove-it rule deploys and before the Level check does. It is not run again: the engine does not replay a Level check.

**Considered Options**: leaving existing players under the old rules (two populations on one scale); a φ-only backfill from the Declared band (the owner chose the full replay knowing it was not the planner's recommendation); applying older formulas by date (the Workspace does not hold the date ADR-0070 reached production); a resumable, batched replay (Glicko-2 is sequential, so a half-applied replay matches neither rule set, and it would have to block rating writes for its whole length anyway); appending a "recalculated" line to Rating history instead of rewriting it (every later line would still read the old moves); a snapshot of closed Seasons' levels (nothing reads one today, and the owner accepted that they change).

## Consequences

- Levels players have already seen change with no Match behind the change, and players whose own rules did not change move too, because everyone they played did.
- Rating history is rewritten, not appended: every past Match line shows the recalculated move, and the old numbers are only in the backup.
- Notification emails, shared Result cards and shared Standing images already sent keep the old numbers.
- Rating writes wait while the apply runs; the dry run's load and compute time is the lower bound for the lock.
- The backup can be written back only until the next padel Rated Match, Level override or Place award.
