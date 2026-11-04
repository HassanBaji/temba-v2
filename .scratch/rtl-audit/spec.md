# RTL audit: fix spec for the Web and Mobile Apps

Status: decisions settled (2026-11-04), ready for tickets
Date: 2026-11-04
Related: `.scratch/arabic-localization/spec.md` (rule 7 "Direction" is the baseline), ADR-0052, `CLAUDE.md` (Package boundaries, design system rules for mobile)

The per-App findings, with every `file:line`, live in:

- [`web.md`](web.md) — findings R1–R20 (cited here as **web R*n***), 28 screenshots in `screens/web/`
- [`mobile.md`](mobile.md) — findings R0–R11 and S1–S9 (cited here as **mobile R*n*** / **mobile S*n***), 35 screenshots in `screens/mobile/`

This file merges the two: one decision list, one set of shared fixes in the Packages, and one ticket order. The Venue console (`apps/console`) is out of scope; it has no Arabic yet.

## 0. Changes on dev since the audit

The audit ran on `bd8c18c4`. dev is now at `f8484c37`: 12 commits and 242 files. The largest is `340021a8`, the Nov 2026 Arabic copy audit (`.scratch/copy-audit-nov-2026/audit.md`). This spec has been checked against it.

**Still open.** Every blocker and every primitive behind the major findings is unchanged on dev:

- `plural.ts`, `apps/mobile/app.json` and `apps/mobile/src/primitives/*`
- `apps/web/src/components/ui/*`, `locale-provider.tsx` and `globals.css`
- `format-game-start.ts`, `tournament-knockout.ts`, `football-lineup.ts`, `player-name.ts` and `initials.ts`

**Already fixed on dev.** These items are dropped from the tickets below:

| Item | What dev did | Was |
| --- | --- | --- |
| Bidi helper | `packages/i18n/src/bidi.ts` exports `isolate()` (FSI … PDI), with a test | the new-file half of P1 |
| Seat subline "يمين · +C" | `courtSeatSubline` now uses the leaf `game.court.seatMeta(position, band)`, with the band in `isolate()` | web R6 (seat subline), mobile R6 and R7 (`seatWithBand`) |
| W/L/D form letters | `home-recent-form.ts` reads ف / خ / ت from the catalog | web R15 (first row), mobile S7 |
| Level progress "% نحو C+", the signed Level delta on Home, Season date ranges | wrapped in `isolate()` | part of web R8 (signed deltas) |
| Trend arrows on the Home Level card | removed from both Apps' `level-card.tsx` | web R5 (third bullet), mobile R11 (trend-arrow bullet) |

**Affects how the fixes are written.**

- The copy audit's glossary is now binding for every Arabic string, including the ones proposed here:
  - مباراة for Game (not لعبة);
  - مكان شاغر for an open spot (not مقعد);
  - الفئة for the Level band;
  - التقييم for the number;
  - ف / خ for Win and Loss.
- The copy audit adds many `plural()` calls. That makes mobile R0 (the crash on Hermes) hit more screens, not fewer.
- `file:line` references in `web.md` and `mobile.md` point at `bd8c18c4`. Some cited files moved on dev, for example `mobile recent-form-card.tsx` (border now at :65), `mobile standing-tab.tsx` (:809) and `game.ts`. Find each site again before editing it.

**New since the audit, never checked live.** A code scan found no new RTL hazards in these, so they inherit the shared fixes:

- mobile Add player from Group (`add-player-group-list.tsx`): R2, R3
- the football join action in the bottom bar (web and mobile)
- the web Settings language control (`language-control.tsx`)

The language control is a 2-up choice of languages, not court sides, so it must mirror. Do **not** give it web R4's physical-sides treatment. It inherits web R17 (keyboard arrows).

## 1. Coverage

