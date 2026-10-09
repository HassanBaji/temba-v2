# Set Level: Level setters set a Group member's Level

Status: approved, ready for implementation. Every open question was answered on 2026-10-07 (section 5.1).

Tickets (Linear, `ready-for-agent`): [TEM-350](https://linear.app/temba-app/issue/TEM-350) → [TEM-351](https://linear.app/temba-app/issue/TEM-351) → [TEM-352](https://linear.app/temba-app/issue/TEM-352) and [TEM-353](https://linear.app/temba-app/issue/TEM-353); [TEM-354](https://linear.app/temba-app/issue/TEM-354) also waits on TEM-345.

Design source: Claude Design project "Set rating flow", screens 06d (Members, setter view), 06e (Member sheet), 06f (Set rating) and 06g (Saved). The design is for mobile. This spec ships **web first**, adapting the design to the Web App. Mobile is a later slice (section 10). The design's Undo is not built (U12).

## 1. Problem

Some Users know a player's real level better than that player's results do: a strong player new to the Group, a player back from injury, a self-declare that was wrong. Today a Rating moves only through Rated Matches (ADR-0009) and one self-declare. Nobody can correct a Level by hand. A Provisional player who is clearly settled must play about five more Rated Matches before anything changes.

The user asked for a small set of trusted Users to be able to set any Group member's Level from that Group's Members list. The new value must:

- show everywhere a Level shows;
- count as confirmed, not Provisional;
- be set with a slider that shows the display letter, the Level and how close the value is to the next letter.

## 2. Discovery findings (current behavior)

### 2.1 Rating model

**Storage.** `ratings` (`packages/db/src/schema/ratings.ts`) has one row per User per sport. Its columns are `mu`, `phi`, `sigma`, the stored `level_band` (D3…A), `self_declared_at` and `last_rated_at`. A Rating is platform-wide. It is not per Group.

**Level.** Level is `clamp(3 + (μ − 1500) / 500, 0, 7)`. The App shows it with one decimal (`formatLevel` in `packages/domain/src/level.ts`). The inverse is `muFromLevel`.

**Bands.** Stored bands are 0.7 wide, D3 … A. The App shows seven assignable display letters: **D, D+, C, C+, B, B+, A**. PRO is reserved and never assigned (`packages/domain/src/level-bands.ts`, `.scratch/level-band-display/spec.md`). The display letters have uneven widths, in tenths:

| Letter | Tenths |
| --- | --- |
| D | 0–13 |
| D+ | 14–20 |
| C | 21–34 |
| C+ | 35–41 |
| B | 42–55 |
| B+ | 56–62 |
| A | 63–70 |

These ranges come from `packages/domain/src/level-range.ts`.

**Provisional.** Provisional means φ > 200 (`isProvisional`). The product shows "typical Rated Matches remaining", computed from φ with `RATED_MATCHES_TO_CONFIRM = 5`. It is not a match-count rule.

**Idle inflation.** `packages/domain/src/idle.ts` adds one Glicko-2 empty period per 30 days since `last_rated_at`. With σ ≈ 0.06 that is well under 1 φ per period. `ratings.me` applies it when reading. `groups.byId` does not, so the two can disagree about Provisional.

**Match complete.** `packages/api/src/ratings/apply-rated-match.ts` runs a Glicko-2 step from the **current** row. It updates the band with hysteresis and appends a `rating_events` row, unique per User per Match, with `match_id` NOT NULL. Five readers use `rating_events`:

- `userHasRatedMatch`, which locks self-declare;
- `ratedMatchCount` and the Home Level sparkline, both in `routers/ratings/me.ts`;
- Game rating impact in `routers/games/byId.ts`;
- wrong-score eligibility in `packages/api/src/games/wrong-score-reversal.ts`.

**Wrong-score reversal.** `routers/games/reportWrongScore.ts` is allowed only when the Match is each seated User's latest Rated Match. It restores μ/φ/σ from the Match's `rating_events.*_before`, deletes those events and sets the Match back to `pending`. It does not restore `level_band`.

### 2.2 Where a Level is read

Every reader reads `ratings` live. There are no denormalized copies. The readers are:

- `ratings.me`: Home and Profile;
- `groups.byId`: Standing and Members;
- `games.byId`: seat Level bands;
- `games.listPartnerSuggestions`;
- `games.listLevelRangeRequests`;
- `games/user-allowed-by-level-range.ts`: the Game admit Level gate;
- `users.onboardingState` and `users.completeOnboarding`.

A manual set therefore appears on the next fetch everywhere. The exceptions are the Home sparkline and Game rating impact, which read `rating_events`.

### 2.3 Permissions

- `groupCreator` is a Clerk `publicMetadata` flag checked only on the client, as a UI hide (`.scratch/group-creator-ui-gate/spec.md`, `apps/web/src/types/globals.d.ts`).
- Operator is the only role enforced on the server: `packages/api/src/auth/require-operator.ts` and `operatorProcedure` in `packages/api/src/trpc.ts`. It reads the memoized `ctx.getPublicMetadata()` that `apps/api/src/context.ts` supplies from the Bearer session.
- Groups have no "admin" role. The design's "you are admin" is not a Temba term. See Organizer and Group approver in `CONTEXT.md`.

### 2.4 Members lists

- **Web.** `apps/web/src/components/groups/group-members-tab.tsx`, fed from `groups.byId` `standing.leaderboard` in `apps/web/src/app/dashboard/groups/[id]/page.tsx`. Rows are read-only `MemberRow` / `ListRow`. The Level column is `LevelCell` (`apps/web/src/components/temba/level-cell.tsx`). It shows the letter only. A Provisional member gets a bare hatch with no letter.
- **Mobile.** `apps/mobile/src/groups/members-tab.tsx` and `level-cell.tsx` behave the same way, with no tap target.
- Both use `levelCellView` (`packages/domain/src/group-home-chrome.ts`).
- Nothing exists anywhere for another User's profile, for "make organizer" or for "remove from Group".

### 2.5 Web building blocks that exist

- `ResponsiveDialog` (`apps/web/src/components/common/responsive-dialog.tsx`): a Dialog on desktop and a vaul Drawer on narrow screens.
- `Surface tone="ink"`, `Hatch`, `ChoiceChip`, `roving-radio-group`, `Button`, and sonner toasts.
- There is **no slider component.** The `radix-ui` umbrella package is already a dependency (used by `dialog.tsx`, `tabs.tsx` and others) and exports `Slider`, so no new library is needed.

### 2.6 Notifications

`.scratch/in-app-notifications/spec.md` (TEM-345…349) is approved but not built. It is web only. Mobile has no inbox, and push is Phase 7.

## 3. Goals

1. A User whose Clerk `publicMetadata.levelSetter === true` can set the Level of any other member of a Group they belong to, from that Group's Members tab on the Web App.
2. A set Level counts as confirmed, not Provisional. It becomes the new Glicko-2 baseline, and later Rated Matches move it as usual.
3. A set Level is displayed exactly like any other Level everywhere, including the Home sparkline. Only Level setters see that a Level was set by hand ("Set by …").
4. The set-Level panel has a slider on the real scale (0.0–7.0, 0.1 steps) with display-letter ticks. It shows the letter, the Level, the change from the current Level, and how close the value is to the next letter.
5. Every set is audited: who, when, from what, to what, and an optional reason.
6. The Members tab shows the Level number. A Provisional Level shows its letter and number on a hatch, not a bare hatch.

## 4. Non-goals

- **Undo.** A mistaken set is corrected by setting the Level again, with the reason "Correcting a mistake" (U12).
- Mobile UI in the web slices. Mobile is a later slice (section 10) that reuses the same procedures and `@repo/domain` helpers.
- Notifying the member. That is a follow-up ticket that depends on TEM-345 (section 11, ticket 5, TEM-354).
- View profile, Make organizer and Remove from Group, the design's other sheet actions. None has a concept or procedure behind it.
- Granting or revoking `levelSetter` in the App. That happens only in the Clerk dashboard.
- Any Level history or audit UI beyond the read-only "Set by …" on the row and in the member dialog.
- Setting PRO, setting a Level outside 0.0–7.0, or two-decimal precision.
- Changing Home's "% of the way to" caption, which uses the stored third.
- Idle-aware Provisional on surfaces other than the Members and Standing tabs, such as `listLevelRangeRequests`.
- Sports other than the Group's sport. The App is padel only.
- Any change to Glicko-2 parameters, hysteresis or Match-complete rating.

## 5. Decisions

### 5.1 Answered by the user

| # | Decision | Answer |
| --- | --- | --- |
| U1 | Scale | Real scale: Level 0.0–7.0 and display letters D, D+, C, C+, B, B+, A, with one decimal and a 0.1 step. The design's 1.00–6.00 scale and C−/B−/A− letters are dropped. |
| U2 | "Next letter" readout | Measured against display letters, not stored thirds. |
| U3 | Permission | Clerk `publicMetadata.levelSetter === true`, enforced on the server. The setter and the target must both be current members of that Group. A setter cannot set their own Level. |
| U4 | Apps | Web first, adapting the mobile design to the web Members tab. Mobile is a later slice. |
| U5 | Reason | Optional reason chips, stored on the audit row. No "is notified" copy. A `level_set` Notification is a follow-up that depends on TEM-345. |
| U6 | φ after a set | φ = min(current φ, 150). |
| U7 | Undo | Superseded by U12. |
| U8 | Wrong-score reversal after a set | "Allow reopen, treat the rating from the new rating." See D5. |
| U9 | How a set Level displays | "A set level should be similar to the normal level." A set Level shows everywhere as an ordinary Level, including as an ordinary point on the Home sparkline. "Set by …" is visible to Level setters only. |
| U10 | Reason chips | New to the Group, Plays above results, Plays below results, Back from injury, Correcting a mistake. |
| U11 | Saved confirmation on web | The inline ink banner, as designed. |
| U12 | Undo | **No Undo. To fix a mistake, set the Level again.** There is no undo procedure, no Undo on the banner and no Undo in the member dialog. |
| U13 | A mistaken set on a Provisional player | **Accepted: it stays confirmed.** Setting again corrects the Level but never makes the Rating Provisional again (R1). The confirm step must say clearly, before the setter confirms, that the Level becomes confirmed. |

### 5.2 Design decisions

**D1. A set is a new baseline, not a permanent override.** A set writes:

- μ = `muFromLevel(tenths / 10)`;
- band = `bandFromLevel(level)`, strict, with no hysteresis;
- φ as in D2;
- σ unchanged, or 0.06 when there is no row;
- `last_rated_at` untouched.

Later Rated Matches step from the new baseline through the unchanged `apply-rated-match`.

**D2. Confirmed means φ ≤ 200.** A set writes φ = min(current φ, 150) (U6). Setting exactly 200 was rejected, because one idle period would make the Rating Provisional again.

**D3. Audit lives in a new `level_overrides` table, not in `rating_events`.** `rating_events.match_id` is NOT NULL, and its rows mean "Rated Match" to five readers (2.1). The table is append-only. Rows are never updated.

**D4. Superseded (U12): no Undo; set again instead.** An earlier draft had any Level setter undo the latest set, either by restoring the before-values or by shifting μ back. That design was removed. Another set corrects a mistake. Because there is no Undo, nothing ever reads a set's before-values to restore a Rating. They are an audit record only.

**D5. Wrong-score reversal after a set (U8).**

- Reversal stays allowed when a seated User had a Level set after that Match. The existing refusal on a later Rated Match is unchanged.
- In the reversal transaction, each seated User is handled in one of two ways:
  - **No set after this Match's rating event:** restore μ/φ/σ from the event, as today.
  - **A set after it:** do **not** touch that User's `ratings` row. The set is their baseline, and their Rating stays as it is now.
- In both cases, delete that User's rating event for the Match.
- When the corrected score is completed again, it rates on top of every User's current Rating through the normal `apply-rated-match` path.
- **No before-value rewrite.** The earlier draft rewrote a set's before-values only so that Undo could not bring back the wrong score. Without Undo, nothing restores from them. One trace remains: the set's audit row, and the sparkline point just before it, still show the Level the User had after the reversed Match. That is a true record of what the Level was when the set was made. The cost is that a sparkline drawn after the reversal may show a step that no longer has a Match behind it (R4).

**D6. A set Level displays like any Level (U9).**

- The Home sparkline history in `ratings.me` is built from every change to the Level, ordered by time: rating events (`mu_after`) and sets (`mu_after` at `created_at`). The first point is the before-value of the earliest change in the window. The window stays at 15 points.
- No point has a special marker.
- `ratedMatchCount` stays a count of Rated Matches only.

**D7. A target with no Rating row is allowed.** The set creates the row. It stores the default placement (μ 1500, φ 350, σ 0.06, band C2) as the before-values, with `had_rating = false`, so the audit and the sparkline have a starting point. Because a row now exists, that User can no longer self-declare and skips the onboarding Level step.

**D8. A Group with no sport.** The action is hidden, and the server refuses it.

**D9. A Soft-archived Community.** Allowed. The Rating is platform-wide, and the Group is only the entry point.

**D10. Visibility.** Only Level setters see tappable rows, "Set by …" captions and the member dialog. Other members see the Members tab as today, apart from goal 6.

**D11. Copy.**

- The App says **Level**, never "rating" or "admin".
- The button reads "Set Level". The confirm button reads "Set to {letter} {level}".
- The reason label reads "Reason". Reason chip copy is in U10, with "Group" capitalized as in the glossary.

**D12. Concurrency.** A set runs in one transaction that locks the target's `ratings` row (`SELECT … FOR UPDATE`). `apply-rated-match` and the D5 reversal take the same lock (R2).

**D13. The flag is read on the server.** `groups.byId` returns `viewerCanSetLevel`, so clients do not read `levelSetter` from Clerk. Add `levelSetter?: boolean` to the web `UserPublicMetadata` type for completeness only.

## 6. Domain model and server design

### 6.1 Schema

New file `packages/db/src/schema/level-overrides.ts` in `@repo/db`, with a new migration.

```text
level_override_reason  enum: new_to_group | plays_above_results | plays_below_results | back_from_injury | correcting_a_mistake

level_overrides                     -- append-only
  id                    uuid pk
  user_id               uuid not null → user.id on delete cascade        -- whose Level was set
  sport                 group_sports not null
  set_by_user_id        uuid not null → user.id on delete cascade
  group_id              uuid null → groups.id on delete set null         -- Group the set was made from
  reason                level_override_reason null
  had_rating            boolean not null                                 -- false when the set created the row
  mu_before, phi_before, sigma_before    double precision not null       -- default placement when had_rating is false
  level_band_before     rating_level_band not null
  mu_after, phi_after, sigma_after       double precision not null
  level_band_after      rating_level_band not null
  created_at            timestamp not null default now()
  index (user_id, sport, created_at)
```

The **latest set** for a User and sport is the row with the greatest `(created_at, id)`.

Reason chips:

| Enum value | Copy |
| --- | --- |
| `new_to_group` | New to the Group |
| `plays_above_results` | Plays above results |
| `plays_below_results` | Plays below results |
| `back_from_injury` | Back from injury |
| `correcting_a_mistake` | Correcting a mistake |

### 6.2 Pure helpers (`@repo/domain`)

**New module `packages/domain/src/level-slider.ts`.** It belongs in `@repo/domain` because web and mobile both use it and `ratings.setLevel` validates with it. It reuses the tenths constants in `level-range.ts` and the display mapping in `level-bands.ts`, and adds no second table. It exports:

- `LEVEL_SLIDER_TICKS`: display-letter edges in tenths (14, 21, 35, 42, 56, 63) and each letter's centre for its label. The ends are labelled 0.0 and 7.0.
- `clampLevelTenths(n)`: an integer from 0 to 70.
- `levelSliderReadout({ tenths, currentTenths })`, which returns:
  - `displayBand`;
  - `levelLabel`;
  - `deltaLabel`;
  - `rung: { label, lowerTenths, upperTenths }`;
  - `percentThroughRung`;
  - `toNext: { label, distanceLabel } | null`, which is null at A and never PRO.
- `LEVEL_OVERRIDE_REASONS` and `levelOverrideReasonLabel(reason)`.
- `levelOverrideCaption({ setByIsViewer, setByName, createdAt, now })`, giving "Set by you, today" or "Set by Sara K, 3 days ago". It follows `formatRequestedAt` in `request-meta.ts`; generalise that helper rather than copy it.

**In `level.ts`.** Add `confirmedPhiForOverride(phi | null) = min(phi ?? INITIAL_PHI, 150)`, with `LEVEL_OVERRIDE_PHI = 150`.

**In `group-home-chrome.ts`.** `levelCellView` returns `{ kind: "provisional"; label: string | null }`, with a label when a band exists. The change is additive: mobile keeps compiling and ignores the label until its slice.

### 6.3 Permission guard

New module `packages/api/src/auth/require-level-setter.ts`, mirroring `require-operator.ts`:

- `isLevelSetterPublicMetadata(metadata)` returns `metadata?.levelSetter === true`.
- `requireLevelSetter(ctx)` throws FORBIDDEN with "Only Level setters can set a Level".
- `levelSetterProcedure` goes in `trpc.ts`, next to `operatorProcedure`.

It is a shared module because it has two callers: `setLevel` and `groups.byId`.

### 6.4 Procedures (additive, one file each)

**`ratings.setLevel`** is a mutation on `levelSetterProcedure`, in `packages/api/src/routers/ratings/setLevel.ts`. It exports a plain `setMemberLevel(database, args)` for tests.

- Input: `{ groupId: uuid, userId: uuid, levelTenths: int 0..70, reason?: LevelOverrideReason }`.
- Refusals:
  - NOT_FOUND when the Group does not exist.
  - BAD_REQUEST when the Group has no sport.
  - FORBIDDEN when the caller is not a member of the Group.
  - BAD_REQUEST when the target is not a member, or when the target is the caller.
- In one transaction:
  1. Lock the target's `ratings` row for the Group's sport.
  2. Build the before-values and after-values (D1, D2, D7).
  3. Upsert `ratings` with `updated_at = now`.
  4. Insert a `level_overrides` row.
- Output: `{ overrideId, level: { level, levelBand, provisional: false } }`.
- Setting the same value as the current Level is allowed. It confirms a Provisional Level, and it is how a setter re-applies a Level after a mistake.

**`groups.byId`** (existing) gains additive fields only:

- `viewerCanSetLevel: boolean`: the viewer has the flag, is a member, and the Group sport is not null.
- Per leaderboard entry:
  - `level: string | null`: one decimal, idle-aware.
  - `levelProvisional`: now idle-aware, using `youRatingViewAfterIdle`.
  - `ratedMatchCount: number`: one grouped count over `rating_events` for the member ids and sport.
  - `levelOverride: { setByName, setByIsViewer, createdAt, reason } | null`: the member's latest set. It is filled only when `viewerCanSetLevel` is true.
- Add the new fields to `GroupLeaderboardEntryData` in `packages/domain/src/group-data.ts`.

**`ratings.me`** (existing) builds its history as in D6. `ratedMatchCount` is unchanged.

**Wrong-score reversal** (existing, in `reportWrongScore.ts`) implements D5:

- Eligibility is unchanged.
- The restore loop skips any seated User who has a set created after their event for this Match. That User's event is still deleted.

### 6.5 Edge cases

| # | Case | Behavior |
| --- | --- | --- |
| E1 | A set was a mistake | Set again with the right Level and "Correcting a mistake". Both rows stay in the audit. |
| E2 | A mistaken set confirmed a Provisional player | Setting again cannot make the Rating Provisional again, because φ only goes down on a set (R1). |
| E3 | Target has no Rating row | The set creates the row. The default placement is stored as the before-values. |
| E4 | Two setters set the same member at once | The row lock serializes them. The last write wins, and both are audited. |
| E5 | Reversing a Match after which one seated User had a Level set | That User's Rating is kept and their event is deleted. The other three restore as today. The re-recorded score rates on top of current Ratings. |
| E6 | A Game Level gate after a set | Gates apply only at admit. Already admitted players are not removed. |
| E7 | Setting your own Level | Refused. |
| E8 | A Group with no sport | Hidden in the UI and refused by the server. |

## 7. Web UI flow (`apps/web`)

All of this is black and white with hairline borders, using existing tokens and components.

### 7.1 Members tab

The tab is `group-members-tab.tsx`, wired in `groups/[id]/page.tsx`.

- `LevelCell` gains an optional `level` prop, so a row reads "C+ 3.8".
- When the Level is Provisional, the letter and number sit on the hatch. The screen-reader text is "Level C+ 3.8, still Provisional".
- The Standing tab keeps the letter only.

When `viewerCanSetLevel` is true:

- every row except the viewer's own becomes a button with a trailing chevron;
- a member with a set shows `levelOverrideCaption(...)` as the caption;
- the footer reads "Select a member to set their Level. Hatched Levels are still Provisional."

### 7.2 Member step

Clicking a row opens a `ResponsiveDialog`. It shows:

- the name, the caption and "{n} Rated Matches";
- a big display letter and the Level;
- when the Level is Provisional: "This Level is still Provisional. Set it by hand if you know {first name} plays at a different Level.";
- when the member has a set, a read-only "Latest Level set" line: "Set by Sara K, 3 days ago", plus the reason if there is one;
- an ink primary button, "Set Level".

### 7.3 Set Level step

This step opens in the same dialog, with a Back control.

- **Readout:** an ink `Surface` shows "New Level", "was C 2.4", a large letter and Level, and the delta. Below it are a progress row ("0.6 to B" … "57% through C+") and a bar labelled at the rung edges.
- **Slider:** a new `apps/web/src/components/ui/slider.tsx` wrapping Radix `Slider` from `radix-ui`.
  - The range is 0–70 tenths with a step of 1, and the arrow keys move it.
  - Letter ticks come from `LEVEL_SLIDER_TICKS`.
  - A floating label sits above the thumb.
  - A grey marker shows the current Level, labelled "Now C 2.4".
- **Stepper:** − / "3.6" / + buttons, each at least 44px. "Reset" returns to the current Level.
- **Reason:** the five `ChoiceChip`s from U10, in the existing roving radio pattern. The reason is optional, and selecting the chosen chip again clears it.
- **Note (U13):** "A Level you set counts as confirmed. Rated Matches keep moving it from here." When the member is Provisional, add: "{First name} will no longer be Provisional, and setting again will not change that." The note sits directly above the confirm button and cannot be collapsed.
- **Confirm button:** "Set to {letter} {level}". It is disabled only when the value equals the current Level and that Level is already confirmed.
- Errors use the existing form-mutation error pattern.

### 7.4 Saved (U11, U12)

- The dialog closes and `groups.byId` is invalidated.
- An inline ink banner appears at the top of the Members tab: "{Name} set to B 4.6." It adds "Reason: back from injury." when a reason was chosen.
- The banner has a dismiss button and **no Undo**. It lasts until it is dismissed or the page is left.
- The member's row shows the solid Level and "Set by you, today".

## 8. Domain docs

### 8.1 `CONTEXT.md` additions (ship with ticket 2)

> **Level setter**:
> A User whose Clerk `publicMetadata.levelSetter` is `true`. A Level setter may set the Level of any other member of a Group they belong to. Granted and revoked only in the Clerk dashboard. Independent of Operator, Organizer and Community roles.
> _Avoid_: admin, rating admin, rating editor, Operator (when you mean this)

> **Level override**:
> A Level that a Level setter set by hand, and its audit record. It replaces the Rating's μ and makes the Rating confirmed. Later Rated Matches move the Level from there. There is no undo; a mistake is corrected by another Level override. A Level override is displayed like any other Level.
> _Avoid_: manual rating, rating override, Rated Match (an override is not a Match), permanent override

Also add to **Provisional**: "A Level override clears Provisional."

### 8.2 ADR proposal: `docs/adr/0023-level-override-is-a-confirmed-glicko-baseline.md`

ADR-0022 is reserved by the in-app Notifications spec. Renumber if needed.

> Some Users know a player's level better than results do, so trusted Users need to set a Level by hand. We store the set Level as a new Glicko-2 baseline: μ from the chosen Level, φ lowered to at most 150 so the Rating is confirmed, and σ kept. Rated Matches keep stepping from it. Each set is an append-only `level_overrides` row with before and after values. There is no undo; a mistake is corrected by setting again. A wrong-score reversal does not touch the Rating of a player whose Level was set after that Match: the set is their baseline.
>
> **Considered options.**
> 1. A permanent override that ignores results. Rejected: Levels would stop moving.
> 2. Writing overrides into `rating_events` with a null Match. Rejected: five readers treat a rating event as a Rated Match.
> 3. Setting φ exactly to 200. Rejected: one idle period makes the Rating Provisional again.
> 4. A per-Group admin role. Rejected: the Rating is platform-wide, so a per-Group role does not limit what the set changes.
> 5. An undo that restores or shifts back the set. Rejected by the user: setting again is simpler, and undo after later Matches had no exact meaning.
>
> Permission is a server-enforced Clerk flag, like Operator.

## 9. Testing

### Domain (Vitest)

- `level-slider`:
  - ticks;
  - clamp;
  - the readout at each letter edge (13/14, 34/35, 62/63, 70);
  - delta signs;
  - `toNext` is null at A;
  - percent through a collapsed letter.
- `levelOverrideCaption`.
- `confirmedPhiForOverride`.
- `levelCellView` with a label.

### Procedures (PGlite, through the exported functions)

- `setMemberLevel`:
  - The happy path writes μ, the band, φ ≤ 150, keeps σ, and writes a correct audit row.
  - A target with no row gets a new row, with the default placement as the before-values.
  - Setting again appends a second row and moves the Rating again.
  - It refuses: a caller who is not a Level setter, a setter who is not a member, a target who is not a member, the setter themselves, a Group with no sport, and tenths out of range.
  - A later Match complete steps from the new baseline.
  - `ratings.me` and `games.byId` show the new Level.
- `reportWrongScore` (D5):
  - With a set after the Match on one seated User, the reversal succeeds.
  - That User's Rating is unchanged and their event is deleted.
  - The other three are restored.
  - The set's audit row is unchanged.
  - The re-recorded score rates from the current Ratings.
- `groups.byId`:
  - `viewerCanSetLevel` true and false cases;
  - `level`, `ratedMatchCount` and idle-aware `levelProvisional`;
  - `levelOverride` appears only for setters.
- `loadRatingsMe` history:
  - includes set points in time order, with no marker field;
  - `ratedMatchCount` excludes sets.
- `require-level-setter` has a unit test that mirrors `require-operator.test.ts`.

`pnpm exec turbo run typecheck lint test` passes.

## 10. Mobile (later slice)

The mobile slice reuses `ratings.setLevel`, the `groups.byId` fields and `@repo/domain/level-slider`. It follows the design more closely:

- tappable rows with a chevron, and the hatched letter and number in `LevelCell`;
- a `Sheet` member sheet with only "Set Level" and the read-only "Latest Level set" line;
- a pushed Set Level screen with an ink readout `Surface`;
- a new slider primitive built on RN `PanResponder` plus reanimated, with no new native dependency, `accessibilityRole="adjustable"` and increment and decrement actions;
- the stepper and the five reason chips;
- the ink saved banner, without Undo.

It must follow the mobile design-system rules in `CLAUDE.md`:

- tokens only;
- the `Text` primitive for all text;
- at most two mount animations, where dragging the slider is not a mount animation.

## 11. Tickets (in Linear: TEM-350 … TEM-354)

Implement in order. Each ticket is a vertical slice.

| # | Title | Blocked by |
| --- | --- | --- |
| 1 (TEM-350) | Members tab shows each member's Level number and the Provisional letter on a hatch (web) | none |
| 2 (TEM-351) | Level setters set a Group member's Level from the web Members tab | TEM-350 |
| 3 (TEM-352) | Home Level history shows Level sets like any Level change | TEM-351 |
| 4 (TEM-353) | Mobile: Members tab and Set Level screen for Level setters | TEM-350, TEM-351 |
| 5 (TEM-354) | The member gets a Notification when their Level is set | TEM-351, TEM-345 |

### Ticket 1 (TEM-350): Members tab shows Level number and Provisional letter

**What to build.**

- `groups.byId` adds `level` and `ratedMatchCount`, and makes `levelProvisional` idle-aware.
- The new fields go in `GroupLeaderboardEntryData`.
- `levelCellView` gains the provisional label.
- Web `LevelCell` gains the `level` prop and shows the letter on the hatch.
- The Members tab shows "C+ 3.8".

**Acceptance criteria.**

- A settled member shows the letter and the one-decimal Level.
- A Provisional member shows the letter and Level on a hatch, with screen-reader text that names Provisional.
- A member with no Rating shows the bare hatch.
- `levelProvisional` matches `ratings.me` after idle inflation.
- The Standing tab is unchanged.
- Mobile compiles and is unchanged.
- PGlite and domain tests pass.

### Ticket 2 (TEM-351): Level setters set a Group member's Level (web)

**What to build.**

- The `level_overrides` schema and migration (6.1).
- `require-level-setter` and `levelSetterProcedure`.
- `@repo/domain/level-slider` and `confirmedPhiForOverride`.
- `ratings.setLevel`.
- `viewerCanSetLevel` and `levelOverride` in `groups.byId`.
- The D5 wrong-score reversal change.
- A `FOR UPDATE` lock on `ratings` rows in `apply-rated-match` (D12, R2).
- On web: the member step, the Set Level step, the slider component, the saved banner and the "Set by" caption.
- `CONTEXT.md` (8.1) and the ADR (8.2).
- `levelSetter?: boolean` in `apps/web/src/types/globals.d.ts`.

**Acceptance criteria.**

- Only a Level setter who is a member sees tappable rows. Everyone else sees no change.
- The server refuses every case in 6.4.
- A set writes the audit row and the confirmed Rating.
- Home, Profile, Game seats, partner suggestions and the Game Level gate show the new Level on the next fetch, with no marker.
- The next Rated Match moves the Level from the set value.
- Setting again corrects the Level and adds a second audit row.
- Reversing a Match that came before a set succeeds. It keeps that player's Rating and restores the other players.
- The slider moves in 0.1 steps between 0.0 and 7.0, with letter ticks and a current-Level marker.
- The readout shows the letter, the Level, the delta, the distance to the next letter, and the percent through the letter.
- The arrow keys and the stepper both work.
- The five reasons are optional and stored.
- The banner has no Undo.
- Directly above the confirm button, the Set Level step says the Level becomes confirmed. For a Provisional member it also says they will no longer be Provisional and that setting again will not change that (U13).
- No copy says "rating", "admin" or "notified".
- `pnpm exec turbo run typecheck lint test` passes.

### Ticket 3 (TEM-352): Home Level history shows Level sets like any Level change

**What to build.** `ratings.me` history merges rating events and sets in time order (D6).

**Acceptance criteria.**

- After a set, the last sparkline point equals the hero Level.
- Set points have no special marker.
- `ratedMatchCount` is unchanged.

### Ticket 4 (TEM-353): Mobile Members tab and Set Level screen

**What to build.**

- Mobile `LevelCell` shows the letter and Level, with Provisional on a hatch.
- Rows are tappable, with a chevron, when `viewerCanSetLevel` is true.
- The "Set by" caption.
- A member `Sheet` with "Set Level" and the read-only latest set line.
- The slider primitive and the Set Level screen.
- The saved banner, without Undo.

**Acceptance criteria.**

- Matches web tickets 1 and 2 in display, rules and visibility.
- VoiceOver can adjust the slider.
- Reduce-motion is honoured.
- At most two mount animations.
- Tokens only, and the `Text` primitive for all text.

If this is too large for one pull request, split it into "Mobile Members tab and member sheet" (blocked by 1 and 2) followed by "Mobile Set Level screen" (blocked by that ticket).

### Ticket 5 (TEM-354): Notification when a Level is set

**What to build.**

- A `level_set` value in `notification_type`, with a nullable `level_override_id`.
- Emit the Notification to the target inside the `setLevel` transaction.
- `notification-copy`: "{setter} set your Level to {letter} {level}", with the reason as the subline.

**Acceptance criteria.**

- Follows the contract in the in-app Notifications spec.
- Clients ignore unknown types.

## 12. Risks

**R1. A mistaken set on a Provisional player cannot be made Provisional again. Accepted by the user (U13).** A set lowers φ to at most 150, and setting again never raises it. A Provisional player who is set by mistake stays confirmed even after the Level is corrected. Results then move them less than they would have while Provisional. Mitigation: the confirm step says clearly that the Level becomes confirmed, and for a Provisional member that this cannot be reversed by setting again (7.3, ticket 2). A support fix needs direct database access.

**R2. Match complete racing a set.** Today `apply-rated-match` reads the row without a lock. A concurrent complete could overwrite a set, or the other way round. Ticket 2 adds `FOR UPDATE` on the `ratings` rows in `apply-rated-match` and in the reversal's restore loop.

**R3. Slider inside the vaul Drawer.** Radix Slider handles keyboard and pointer input. Check that dragging the slider inside the Drawer does not close it.

**R4. A sparkline step after a reversal.** The point just before a set still reflects a Match that was later reversed (D5). It is a cosmetic step in history only. The current Level and the audit are correct.

**R5. Band on reversal.** `reportWrongScore` restores μ/φ/σ but not `level_band`. This is an existing gap and out of scope. It is noted because sets make mismatches between band and μ more visible.

**R6. Extra Clerk request on Group pages.** `groups.byId` calls `getPublicMetadata`, which costs one Clerk request per Group page view by a member. Call it only when the viewer is a member.

## 13. Open questions

None. All were answered on 2026-10-07 (5.1).

## Comments
