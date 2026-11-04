# RTL audit: Web App (`apps/web`)

Audited on `bd8c18c4`. Some findings were fixed on dev (`f8484c37`) after the audit; `spec.md` section 0 lists them, and `spec.md` wins where the two disagree.

Status: findings and fix spec. Nothing in production code was changed.

Related: `.scratch/arabic-localization/spec.md` (rules 1–7 are the baseline this audit checks against), ADR-0052, `CLAUDE.md` (Package boundaries, design system).

## 1. Method and coverage

**Environment.** Web App on `:3002`, API on `:4002`, Postgres on `:5434`, signed in as "Testa Phonedoor". Locale switched by writing the `temba-locale` cookie (same cookie `setLocaleAction` writes) and reloading; the LanguageToggle itself was seen on Settings, `/terms`, `/privacy`, `/onboarding/photo`, `/gr/*` and not-found. Arabic at 375×812 (phone) for every screen visited, desktop (1280×860) spot checks, then English at 375×812 on Home, Games hub, Game details (scored), Player profile and Settings.

**Tools.** Screenshots plus an injected audit script per page that reports: horizontal page overflow, computed physical `text-align`, clipped/ellipsised text, non-zero `letter-spacing` on Arabic text, Arabic text rendered in `font-mono`, lucide direction icons with/without a computed `scale: -1 1`, Latin-only strings in the `ar` locale, and bidi candidates (`+digits`, level bands, `n-n` scores). Bidi claims were confirmed by measuring glyph positions with `Range.getBoundingClientRect()`, not by eye.

**Fix simulation.** Because Radix Tabs force `dir="ltr"` (finding R1), every screen inside a Tabs root was audited twice: as shipped, then with a page-side shim that rewrote those `dir="ltr"` attributes to `rtl`, to see what is left once R1 is fixed. Findings marked "after R1" were seen only in the second pass.

**Test data.** Inserted into the local DB on `:5434`: one full upcoming Game (`aaaaaaaa-0000-4000-8000-000000000002`, "Thursday decider"), four notifications for the test user, two pending join requests on "Friday Night Padel". Three more Games I inserted were deleted by a concurrent session using the same DB; that session also created the tournament `bf4c362c-…` ("بطولة الخريف Autumn Cup"), the upcoming Games `cdba2da1-…`, `88101913-…` and the cancelled Game `68efb751-…`, which this audit used. No throwaway scripts were written. The SQL file lives only in the session scratchpad.

**Note for the parent.** `packages/i18n/src/plural.ts` has an uncommitted `AUDIT_TEMP_select` patch in this worktree. It is not from this audit (it says it belongs to another audit session and is "reverted before handback"). I left it alone.

### Coverage

| Route | Visited live | Locales / widths | Notes |
| --- | --- | --- | --- |
| `/dashboard` | yes | ar 375 + 1280, en 375 | |
| `/dashboard/games` (Upcoming, Played tabs) | yes | ar 375, en 375 | |
| `/dashboard/games/[id]`: upcoming, full, scored, cancelled, football (scored), tournament (live, knockout) | yes | ar 375 + 1280 (dialog), en 375 | actions sheet, cancel drawer, invite dialog (Players, Phone tabs), desktop actions dialog |
| `/dashboard/games/[id]/score` | yes | ar 375 | padel: API error (English, out of scope); football: locked state |
| `/dashboard/games/[id]/teams` | yes | ar 375 | locked state; make-teams UI seen on `/dashboard/design/football` |
| `/dashboard/games/[id]/share` | yes | ar 375 | football result story card |
| `/dashboard/games/[id]/partner` | code only | — | needs a tournament registration in progress |
| `/dashboard/games/new` (steps 1–4, calendar popover) | yes | ar 375 | stopped before submit |
| `/dashboard/games/new-tournament` | yes | ar 375 | redirects to `/games/new?type=friendly_tournament` |
| `/dashboard/groups` | yes | ar 375 | |
| `/dashboard/groups/[id]` (Standing, Games, Members, join requests, overflow) | yes | ar 375 + 1280 | |
| `/dashboard/groups/[id]/edit` | yes | ar 375 | |
| `/dashboard/groups/[id]/members/[userId]` | partly | ar 375 | only the "cannot set level" state was reachable; form audited from code |
| `/dashboard/groups/[id]/seasons`, `/seasons/new` | yes | ar 375 | |
| `/dashboard/groups/new` | yes | ar 375 | |
| `/dashboard/invites` | yes | ar 375 | empty state only |
| `/dashboard/notifications` | yes | ar 375 | |
| `/dashboard/players/[userId]`, `/matches` | yes | ar 375, en 375 | |
| `/dashboard/you`, `/dashboard/you/settings` | yes | ar 375, en 375 | |
| `/dashboard/teams`, `/teams/new` | yes | ar 375 | empty states |
| `/dashboard/teams/[id]` | code only | — | test user is not a member (stays on skeleton) |
| `/dashboard/venues`, `/venues/new`, `/venues/[id]`, `/dashboard/operator/groups`, `/dashboard/operator/levels` | gate only | ar 375 | Operator is Clerk `publicMetadata.operator`; changing it is an account-setting change, so the bodies are code only |
| `/dashboard/communities` | yes | ar 375 | hub is gated ("list restricted") |
| `/dashboard/communities/[id]` | yes | ar 375 | non-member view |
| `/dashboard/communities/new` | code only | — | |
| `/dashboard/design/football`, `/design/tournament` | yes | ar 375 | dev previews with English fixtures; used to see components the live data could not reach |
| `/dashboard/design/game-details` | code only | — | dev preview |
| `/onboarding`, `/onboarding/sports`, `/onboarding/photo` | yes | ar 375 | |
| `/onboarding/name`, `/onboarding/email` | code only | — | |
| `/login`, `/login/[...slug]`, `/login/factor-two`, `/login/sso-callback`, `/signup`, `/signup/[...slug]`, `/signup/continue`, `/signup/sso-callback` | code only | — | viewing them means signing out, which the brief forbids |
| `/invites/{game,group,team,community}/link/[token]`, `/g/[code]` | code only | — | no game links in the DB; tokens not created |
| `/gr/[code]` | yes | ar 375 | expired-link state |
| `/terms`, `/privacy` | yes | ar 375 | |
| not-found, root `error.tsx` | yes | ar 375 | error page seen when the API dropped a request |
| `/` (`app/page.tsx`) | code only | — | redirect |

## 2. Screen table