| App | Live in Arabic | Live in English | Code only |
| --- | --- | --- | --- |
| Web (`:3002`, 375px and 1280px) | every dashboard route, onboarding, `/gr`, terms, privacy, not-found, error | Home, Games hub, Game details, Player profile, Settings | sign-in and sign-up (needs signing out), Operator and Venue bodies (Operator is a Clerk setting), `teams/[id]`, `games/[id]/partner`, invite links, `/g`, set-level form |
| Mobile (iOS Simulator, iPhone 17 Pro) | about 35 screens: tabs, Home, Games, Game details in five states, Sheets, Share, Book, Venue, Checkout, Groups, Group home and edit, Profile, Settings, Teams, Invites, Create Game, Welcome, Sign in, Terms | about 12 key screens, side by side | football Make teams and Score, booking detail and payment, Communities create and home, Set Level, Group create, team home, invite link, sign-up continue, second factor, onboarding |

English is correct on both Apps apart from a few locale-independent bugs (web R18, R19; mobile S4).

## 2. Screens that need fixing

Severity: **blocker** = unreadable or broken; **major** = wrong reading order or wrong mirroring; **minor** = polish.

### Web App

| Screen | Severity | Problem | Findings |
| --- | --- | --- | --- |
| Game details (friendly) | blocker (desktop) | Dialogs half off-screen; Left/Right seats mirrored; "C+" reads "+C"; chevrons; "aishab@", "973+" | web R2, R4, R5, R6, R8 |
| Group home | blocker (desktop) | Whole page LTR on desktop, "نقاط" clipped; overflow dialog off-screen; "…onedoor"; played rows | web R1, R2, R7, R9, R10, R18 |
| Group edit, Group create | blocker | Switch thumb outside its track | web R3, R5 |
| Game details (football) | major | Desktop dialogs; FWD/MID/DEF/GK in English; bands reversed | web R2, R6, R15 |
| Game details (tournament) | major | Round score next to the wrong team; "Final"/"S1" English; names truncated from the start | web R1, R7, R8, R10, R15 |
| Games hub | major | Tabs force LTR; "+3" reads "3+" | web R1, R7, R8 |
| Share result | major | Tabs LTR; "SETS/SCORERS/YOU" English; tracking; "1080 × 1920" reversed | web R1, R8, R11, R15 |
| Create Game | major | Level grid "+D -C +C"; keyboard arrows reversed | web R6, R12, R17 |
| Groups list | major | Tabs LTR | web R1 |
| Player profile | major | Hero "+C"; court diagram highlights the wrong half | web R4, R6, R10, R19 |
| Player matches | major | "Omar Aziz, 3 فوز" puts the 3 before the name | web R9, R10 |
| Settings | major | Preferred Position mirrored; eyebrows | web R4, R11, R12 |
| Onboarding | major | "+1 555 555 0142" reads "0142 555 555 1+" | web R8 |
| Sign in, sign up, second factor (code) | major | Phone field "973+"; OTP cells read reversed | web R8 |
| Invites (code) | major | Phone numbers in lookup rows reversed | web R8 |
| Partner picker, Set Level, Team home, Venues, Community home (code) | major | Bands; slider; Selects forced LTR; "@username" | web R1, R6, R8, R13 |
| Home | minor | Mono font and tracking on Arabic; Latin comma | web R11, R12, R14 |
| Notifications | minor | Truncation drops a word from the middle | web R10 |
| You | minor | "أحمد ا" (W/L letters fixed on dev) | web R16 |
| Operator pages, Community create, onboarding sports/photo, invite links, Terms | minor | Sheet slides from the wrong side; arrows; mono; English date | web R8, R12, R15, R17, R20 |

OK: Score, Teams, new tournament, Seasons, Teams list, Communities hub, onboarding name/email, SSO callbacks, `/gr`, privacy, not-found, error.

### Mobile App

