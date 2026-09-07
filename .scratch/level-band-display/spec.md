# Level-band display

Status: ready-for-agent

Related: [user-ratings](../user-ratings/spec.md), [game-level-range](../game-level-range/spec.md), [home-level-redesign](../home-level-redesign/spec.md), [ADR-0009](../../docs/adr/0009-glicko-2-user-ratings.md).

## Problem Statement

Users and Organizers see Level bands as D3, D2, D1, C3, C2, C1, B3, B2, B1, A. That ladder is hard to read aloud and does not match how people talk about padel skill (D, D+, C, … A, and a reserved elite PRO). The stored 10-step hysteresis table is still the right Rating model; the product face is the problem.

## Solution

Keep the stored Rating Level band enum, hysteresis, continuous Level, and Game tenths. Show a new display ladder: **D, D+, C, C+, B, B+, A, PRO** (PRO highest). Map the ten stored bands onto seven assignable display labels; list PRO in the glossary as the reserved rung above A without assigning it. Self-declare and Game Level range pickers use the seven assignable labels. One display-map module is the only table of labels; every badge, picker, range string, and gate sentence calls it.

Approving this spec approves the Test seams in Testing Decisions and the `CONTEXT.md` glossary replacements in Implementation Decisions.

## User Stories

1. As a User on You with a Rating, I want my Level band badge to show the new display label (D, D+, C, C+, B, B+, or A), so that the ladder matches how I talk about skill.

2. As a User on You, I want my continuous Level (one decimal) unchanged, so that the number I already know does not move because letters changed.

3. As a User on You whose Rating is Provisional, I want the Provisional badge still shown and never labelled PRO, so that confidence is not confused with an elite band.

4. As a User on You with no Rating and `canSelfDeclare`, I want the existing Declare Level CTA, so that placement stays intentional.

5. As a User opening Declare Level, I want choices **D, D+, C, C+, B, B+, A** plus **I don’t know**, so that I pick the new face, not D3…A.

6. As that User, I do not want PRO in the declare picker, so that I cannot claim a reserved elite label.

7. As a User who picks D, I want stored band **D3** and midpoint Level **0.35**, so that “I am a D” starts at the floor of that display rung.

8. As a User who picks D+, I want stored band **D1** and midpoint **1.75**.

9. As a User who picks C, I want stored band **C3** and midpoint **2.45**.

10. As a User who picks C+, I want stored band **C1** and midpoint **3.85**.

11. As a User who picks B, I want stored band **B3** and midpoint **4.55**.

12. As a User who picks B+, I want stored band **B1** and midpoint **5.95**.

13. As a User who picks A, I want stored band **A** and midpoint **6.65**, as today.

14. As a User who picks I don’t know, I want Level **3.0** and stored band **C2** (displays as **C**), so that mid-ladder default is unchanged.

15. As a User who already declared or has a Rated Match, I want a second declare still refused, so that write-down does not reopen seeding.

16. As a crafted client still sending stored `D2` / `C2` / `B2` to `ratings.selfDeclare`, I want those choices still accepted, so that this slice does not rename or shrink the mutation input.

17. As a User on Home, I want the Level hero letter (`HomeLevelBlock`) to be the display label, so that Home and You do not disagree.

18. As a User on Home, I want “{n}% of the way to {next display label}” to name the next **distinct** display rung (D3 progress names D+, not D), so that the caption is not the same letter I already am.

19. As a User on Home at stored A, I want “Top Level band” with no “of the way to PRO”, so that PRO stays unassigned.

20. As a User whose stored band is D3 or D2, I want both to show **D**, so that collapsed thirds share a letter.

21. As a User whose Level oscillates across the D3↔D2 boundary, I want hysteresis still applied on the stored 0.7 table even though the badge does not change, so that the Rating model is unchanged (known limitation: that flip is invisible on the badge).

22. As a User whose stored band is C3 or C2, I want **C**; C1 shows **C+**. Same pairing for B3/B2 → **B** and B1 → **B+**.

23. As a User, I want product order C3 < C2 < C1 preserved, so that a reversed C1–C2–C3 list never ships.

24. As an Organizer creating a Game, I want Minimum/Maximum Level selects to list **None** plus D, D+, C, C+, B, B+, A, so that I set a range in the new letters.

25. As that Organizer, I do not want PRO in those selects, so that a Game cannot be gated to an unassigned elite rung.

26. As an Organizer who sets min D, I want tenths **0** (D3 lower edge), so that the display rung’s floor is the bound.

27. As an Organizer who sets max D, I want tenths **13** (D2 upper edge), so that “max D” includes the whole collapsed D rung, not only D3.

28. As an Organizer who sets min D+ / max D+, I want tenths **14** and **20** (D1 edges).

