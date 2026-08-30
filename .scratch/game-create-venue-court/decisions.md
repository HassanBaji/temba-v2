# Game create Venue and Court — settled decisions

Status: spec published — `.scratch/game-create-venue-court/spec.md` (ready-for-agent). Tickets: TEM-91, TEM-92, TEM-93. Frontier TEM-91.

## Settled (round 1)

1. **App format picker later.** App Create Game stays Friendly game only. Americano / Friendly tournament multi-Court UI waits until the format picker returns.
2. **Venue required; Court optional.** Skip Court is allowed even when Venue is locked.
3. **Game-Court rows** for Americano / Friendly tournament (schema + tRPC), unique `(gameId, courtId)`, all Courts on one Venue.
4. **Americano create** still inserts zero Matches; Courts on the Game are stored for later generation. Generation out of scope.
5. **Exactly one Venue per Game**, required (not optional). Mixed-Venue Courts refused. Changing Venue on the form clears Court.
6. **Club Group with no Venue link** sees all live Operator Venues (unlocked). Overrides games-matches story 32 “no link → no Court.”
7. **Club Group with a live Venue link:** Venue default and locked; Court still optional.
8. **Loose Group / groupless:** unlocked live catalog; any Court on the selected Venue; skip Court allowed.
9. **After create:** Friendly game Game home gets a Match Court editor; `updateMatch` may set Court on Friendly game. No post-create Game Venue / Game-Court editor.
10. **Soft-archived linked Venue:** locked, shown as Soft-archived; Court dropdown empty; skip Court only; do not unlock another Venue.
11. **UI:** Venue Select; Friendly Court Select with None; multi-select later with the format picker. Existing primitives; no new library.
12. **Display:** Game home shows Venue name; Match lines keep Court name; Home / pickup / Group cards stay thin.
13. **Persist `venueId` on Game** (required after round 2). Unlink Community Venue later does not rewrite existing Games.
14. **Venue with zero Courts** selectable; skip Court.
15. **Out of scope:** Operator catalog, Venue link flow, Americano generation, football, requiring Court, Directory of Venues, who may create Games, coach FKs, post-create Venue/pool editor.

## Settled (round 2)

16. **Ship schema + tRPC now** for Game-Court rows even though App multi-select is later. Friendly: optional `courtId` on the one Match, no Game-Court row. Americano / tournament: optional `courtIds`. App: required Venue Select, optional one Court, no Format select.
17. **Game.venueId is the source of truth** for assignable Courts for the life of the Game. Community Venue link only defaults/locks at create. Soft-archived Game Venue: refuse new Court assign; allow skip/clear.
18. **New Game-create picker query**, not the Community claim catalog. Any User who may create that Game. Unlocked: live Venues including zero Courts. Locked: that linked Venue only (including Soft-archived).
19. **Empty unlocked catalog:** create refused. Locked Soft-archived Venue still allowed with skip Court.
20. **Venue Select label:** `name — city, country`.
21. **friendly-only-ui remainder stays on that spec.** This slice only adds Venue/Court and must not reintroduce a Format select. (On current `dev`, Format select is already gone.)
22. **Friendly Game home Court list:** all Courts on Game.venueId (live) plus None. Create-time Court is initial Match.courtId, not a one-item list on the Game.
23. **Change Venue before submit** clears Court. Locked Venue cannot change.
24. **Copy** as spec stories 17–20.
25. **`venueId` immutable** after create (same as format, public, registration mode).
26. **Column NOT NULL**, restrict on Venue delete. No sentinel Venue. Backfill leftover Games from Club Group live Venue link when present; otherwise a live Venue if one exists; fail if Games exist and no live Venue exists.

## Settled (round 3)

27. **Empty Game-Court set = unrestricted:** later Match Court = any Court on Game.venueId (same as Friendly game). Non-empty = Match.courtId must be in that set or skip.
28. **Validation:** unique constraint; duplicate `courtIds` refused; every `courtId` exists, belongs to `venueId`, Venue live unless locked Soft-archived Club Group create (then Court fields empty). Game delete cascades Game-Court rows.
29. **Tournament add/update Match Court** follows 27. Friendly: always all Courts on Game.venueId. Americano: crafted `addMatch` stays refused.
30. **Friendly `updateMatch`:** only `courtId` (including null) on a non-cancelled Match. Refuse times/slots. Add Match still refused. Cancel Match still cancels the Game.
31. **Create shape:** Friendly `courtId` optional, `courtIds` refused; Americano/tournament `courtIds` optional, `courtId` refused; `venueId` required every format.
32. **Lock vs unlock at create:** locked `venueId` must equal the Community Venue link; unlocked `venueId` must be a live Venue; Courts belong to that Venue.
33. **by-id** returns `venueId`, name, city, country, `archivedAt`. `listCourts` organizer-only. Non-organizers see Venue and Match Court name only.
34. **Out of scope confirmed** (no Directory, no App format picker, no generation, no post-create Venue editor, no three Set shells in this spec, no list-card Venue).
35. **Operator Court delete stays:** Match.courtId set null; Game-Court row cascades. Do not restrict Court delete.
