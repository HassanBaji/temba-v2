# Mobile App RTL / LTR audit

Audited on `bd8c18c4`. Some findings were fixed on dev (`f8484c37`) after the audit; `spec.md` section 0 lists them, and `spec.md` wins where the two disagree.

Status: findings and fix spec, nothing implemented
Scope: `apps/mobile` (Expo SDK 57, RN 0.86.3 New Architecture, Expo Router, NativeWind v5), Arabic (RTL) and English (LTR)
Related: `.scratch/arabic-localization/spec.md` (rule 7 "Direction"), ADR-0052, `CLAUDE.md` "Design system rules for mobile"
Date: 2026-11-04

## Before you start: two blockers that hide every other finding

1. **The app crashes on iOS in both languages.** `@repo/i18n` `plural()` calls `new Intl.PluralRules(...)`. Hermes on iOS has no `Intl.PluralRules`, so the first `plural()` call throws `undefined cannot be used as a constructor`. Home crashes on mount (`home-screen.tsx:46` → `packages/i18n/src/plural.ts:22`). To audit at all I patched `plural.ts` locally with a fallback for this session and reverted it before handback (`git status` is clean apart from this folder and the untracked `.claude/launch.json`).
2. **The layout never mirrors on a device whose system language is English.** `app.json:62-63` sets `"extra": { "supportsRTL": true }`. The `expo-localization` config plugin writes that into `Info.plist` as `ExpoLocalization_supportsRTL`, and `LocalizationModule.swift` (`OnCreate`) then calls `RCTI18nUtil.forceRTL(<device language is RTL>)` on **every launch**. That overwrites the `forceRTL(true)` that `locale-provider.tsx:36-43` persisted, so after the restart the app still runs LTR. Conversely, on an Arabic device, choosing English keeps the app RTL. I confirmed this live: Arabic stayed LTR after a relaunch. With the key deleted from the installed app's `Info.plist`, the next relaunch mirrored, and switching back to English un-mirrored after a restart. I restored the key on the installed copy afterwards.

Every other Arabic finding below was observed with blocker 2 bypassed in this way.

## Method and coverage

- **Build.** I prebuilt `apps/mobile/ios` (gitignored, left as generated, `Package.resolved` restored). The Debug build of scheme `Temba` took 4.5 minutes. It ran on the booted iPhone 17 Pro (iOS 26.5) against Metro from this worktree (`rtl-metro`, started with `preview_start`; I left it running) and the API on `:4002`.
- **Test data**, created with a throwaway script under `packages/api/scripts` (deleted afterwards) plus SQL on `:5434`:
  - Group "Friday Night Padel": an upcoming open Game, a full Game, a cancelled Game, and a groups-then-knockout tournament "بطولة الخريف Autumn Cup" (8 teams, 2 Pools, every Pool Match scored, knockout placed).
  - Arabic-named users (أحمد الخليفة, فاطمة المنصوري, لاعب 1…6), a Season "موسم الخريف" and a pending join request (خالد البنعلي).
  - Testa is now `organizer` in that Group. Tapping an open seat during the audit also moved Testa's seat on Game `cdba2da1…`.
  - **Side effect to flag:** while cleaning up a failed first run, I ran `delete from games where created_by = Testa and created_at > now() - 30 min`. It removed 4 rows: 1 was mine, but 3 were probably Games another agent had just created on `:5434` (its rows use the id pattern `aaaaaaaa-0000-4000-8000-00000000000N`, and only `…0002` survived). Whoever owns the web audit may need to reseed.
- **Visited live in Arabic and English:**
  - Home and the tab bar
  - Games list
  - Game details in five states: upcoming full, upcoming open, played padel with the score card, groups-then-knockout tournament, played football
  - Game menu Sheet, invite Sheet, the toast
  - Share result
  - Book (Venues), Venue, Venue details, Checkout
  - Groups list, Group home (Standing, Members), Group menu Sheet, Group edit
  - Player profile
  - Profile and Settings (including the language switch and the restart note), Teams, Create team, Invites, My bookings, Terms
  - Create Game steps 1–4 and the calendar Sheet
  - Complete profile and the email task
  - Communities hub (staff gate)
  - Welcome, Sign in (phone, password step), the country code Sheet
- **English pass:** I took English screenshots of Home, Games, Game details, Football played, Share, Group home, Book, Tournament, Profile and Settings, and checked them side by side. English is correct apart from the two locale-independent notes under "Other findings".
- **Code only, and why:**
  - Football Make teams (`games/[id]/teams`) and Score (`games/[id]/score`): they need an upcoming or ongoing football Game with teams.
  - Booking detail, payment, booked and booking Game (`book/bookings/[bookingId]/*`, `profile/bookings/[bookingId]`): I made no booking, because payment needs the provider.
  - Communities `new`, `[id]` and `players/*`: staff-only.
  - `groups/set-level` and the `Slider`: need Clerk Level-setter public metadata, which can't be set from here.
  - `groups/new` (same form parts as edit), `profile/teams/[id]`, `profile/invite-link`, `players/[userId]/matches`.
  - Complete-profile name, photo and sports tasks; `(auth)/continue`, `factor-two` and `terms`; the onboarding questionnaire.
  - These all reuse the primitives found broken below, so the shared root causes apply to them.
- **Grep sweep** across `apps/mobile/src` and `app`, plus the copy helpers in `packages/domain` and `packages/i18n` that the screens use, for:
  - physical `left`/`right`/margin/padding/border props
  - `row-reverse`, `isRTL`, `textAlign`, `writingDirection`, `translateX`
  - horizontal scrolls
  - directional icons and `mirrorInRtl`
  - SVG paths
  - `Intl` and `toLocale*`
  - name, phone and score concatenations
  - English literals

### Measured RN behaviour on this build (it decides the fixes)