29. As an Organizer who sets min C / max C, I want tenths **21** and **34** (C3 lower through C2 upper).

30. As an Organizer who sets min C+ / max C+, I want tenths **35** and **41**.

31. As an Organizer who sets min B / max B, I want tenths **42** and **55**.

32. As an Organizer who sets min B+ / max B+, I want tenths **56** and **62**.

33. As an Organizer who sets min A / max A, I want tenths **63** and **70**.

34. As an Organizer who sets min C+ and max C, I want the inverted-range error, so that a higher display rung cannot sit below a lower one.

35. As an Organizer editing an existing Game, I want the selects prefilled from stored tenths via the display map, so that old D3/C3/… rows show the new letters.

36. As that Organizer saving without intending a tighter gate, I accept that a collapsed letter snaps tenths to that display rung’s canonical edges (for example an old C2-min of 28 shown as C saves as 21), so that pickers have one write table.

37. As a viewer of Game home, list cards, Friendly overview, Invite preview, and Open Graph, I want the range string to use display labels (for example `Level C–C+`, `Level C and up`, `Level B and under`), so that every band-letter face matches.

38. As a viewer of a range whose min and max map to the same display label, I want a single label (`Level C`), so that `Level C–C` does not appear.

39. As a viewer of a min-only range, I want `Level {label} and up` rather than a trailing `+`, so that `D+` never becomes `D++`.

40. As a User blocked by a Game Level range, I want gate copy to name display labels (`This Game is for Level C–B. Your Level is B+.`), so that the refusal matches the cards.

41. As a User with no Rating on a gated Game, I want the existing “Declare one on You, or request to play” copy, so that the no-Rating CTA is unchanged except that “Level” still does not say PRO.

42. As an Organizer in the Level range request queue, I want requester meta to stay the numeric Level (and Provisional), so that the continuous face is not replaced by letters there.

43. As a User, I want Game admit still compared on displayed tenths, so that collapsing letters does not change who passes a stored tenths gate until an Organizer re-saves the picker.

44. As a reader of CONTEXT.md, I want **Level band** defined as D–D+–C–C+–B–B+–A–PRO, and **Game Level range** no longer saying letterNumber D3–A.

45. As a reader of CONTEXT.md, I want **Provisional** to avoid PRO, so that the two words stay distinct.

46. As a developer, I want one display-map module reused by badge, Home, declare picker, Game select, range formatter, and gate copy, so that label tables are not duplicated.

47. As a developer, I want no new tRPC paths, no payload rename of `ratings.me.levelBand`, no new Package, and no twin `server/<domain>/<verb>.ts`, so that this stays a display-face change.

48. As a developer of tests, I want unit coverage of the map, self-declare write-down, picker tenths, range formatter (including `and up` and same-label collapse), and next-distinct display rung, on the existing `level-bands` / `level-range` / `level.test.ts` seams.

49. As a User, I want no leaderboard, Team Rating, Glicko rewrite, or Level > 7.0, so that this slice cannot be mistaken for a new Rating system.

50. As a future slice, I want a hook that PRO may later be an Operator-granted or elite override, so that v1 can list the rung without shipping assignment.

51. As a developer of the Home design preview, I want fixture `nextBand` captions and hero letters to use display labels, so that `/dashboard/design/home` does not still show C1 / B3.

## Implementation Decisions

- **Status of the change.** Display-face remap. Do not migrate `rating_level_band`. Do not change Glicko-2, μ map, Level clamp 0.0–7.0, hysteresis ±0.10 against the 0.7 stored table, Provisional φ > 200, or Game `level_min_tenths` / `level_max_tenths`.

- **No new ADR.** ADR-0009 still describes Glicko-2 and the stored 0.7 D3…A table. Relabeling the product face is not hard-to-reverse in the ADR sense, not a new Rating trade-off, and not a stored-enum change. Do not add an ADR-0009 note.

- **Glossary.** Replace **Level band** and **Game Level range** in root `CONTEXT.md` (exact text below). Sharpen **Provisional** `_Avoid_` to include PRO. Those glossary edits ship in this planning commit so the living language matches the approved face; the App still shows D3…A until the implementation tickets land.

- **Stored → display map (authoritative).** Stored enum order remains D3 < D2 < D1 < C3 < C2 < C1 < B3 < B2 < B1 < A.

  | Stored band | Display label |
  |---|---|
  | D3, D2 | D |
  | D1 | D+ |
  | C3, C2 | C |
  | C1 | C+ |
  | B3, B2 | B |
  | B1 | B+ |
  | A | A |
  | *(none)* | PRO |