| Screen | Severity | Problem | Findings |
| --- | --- | --- | --- |
| **Every screen** | blocker | Crashes on iOS in both languages (`Intl.PluralRules` missing on Hermes); layout never mirrors on an English-language device | mobile R0, R1 |
| Share result | blocker | Story and Sticker preview blank in Arabic | mobile S1 |
| Set Level (code) | blocker | Slider thumb runs off the track, drag inverted | mobile S2 |
| About 50 screens (headings, bodies, Sheet titles, empty states, toasts) | major | Arabic text left-aligned; Latin-led lines lay out LTR | mobile R2 |
| Game details (friendly) | major | Left seat drawn on the right; Unrated card clipped (the "يمين · +C" subline is fixed on dev) | mobile R2, R7, S3, S4 |
| Tournament details | major | "FINAL", "S1" English; garbled pair names | mobile R6, S5 |
| Games hub | major | "Sofia Rو Jonas B"; dividers; Arabic-Indic times | mobile R2, R4, R6, R8 |
| Home | major | Recent-form dividers; Arabic-Indic times; mono eyebrows | mobile R4, R5, R8, R10 |
| Sign in, sign-up continue, second factor | major | Phone field reads "555 555 0142 +1" | mobile R2, R7 |
| Tab bar | major | "الملف الشخصي" wraps and is clipped | mobile R9 |
| Profile and Settings | major | Tab label clipped; record order (the "W/L" form slots are fixed on dev) | mobile R9, R10 |
| Player profile and matches | major | "٢٠٢٦"; score pairs reversed | mobile R2, R8, R10 |
| Create Game | major | Headings; Arabic-Indic time chips; step counter | mobile R2, R5, R8 |
| Book, Venue, Checkout, My bookings, Booking detail | major | Placeholders on the left; "ملاعب 4"; slot times; venue phone | mobile R2, R3, R5, R7, R8 |
| Group home, Group edit/create, Group Sheets | major | Headings; member search; dividers; joined subline | mobile R2, R3, R4, R6 |
| Game Sheets (menu, invite, add player, including the new Add from Group list) | major | Labels far from icons; Leave icon; search placeholder | mobile R2, R3, R7, R11 |
| Welcome, Complete profile and tasks, Teams, Invites, Community create/home | major | Left-aligned text and inputs; letters pulled apart | mobile R2, R3, R5 |
| Football details, Groups list, Terms, Toast | minor | Position codes; mono; English date; alignment | mobile R2, R5, S6, S8 |

OK: Communities hub (staff gate), football Make teams (apart from the shared causes).

## 3. Decisions

Settled on 2026-11-04: every recommendation below was accepted as written. Both Apps follow them.

| # | Question | Decision |
| --- | --- | --- |
| D1 | Which side does a score's first number (viewer, slot 1, home) sit on in Arabic? | **Start side (right)**, matching the mirrored layout where that side's names already sit. Both audits recommend this. |
| D2 | Do padel Left/Right seats, court diagrams and the Preferred Position control stay physical in Arabic? | **Yes.** They are court positions, not reading order. Both audits recommend this. |
| D3 | Does the Level slider mirror in Arabic? The audits disagree: web proposed an LTR number line (smaller change), mobile proposed mirroring. | **Mirror on both Apps** (D at the right). iOS and Material both mirror sliders, and every progress bar in both Apps already fills from the start side. Web R13 then converts its ticks to `inset-inline-start` instead of pinning `dir="ltr"`. |
| D4 | Football position codes GK/DEF/MID/FWD in Arabic. | **Translate**: حارس / دفاع / وسط / هجوم. The localization spec exempts Level bands, scores and codes; these are English abbreviations. |
| D5 | Arabic knockout labels (web proposed "نصف النهائي 1", mobile "نصف 1"). | **Full words on details, short on chips**: two leaves, `tournament.knockout.label.*` ("النهائي", "نصف النهائي 1", "ربع النهائي 1", "دور الـ16 – 1") and `.short.*` ("النهائي", "نصف 1", "ربع 1", "د16 – 1"). |
| D6 | First launch on an Arabic device opens LTR until a restart, once mobile R1 is fixed. | **Accept a one-time restart for now**, with the existing note. Adding `expo-updates` for a "Restart now" button is a separate ticket. |
| D7 | Arabic short names and initials: "أحمد الخليفة" → "أحمد ا". | **Skip "ال"**: "أحمد خ", initials "أخ" (web R16). One rule in `@repo/domain`, so both Apps get it. |