| Behaviour                                                                         | Result                                                                                                                                     |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `marginLeft/Right`, `paddingLeft/Right`, `left`/`right` (position)                | **Swapped** in RTL (venue card `right: 12` chip and SearchField `paddingLeft` land on the mirrored side)                                   |
| `borderLeftWidth/Color`                                                           | **Not swapped**: dividers stay on the physical left (Home recent form: divider on the card edge, none between Played and Won)              |
| `textAlign: "right"` / `"left"`                                                   | **Swapped** (Venue details hours with `textAlign: "right"` render on the left in RTL), so `"left"` means start and `"right"` means end     |
| No `textAlign` (natural)                                                          | Follows UIKit's app localisation (the device language), **not** the layout direction: Arabic block text is left-aligned on an English device |
| Paragraph base direction                                                          | First strong character, so a Latin-led string such as `Lisbon · 4 ملاعب` reorders as LTR                                                   |
| `ScrollView horizontal`                                                           | Starts at the right and scrolls correctly in RTL                                                                                           |
| Native-stack back swipe                                                           | Works from the right edge in RTL (correct)                                                                                                 |
| `transform: translateX`                                                           | Not mirrored (as expected)                                                                                                                 |
| `toLocaleTimeString("ar-BH-u-nu-latn")` on Hermes iOS                             | Returns **Arabic-Indic digits** (`٨:٢٣ م`): Hermes ignores `-u-nu-latn`                                                                    |
| `new Intl.PluralRules()` on Hermes iOS                                            | **Throws** (not implemented)                                                                                                               |

## Screen table

Severity: **blocker** = unreadable or broken, **major** = wrong reading order or wrong mirroring, **minor** = polish. "R-n" points to the shared root causes in the next section.