- **PRO.** Display-only reserved label. Not a Postgres enum value, not returned as `ratings.me.levelBand`, not a picker option, not a Game bound, not “of the way to PRO”. No User is assigned PRO this slice. Follow-up: Operator-granted or elite override.

- **Single module.** Extend the existing App `level-bands` lib (stored `LEVEL_BANDS` already lives there) with display labels, the stored→display function, next-distinct-display-rung, self-declare write-down, and assignable picker list. `level-range` format/parse helpers call that module; they do not own a second table. Do not add a Package, service layer, or router-only helper. A helper used by two or more surfaces belongs in that lib, not copied into procedure files.

- **tRPC.** No path renames. `ratings.me` still returns stored `levelBand` and stored `nextBand`. `ratings.selfDeclare.choice` still accepts stored bands plus `unknown`. `games.create` / `games.updateLevelRange` still take tenths. UI maps for display and writes tenths/stored bands before mutate.

- **Self-declare write-down.** App picker values are display rungs; on submit map to stored and call existing `selfDeclare`. D→D3, D+→D1, C→C3, C+→C1, B→B3, B+→B1, A→A. `unknown` still C2 / 3.0 / φ 350. Picking C (2.45) and I don’t know (3.0, displays C) can both show **C** with different Levels — keep I don’t know as specified in user-ratings.

- **You.** `LevelBandBadge` maps stored band → display string (aria-label uses the display label). Style groups stay D/C/B/A from the first letter of the display label (`D+` is D). No PRO style. Numeric Level and Provisional unchanged.

- **Home.** Shipped surface is `HomeLevelBlock` (home-level-redesign). Hero letter and “{n}% of the way to …” use the display map. Progress **percent** stays `progressToNextBand` on the stored 0.7 band. Caption uses the next stored band whose display label **differs** from the current display label; at A, keep “Top Level band”. Known limitation: percent is still within the stored third, not the collapsed 1.4-wide letter. Design preview fixtures (`fixtures/home`) must show display labels, not C1/B3.

- **Game pickers.** `GameLevelBandSelect` iterates assignable display rungs, not stored `LEVEL_BANDS`. Select values are display labels (plus None).

  Display rung tenths (inclusive):

  | Display | min tenths | max tenths | stored edges |
  |---|---|---|---|
  | D | 0 | 13 | D3 lower … D2 upper |
  | D+ | 14 | 20 | D1 |
  | C | 21 | 34 | C3 lower … C2 upper |
  | C+ | 35 | 41 | C1 |
  | B | 42 | 55 | B3 lower … B2 upper |
  | B+ | 56 | 62 | B1 |
  | A | 63 | 70 | A |

- **Range label formatter.** Map each bound’s tenths → stored band → display label, then format. Same display min and max → `Level {label}`. Both set and different → `Level {min}–{max}`. Min-only → `Level {label} and up`. Max-only → `Level {label} and under`. Unset both → omit. Gate copy uses the same formatter; “Your Level is {display}”. Consumers: Game tiles, summary cards, Friendly overview, Invite preview, Open Graph, create/edit helper (helper text still “Level bands”, not D3–A). Home next-Game no longer shows a range string (home-level-redesign dropped that hero meta).

- **Existing tenths.** Gates keep comparing displayed Level tenths to stored columns. Cards remap immediately. Re-saving a picker snaps to canonical display-rung edges (documented).

- **Permissions.** Unchanged. Organizers still set ranges; viewers still see ranges where they already could.

- **Seed / fixtures.** Dev seed may keep inserting stored enum values. Home design fixtures that render letters must use the display map. No PRO rows.

- **Related specs (do not rewrite here).** user-ratings still owns Glicko and self-declare rules; this spec replaces the D3…A **face**. game-level-range originally specified numeric `Level 3.0–4.5` and “no Level band picker”; the App already shipped band selects and band-letter labels — this spec updates that shipped face. home-level-redesign has shipped; copy that says “way to C1” / D3–A must use this map. sports-brand-system “real band string (C2, B1, A)” is superseded for the visible string.

- **App tRPC.** One procedure per file remains. Do not extract endpoint logic into `server/<domain>/<verb>.ts` twins. Shared ratings hysteresis and Game admit / Level-range gate modules stay shared; this slice does not reimplement them.

### CONTEXT.md replacements (this planning commit)

**Level band:**

The discrete skill label D–D+–C–C+–B–B+–A–PRO (PRO highest) shown in the App, derived from Level with hysteresis. PRO is reserved for an elite override and is not assigned from Level.

_Avoid_: rank, Level 1–5 (redesign artefact, not product), ELO, D3–A (stored thirds, not the product face)

**Game Level range:**

Optional inclusive minimum and/or maximum Level band bounds (D–A) on a Game, stored as tenths. Both unset means no Level gate. Distinct from a User’s continuous Level.