Severity: **blocker** = unreadable or broken; **major** = wrong reading order or mirrored wrongly; **minor** = polish. A screen takes the worst severity of its findings. Finding ids (R1…) are in section 3.

| Route / screen | Status | Severity | Findings |
| --- | --- | --- | --- |
| `/dashboard` Home | needs fix | minor | R12 mono font on Arabic, R11 letter-spacing on Arabic, R14 Latin comma in lists |
| `/dashboard/games` Games hub | needs fix | major | R1 Tabs force LTR (chip order, card layout, tab order); R8 "+3" shows as "3+"; R7 score separators; R12 |
| `/dashboard/games/[id]` friendly | needs fix | **blocker** (desktop) | R2 desktop dialogs off-screen; R4 Left/Right seats mirrored; R6 "C+" shows "+C"; R5 sheet chevrons not mirrored, Leave icon; R8 "@handle" shows "handle@", "+973" shows "973+"; R14; R16 short names "أحمد ا" |
| `/dashboard/games/[id]` football | needs fix | major | R2; R15 FWD/MID/DEF/GK in English; R6 |
| `/dashboard/games/[id]` tournament | needs fix | major | R1 (standings Tabs); R7 round-result score sits next to the wrong team; R15 "Final", "S1", "S2"; R10 truncation eats a partner's name; R8 "+4"; R14 "11:00 ص, Court 1" |
| `/dashboard/games/[id]/score` | OK | — | locked state fine; score-entry component fine on design preview (API error text is English: out of scope per localization spec) |
| `/dashboard/games/[id]/teams` | OK | — | make-teams arrows mirror correctly |
| `/dashboard/games/[id]/share` | needs fix | major | R1 (Story/Sticker Tabs); R15 "SETS", "SCORERS", "YOU"; R11 wide tracking on Arabic in the card; R8 "1080 × 1920" reversed |
| `/dashboard/games/[id]/partner` | needs fix (code) | major | R6 level bands in the partner picker; R4 if seats are shown |
| `/dashboard/games/new` | needs fix | major | R6 level-band grid shows "+D", "-C"; R12; R17 keyboard arrows |
| `/dashboard/games/new-tournament` | OK | — | redirect; steps, stepper and calendar mirror correctly |
| `/dashboard/groups` | needs fix | major | R1 (Mine / Public Tabs) |
| `/dashboard/groups/[id]` | needs fix | **blocker** (desktop) | R1 whole page LTR on desktop and "نقاط" header clipped; R2 overflow dialog off-screen; R10 "…onedoor"; R7 played rows; R9 date split by names; R18 stray scrollbar on season sub-tabs |
| `/dashboard/groups/[id]/edit` | needs fix | **blocker** | R3 Switch thumb leaves its track; R5 Transfer ownership chevron |
| `/dashboard/groups/[id]/members/[userId]` | needs fix (code) | major | R13 level slider ticks and end labels disagree in RTL (and break further once R1 lands) |
| `/dashboard/groups/[id]/seasons` | OK | — | "3 / 1 / 0" reads correctly; progress fills from the start |
| `/dashboard/groups/[id]/seasons/new` | OK | — | calendar navigation mirrors correctly |
| `/dashboard/groups/new` | needs fix | **blocker** | R3 Switch |
| `/dashboard/invites` | needs fix (code) | major | R8 phone numbers in lookup rows (`lookup-user-select.tsx:143`); empty state OK |
| `/dashboard/notifications` | needs fix | minor | R10 truncation drops a Latin word from the middle of the title |
| `/dashboard/players/[userId]` | needs fix | major | R6 hero "C+" shows "+C"; R4 court-side diagram mirrored ("Right side" highlights the left half); R10; R19 stray border (both locales) |
| `/dashboard/players/[userId]/matches` | needs fix | major | R9 "Omar Aziz, 3 فوز، 2 خسارة" puts the 3 before the name; R10 |
| `/dashboard/you` | needs fix | minor | R15 W/L glyphs in English; R16 |
| `/dashboard/you/settings` | needs fix | major | R4 Preferred Position segments mirrored; R11, R12 eyebrows |
| `/dashboard/teams`, `/teams/new` | OK | — | |
| `/dashboard/teams/[id]` | needs fix (code) | major | R1 (Radix Select content forced LTR) |
| `/dashboard/venues/*` | needs fix (code) | major | R1 (Select); R8 "@username" in managers list |
| `/dashboard/operator/groups`, `/operator/levels` | needs fix (code) | minor | R20 Sheet slides in from the wrong side; R8 "@username" |
| `/dashboard/communities` | OK | — | gate state |
| `/dashboard/communities/[id]` | needs fix (code) | major | R1 (member view uses Tabs); non-member view OK |
| `/dashboard/communities/new` | needs fix (code) | minor | R17 keyboard arrows |
| `/dashboard/design/*` | dev only | — | inherit R6, R10, R4 from the real components; preview column overflows by ~25px in both directions (not RTL); no fix asked |
| `/onboarding` | needs fix | major | R8 "+1 555 555 0142" shows "0142 555 555 1+" |
| `/onboarding/sports`, `/photo` | needs fix | minor | R12 mono breadcrumbs |
| `/onboarding/name`, `/email` | OK (code) | — | |
| `/login`, `/signup`, `/signup/continue`, `/login/[...slug]`, `/signup/[...slug]` | needs fix (code) | major | R8 phone field "+973" and country list; R8 "sent to +…" sentence; R8 OTP cells fill right-to-left so the code reads reversed |
| `/login/factor-two` | needs fix (code) | major | R8 OTP |
| `/login/sso-callback`, `/signup/sso-callback` | OK (code) | — | |
| `/invites/*/link/[token]`, `/g/[code]` | needs fix (code) | minor | R8 levels and phones inside invite copy; `/gr` expired state OK |
| `/terms` | needs fix | minor | R15 "27 OCTOBER 2026" in English |
| `/privacy`, not-found, error | OK | — | |

## 3. Findings and fixes

Grouped by root cause. Each lists the screens it covers, the cause with `file:line`, and the exact fix.

### R1. Radix primitives render `dir="ltr"` inside an RTL page (major, every Tabs/Select/DropdownMenu/Slider screen)

What is wrong in Arabic: everything inside a Radix Tabs root lays out left-to-right. On the Games hub the sport chips run "All, Padel, Football" from the left, the first tab sits on the left and card rows are mirrored back to LTR. On desktop the Group home is entirely LTR and the Standing table's "نقاط" header is clipped (`screens/web/dashboard-groups-id-desktop-tabs-ltr-ar.jpg`, `dashboard-games-ar.jpg`).