| Route                                                                        | Screen                                  | Locales checked        | Status    | Severity | Main problem                                                                                                                                                                          |
| ---------------------------------------------------------------------------- | --------------------------------------- | ---------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (all)                                                                        | App shell                               | ar, en                 | needs fix | blocker  | R0 crash in `plural()` on Hermes iOS; R1 layout never mirrors on an English-language device                                                                                           |
| `(app)/_layout.tsx`                                                          | Tab bar                                 | ar, en                 | needs fix | major    | Focused "الملف الشخصي" wraps to 2 lines and is clipped (R9)                                                                                                                           |
| `(auth)/welcome.tsx`                                                         | Welcome                                 | ar (code: en)          | needs fix | major    | Body text left-aligned (R2); Tonight strip in mono Arabic with gapped letters (R5); language-switch divider on the wrong side (R4)                                                     |
| `(auth)/sign-in.tsx`                                                         | Sign in (phone, password, code)         | ar (code: en)          | needs fix | major    | Phone field reads "555 555 0142 +1" (R7); "للرقم +1 555 555 0142." group order reversed (R7); headings and body left-aligned (R2)                                                     |
| `(auth)/continue.tsx`, `(auth)/factor-two.tsx`                               | Sign-up continue, second factor         | code                   | needs fix | major    | Same AuthScreen, TextField and phone sentence as sign-in (R2, R7)                                                                                                                     |
| `(auth)/terms.tsx`, `profile/terms.tsx`                                      | Terms                                   | ar                     | needs fix | minor    | Eyebrow mixes English date into Arabic: "OCTOBER 2026 27 آخر تحديث" (R6, R5); heading left-aligned (R2). English legal body is correctly LTR                                          |
| `(home)/index.tsx`                                                           | Home                                    | ar, en                 | needs fix | major    | Recent-form dividers wrong (R4); Arabic-Indic times (R8); mono eyebrows (R5); Latin names left-aligned (R2); "3–1" record order (R10)                                                 |
| `(home)/complete-profile/index.tsx`                                          | Complete profile                        | ar                     | needs fix | major    | Text left-aligned (R2); phone value must stay LTR once R3 lands (R7); mono progress label (R5)                                                                                        |
| `(home)/complete-profile/{name,email,photo,sports}.tsx`                      | Profile tasks                           | ar (email), code       | needs fix | major    | R2 headings and inputs; R5 breadcrumb; email and name inputs should be explicit-LTR / explicit-start (R3)                                                                             |
| `*/players/[userId]/index.tsx` (×5 stacks)                                   | Player profile                          | ar                     | needs fix | major    | R2 heading; R8 "نوفمبر ٢٠٢٦"; R10 score pairs ("6–3" vs "4–6" read in RTL)                                                                                                            |
| `*/players/[userId]/matches.tsx` (×5)                                        | Player matches                          | code                   | needs fix | major    | Same match rows (R10, R2)                                                                                                                                                              |
| `games/index.tsx`                                                            | Games hub                               | ar, en                 | needs fix | major    | Venue and place lines left-aligned (R2); "Sofia Rو Jonas B" (R6); segment dividers (R4); mono (R5); Arabic-Indic times (R8)                                                           |
| `games/new.tsx`                                                              | Create Game (4 steps, Sheets)           | ar                     | needs fix | major    | R2 headings and lists; R8 time chips; R5 step counter; level chips OK only while text is LTR-natural (keep them LTR, R7)                                                              |
| `games/[id]/index.tsx` friendly                                              | Game details                            | ar, en                 | needs fix | major    | "يمين · +C" level band flipped (R7); court line-up mirrors physical Left/Right seats (S3); R2, R8, R4 (hero figures); Unrated card unpadded and clipped (S4)                          |
| `games/[id]/index.tsx` tournament                                            | Tournament details                      | ar, en                 | needs fix | major    | Knockout codes "FINAL", "S1", "S2" in English (S5); R2; R6 team names                                                                                                                 |
| `games/[id]/index.tsx` football                                              | Football details                        | ar, en                 | needs fix | minor    | Position codes "GK/DEF/MID/FWD" Latin (S6, needs a decision); R2 place line; R5 mono goal counts                                                                                      |
| `games/[id]/score.tsx`                                                       | Football score entry                    | code                   | needs fix | major    | R2, R10 scorer note; shares the board components                                                                                                                                       |
| `games/[id]/teams.tsx`                                                       | Football make teams                     | code                   | OK\*      | minor    | Move arrows already mirror correctly (`make-teams-screen.tsx:177-193`); only R2 / R5 apply                                                                                            |
| `games/[id]/share.tsx`                                                       | Share result                            | ar, en                 | needs fix | blocker  | Story and Sticker preview is blank in Arabic (S1)                                                                                                                                      |
| (sheets on Game details)                                                     | Game menu, invite, add player, join     | ar                     | needs fix | major    | SheetMenu labels far from icons (R2); Sheet title away from its row (R2); search placeholder left (R3); "@handle" must stay LTR (R7); leave icon not mirrored (R11)                   |
| `book/index.tsx`                                                             | Book (Venues)                           | ar, en                 | needs fix | major    | Search placeholder left (R3); "Lisbon · 4 ملاعب" reads "ملاعب 4" (R2); mono (R5)                                                                                                      |
| `book/venues/[venueId]/index.tsx`                                            | Venue                                   | ar                     | needs fix | major    | Venue name heading left (R2); Arabic-Indic slot times (R8). Day carousel and slot grid mirror correctly                                                                               |
| `book/venues/[venueId]/details.tsx`                                          | Venue details                           | ar                     | needs fix | minor    | Heading left (R2); hours column correct (end-aligned)                                                                                                                                  |
| `book/venues/[venueId]/checkout.tsx`                                         | Checkout                                | ar                     | needs fix | major    | Method titles and descriptions hug the radio, not the icon (R2); mono uppercase venue eyebrow (R5); mixed digits in date line (R8)                                                    |
| `book/bookings/index.tsx`, `profile/bookings/index.tsx`                      | My bookings                             | ar                     | needs fix | major    | R2                                                                                                                                                                                     |
| `book/bookings/[bookingId]/{index,payment,booked,game}.tsx`, `profile/bookings/[bookingId]` | Booking detail, payment, booked | code         | needs fix | major    | Venue phone inside an Arabic sentence (`cancelWindowClosedCall`) and as a bare value (R7); R2; R8                                                                                     |
| `groups/index.tsx`                                                           | Groups list                             | ar, en                 | needs fix | minor    | Mono "اللعبة القادمة" / "أداؤك الأخير هنا" (R5). Rows mirror correctly                                                                                                                |
| `groups/[id].tsx`                                                            | Group home (Standing, Games, Members)   | ar, en                 | needs fix | major    | R2 heading; R3 member search; R5 table header; R4 `standing-tab.tsx:771` divider                                                                                                      |
| `groups/edit.tsx`, `groups/new.tsx`                                          | Group edit / create                     | ar (edit), code (new)  | needs fix | major    | R2; R6 subline "بادل، 18 عضوًا، Friday Night Padel"; R4 `group-form-parts.tsx:250`                                                                                                    |
| `groups/set-level.tsx`                                                       | Set Level                               | code                   | needs fix | blocker  | Slider thumb runs off the track in RTL and drag is inverted (S2)                                                                                                                       |
| (sheets on Group home)                                                       | Group menu, member, join requests, transfer, delete | ar (menu), code | needs fix | major | SheetMenu (R2); `delete-group-sheet.tsx:35` divider (R4); phone mask in member sheet (R7)                                                                                         |
| `communities/index.tsx`                                                      | Communities hub                         | ar                     | OK        | —        | Staff-gate notice renders correctly                                                                                                                                                    |
| `communities/{new,[id]}.tsx`, `communities/players/*`                        | Community create / home                 | code                   | needs fix | major    | R2, R5 (`community-home-view.tsx:256` badges), R6 `twoSports`                                                                                                                         |
| `profile/index.tsx`                                                          | Profile and Settings                    | ar, en                 | needs fix | major    | Form slots show English "W/L" (S7); R9 tab label; R10 record "4–1"; restart note shows correctly                                                                                       |
| `profile/teams/index.tsx`, `profile/teams/new.tsx`, `profile/teams/[id].tsx` | Teams                                   | ar (index, new), code  | needs fix | major    | R2 headings, empty state, field labels                                                                                                                                                 |
| `profile/invites.tsx`, `profile/invite-link.tsx`                             | Invites, invite link                    | ar (invites), code     | needs fix | major    | R2 everything left-aligned; R3 paste field                                                                                                                                             |
| Toast (`primitives/toast.tsx`)                                               | Toast                                   | ar                     | needs fix | minor    | Message left-aligned (R2); position is symmetric                                                                                                                                       |

\* OK apart from the shared root causes.

## Shared root causes and fixes

Each of these fixes one primitive or module and covers many screens. Do them first, in this order.

### R0 (blocker): `plural()` throws on Hermes iOS

- Cause: `packages/i18n/src/plural.ts:17-26` calls `new Intl.PluralRules(intlLocale(locale))`; Hermes iOS has no `Intl.PluralRules`.
- Fix (in `@repo/i18n`, host-neutral): add `pluralCategory(locale, n)` with the CLDR rules for the two Locales we ship:
  - en: `one` when n = 1, else `other`
  - ar: `zero` 0, `one` 1, `two` 2, `few` n%100 in 3–10, `many` n%100 in 11–99, else `other`
- `plural()` uses `Intl.PluralRules` when `typeof Intl.PluralRules === "function"` and this function otherwise.
- Test: `plural.test.ts` asserts that `pluralCategory` equals `new Intl.PluralRules(...).select(n)` for n in 0..250 in both Locales. Node has the API, so the fallback is pinned to CLDR.
- Alternative, needs a decision: the `@formatjs/intl-pluralrules` polyfill imported first in `apps/mobile/app/_layout.tsx`. That is one more dependency; the hand rule is 12 lines.

### R1 (blocker): `expo-localization` overrides the in-app direction on every launch