## 4. Shared fixes (Packages)

Both Apps need these, so they land once, first.

### P1. `@repo/i18n`: plural fallback, bidi helpers, Latin digits, list separator

- **`plural()` without `Intl.PluralRules`** (mobile R0, the blocker). In `packages/i18n/src/plural.ts`, add `pluralCategory(locale, n)` with the CLDR rules for `en` and `ar`. Use it when `typeof Intl.PluralRules !== "function"`. Test that it equals `Intl.PluralRules` for 0..250 in both Locales (Node has the API).
- **Bidi helper: use dev's `isolate()`.** It is in `packages/i18n/src/bidi.ts` (FSI … PDI). Add no second helper. web's `ltr()` and mobile's `isolateLtr()` are not needed, because FSI takes its direction from the first strong letter:
  - Latin names, `@handles` and Level bands come out LTR;
  - a phone number, `+N` or signed delta has no strong letter, so it falls back to LTR (UAX #9 rule P3).
  
  Never pass a score to `isolate()`. It would read LTR, against D1. Scores go through `ScoreText` / `ScorePair`.
- **`latinDigits(text)`** maps U+0660–0669 and U+06F0–06F9 to 0–9 (mobile R8: Hermes ignores `-u-nu-latn`). It does nothing on the web, but is safe there.
- **`common.listSeparator`**: en `", "`, ar `"، "` (web R14, mobile R6).

### P2. `@repo/domain`: copy that reads right in Arabic

- **Scores** use the en dash "–" everywhere. Change the hyphen sites in `group-home-chrome.ts`, `tournament-card.ts` and `tournament-knockout.ts` (web R7) and update their tests.
- **Names** interpolated into Arabic leaves are wrapped with `isolate()`. This covers the pair and list leaves in `ar/game.ts`, `ar/tournament.ts`, `ar/mobile-game-details.ts` and `ar/community.ts`, plus `groupPlayedOpponentLine`, `played-game.ts`, `friendly-game-partner.ts` and `notification-copy.ts` (web R9, mobile R6).
- **Joins built outside the catalog** become catalog leaves:
  - The Group subline joins go into leaves.
  - Every visible `.join(", ")` uses `listSeparator`.
  - (web R14, mobile R6. `courtSeatSubline` is already done on dev as `game.court.seatMeta`.)
- **LTR values inside sentences** are wrapped in `isolate()`:
  - `formatLevelRangeLabel` and `formatLevelRangeProseLabel`
  - handles (`invite-door.ts`)
  - signed deltas (`player-profile-matches.ts`, `level-slider.ts`)
  - the phone leaves: `webAuth.verify.sentTo`, `forPhone`, `forPhoneOtherDevices` and `cancelWindowClosedCall`
  - (web R6, R8; mobile R7)
- **Latin digits**: wrap every `Intl` or `toLocale*` result in `format-game-start.ts`, `booking-copy.ts` and `player-profile.ts` with `latinDigits()`, and pass `numberingSystem: "latn"` (mobile R8).
- **English left in the UI** (the W/L/D form letters are already done on dev):
  - Knockout labels: add `knockoutMatchLabel`, per D5; `knockoutMatchCode` stays as the id.
  - Football position codes, per D4.
  - The Terms date (`terms.ts`) becomes an ISO date formatted per Locale.
  - (web R15; mobile S5, S6, S7, S8)
- **Short names and initials** (`player-name.ts`, `initials.ts`) follow D7, with a test for "أحمد الخليفة".

## 5. Rules for the implementer (both Apps)

1. Paragraph direction and alignment come from the page (web: `dir` plus the Radix direction provider) or from the `Text` primitive (mobile). Never fake RTL with per-screen `text-right`/`textAlign: "right"`.
2. Use logical properties only: Tailwind `ms-`/`pe-`/`start-`/`border-s`, RN `marginStart`/`paddingEnd`/`borderStartWidth`. Two exceptions are physical on purpose:
   - centring: `left-1/2 -translate-x-1/2` on the web;
   - geometry that is physical by D2, or by construction (mobile share canvas, slider internals).
   Mark each exception with a comment that says why.
3. Any `translate-x` that moves something along the reading direction needs an RTL counterpart (switch thumbs, slider thumbs).
4. LTR units (phones, `@handles`, Level bands, codes, `+N`, signed deltas, dimensions):
   - a whole element gets `dir="ltr"` on the web, `<Text ltr>` on mobile;
   - inside a string, use `isolate()` from `@repo/i18n/bidi`.
5. User names, venues and Group names inside Arabic copy use `isolate()`. A name alone in a truncating element gets `dir="auto"` on the web.
6. Scores use the en dash and render through `ScoreText` (web) or `ScorePair` (mobile), with the viewer or slot 1 at the start (D1).
7. Lists join with `common.listSeparator`. A sentence is one catalog leaf.
8. No tracking, no mono face and no uppercase on Arabic:
   - web: a global `:lang(ar)` rule, and an Arabic fallback in the mono stack;
   - mobile: the `Text` primitive switches family when the string contains Arabic.
9. All digits are Latin (`latinDigits()` after every `Intl` call).
10. Direction icons that point along the reading direction mirror: `rtl:-scale-x-100` on the web, `mirrorInRtl` on mobile. This includes Leave/`LogOut` and the trend arrows on the Rating impact card. Icons that point at a fixed thing do not mirror.
11. Every catalog change goes into both `en/` and `ar/` (`messages.test.ts` enforces this). New Arabic copy follows the glossary in `.scratch/copy-audit-nov-2026/audit.md`.
12. Verify every ticket in both Locales:
    - web: at 375px, and at 1280px where the ticket names desktop;
    - mobile: on the simulator, restarting after each language switch.

## 6. Tickets

Published to Linear on 2026-11-04 as TEM-397 … TEM-413, with blocking relations. "Depends on" below uses the ticket codes; Linear holds the same edges.

Each ticket is done when `pnpm exec turbo run typecheck lint test` passes and its named screens are checked in Arabic and English. Acceptance criteria per ticket are in the App files (web section 6, mobile "Proposed tickets"); the changes from those lists are noted here.

| # | Ticket | Covers | Severity | Depends on |
| --- | --- | --- | --- | --- |
| **P1** [TEM-397](https://linear.app/temba-app/issue/TEM-397) | `@repo/i18n` plural fallback, `latinDigits`, `listSeparator` (`isolate()` is already on dev) | mobile R0; helpers for everything else | blocker | — |
| **M1** [TEM-398](https://linear.app/temba-app/issue/TEM-398) | Mobile boots and mirrors: drop `extra.supportsRTL` from `app.json`, prebuild, verify on an English-language simulator | mobile R1 | blocker | P1 |
| **W1** [TEM-399](https://linear.app/temba-app/issue/TEM-399) | Web dialogs, switches, sheets: `dialog.tsx`, `button.tsx`, `sidebar.tsx`, `switch.tsx`, `sheet.tsx` | web R2, R3, R20 | blocker | — |
| **W2** [TEM-400](https://linear.app/temba-app/issue/TEM-400) | Web Radix direction provider in `locale-provider.tsx`, and the mirrored level slider | web R1, R13 (per D3) | major | D3 |
| **M2** [TEM-401](https://linear.app/temba-app/issue/TEM-401) | Mobile `Text`, `TextField`, `SearchField` follow the layout direction; `ltr` prop; phone field; LTR values | mobile R2, R3, R7 | major | M1, P1 |
| **M3** [TEM-402](https://linear.app/temba-app/issue/TEM-402) | Mobile share canvas preview | mobile S1 | blocker | M1 |
| **M4** [TEM-403](https://linear.app/temba-app/issue/TEM-403) | Mobile slider in RTL | mobile S2 | blocker | M1, D3 |
| **P2** [TEM-405](https://linear.app/temba-app/issue/TEM-405) | `@repo/domain` copy: en dash, `isolate` in leaves, catalog joins, Latin digits, English left over, short names | section 4 P2 | major | P1, D4, D5, D7 |
| **W3** [TEM-406](https://linear.app/temba-app/issue/TEM-406) | Web LTR isolation in components: bands, phone field, OTP, phone values, counters, story dimensions | web R6, R8 (the App half; the domain half is in P2) | major | P1 |
| **W4** [TEM-407](https://linear.app/temba-app/issue/TEM-407) | Web court sides stay physical | web R4 | major | D2 |
| **M5** [TEM-408](https://linear.app/temba-app/issue/TEM-408) | Mobile court sides physical, Leave icon | mobile S3, R11 (trend arrows: only the Rating impact card is left, and it already mirrors) | major | M2, D2 |
| **W5** [TEM-409](https://linear.app/temba-app/issue/TEM-409) | Web `ScoreText`, names and truncation | web R7 (App half), R9, R10 | major | P2, D1 |
| **M6** [TEM-410](https://linear.app/temba-app/issue/TEM-410) | Mobile `ScorePair`, Terms date | mobile R10, S8 (App half; S7 is done on dev) | major | M2, P2, D1 |
| **M7** [TEM-404](https://linear.app/temba-app/issue/TEM-404) | Mobile logical borders and the physical-prop ESLint rule | mobile R4 | major | M1 |
| **M8** [TEM-411](https://linear.app/temba-app/issue/TEM-411) | Mobile typography: mono and tracking on Arabic, tab label | mobile R5, R9 | major | M2 |
| **W6** [TEM-412](https://linear.app/temba-app/issue/TEM-412) | Web typography and polish: chevrons, Leave icon, `:lang(ar)` tracking, mono stack, roving-radio direction, stray scrollbar, grid borders | web R5, R11, R12, R17, R18, R19 | minor | — |
| **M9** [TEM-413](https://linear.app/temba-app/issue/TEM-413) | Mobile Unrated card padding | mobile S4 | minor | — |

Order:

1. **Blockers first, in parallel:** P1, then M1 (which needs P1), alongside W1.
2. **Next:** W2, M2, M3, M4.
3. **Then P2**, which needs P1 and decisions D4, D5 and D7.
4. **The rest can run in parallel**, provided no two tickets touch the same files:
   - W3, W4, W5, W6
   - M5, M6, M7, M8, M9

Changes from the App files:

- Web T4 and mobile T2 split their `@repo/i18n` and `@repo/domain` work into P1 and P2.
- Web T7 and mobile T6/T10 copy moves into P2.
- Web R13 follows D3 (mirror) instead of pinning LTR.

## 7. Side effects of the audit

- The local test database on `:5434` (not Railway) now holds extra test data:
  - in the Group "Friday Night Padel": friendly Games (open, full, cancelled), a scored tournament "بطولة الخريف Autumn Cup", Arabic-named users, a Season, pending join requests and notifications;
  - Testa is now organizer of that Group.
  - The mobile audit also deleted three Games the web audit had inserted; nothing else depended on them.
- `apps/mobile/ios` was prebuilt in this worktree (gitignored).
- `.claude/launch.json` (untracked) holds the `rtl-api`, `rtl-web` and `rtl-metro` configs used by the audit.
- No production code changed.

## 8. Not RTL, seen in passing

- English tournament Pool tabs read "group A" in lowercase on mobile.
- A morning tournament card says "11:00 AM Tonight".
- API error messages arrive in English. This is out of scope per the localization spec.
- The web `DashboardLayout` logs a hydration mismatch on most loads.