Cause: there is no `DirectionProvider`, so every Radix primitive defaults to `ltr` and writes `dir="ltr"` on its root (seen on `div[data-slot=tabs]`). Affects Tabs (`components/ui/tabs.tsx:14`; consumers: `app/dashboard/games/page.tsx`, `app/dashboard/games/[id]/page.tsx`, `app/dashboard/groups/page.tsx`, `app/dashboard/groups/[id]/page.tsx`, `app/dashboard/communities/[id]/page.tsx`, `components/groups/group-home-chrome.tsx`, `components/communities/community-home-chrome.tsx`, `components/share-result/share-result-page.tsx`, `components/invites/invite-dialog-view.tsx`, `components/games/tournament-standings-section.tsx`), Select content (`components/ui/select.tsx`; phone country list, teams, venues), DropdownMenu content and its submenu chevron (`components/ui/dropdown-menu.tsx`), Slider (`components/ui/slider.tsx`), and keyboard arrows in Tabs.

Fix: in `apps/web/src/components/locale-provider.tsx:69`, wrap children in Radix's direction provider: `import { Direction } from "radix-ui"` and render `<Direction.Provider dir={value.direction}>{children}</Direction.Provider>` inside `LocaleContext.Provider`. One change; no per-component edits. R13 must land in the same pull request (the level slider is the one place that relies on the slider staying LTR).

Verify: in Arabic, `document.querySelectorAll('[dir="ltr"]')` returns only the intentional ones (`/terms` body and the ones this spec adds); Games hub first tab and "الكل" chip are on the right; Group home desktop Standing table has rank on the right and points on the left; arrow keys in a tab list move toward the visually adjacent tab.

### R2. Desktop dialogs are pushed off-screen in RTL (blocker, every desktop dialog)

What is wrong: at ≥640px the responsive dialog renders as a centred Dialog. In Arabic its box measured `left −128px … right 384px` on a 1280px viewport: half the dialog is off-screen (`dashboard-games-id-dialog-desktop-ar.jpg`, `dashboard-groups-id-overflow-dialog-desktop-ar.jpg`). This hits the Game actions dialog, Group overflow dialog, cancel/leave confirmations and every other `ResponsiveDialog` (27 consumers) on desktop. Mobile drawers are unaffected.

Cause: `components/ui/dialog.tsx:67` uses `start-[50%]` with `translate-x-[-50%]`. In RTL `start` becomes `right: 50%`, but the translate still moves the box left, so it ends up a full box-width left of centre. The logical-class rewrite turned a direction-neutral centring (`left-1/2 -translate-x-1/2`) into a direction-dependent one.

Fix: in `dialog.tsx:67` replace `start-[50%]` with `left-[50%]`. Centring is physical by nature; keep `translate-x-[-50%]`. Same pattern, same fix:
- `components/ui/button.tsx:11` hit-area pseudo-element: `after:start-1/2` → `after:left-1/2` (the 44px touch target is currently shifted by its own width in RTL).
- `components/ui/sidebar.tsx:298` rail: `-translate-x-1/2` with `after:start-1/2` → add `rtl:translate-x-1/2` (desktop hover handle only).

Verify: Arabic at 1280 wide, open Game actions on `/dashboard/games/[id]` and the overflow on `/dashboard/groups/[id]`: the dialog's left and right gaps are equal. Same in English.

### R3. Switch thumb leaves its track (blocker, Group create and edit)

What is wrong: off state, the thumb sticks 3px out of the track's right end; on state, it sits entirely outside the track (track `35–85px`, thumb `84–108px`), so the control shows no state (`dashboard-groups-id-edit-switch-off-ar.png`, `…-switch-on-ar.png`).

Cause: `components/ui/switch.tsx:24` uses physical `translate-x-[3px]` / `data-[state=checked]:translate-x-[23px]`. In RTL the thumb starts at the right, so a positive translate pushes it out.

Fix: append `rtl:-translate-x-[3px] rtl:data-[state=checked]:-translate-x-[23px]` to that class list.

Verify: `/dashboard/groups/new` and `/dashboard/groups/[id]/edit` "Requires approval": in Arabic the off thumb sits flush right inside the track and the on thumb flush left; in English the reverse; toggling animates inside the track both ways.

### R4. Court sides (Left / Right) are mirrored with the layout (major)

What is wrong: padel seat "Left" means the left side of the court. In Arabic the Left seat ("يسار") is drawn on the right and "يمين" on the left (`dashboard-games-id-lineup-ar.jpg`). On the player profile "الجهة اليمنى" (Right side) highlights the left half of the court diagram (`dashboard-players-userId-position-ar.png`; English is correct). Settings shows the Preferred Position segments as يسار | يمين | أي جهة from the right.

Cause: left/right pairs are rendered as flex rows (or grid cells) in data order, so `dir="rtl"` mirrors them.
- `components/games/game-lineup-section.tsx:201` (`<div className="flex">` over `["left","right"]`)
- `components/games/friendly-game-join-sheet.tsx:243`
- `components/games/tournament-hero.tsx:134`
- `components/games/tournament-teams-section.tsx:241`
- `components/games/tournament-half-teams-panel.tsx:316` (preview seats) and the matching row in `components/games/tournament-merge-drawer.tsx`
- `components/players/player-position-card.tsx:27` (court diagram)
- `components/settings/preferred-position-control.tsx:86` (grid of Left / Right / Either)

Fix: keep court geometry physical. Add `rtl:flex-row-reverse` to each flex row above (and the divider between seats keeps its place because it is symmetric). For the aria-hidden court diagram in `player-position-card.tsx:27`, add `dir="ltr"` instead. For the settings grid (`grid-cols-3`), add `dir="ltr"` on the `RovingRadioGroup` and `dir="rtl"` on each button's label span so Left stays on the left; or use `rtl:[direction:ltr]` on the grid. Text inside the seats keeps its own direction. Decision D2 in section 5 confirms the intent.

Verify: Arabic, `/dashboard/games/[id]` lineup: "يسار" on the left of each team, "يمين" on the right; join sheet and tournament hero match; `/dashboard/players/[userId]` "الجهة اليمنى" highlights the right half; Settings shows يسار at the left. English unchanged.

### R5. Direction icons that are not mirrored (major)

What is wrong: trailing chevrons in sheet menus point right (`›`) in Arabic, toward the start instead of the end (`dashboard-games-id-actions-sheet-ar.jpg`). The Leave icon's arrow points right.