- Cause: `apps/mobile/app.json:62-63` (`extra.supportsRTL: true`) makes the plugin write `ExpoLocalization_supportsRTL`, and `expo-localization/ios/LocalizationModule.swift` `OnCreate` calls `forceRTL(device language is RTL)` at every start.
- Fix: delete the `extra.supportsRTL` key from `app.json`. Keep the `expo-localization` plugin, which `getLocales()` needs. Re-run prebuild; the key must be gone from `ios/Temba/Info.plist`. Direction then comes only from `locale-provider.tsx` (`allowRTL(true)`, `forceRTL(isRtl(locale))`), which `RCTI18nUtil` persists in `NSUserDefaults`.
- Known consequence: on the first launch on an Arabic device the stored direction is still LTR, so the app shows Arabic copy in an LTR layout plus the existing `restartToApplyLayout` note until the next start. Decision for the product owner:
  - (a) accept this, which is what I recommend for now; or
  - (b) add `expo-updates` and give the note a "Restart now" button calling `Updates.reloadAsync()`, since `I18nManager.isRTL` is re-read on a JS reload.
- Android: `allowRTL`/`forceRTL` behave the same, so check that the same key isn't written to `strings.xml` (the plugin writes `ExpoLocalization_supportsRTL` there too, at `withExpoLocalization.js:106-110`).

### R2 (major, about 50 screens): block text aligns by device language, and mixed text takes its direction from the first letter

- Causes, both in `apps/mobile/src/primitives/text.tsx:41-57`:
  - `Text` sets no `textAlign`, so iOS uses `NSTextAlignmentNatural`. That follows the app's UIKit localisation (the device language), not `I18nManager`, so every full-width Arabic block on an English device is left-aligned (headings under a back button, card bodies, Sheet titles, SheetMenu labels, empty states, toasts).
  - `Text` sets no `writingDirection`, so a Latin-led line ("Lisbon · 4 ملاعب", "Friday Night Padel", "Sofia R وJonas B") lays out as an LTR paragraph inside an RTL screen.
- Fix in `Text`, once, for every screen:
  - Default style `textAlign: "left"`. Fabric swaps it to right under RTL layout, as measured above, so it behaves as "start" in both directions. Caller `style` still overrides; the existing `textAlign: "right"` and `"center"` usages are already correct.
  - Default style `writingDirection: isLayoutRtl() ? "rtl" : "ltr"`. This gives the paragraph the screen's direction, like `dir` on the web.
  - New prop `ltr?: boolean`. When it is true, set `writingDirection: "ltr"` and keep `textAlign: "left"`. It is for values that must read LTR as a unit (R7).
- Expect fallout: R2 makes R7 values visible (`D+` → `+D`, `+973 …` → `… 973+`, `@handle` → `handle@`), so land R2 and R7 in the same ticket.
- `ScreenHeader` (`screen-header.tsx:37-47`) needs nothing more: its title is a full-width `Text` and is fixed by the default.

### R3 (major): `TextInput` values and placeholders align by device language

- Cause: `primitives/text-field.tsx:53-81` and `primitives/search-field.tsx:56-66` set no `textAlign` or `writingDirection`. Placeholders "ابحث في الأعضاء", "المنطقة أو النادي" and "الصق الرابط الذي وصلك" sit on the left, next to nothing, while the search icon is on the right.
- Fix:
  - Both primitives default to `textAlign: "left"` and `writingDirection` from layout, the same as R2. Verify on the simulator whether `TextInput` swaps `textAlign` the way `Text` does; if it doesn't, use `isLayoutRtl() ? "right" : "left"`.
  - Add `ltr` to `TextField` for phone, email, code, password and URL inputs: `writingDirection: "ltr"`, `textAlign: "left"`.
  - Use it in `password-field.tsx`, `code-form.tsx`, `email-task-screen.tsx` and the invite-link paste field (`invite-link-view.tsx`).

### R4 (major): physical border dividers don't flip

- Cause: Fabric swaps margin, padding and position but not `borderLeft*` (measured).
- Fix: replace with `borderStartWidth` / `borderStartColor` in:
  - `home/recent-form-card.tsx:89-90`
  - `auth/language-switch.tsx:47-48`
  - `groups/delete-group-sheet.tsx:35`
  - `groups/group-form-parts.tsx:250`
  - `groups/standing-tab.tsx:771-772`
  - `game-details/figure-pair.tsx:27-29` (also `paddingLeft` → `paddingStart`)
  - `lib/sport-segments.tsx:47-48`
  - `games/games-empty.tsx:153-154`
  - `lib/not-set-cell.tsx:25-26`
  - `games/games-view.tsx:132-133`
- Rule for the same pull request: convert all remaining physical props in `apps/mobile/src` to logical ones (`marginStart`/`End`, `paddingStart`/`End`, `start`/`end`) except symmetric pairs (`left: 0, right: 0`) and geometry that is deliberately physical (S1, S2). The full list is the grep in "Method"; today they render right only because of the implicit swap, which Android and future RN releases don't promise. Add an ESLint `no-restricted-syntax` rule for `marginLeft|marginRight|paddingLeft|paddingRight|borderLeft*|borderRight*|left:|right:` in `apps/mobile/src` with an allow-comment for deliberate cases.

### R5 (major): Arabic set in the mono face loses its letter joins

- Cause: `Text` `mono` picks `GeistMono-Regular` (`primitives/font-family.ts:14-16`). Arabic falls back inside a monospaced run, so each glyph gets a fixed advance and words read "ب ا د ل / ل ع ب ة", "م ج م و ع ت ا ن". `mono` is used on copy in 61 files: Card `monoMeta` eyebrows, chips, step counters, the Tonight strip, goal counts, table headers.
- Fix in `Text`: apply the mono family only when the string children contain no Arabic letters (`/[؀-ۿݐ-ݿࢠ-ࣿ]/`); otherwise use the body family at the same size. `uppercase` already has no effect on Arabic; keep it. Also skip the expanded `letterSpacing` (`text.tsx:51-53`) when the content is Arabic, because negative tracking crowds the joins.
- Unit-test the family choice as a pure helper next to `font-family.ts`.

