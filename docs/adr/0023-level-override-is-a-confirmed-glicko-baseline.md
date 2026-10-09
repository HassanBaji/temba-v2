# A Level override is a confirmed Glicko-2 baseline

**Status:** accepted. ADR-0022 is reserved by the in-app Notifications spec.

Some Users know a player's level better than results do, so trusted Users need to set a Level by hand. We store the set Level as a new Glicko-2 baseline: μ from the chosen Level, φ lowered to at most 150 so the Rating is confirmed, and σ kept. Rated Matches keep stepping from it. Each set is an append-only `level_overrides` row with before and after values. There is no undo; a mistake is corrected by setting again. A wrong-score reversal does not touch the Rating of a player whose Level was set after that Match: the set is their baseline.

## Considered options

1. A permanent override that ignores results. Rejected: Levels would stop moving.
2. Writing overrides into `rating_events` with a null Match. Rejected: five readers treat a rating event as a Rated Match.
3. Setting φ exactly to 200. Rejected: one idle period makes the Rating Provisional again.
4. A per-Group admin role. Rejected: the Rating is platform-wide, so a per-Group role does not limit what the set changes.
5. An undo that restores or shifts back the set. Rejected by the user: setting again is simpler, and undo after later Matches had no exact meaning.

## Consequences

Permission is a server-enforced Clerk flag, like Operator. `apply-rated-match` and the wrong-score reversal lock the `ratings` rows with `FOR UPDATE`, as a set does, so a concurrent Match complete and a set serialize. A set on a Provisional player cannot be made Provisional again by setting again.