Cause and fix:
- `components/common/sheet-menu.tsx:70`: add `trailing === "chevron" && "rtl:-scale-x-100"` to the `Trailing` icon classes. Covers the Game actions sheet (`components/games/game-actions-sheet.tsx`), Group overflow (`components/groups/group-home-overflow-menu.tsx`), Group edit "Transfer ownership" (`app/dashboard/groups/[id]/edit/page.tsx`), the join sheet and the create-game type step.
- `LogOut` used as "Leave" in `components/games/friendly-game-menu.tsx`, `components/groups/group-home-overflow-menu.tsx`, `app/dashboard/games/[id]/page.tsx`: add `iconClassName`/`className` `rtl:-scale-x-100` (minor). The `SheetMenuRow` `icon` prop needs an `iconClassName` pass-through for this.
- `components/home/level-card.tsx:93` trend arrows (`ArrowUpRight` / `ArrowDownRight` / `ArrowRight`): add `rtl:-scale-x-100`, matching `components/games/game-rating-impact-block.tsx:61`, which already mirrors the same set (minor, consistency).

Already correct (no change): back buttons (`nav-icon-button.tsx:124`), all `ChevronRight` row affordances outside `sheet-menu`, `dropdown-menu.tsx:220`, create-game Continue arrow, football make-teams move arrows, calendar month navigation (react-day-picker receives `dir`).

### R6. Level bands render reversed: "C+" shows as "+C", "B-" as "-B" (major)

What is wrong: any band that ends its text run in an Arabic context shows its sign first: player hero "+C" (`dashboard-players-userId-level-ar.jpg`), create-game level grid "+D -C +C -B +B" (`dashboard-games-new-step4-levels-ar.jpg`), seat sublines "يمين · C+" render as "+C · يمين", football and tournament player chips (`dashboard-design-football-levels-truncation-ar.jpg`).

Cause: the trailing `+`/`-` is a neutral between the Latin letter and the RTL paragraph end, so the bidi algorithm gives it RTL direction.

Fix, two parts:
1. Elements whose whole text is a band (or a band plus a number) get `dir="ltr"`: `components/temba/level-band-badge.tsx:27`, `components/temba/level-cell.tsx`, `components/temba/level-choice-grid.tsx` (cell label), `components/players/player-level-card.tsx:40`, `components/you/profile-level-card.tsx`, `components/home/level-card.tsx`, `components/home/home-level-block.tsx`, `components/games/game-level-band-select.tsx`, `app/dashboard/games/new/_parts/level-band-row.tsx`, `components/groups/level-slider.tsx` (value bubble), and the band spans in `football-pool-grid.tsx`, `football-team-columns.tsx`, `football-player-dialog.tsx`, `football-make-teams.tsx`, `tournament-teams-section.tsx`, `tournament-half-teams-panel.tsx`, `tournament-summary-card.tsx`, `friendly-game-partner-picker.tsx`, `friendly-game-partner-review.tsx`, `friendly-game-join-sheet.tsx`, `game-seat-grid.tsx`, `game-edit-dialog.tsx`, `group-members-tab.tsx`, `group-join-requests-section.tsx`, `set-level-form.tsx`.
2. Where a band is interpolated into a sentence, the Arabic catalog leaf or domain formatter wraps it with the `ltr()` helper from R8 (for example the seat subline built by `courtSeatSubline` in `@repo/domain`, used at `components/games/game-lineup-section.tsx:129`, and `formatLevelRangeLabel` / `formatLevelRangeProseLabel` in `packages/domain/src/level-range.ts:200,229`).

Do not wrap the band string returned by `displayLabelFromStoredBand` itself: `level-band-badge.tsx:22` reads `label.charAt(0)` to pick a style.

Verify: Arabic, `/dashboard/players/[userId]` hero reads "C+"; `/dashboard/games/new` step 4 grid reads "D D+ C- C C+ B- B B+ A"; Game details seat sublines read "يمين · C+". The audit check: no visible text node matching `^[+-][A-E]$`.

### R7. Scores: hyphen and en dash disagree, so the first number lands on the wrong side (major)

What is wrong: in Arabic, a score formatted with an en dash ("6–4") is reordered by bidi so the first number is on the right, next to the viewer's side, which is also on the right. A score formatted with an ASCII hyphen ("6-4") stays LTR, so the first number is on the left, next to the opponent. Both kinds sit side by side. The visible defect: tournament round results put the winner's games next to the loser (`dashboard-games-id-tournament-rounds-ar.jpg`), and group played rows read "7-5 3-6 6-4" with every set internally reversed against the row (`dashboard-groups-id-games-played-ar.jpg`).

Cause: mixed separators in `@repo/domain`. Hyphen: `group-home-chrome.ts:166,232,233`, `tournament-card.ts:378,443`, `tournament-knockout.ts:449`. En dash: `match-history-card.ts:130`, `friendly-game-hero.ts:216,232`, `friendly-game-court.ts:145,167`, `profile-all-time.ts:72,78`, `player-profile-matches.ts:193`, `player-profile-football.ts:148`, `home-recent-form.ts:105,107`, `season-standing.ts:312`, `game-result-share.ts:303,321`, and `components/games/football-game-card.tsx:161`.

Fix:
1. Every score and record uses the en dash "–" (U+2013), never "-". Change the seven hyphen sites above.
2. Add a `ScoreText` primitive in `components/temba/score-text.tsx`: `<bdi dir={direction} className="tabular-nums">{text}</bdi>`, with `direction` from `useTextDirection()`. Render every standalone score/record through it (row scores in `group-played-row.tsx:59`, tournament round-result rows, `match-history-card`, `recent-form-card.tsx:31`, profile all-time cards, football hero). The isolate stops a preceding Latin name from turning the digits LTR (bidi rule W7), which is what happens today in "Omar Aziz, 3–1".
3. Leave per-side numbers that are separate flex cells (set-by-set grids, the football hero "4 | 3") as they are: they already mirror with the layout.

Decision D1 in section 5 confirms that the first number reads from the start side in Arabic.

Verify: Arabic `/dashboard/games/[id]` (tournament) round results: the winning pair's games are adjacent to the winning pair; `/dashboard/groups/[id]?tab=games` played rows: each set's viewer games sit on the right. English unchanged.

### R8. Phone numbers, handles, "+N" counters, codes and dimensions need LTR isolation (major)