### R6 (major): user values inside Arabic sentences are not isolated

- Cause: catalog leaves interpolate names, venues, Group names and dates straight into Arabic text, and some domain code joins pieces outside the catalog. Bidi then reorders around the Latin value.
- Concatenating catalog leaves:
  - `ar/game.ts:253` (`pairNames`), `:356`, `:408`
  - `ar/tournament.ts:54` (`listAnd`), `:466`
  - `ar/mobile-game-details.ts:52` (`youAnd`)
  - `ar/community.ts:169` (`twoSports`)
  - all of these produce "Sofia Rو Jonas B", "TestaوOmar", "أنت وSam Rivera"
- Domain joins outside the catalog (rule 3 of the localization spec):
  - `courtSeatSubline` (`packages/domain/src/friendly-game-court.ts:31-39`)
  - Group subline joins in `groups/group-home-model.ts:287, 376`
  - `.join(", ")` lists in visible text: `groups/groups-view.tsx:211`, `groups/members-tab.tsx:241`, `games/history-card.tsx:98`, `games/football-game-card.tsx:108, 164`, `games/tournament-cards.tsx:378`. These use a Latin comma in Arabic.
- Fix:
  - Add to `@repo/i18n` `isolate(value)` → `⁨${value}⁩` (FSI/PDI) and `isolateLtr(value)` → `⁦${value}⁩` (LRI/PDI).
  - Every Arabic leaf that takes a name, venue, Group, team or free-text variable wraps it in `isolate()`.
  - The Arabic pair form becomes `${isolate(a)} و${isolate(b)}`; keep the attached "و", because the isolate stops it reordering.
  - Move the domain joins into catalog leaves (`game.court.seatWithBand(label, band)`, `common.listSeparator` = "، " in ar).
  - Domain tests: one Arabic case each, asserting the isolate marks are present.

### R7 (major): values that must read LTR as a unit aren't marked

- Level bands in mixed strings render reversed ("يمين · +C", "+D") — see `game-details-level-band-ar.png`.
- Phone numbers:
  - `PhoneField` row reads "555 555 0142 +1" (`auth/phone-field.tsx:54-76`)
  - inside sentences: "للرقم +1 555 555 0142." (`ar/mobile-home.ts:90, 95`; `ar/booking.ts:31` `cancelWindowClosedCall`)
  - bare values: `booking-detail-screen.tsx:251`, `venue-details-screen.tsx:70`, `member-sheet.tsx:104` (`phoneMasked`), `add-player-identity-fields.tsx:101`, `complete-profile-screen.tsx:221`
- Handles: the `@handle` lines in the invite Sheet (`invites/invite-sheet-view.tsx`).
- Fix:
  - Bare values: `<Text ltr>`.
  - Values inside a sentence: `isolateLtr()` in the Arabic leaf (`forPhone`, `forPhoneOtherDevices`, `cancelWindowClosedCall`, `seatWithBand`).
  - `PhoneField`: wrap the country pill and the input in `<View style={{ direction: "ltr" }}>`, so the code sits left of the number in both Locales, and give the input `ltr`. The country Sheet rows keep RTL order, but `+{callingCode}` gets `ltr`.
  - Level chips in the create flow (`create-game/level-range-field.tsx`, `chips.tsx`) and the band `Text` in Level cards get `ltr` so that R2 doesn't flip "D+".

### R8 (major): Arabic-Indic digits from Hermes Intl

- Cause: Hermes iOS ignores `-u-nu-latn` (`intlLocale`, `packages/i18n/src/locale.ts:37-39`).
- Affected formatters:
  - `formatGameClock` (`packages/domain/src/format-game-start.ts:70-76`)
  - `formatWeekday`/`formatMonth` (`:24-44`), which are safe today but use the same path
  - `booking-copy.ts:60-74` (`stepFormatter`)
  - `player-profile.ts:124` (`toLocaleDateString`)
- Effect: times read "٨:٢٣ م" and "١٢:٣٠", and the year "٢٠٢٦", while days and prices are Latin. That breaks spec rule 4 ("Digits stay Latin") and mixes two digit systems on one line.
- Fix: add `latinDigits(text)` to `@repo/i18n`. It maps U+0660–0669 and U+06F0–06F9 to 0–9. Wrap every `Intl`/`toLocale*` result in the domain formatters with it, and pass `numberingSystem: "latn"` in the options as well.
- Tests: a unit test feeding the Arabic-Indic string, and the existing formatter tests in `"ar"`.

### R9 (major): tab labels wrap and clip

- Cause: `navigation/app-tabs.tsx:112-120`. The label `Text` has no `numberOfLines`, so the focused semibold "الملف الشخصي" wraps to two lines and is cut by the bar height. You can see it in `profile-ar.png`.
- Fix: `numberOfLines={1}`, `adjustsFontSizeToFit` and `minimumFontScale={0.85}` on the tab label.
- Decision: also offer a short tab title, `mobileHome.tabs.profileShort` = "حسابي", if the scaled label still looks cramped.

### R10 (major): score pairs read the wrong way round in RTL

- Cause: scores are single strings, some with an en dash ("6–3", "3–1", "4–1") and some with a hyphen ("6-4" in tournament rounds). Once R2 sets an RTL paragraph, the en-dash form reorders and the hyphen form doesn't, so the same screen would show two orders. Today both render LTR, which puts the player's own number on the left, where an Arabic reader reads it last. Examples: player match rows, Home "3–1", Profile "4–1" / "5–2", tournament "4-6", the score sentence in the bottom bar.
- Fix: add a `ScorePair` primitive (`[own][–][other]` as three `Text` nodes in a row), so row mirroring puts the viewer's or slot-1 number at the start. Use it for every rendered score and record; keep domain strings for accessibility labels only.
- Also give the large football score hero (`football-hero.tsx`) a check, although it is already two separate numbers and mirrors correctly.