_Avoid_: rank range, ELO range, skill cap (when you mean this), letterNumber D3–A (stored thirds, not the product face)

**Provisional** `_Avoid_`:

_Avoid_: unranked, unrated (a User may already have a Level), PRO (that is a Level band label)

## Testing Decisions

### What a good test is

Assert product-facing labels, write-down, and tenths. Do not assert file moves. Do not re-test Glicko, hysteresis math, or admit doors except where a visible string changed. Prefer existing Vitest + PGLite seams.

### Test seams

Highest seam: a User sees D/D+/C/…/A on You and Home, declares a collapsed letter that persists the lower stored third, and an Organizer’s Game range picker writes inclusive tenths and shows the new range strings — without assigning PRO, without changing Glicko, and without renaming tRPC paths.

If you implement this spec, you implement these seams:

- Display map: every stored band → expected label; PRO is not produced from any stored band
- Next distinct display rung: D3 and D2 → D+; C3 and C2 → C+; B1 → A; A → null
- Self-declare write-down: seven rungs → stored band + midpoint; unknown → C2 / 3.0
- `ratings.selfDeclare` still accepts stored D2/C2/B2 from a crafted client
- Game parse: display D min/max → 0 and 13; C+ min/max → 35 and 41; A max → 70; None → null; min C+ + max C inverted
- Prefill: tenths 0 → D; 7 → D; 14 → D+; 30 → C; 35 → C+
- `formatLevelRangeLabel`: 21–41 → `Level C–C+`; 21–34 → `Level C`; 21–null → `Level C and up`; null–41 → `Level C+ and under`; never `D++`
- Gate copy uses display labels; no-Rating sentence unchanged
- Open Graph description includes the remapped range string
- You/Home: badge/hero show display labels; Provisional copy has no PRO
- Home progress at A is still “Top Level band”
- Home design fixtures / preview do not render stored C1/B3 as the visible letter
- Hysteresis tests / `bandFromLevel` still use stored D3…A
- Game admit PGLite suites keep stored C2 fixtures; no need to rewrite gate math
- No test whose only purpose is that a helper lives in a new file

Prior art: `level-range.test.ts`, `level.test.ts` (`progressToNextBand`), `game-invite-open-graph.test.ts`, ratings self-declare mutation via existing procedure file (`selfDeclareRating`).

## Out of Scope

- Changing Glicko-2, μ, Level 0.0–7.0, or the 0.7 stored band table
- Migrating `rating_level_band` or adding an 11th hysteresis state
- Assigning PRO (no live path, no Operator flag)
- Level > 7.0 or a new Glicko scale
- Changing Game tenths columns or admit comparison math
- Changing Provisional threshold or mixing Provisional with PRO
- Leaderboards, Team ratings, per-User Level chips on Game cards
- Rebuilding Home (home-level-redesign already shipped)
- tRPC path renames, new Package, service/repository/use-case layer
- A new ADR or an ADR-0009 amendment
- CI beyond existing Vitest

## Further Notes

Planner session locked v1 without an interactive grill (autonomous Cloud Agent). Smaller interpretation chosen wherever two readings were plausible: display remap, not a Glicko rewrite.

**Assumptions (locked)**

- User’s listed order C1, C2, C3 is ignored; glossary order C3 < C2 < C1 stands.
- Game **max** of a collapsed letter uses the **upper** stored third (D max = D2 = 13 tenths). Inclusive rungs beat “always write the lower third’s max”, which would exclude D2 Users from “max D”.
- Min-only copy is `and up` because a trailing `+` collides with D+/C+/B+.
- `ratings.me.levelBand` stays the stored enum; UI maps. Avoids a payload rename.
- App declare UI omits D2/C2/B2; API still accepts them.
- Home is `HomeLevelBlock` (home-level-redesign shipped as TEM-165–TEM-172). Caption copy is `{n}% of the way to {label}`.
- Seed keeps stored enums.
- Snapping tenths on Organizer re-save of a collapsed letter is acceptable v1.

**Known limitations**

- D3↔D2 (and C3↔C2, B3↔B2) hysteresis is invisible on the badge.
- Home progress percent is still 0.7-wide stored thirds.
- I don’t know (C2 / 3.0) and pick C (C3 / 2.45) can both display as C.

**PRO follow-up hook**

Later: an Operator-granted or elite override that sets display PRO without a Level > 7.0. Not this slice.

## Comments

Inspection found the App already uses Level band **selects** and formats ranges as `Level C3–C1`, not the numeric `Level 3.0–4.5` in `.scratch/game-level-range/spec.md`. This spec updates the shipped band-letter face. No existing pro/elite User flag was found. Home next-Game no longer shows a Level range string after home-level-redesign.