What is wrong in Arabic:
- "+1 555 555 0142" shows as "0142 555 555 1+" on `/onboarding` (`onboarding-phone-ar.jpg`).
- The phone field's country code shows "973+" and its country list "البحرين 973+" (`dashboard-games-id-invite-phone-ar.jpg`). The field puts the code on the right of the number.
- "@aishab" shows as "aishab@" in the invite dialog (`dashboard-games-id-invite-handles-ar.jpg`).
- "+3" / "+4" overflow counters show as "3+" / "4+".
- OTP: the six cells are a grid, so the first typed digit lands in the rightmost cell and "424242" reads "242424" left to right (code only).
- Story card "1080 × 1920" reads as height × width.

Cause and fix: add one helper to `@repo/i18n` (it is copy-shaping, and both Apps and `@repo/domain` may import it):

```ts
// packages/i18n/src/bidi.ts
export const ltr = (text: string) => `⁦${text}⁩`;   // LRI … PDI
export const isolate = (text: string) => `⁨${text}⁩`; // FSI … PDI
```

Then:
- `components/auth/phone-field.tsx:64`: `dir="ltr"` on the `InputGroup` (the whole composite reads LTR: flag, "+973", number). Lines 97 and 107 then render correctly inside it; wrap the country name at line 107 in `<bdi>` so Arabic names keep their own direction.
- `components/ui/otp-input.tsx:55`: `dir="ltr"` on the root.
- Phone values shown as text: `components/onboarding/profile-checklist-screen.tsx:323` value element `dir="ltr"`; `components/invites/lookup-user-select.tsx:143` `<bdi dir="ltr">`; `components/settings/settings-footer.tsx:21` wrap the phone with `ltr()`.
- Phone inside sentences: the Arabic leaf `webAuth.verify.sentTo` (`packages/i18n/src/messages/ar/web-auth.ts`) and the calling-code `aria` leaf at `ar/web-auth.ts:33` wrap the number with `ltr()`.
- Handles: `packages/domain/src/invite-door.ts:63`, `components/venues/venue-managers-section.tsx:95,136`, `app/dashboard/operator/levels/page.tsx:58` use `ltr(\`@${username}\`)`.
- Counters: `components/common/avatar-stack.tsx:73`, `components/games/tournament-summary-card.tsx:215` render `<bdi dir="ltr">+{n}</bdi>`; `packages/i18n/src/messages/ar/game.ts:376` (`namesMore`) becomes `` `${named} و${rest} آخرون` `` through `plural()` or uses `ltr(\`+${rest}\`)`.
- Signed deltas: `packages/domain/src/player-profile-matches.ts:123`, `packages/domain/src/level-slider.ts:85` wrap with `ltr()`.
- Story dimensions in `components/share-result/*` (the "1080 × 1920 · قصة" meta): `<bdi dir="ltr">`.

Verify: Arabic `/onboarding` shows "+1 555 555 0142"; invite dialog Phone tab shows "🇧🇭 +973" to the left of the number; Players tab shows "@aishab"; tournament card shows "+4"; on `/login` (code review, or sign in again on a second session) OTP digits fill left to right.

### R9. Latin names glue to the following digits and split dates or counts from their words (major)

What is wrong:
- `/dashboard/players/[userId]/matches` subtitle "Omar Aziz, 3 فوز، 2 خسارة" renders with "3" before the name, detached from "فوز".
- Group played rows "Maya C، Tom B، 3 نوفمبر" render the day number at the far right, separated from "نوفمبر" by the names.

Cause: bidi rule W7. A European digit after a Latin letter becomes LTR and joins the name's run. Strings built by concatenation make it worse.
- `components/players/player-matches.tsx:85` builds `` `${name}, ${record}` `` in the component (Latin comma, no catalog leaf).
- `packages/domain/src/group-home-chrome.ts:204` (`groupPlayedOpponentLine`) joins names then the day.

Fix:
- Add a catalog leaf `webUi.player.matchesSubtitle(name, record)` in `packages/i18n/src/messages/{en,ar}/web-ui.ts` (ar: `` `${isolate(name)}، ${record}` ``) and use it at `player-matches.tsx:85`.
- In `groupPlayedOpponentLine` wrap each name with `isolate()` before joining.
- Rule for all copy functions: a user-provided name interpolated into an Arabic leaf is wrapped with `isolate()`. Apply it first to leaves where the name is followed by digits or punctuation: names lists in `played-game.ts:106,118`, `friendly-game-partner.ts:214`, `match-history-card`, notification titles (`packages/domain/src/notification-copy.ts`).

Verify: Arabic `/dashboard/players/[userId]/matches`: the subtitle reads name, then "3 فوز، 2 خسارة" in order; `/dashboard/groups/[id]?tab=games`: "3 نوفمبر" stays together at the end of the line.

### R10. Truncation clips the wrong part of mixed-script text (major for names, minor for meta lines)

What is wrong:
- A Latin name in a truncating RTL box loses its start: "…onedoor" for "Testa Phonedoor" on the group Standing (`dashboard-groups-id-standing-ar.jpg`), "…sal A", "…san A" on football chips.
- Pair labels "Testa Phonedoor / أحمد الخليفة" lose the partner and the first letter: "…esta Phonedoor".
- Meta lines with a mixed-script Game name drop a word from the middle: "بطولة الخريف …tumn Cup" (player match rows), "…بطولة الخريف Cup" (notifications: "Autumn" vanishes; `dashboard-notifications-ar.jpg`).

Cause: `text-overflow: ellipsis` clips at the visual end edge (left in RTL). An LTR run inside an RTL box overflows to the left, so its beginning is cut.

Fix:
- Single user-generated name in a `truncate` box: add `dir="auto"` to that element so a Latin name truncates "Testa Ph…". Apply in `components/common/member-row.tsx`, `components/common/row-list.tsx` (title slot), `components/groups/group-standing-tab.tsx` (player cell), `components/games/football-*` player chips, `components/games/tournament-*` team cells. `components/home/up-next.tsx:184,194` already does this; copy that pattern.
- Pair labels "A / B": render as two spans, each `min-w-0 truncate` with `dir="auto"`, with the "/" between them (tournament standings, round results, knockout cards, `components/games/tournament-standings-section.tsx` and the round-result rows it renders).
- Meta and notification lines that mix copy and user content: replace `truncate` with `line-clamp-1` (wraps at word boundaries, so whole words drop instead of half of one) in `components/players/player-match-row.tsx:27,29` (meta lines). Notification titles render through `ListRow` (`components/common/row-list.tsx`, used by `app/dashboard/notifications/page.tsx`): give `ListRow` a `titleClamp` option (`"truncate"` default, `"lines"` → `line-clamp-2`) and pass `"lines"` from the notifications page, so other `ListRow` callers keep single-line names with `dir="auto"`.