### R11 (minor): directional icons not mirrored

- `LogOut` for Leave in `game-details/game-menu.ts:39` and `groups/group-menu-sheet.tsx:15`: the exit arrow points into the layout in RTL. Pass `mirrorInRtl`. This needs `SheetMenu` icons to accept a style, or a `MirroredIcon` wrapper.
- Trend arrows are inconsistent: `game-details/rating-impact-card.tsx:50` mirrors `ArrowUpRight`/`ArrowDownRight`/`ArrowRight`, but `home/level-card.tsx:16-20, 135` doesn't. Pick one rule. I recommend mirroring (progress over time runs right to left in RTL) and applying it to both.
- All chevrons, back buttons and "continue" arrows already carry `mirrorInRtl` and render correctly. Calendar month buttons, the Venue footer, checkout pay, "All bookings and games", checklist rows and make-teams arrows are all right.

## Screen-specific defects

### S1 (blocker): Share result preview is blank in Arabic

- Screen: `games/[id]/share.tsx`. I saw the Story mode blank live; Sticker mode uses the same `ScaledCanvas`, so it is broken too (from code). See `share-result-ar.png` and `share-result-en.png`.
- Cause: `share-result/story-canvas.tsx:49-60` positions the 1080-wide canvas with `left: 0` (swapped to `right: 0` in RTL) and scales it with `transformOrigin: "top left"`. The scaled card is anchored to the far edge and lands off-screen.
- Fix: put `direction: "ltr"` on the outer frame `View` so that `left: 0` stays physical, and `direction: isLayoutRtl() ? "rtl" : "ltr"` on the canvas `View` so the card's own content still mirrors.
- Verify: preview visible in both Locales; "Share image" and "Save" export a full, unclipped 1080×1920 card in Arabic. `captureRef` renders the unscaled view, so check the saved file too.
- Also: `share-preview.tsx:86-87` is symmetric and fine.

### S2 (blocker, code-only): Set Level slider breaks in RTL

- Cause: `primitives/slider.tsx`.
  - The thumb is `left: 0` (`:198`, swapped to right) plus `translateX: x - THUMB/2` (`:113`, not swapped). It starts at the right edge and moves further right as the value rises.
  - Fill (`:115`), edges, marks and value label (`:147`, `:186`, `:222`, `:237`, `:259`) use the swapped `left`, so they mirror.
  - Drag uses raw `gesture.dx` (`:92-100`), so dragging towards higher values (left) lowers the value.
- Fix, which keeps the mirrored scale (min at the right, as for every other RTL control):
  - In RTL, `translateX: -(x - THUMB/2)`.
  - `sliderValueFromDrag(start, isLayoutRtl() ? -dx : dx, track)`.
  - Accessibility increment and decrement are unchanged.
  - Add a `direction` parameter to `slider-geometry.ts` and test it (`slider-geometry.test.ts`).
- Verify, which needs a Clerk dev user with Level-setter metadata:
  - Arabic: the thumb sits on the fill end, dragging left raises the value, the value label follows, and marks align with ticks.
  - English: unchanged.

### S3 (major, decision): padel court line-up mirrors physical seats

- Screen: `game-details/lineup-card.tsx:235-262`, the "court from above".
- What's wrong: in Arabic the seat labelled "يسار" (Left) is drawn on the right of the screen. Left and Right are physical court sides, not reading order, so this is a fixed-meaning layout. See `game-details-lineup-ar.png`.
- Recommended fix: `style={{ direction: "ltr" }}` on the court grid's side rows (the `flexDirection: "row"` at `:235`) and on the same seat rows in `games/seat-chips.tsx`, `games/seat-picker-sheet.tsx`, `invites/seat-choice.tsx` and `game-details/join-sheet.tsx`. Text inside keeps the R2 default, so labels stay Arabic-aligned.
- Decision needed: confirm with the product owner that "left seat on the left" is wanted in Arabic. The alternative is to accept mirroring and rename nothing.
- Team labels ("الفريق A") also sit at the far left today because of R2; R2 moves them to the right.

### S4 (minor, both Locales): Unrated card body has no padding

- Cause: `game-details/rating-impact-card.tsx:77-86`. `UnratedCard` puts the line straight into `Card` without the padded body, so it touches the card edge. In Arabic it is also clipped at the left ("أحد." loses its period).
- Fix: wrap it in `<View style={{ paddingHorizontal: spacing.surface, paddingBottom: spacing.surface }}>`, as the rated card does.

### S5 (major): knockout codes are English

- Cause: `packages/domain/src/tournament-knockout.ts:324-339` (`knockoutMatchCode`) returns "Final", `S${n}`, `Q${n}` and `R${teams}-${n}`. They are shown as eyebrows ("FINAL", "S2") and inside "الفائز في S1". The code is also an identifier (`tournament-model.ts:54`, `tournament-knockout-view.ts:142, 263, 276`).
- Fix:
  - Keep `knockoutMatchCode` as the id.
  - Add `knockoutMatchCodeLabel(code, locale)` reading the catalog keys `tournament.knockout.codes.final`, `.semi(n)`, `.quarter(n)` and `.round(teams, n)`, in `packages/i18n/src/messages/{en,ar}/tournament.ts`.
  - English keeps "Final", "S1", "Q1", "R16-1".
  - Proposed Arabic: "النهائي", "نصف 1", "ربع 1", "دور الـ16 ‏- 1". The product owner should confirm the abbreviations.
  - Use the label everywhere it is displayed, including `winnerOf`.

### S6 (minor, decision): football position codes are English

