# 01: Optional Level range on Game (columns, create, display, organizer edit)

**Linear:** [TEM-130](https://linear.app/temba-app/issue/TEM-130/optional-level-range-on-game-columns-create-display-organizer-edit)

**Spec:** `.scratch/game-level-range/spec.md`

**What to build:** Organizers can set an optional inclusive Level minimum and/or maximum when creating a Game, see it on Game home and list cards when set, and change or clear it later. Both blank means no range stored. This ticket does not yet refuse Game admit — ticket 02 turns the stored range into a gate.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `games` has nullable `level_min_tenths` and `level_max_tenths` (0…70), no default, no backfill; existing Games remain unset
- [ ] App Create Game has optional Minimum Level and Maximum Level Fields (one decimal, 0.0–7.0) after price per player; blank/blank creates unset; min-only, max-only, and both persist; min > max, extra decimals, negatives, and > 7.0 are refused
- [ ] `games.create` accepts optional integer tenths on Friendly game, Americano, and Friendly tournament; omit → null
- [ ] Game home shows `Level 3.0–4.5` / `Level 3.0+` / `Level 4.5 and under` when set and omits when unset
- [ ] Organizers can set, change, and clear via `games.updateLevelRange` (major-unit Fields); cancelled Games refuse; non-organizers have no editor; Soft-archived Club Group Games still allow edit
- [ ] `GameSummaryCard`, Home hero, Home upcoming, public pickup, and Group Games lists show the formatted range when set and omit when unset
- [ ] `games.byId` and those list payloads include `levelMinTenths` and `levelMaxTenths`
- [ ] Copy says “Level”, not rank or ELO; no Level band picker; Format / public / mode / Venue rules unchanged
- [ ] Parse/format helper tests and create-friendly persistence tests cover blank, 0.0, 4.2 → 42, and invalid input