Verify: Arabic `/dashboard/groups/[id]` Standing shows "Testa Ph…" at 375px; tournament standings show each partner name truncated on its own; `/dashboard/notifications` keeps "Autumn" or drops whole trailing words.

### R11. Letter-spacing and uppercase applied to Arabic (minor, app-wide)

What is wrong: eyebrows, chips and headings use `tracking-[…]` (141 sites) and `font-expanded` (−0.03em). On Arabic this pulls joined letters apart ("الأ شخا ص" on Settings) or crowds them. The share story uses 2.6–2.9px tracking on Arabic labels. `uppercase` is harmless on Arabic but signals the same intent.

Fix: one global rule in `apps/web/src/styles/globals.css`, after the `@layer base` block:

```css
:lang(ar) { letter-spacing: 0 !important; }
```

`!important` is needed to beat utilities on the same element. Latin names inside Arabic UI lose their tracking too; that is acceptable. Do not edit the 141 call sites.

Verify: in Arabic, `getComputedStyle(el).letterSpacing` is `0px` on every element; in English it is unchanged.

### R12. `font-mono` has no Arabic fallback (minor, app-wide)

What is wrong: mono eyebrows ("1 هذا الأسبوع", "اللعب", "الخطوة 1 من 4", chips "بادل") render Arabic in whatever system font the browser picks after Geist Mono, which looks unlike the rest of the page.

Cause: `apps/web/src/styles/globals.css:20` `--font-mono` stack lacks `var(--font-arabic)`. `--font-sans` and `--font-display` include it.

Fix: `--font-mono: var(--font-mono), var(--font-arabic), ui-monospace, …`. Latin and digits stay in Geist Mono; Arabic falls through to Noto Sans Arabic.

### R13. Level slider: ticks are physical, labels and thumb are not (major, set-level form)

What is wrong (code): `components/groups/level-slider.tsx` positions the value bubble, the "now" marker, the band ticks and letters with `style={{ left: leftAt(…) }}` (lines 33, 56, 64, 71, 80) and `-translate-x-1/2`. The start/end labels below use `flex justify-between` (line 87), which mirrors. Today the Radix slider is LTR (R1), so ticks and thumb agree and the end labels are swapped. After R1 the thumb runs right-to-left while the ticks stay left-to-right.

Fix (Decision D3): treat the level scale as a number line that is LTR in both locales. Put `dir="ltr"` on the component's root `<div className="px-4">` and pass `dir="ltr"` to `<Slider>` (Radix accepts it and it overrides the provider). Keep Arabic text in the bubble and "now" label readable by giving those spans `dir="auto"`.

Verify: Arabic, set-level form for a Group member (needs a member the test user can set): D is at the left end, the thumb and the bubble move together, and the "now" marker sits under the current level.

### R14. Latin comma in joined lists (minor)

What is wrong: "الصورة, البريد", "الثلاثاء 3 نوفمبر, أضف النتائج", "11:00 ص, Court 1", "غدًا 6:00 م, Court 1".

Cause: `.join(", ")` in Apps and domain: `components/home/profile-checklist-card.tsx:114`, `components/home/up-next-model.ts:149,175,188,215`, `components/home/up-next.tsx:260,266`, `components/invites/invite-door-dialog.tsx:85`, `components/games/football-score-entry.tsx:203,214`, `components/games/football-game-details.tsx:354`, and in `@repo/domain`: `friendly-game-chrome.ts:104`, `create-game-flow.ts:882,895`, `tournament-card.ts:347,421`, `played-game.ts:106,118`, `game-edit-form.ts:39`, `friendly-game-partner.ts:214`.

Fix: add `common.listSeparator` to `packages/i18n/src/messages/en/common.ts` (`", "`) and `ar/common.ts` (`"، "`), and join with `messagesFor(locale).common.listSeparator` (domain) or `m.common.listSeparator` (Apps). `" · "` separators are fine and stay.

### R15. English left in the Arabic UI (minor unless noted)

| Text | Where | Fix |
| --- | --- | --- |
| "W" / "L" / "D" result glyphs | `components/home/home-recent-form-row.tsx:107`, `packages/domain/src/home-recent-form.ts:41-46` | catalog `common.winLetter/lossLetter/drawLetter` (en W/L/D, ar ف/خ/ت); domain takes `locale` |
| "Final", "S1", "Q1", "R16-1" knockout codes, shown in cards and in "الفائز في S1" | `packages/domain/src/tournament-knockout.ts:324-339` | keep `knockoutMatchCode` as an id if anything compares it; add `knockoutMatchLabel(round, position, roundCount, locale)` with catalog leaves in `tournament.knockout` (ar: "النهائي", "نصف النهائي 1", "ربع النهائي 1", "دور الـ16 – 1") and use it for display and inside `winnerOf` |
| "FWD", "MID", "DEF", "GK" | `packages/domain/src/football-lineup.ts:19-21,44` | Decision D4; if translated: catalog `football.positionCode.*` (ar هجوم / وسط / دفاع / حارس), domain takes `locale` |
| "SETS", "SCORERS", "YOU" on the result story | `components/share-result/story-cards.tsx:149,259,284,362` | catalog keys in `webUi.shareResult` (ar الأشواط / المسجّلون / أنت) |
| "27 OCTOBER 2026" on `/terms` | `packages/domain/src/terms.ts:13` (`TERMS_UPDATED` string) | store an ISO date and format with the `dates` formatter and `locale` at `app/terms/page.tsx:44` |
| `/gr/[code]` and other public pages fall back to the English metadata title "Temba - the future of competitive sports" | `app/layout.tsx:21` `description`; `/gr` and `/g` `generateMetadata` error paths | catalog title/description via `getRequestMessages()` |

### R16. Arabic short names and initials keep the definite article (minor)

What is wrong: "أحمد الخليفة" becomes "أحمد ا" and initials "أا"; "فاطمة المنصوري" becomes "فا".

Cause: `packages/domain/src/player-name.ts:18` and `packages/domain/src/initials.ts:17` take the first grapheme of the last word, which is the "ا" of "ال".

Fix: in both functions, when a word starts with "ال" and has more than two letters, use the third letter (أحمد خ, initials أخ). Add a unit test with "أحمد الخليفة".