- Cause: `packages/domain/src/football-lineup.ts:18-22, 44` ("DEF", "MID", "FWD", "GK"). Shown in line-ups, "لعبت FWD مع أسود" and the onboarding questionnaire.
- Decision: treat them like Level bands, Latin by design (then wrap them with `isolateLtr` inside sentences, R7), or translate them. Proposed codes are "حارس", "دفاع", "وسط", "هجوم", in a catalog `football.lineup.codes`.

### S7 (major): Profile form slots show "W/L"

- Cause: `packages/domain/src/home-recent-form.ts:41-46` hard-codes the labels "W", "L" and "D", and `profile/form-card.tsx:31` renders `bar.label`.
- Fix: render `m.mobilePlayer.formSlot[bar.outcome]` (the keys already exist: ar "ف/خ/ت"), and keep `label` as an id or drop it.

### S8 (minor): the Terms eyebrow interpolates an English date

- Cause: `legal/terms-screen.tsx:43` with `m.mobileHome.terms.lastUpdated(TERMS_UPDATED)` renders "OCTOBER 2026 27 آخر تحديث".
- Fix: format the date with `formatDayMonth(date, locale, { month: "long", year: true })`, which also needs R8; or keep the English date wrapped in `isolateLtr()`. The legal body stays English and LTR, which is correct.

### S9 (minor): Arabic short names

- `playerShortName` turns "أحمد الخليفة" into "أحمد ا." (Profile "Most played partner", line-up "أحمد ا").
- Latin-style initials don't read naturally in Arabic. Decision: for names in Arabic script, use the first name only or the first two words. Not an RTL defect; logged so it isn't lost.

## Cross-cutting rules for the implementer

1. Text alignment and paragraph direction come from the `Text` primitive (R2). Never rely on natural alignment. Don't add per-screen `textAlign: "right"` to fake RTL; `"left"` means start and `"right"` means end on this RN build.
2. Use logical style props only (`marginStart`, `paddingEnd`, `start`, `borderStartWidth`, `borderTopStartRadius`). Physical props are allowed only for deliberately physical geometry, with an ESLint allow-comment that says why (court seats, canvases, slider internals).
3. Never set `flexDirection: "row-reverse"` or flip on `isRTL` to "fix" RTL; the layout already mirrors. The one existing `row-reverse` (`played-game/played-football-board.tsx:53, 91`) is a deliberate inner-side mirror and renders correctly; leave it.
4. Values that read LTR as a unit (phone numbers, Level bands, `@handles`, codes, URLs, emails) use `<Text ltr>` on their own, and `isolateLtr()` inside a sentence. Names, venues and Group names inside sentences use `isolate()`.
5. Arabic copy never goes through `mono`, `uppercase` or expanded tracking; the `Text` primitive enforces this (R5).
6. All digits are Latin. Every `Intl`/`toLocale*` output passes through `latinDigits()` (R8).
7. Never concatenate catalog leaves or user values with `.join`/template strings in a component or domain module; a sentence or list is one catalog leaf (spec rule 3).
8. Scores and records render through `ScorePair` (R10).
9. Directional icons: chevrons and arrows that point along reading order get `mirrorInRtl`, and so do exit and trend icons (R11). Clocks, share, maximise, navigation, shuffle and sport glyphs never do.
10. Verify every change on the simulator in both Locales, with a restart after each switch. Unit-test pure helpers; there are no component tests.

## Proposed tickets (vertical slices, in order)

Each ticket's verification is "build, sign in as Testa, view the named screens in Arabic and English (switch in Settings and relaunch), compare with `screens/mobile/*`".

### T1: App boots and mirrors in Arabic (R0, R1). Blocker. No dependencies.

- Scope: `packages/i18n/src/plural.ts` plus a test; `apps/mobile/app.json`; a fresh prebuild.
- Acceptance:
  - Home renders on iOS in both Locales with no red box.
  - `plural()` matches `Intl.PluralRules` for 0..250 in en and ar (test).
  - On an English-language simulator, choosing العربية in Settings and relaunching gives a mirrored layout (avatar on the right on Home, back chevron on the right).
  - Choosing English and relaunching gives LTR.
  - The restart note shows only between the switch and the relaunch.
  - `Info.plist` has no `ExpoLocalization_supportsRTL`.

### T2: Text and inputs follow the layout direction (R2, R3, R7). Major. Depends on T1.

- Scope:
  - `primitives/text.tsx` (`textAlign`, `writingDirection`, `ltr` prop), `text-field.tsx`, `search-field.tsx`
  - `auth/phone-field.tsx`, `password-field.tsx`, `code-form.tsx`, email task
  - `ltr` on band, phone and handle values (sites listed in R7)
  - `isolate` and `isolateLtr` in `@repo/i18n`, applied to `forPhone`, `forPhoneOtherDevices`, `cancelWindowClosedCall`, and `seatWithBand` (new key replacing the join in `courtSeatSubline`)
- Acceptance:
  - In Arabic, these headings and bodies are right-aligned: Invites, Teams, My bookings, Create team, Game details, Venue, Checkout, Group edit, Sign in, Terms (title).
  - SheetMenu labels sit next to their icons (Game menu, Group menu).
  - Search placeholders and typed text sit at the right (Book, Group members, invite Sheet).
  - The phone field reads "+1 555 555 0142" left-to-right in both Locales.
  - "للرقم +1 555 555 0142." shows the number as one LTR unit.
  - "يمين · C+" and "D+" chips are not flipped.
  - "@aishab" stays as is.
  - English is pixel-identical to `*-en.png`.

### T3: Logical borders and the physical-prop lint (R4). Major. Depends on T1.

- Scope: the 10 border sites, the conversion of the remaining physical props, and the ESLint rule.
- Acceptance:
  - In Arabic, Home recent form has dividers between لعبت|الفوز|خسارة and none on the card edge.
  - Game details hero figures have dividers between the figures.
  - The language switch, sport segments, Games filters, Standing columns, NotSet cells and the Delete Group sheet split correctly.
  - Lint fails on a new `marginLeft` in `apps/mobile/src`.
  - English unchanged.