### R17. Keyboard arrows in custom radio groups move the wrong way (minor, a11y)

Cause: `packages/domain/src/roving-radio.ts:15-20` maps ArrowLeft to previous and ArrowRight to next regardless of direction. Used by `components/ui/roving-radio-group.tsx` (create-game steps, Groups list, community create, Settings).

Fix: add a `direction: "ltr" | "rtl"` parameter (default `"ltr"`), swap ArrowLeft/ArrowRight when `"rtl"`, pass `useTextDirection()` from `roving-radio-group.tsx`. Extend `roving-radio.test.ts` with an RTL case.

### R18. Season sub-tabs show a stray vertical scrollbar (minor, both locales)

Cause: `components/groups/group-standing-tab.tsx:530` `overflow-x-auto` with 1px of vertical overflow (scrollHeight 44, clientHeight 43) makes `overflow-y` compute to `auto`. The scrollbar shows at the left in Arabic and at the right in English.

Fix: add `overflow-y-hidden` to that class list.

### R19. 2×2 stat grids draw a border on the outer edge (minor, both locales)

Cause: `divide-x` on a two-column grid with four children gives the second child an end border at the card edge: `components/players/player-overall-card.tsx:10`. Same pattern in `components/players/player-streaks-card.tsx:13`, `components/groups/group-games-tab.tsx:121`, `components/groups/groups-list-empty.tsx:51`, `components/games/games-hub-empty.tsx:59` (check each: two-child grids are fine).

Fix: on four-cell grids replace `divide-x` with `[&>*:nth-child(odd)]:border-e` (logical, so it stays correct in RTL).

### R20. Side sheets slide in from the wrong edge (minor)

Cause: `components/ui/sheet.tsx:68,70` pair `end-0` / `start-0` with physical `slide-in-from-right` / `slide-in-from-left`. In RTL a `side="right"` sheet sits at the left and slides across the screen from the right. Used by `app/dashboard/operator/levels/page.tsx:200`, `app/dashboard/games/new/_parts/venue-field.tsx:204` (when not bottom) and the mobile sidebar.

Fix: `slide-in-from-right` → `slide-in-from-end`, `slide-out-to-right` → `slide-out-to-end`, and `…left` → `…start` (tw-animate-css 1.4 ships the logical variants).

### Checked and correct (do not change)

- `divide-x` and `space-x` are logical in Tailwind 4.1 (`border-inline-*`, `margin-inline-*`).
- Progress bars and seat meters fill from the start side: season progress, win-rate bar, create-game step bar, onboarding step bar, game-card seat meter, up-next occupancy.
- Form strips: oldest first reads toward the end in both directions.
- `toLocaleString` with a literal locale exists only in `app/dashboard/design/game-details/page.tsx:80` (dev preview, allowed by the localization spec). `components/ui/calendar.tsx:207` `toLocaleDateString()` feeds a `data-day` attribute, not copy.
- Calendar (react-day-picker) gets `dir` and mirrors its navigation; weekdays run Sunday at the right.
- Time "8:23 م", price "5.500 د.ب", "2/4", "3 / 1 / 0" and "#2 من 10" read correctly.
- Arabic glyphs do not clip vertically at the type scale's tight line heights (hero 48/46, display 36/38) in any screen visited.
- Toasts (code only, none triggered): Sonner reads `document.documentElement.dir` and has RTL rules for icon and close-button placement.

## 4. Cross-cutting rules for the implementer

1. Centring is physical: `left-1/2 -translate-x-1/2`, never `start-1/2` with a translate.
2. Any `translate-x` that moves something along the reading direction needs an `rtl:` counterpart (switch thumbs, sliding indicators).
3. Court geometry is physical. Left and Right seats, court diagrams and the Preferred Position control keep Left on the left in both locales.
4. A level band, a phone number, an `@handle`, a code, a `+N`, a signed delta or a dimension pair is LTR content. Whole-element: `dir="ltr"`. Inline in JSX: `<bdi dir="ltr">`. Inside a string: `ltr()` from `@repo/i18n/bidi`.
5. A user-provided name interpolated into Arabic copy is wrapped with `isolate()`. A user-provided name alone in a truncating element gets `dir="auto"`.
6. Scores and records use the en dash and render through `ScoreText`. No ASCII hyphen between two numbers that mean two sides.
7. Lists join with `common.listSeparator`, never `", "`.
8. Direction icons that point along the reading direction get `rtl:-scale-x-100`; icons that point at a fixed thing (down, up, external) do not.
9. Do not add tracking for Arabic; the global `:lang(ar)` rule removes it. Do not use `font-mono` for Arabic-only copy in new code.
10. Every catalog change goes into both `en/` and `ar/` files (`messages.test.ts` enforces parity).

## 5. Decisions to confirm before implementation

- **D1 Score reading order in Arabic.** Recommended: the first number (viewer / slot 1 / home) reads from the start side (right), matching the mirrored layout where that side's names also sit on the right. The alternative, "scores always LTR", contradicts every per-side layout already shipped.
- **D2 Court sides are physical.** Recommended: yes (R4). Padel Left/Right are court positions, not reading positions.
- **D3 Level slider is an LTR number line.** Recommended: yes (R13). The alternative is converting every tick to `inset-inline-start` and flipping the scale.
- **D4 Football position codes.** Recommended: translate (هجوم / وسط / دفاع / حارس or short forms); the localization spec lists only Level band letters, scores and codes as exempt, and FWD/MID/DEF are English abbreviations, not codes.

## 6. Proposed tickets (vertical slices)

Each ticket is done when `pnpm exec turbo run typecheck lint test` passes and the screens listed are checked at 375px in Arabic and English (desktop 1280px where named).

**T1. Radix follows the page direction (R1, R13).** Add the Radix direction provider to `LocaleProvider`; pin the level slider to LTR.
Acceptance: in Arabic, `/dashboard/games`, `/dashboard/groups`, `/dashboard/groups/[id]` (all three tabs, desktop and phone), `/dashboard/games/[id]` (tournament standings), `/dashboard/games/[id]/share`, the invite dialog, `/dashboard/communities/[id]` (member) lay out RTL with the first tab at the right; the phone country Select list is RTL; the set-level slider still has D at the left and its thumb, bubble and ticks agree; `document.querySelectorAll('[dir="ltr"]')` returns only intentional elements. English unchanged.
Depends on: none. Do first: it changes what every later ticket sees.