### T4: Arabic typography in mono, eyebrows and tabs (R5, R9). Major. Depends on T2.

- Scope: the family choice in `Text` plus a unit test; the tab label in `app-tabs.tsx`; the optional short Profile tab title.
- Acceptance:
  - In Arabic, these eyebrows show joined letters: Home ("بادل / لعبة", "مجموعتان"), Games, Groups list, Create step counter, Checkout venue eyebrow, the Tonight strip on Welcome, goal counts on Football details.
  - "1080 × 1920" stays mono.
  - The focused Profile tab label is one line and unclipped on iPhone 17 Pro and iPhone SE.

### T5: Latin digits everywhere (R8). Major. Depends on T1.

- Scope: `latinDigits` in `@repo/i18n`; the formatters in `format-game-start.ts`, `booking-copy.ts` and `player-profile.ts`; Arabic test cases.
- Acceptance:
  - In Arabic, these show only Latin digits: the Home hero time and to-time, Coming up times, Game details date line, Venue slot grid and footer, Checkout date line, Create time chips and hero, Player profile streak date.
  - Domain tests in `"ar"` pass.

### T6: Names, lists and scores read right in Arabic (R6, R10, S7, S8). Major. Depends on T2.

- Scope:
  - `isolate` in the pair and list leaves (`ar/game.ts`, `ar/tournament.ts`, `ar/mobile-game-details.ts`, `ar/community.ts`)
  - `common.listSeparator`, replacing the visible `.join(", ")` and `" · "` joins
  - the `ScorePair` primitive, used on match rows, Home and Profile records, tournament rounds, the score card and the bottom-bar sentence
  - the Profile form-slot letters
  - the Terms date
- Acceptance:
  - In Arabic: "Sofia R و Jonas B" and "Testa و Omar" display with the conjunction between the names on the Games hub, Tournament, Score card and Game details hero.
  - Lists use "،".
  - In every score the viewer's or slot-1 number is on the right in Arabic and on the left in English.
  - Profile form slots read "ف/خ".
  - The Terms eyebrow reads as one Arabic date.

### T7: Share result preview in RTL (S1). Blocker. Depends on T1.

- Scope: `share-result/story-canvas.tsx`.
- Acceptance:
  - In Arabic the Story and Sticker previews are visible and match the English layout mirrored.
  - The exported PNG (Save image) is full and unclipped in both Locales.

### T8: Slider in RTL (S2). Blocker. Depends on T1.

- Scope: `primitives/slider.tsx`, `slider-geometry.ts` plus tests.
- Acceptance:
  - On `groups/set-level` (Level-setter account), in Arabic the thumb sits on the fill end at every value, dragging left increases the value, and the label tracks the thumb.
  - English unchanged.
  - Geometry tests cover both directions.

### T9: Fixed-meaning layouts and icons (S3, R11). Major. Needs the S3 decision; depends on T2.

- Scope:
  - `direction: "ltr"` on the court seat rows (line-up card, seat chips, seat picker, seat choice, join sheet)
  - `mirrorInRtl` for `LogOut` in the Game and Group menus
  - consistent trend arrows on Home Level and the Rating impact card
- Acceptance:
  - In Arabic the "يسار" seat is drawn on the left of the court on Game details (upcoming, played), in the Join sheet and in the seat picker.
  - The Leave icons point out of the reading direction.
  - Home and Game details trend arrows agree.

### T10: Knockout and position codes (S5, S6). Major or minor. Needs the code-wording decision.

- Scope: `knockoutMatchCodeLabel` plus catalog keys; football code labels if the decision is to translate.
- Acceptance: no Latin "FINAL", "S1", "S2" or "Q1" on the Arabic Tournament details knockout, the "الفائز في …" placeholders or the tournament card; English unchanged.

### T11: Unrated card padding (S4). Minor, both Locales. No dependencies.

- Acceptance: the Unrated card line is inset like the rated card in both Locales; the Arabic period is visible.

## Other findings (not RTL, logged so they aren't lost)

- English tournament Pool tabs read "group A" and "group B" in lowercase (see the Tournament English screenshot). Check the `en` catalog key used by `tournament/standings-view.tsx`.
- The Games hub tournament card shows "11:00 AM Tonight" for a morning window in both Locales; check the time-of-day word in the domain copy.
- Server error messages (`error.message` rendered in Notices and toasts) arrive in English. This is out of scope per the localization spec (`Accept-Language` later).

## Screenshots

`.scratch/rtl-audit/screens/mobile/`:

- `home-ar.png`, `home-en.png`
- `home-recent-form-ar.png` vs `home-recent-form-en.png` (R4)
- `settings-ar-before-restart.png` (R9 wrap)
- `games-ar.png`, `games-cards-ar.png` (R2, R6, R8)
- `game-details-ar.png` vs `game-details-en.png`
- `game-details-lineup-ar.png` (S3)
- `game-details-level-band-ar.png` ("+C", R7)
- `game-score-card-ar.png` (R6, "+D")
- `game-menu-sheet-ar.png`, `group-menu-sheet-ar.png` (R2)
- `invite-sheet-ar.png` (R2, R3)
- `tournament-knockout-ar.png` (S5)
- `football-played-ar.png` (S6, R5)
- `share-result-ar.png` vs `share-result-en.png` (S1)
- `book-venues-ar.png` (R2, R3), `book-venue-ar.png`, `book-checkout-ar.png`
- `group-home-ar.png`, `group-members-ar.png`, `group-edit-ar.png`
- `player-profile-ar.png`, `player-profile-matches-ar.png` (R8, R10)
- `profile-ar.png` (S7, R9), `profile-invites-ar.png` (R2)
- `create-game-type-ar.png` (R5), `create-game-calendar-ar.png` (correct mirroring)
- `welcome-ar.png`, `sign-in-phone-ar.png`, `sign-in-password-ar.png` (R7)
- `terms-ar.png` (S8)