**T2. Desktop dialogs and switches (R2, R3, R20).** `dialog.tsx`, `button.tsx`, `sidebar.tsx` rail, `switch.tsx`, `sheet.tsx`.
Acceptance: Arabic and English at 1280px: Game actions, Group overflow, cancel/leave confirmations are centred. `/dashboard/groups/new` and `/edit` switches show both states inside the track in both locales. Operator levels sheet slides in from the screen edge it sits on.
Depends on: none.

**T3. Court sides stay physical (R4).** Seven files listed in R4.
Acceptance: Arabic `/dashboard/games/[id]` lineup, join sheet (open a vacant seat), tournament hero and teams section (`/dashboard/design/tournament` for the half-team states), `/dashboard/players/[userId]` position card and `/dashboard/you/settings` Preferred Position all show Left on the left and match English.
Depends on: D2.

**T4. LTR content isolation (R6, R8).** `@repo/i18n/bidi` helpers with a unit test; band elements; phone field, OTP, phone values, handles, counters, deltas, story dimensions; catalog leaves `sentTo`, `namesMore`, calling-code label.
Acceptance: Arabic `/dashboard/players/[userId]` hero "C+"; `/dashboard/games/new` step 4 grid; Game details seat sublines; football and tournament chips; `/onboarding` phone; invite dialog phone tab ("+973" left of the number) and Players tab ("@aishab"); tournament card "+4"; `/login` phone field and OTP (reviewer signs in on a separate profile). No visible text node matches `^[+-][A-E]$` or `^\d+\+$`.
Depends on: none.

**T5. Scores read toward the right side (R7).** Unify separators to en dash in `@repo/domain` (update tests), add `ScoreText`, use it at the listed sites.
Acceptance: Arabic tournament round results and knockout cards put each pair's games next to that pair; `/dashboard/groups/[id]?tab=games` played rows read set 1 from the right with the viewer's games first; `/dashboard/games?tab=history` cards and `/dashboard/players/[userId]/matches` unchanged in meaning; English shows the same numbers left to right.
Depends on: D1.

**T6. Names in sentences and truncation (R9, R10, R16).** `isolate()` in name-bearing copy, `matchesSubtitle` leaf, `dir="auto"` on name cells, split pair labels, `line-clamp-1` on mixed meta lines, Arabic article in short names/initials.
Acceptance: Arabic `/dashboard/players/[userId]/matches` subtitle order; group played-row dates; Standing "Testa Ph…"; tournament pair labels truncate per name; `/dashboard/notifications` titles lose whole words only; "أحمد خ" / "أخ" for "أحمد الخليفة".
Depends on: T4 (helpers).

**T7. Missing Arabic copy (R14, R15).** `common.listSeparator`, W/L/D letters, knockout labels, story labels, terms date, public-page metadata, football codes if D4 says translate.
Acceptance: Arabic Home profile card and up-next line use "،"; `/dashboard/you` form slots show Arabic letters; tournament knockout shows Arabic round names and "الفائز في نصف النهائي 1"; share story labels are Arabic; `/terms` date is Arabic; `/gr/[code]` tab title is Arabic. `pnpm --filter @repo/i18n test` passes.
Depends on: D4 for football codes only.

**T8. Typography and polish (R5, R11, R12, R17, R18, R19).** Sheet-menu chevrons, Leave icon, trend arrows; `:lang(ar)` letter-spacing rule; mono stack; roving radio direction; season tab overflow; 2×2 grid borders.
Acceptance: Arabic Game actions sheet and Group edit "Transfer ownership" chevrons point left; Settings eyebrows render joined Arabic in Noto Sans Arabic; arrow keys on the create-game day and time radios move to the visually adjacent option; no scrollbar beside the season sub-tabs; player Overall card has no border on its outer edge in either locale.
Depends on: none.

Suggested order: T1, T2 (both small and blocking), then T4, T3, T5, T6, T7, T8. T3, T5 and T7 can run in parallel once their decisions are confirmed.

## 7. Screenshots

`.scratch/rtl-audit/screens/web/` (JPEG/PNG captured from the browser pane; names are `<route>-<what>-ar`):

- `dashboard-games-ar.jpg`: Games hub forced LTR (R1)
- `dashboard-groups-id-desktop-tabs-ltr-ar.jpg`: Group home desktop LTR, "نقاط" clipped (R1)
- `dashboard-games-id-dialog-desktop-ar.jpg`, `dashboard-groups-id-overflow-dialog-desktop-ar.jpg`: dialogs off-screen (R2)
- `dashboard-groups-id-edit-switch-off-ar.png`, `dashboard-groups-id-edit-switch-on-ar.png`: switch thumb (R3)
- `dashboard-games-id-lineup-ar.jpg`, `dashboard-players-userId-position-ar.png`, `dashboard-you-settings-ar.jpg`: court sides (R4)
- `dashboard-games-id-actions-sheet-ar.jpg`: chevrons (R5)
- `dashboard-players-userId-level-ar.jpg`, `dashboard-games-new-step4-levels-ar.jpg`, `dashboard-games-id-scored-ar.jpg`, `dashboard-design-football-levels-truncation-ar.jpg`: level bands (R6), truncation (R10)
- `dashboard-games-id-tournament-rounds-ar.jpg`, `dashboard-groups-id-games-played-ar.jpg`: scores (R7), dates split by names (R9)
- `onboarding-phone-ar.jpg`, `dashboard-games-id-invite-phone-ar.jpg`, `dashboard-games-id-invite-handles-ar.jpg`: phone, code, handles (R8)
- `dashboard-players-userId-matches-ar.jpg`, `dashboard-players-userId-matches-truncation-ar.jpg`: reading order (R9), truncation (R10)
- `dashboard-groups-id-standing-ar.jpg`, `dashboard-notifications-ar.jpg`: truncation (R10), season tab scrollbar (R18)
- `dashboard-games-id-share-ar.jpg`, `dashboard-games-id-football-ar.jpg`, `dashboard-games-id-tournament-knockout-ar.jpg`, `dashboard-you-ar.jpg`, `terms-ar.jpg`: English left in the UI (R15)

## 8. Out of scope, seen in passing

- API error messages arrive in English ("Only a football Game has teams and a Score" on `/dashboard/games/[id]/score`). The localization spec defers these to `Accept-Language` on the API context.
- A hydration mismatch in `DashboardLayout` (`<div>` vs `<Suspense>`) is logged on most dashboard loads in both locales. Not direction-related.
- `/dashboard/design/tournament` columns overflow the 343px grid cell by about 25px; not direction-related (dev preview).
