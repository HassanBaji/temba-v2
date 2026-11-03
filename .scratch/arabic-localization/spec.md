# Arabic localization

Status: in-progress

Related: [ADR-0052](../../docs/adr/0052-two-languages-from-one-message-catalog.md), `CONTEXT.md` (i18n Package, Locale, Message catalog), `CLAUDE.md` (Package boundaries, Conventions).

## Problem Statement

Temba is written in English only, as string literals spread over the Web App, the Mobile App and the copy modules of `@repo/domain`. Bahrain's players read Arabic. There is no locale, no catalog, no right-to-left layout and no language switch.

## Solution

One typed Message catalog in the new `@repo/i18n` Package, in English and Arabic, read by property access. A `Locale` value flows into every function that produces copy. The Web App reads it from a cookie and sets `lang` and `dir` on `<html>`; the Mobile App stores it in AsyncStorage, defaults to the device language and mirrors layout through `I18nManager`. A two-way language switch sits on the sign-in screens and in Settings on both Apps.

The Venue console App (`apps/console`) is out of scope: Venue managers get Arabic in a later ticket. Legal text (`terms.ts`) stays in English with a note that the English text governs. Server error messages from the API still arrive in English (later ticket: `Accept-Language` on the API context).

## Architecture (already in place)

```text
packages/i18n/src/locale.ts        Locale ("en" | "ar"), DEFAULT_LOCALE, isLocale, localeDirection, isRtl,
                                   intlLocale (en-US / ar-BH-u-nu-latn), LOCALE_LABELS, pickLocale, cookie and storage keys
packages/i18n/src/plural.ts        plural(locale, count, { zero?, one, two?, few?, many?, other })  — "{n}" is the count
packages/i18n/src/messages.ts      messagesFor(locale): Messages;  type Messages = typeof en
packages/i18n/src/messages/en/*.ts One file per owner (below). Leaves are strings or (vars) => string.
packages/i18n/src/messages/ar/*.ts Same files; each is `{...} satisfies typeof <en file>` so keys must match.
packages/i18n/src/messages.test.ts Walks both catalogs: same keys, same leaf kinds, no empty strings, Arabic in ar.

apps/web/src/lib/request-locale.ts            getRequestLocale(), getRequestMessages()  — Server Components only
apps/web/src/components/locale-provider.tsx   useLocale(), useMessages(), useTextDirection(), useLocaleSwitch()  — Client Components
apps/web/src/components/common/language-toggle.tsx   <LanguageToggle />
apps/web/src/lib/set-locale-action.ts         server action writing the cookie (the provider calls it)

apps/mobile/src/i18n/locale-provider.tsx      useLocale(), useMessages(), useLocaleSwitch() ({ locale, setLocale, restartNeeded })
apps/mobile/src/i18n/rtl.ts                   mirrorInRtl (style for arrows/chevrons), isLayoutRtl()
```

Reading a message:

```ts
// Client Component (web)             // Client Component (mobile)
const m = useMessages();               const m = useMessages();
const locale = useLocale();            const locale = useLocale();
<Button>{m.webGame.joinButton}</Button>
<Text>{m.mobileHome.greeting(firstName)}</Text>

// Server Component (web)
const m = await getRequestMessages();
const locale = await getRequestLocale();

// Domain or any plain module
import { messagesFor } from "@repo/i18n/messages";
import { plural } from "@repo/i18n/plural";
export function cancelGameConsequence(playerCount: number, locale: Locale) {
  const m = messagesFor(locale).game;
  if (playerCount <= 0) return m.cancelNobodyJoined;
  return m.cancelRemovesFromCalendar(playerCount);   // leaf: (n: number) => plural(locale, n, {...})  — or branch on n inside the leaf
}
```

Leaves that need a count carry the plural inside the catalog file, so the Arabic file can use the six categories:

```ts
// en/game.ts
cancelRemovesFromCalendar: (n: number) => plural("en", n, { one: "Removes it from the calendar for 1 player.", other: "Removes it from the calendar for all {n} players." }),
// ar/game.ts
cancelRemovesFromCalendar: (n: number) => plural("ar", n, { one: "يزيلها من تقويم لاعب واحد.", two: "يزيلها من تقويم لاعبَين.", few: "يزيلها من تقويم {n} لاعبين.", many: "يزيلها من تقويم {n} لاعبًا.", other: "يزيلها من تقويم {n} لاعب." }),
```

## Rules for every slice

1. **Every user-facing string comes from the catalog.** JSX text, `label`/`title`/`placeholder`/`description` props, toasts, alerts, `aria-label`, `accessibilityLabel`, `accessibilityHint`, `alt`, `<title>` metadata, Open Graph text, share messages, empty states, error summaries, skeleton labels, `confirm()` text. The brand "Temba", proper nouns, Level band letters (`D+`, `PRO`), scores and codes stay as they are.
2. **Edit only your own catalog files** (`en/<file>.ts` and `ar/<file>.ts` for your owner name) and only the source files in your slice. Read `en/common.ts` first and reuse its keys; never edit `common` or another slice's files. Other agents are editing other slices at the same time, so typecheck errors inside files outside your slice are not yours: judge your slice by `tsc` errors in your files and by its tests.
3. **Key shape.** camelCase keys, nested by screen or component (`m.webGame.joinSheet.title`). Strings without variables are strings. Strings with variables are functions `(name: string) => \`...\``. Counts use `plural()`. Never build a sentence by concatenating catalog pieces across keys: a sentence is one leaf, because Arabic word order differs.
4. **Arabic is a translation, not a transliteration.** Modern Standard Arabic, addressed to one reader (أنت). Use Arabic punctuation (، ؟) and the ellipsis "…". Keep "Temba" in Latin. Digits stay Latin (the Intl locale carries `nu-latn`). Use the glossary below for every product noun. Match English sentence case; Arabic has no case. Keep strings as short as the English ones: buttons and tab labels must fit the same space.
5. **Identifiers are not copy.** If a string is compared somewhere (`tab === "Upcoming"`, `status === "Not played"`), it is an id: keep it stable (or convert it to an id and derive the label from the catalog). Never translate a value that is sent to the API, stored, or used as a key, route or test id.
6. **Dates and times** go through the domain formatters in `format-game-start.ts` and `booking-copy.ts`, which take `locale`. Never call `toLocaleDateString` with a literal locale in an App.
7. **Direction.** Web: Tailwind physical classes were already rewritten to logical ones (`ms-`, `pe-`, `start-`, `text-end`). Add `rtl:-scale-x-100` to `ArrowLeft`, `ArrowRight`, `ChevronLeft`, `ChevronRight`, `MoveRight` icons that point along the reading direction. Mobile: React Native mirrors layout on its own; add `style={mirrorInRtl}` (from `src/i18n/rtl.ts`) to those same icons. Do not mirror icons that point at a fixed thing.
8. **No behaviour change.** Same components, same props, same routes, same procedure calls. Do not restructure, rename, reformat or "improve" code beyond what reading from the catalog needs. Do not touch migrations, the API Package, or files outside your slice.
9. **Tests.** Keep every test passing. Where a test asserts English copy, keep the English literal (call the function with `"en"`). For domain modules add one test per module that calls with `"ar"` and asserts Arabic output for one representative case. Do not test the Apps' components (there are no component tests).
10. **Comments.** None that narrate the change. Keep existing comments unless the code they describe changed.
11. **Finish.** Run `pnpm --filter <your package> exec tsc --noEmit`, `pnpm --filter <your package> exec eslint <your files>`, `pnpm --filter <your package> exec vitest run <your tests>` and `pnpm --filter @repo/i18n test`. Then run `pnpm --filter <your package> exec prettier --write <your files>` and the same on your catalog files in `packages/i18n`. Then grep your slice for leftover literals: `grep -nE '>[^<>{}]*[A-Za-z]{3,}' <files>` and `grep -nE '(label|title|placeholder|description|aria-label|accessibilityLabel|accessibilityHint)=\"[A-Z]' <files>`. Report what you could not move and why.

## Domain slice rules (`packages/domain`)

- A function that returns copy (a string, or an object with copy inside) gains `locale: Locale` as its **last required positional parameter**. If it takes one options object, add `locale: Locale` to that object instead. If it has optional trailing parameters, `locale` goes before them. Import `type Locale` from `@repo/i18n/locale`.
- An **exported string constant** (`export const JOIN_GAME_ACTION = "Join Game"`) is deleted and replaced by a catalog entry. If other domain modules read it, export a function of `locale` with the same meaning (`joinGameAction(locale)`). Grouped constant objects (`GAME_TOAST.joined`) become nested catalog objects.
- Display maps (`Record<Sport, string>`) become functions of `(value, locale)`.
- `APP_LOCALE` in `format-game-start.ts` is replaced by `intlLocale(locale)` and every formatter takes `locale`; `product-timezone.ts` keeps its fixed `en-US` parts formatter (it parses numbers, not copy).
- Fixture modules (`*-fixtures.ts`) are preview data, not copy: leave their English strings, but pass `"en"` where they call changed functions.
- Modules whose strings are not user-facing (error classes, ids, enums, route paths, `terms.ts`) are left as they are. `terms.ts` gains nothing; the Apps add the "English text governs" note from their own catalogs.
- Do not change a function's return shape. Do not move a function between modules.
- Callers outside the domain (`@repo/api`, `apps/web`, `apps/mobile`, `apps/console`) are updated in the next phase by other agents; do not edit them.

Slices and catalog owners:

| Slice | Catalog file(s)                                                    | Modules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1    | `game`                                                             | completed-matches friendly-game-actions friendly-game-chrome friendly-game-cta friendly-game-details friendly-game-details-fixtures friendly-game-hero friendly-game-organizer friendly-game-partner friendly-game-players friendly-game-results friendly-game-score game-card game-card-side-join game-copy game-details-fixtures game-kick-confirm game-occupancy game-rating-eligibility game-rating-impact game-result-share game-summary-cta game-window games-hub-empty-states games-hub-fixtures games-hub-tab hub-game-row match-history-card match-outcome match-slots match-status played-game rate-doubles-match result-mark set-wins-for-games                                                                                            |
| D2    | `createGame`, `level`, `dates`                                     | court-rename court-sport-copy create-game-draft create-game-fixtures create-game-flow create-game-submit entity-image-file format-game-start game-custom-name game-edit-form game-edit-save game-format-label game-invite-open-graph game-invite-share-message game-season-link game-shape game-side-label game-venue-select home-countdown level level-bands level-range level-range-request level-slider price-per-player product-timezone sport venue-photos                                                                                                                                                                                                                                                                                       |
| D3    | `tournament`, `football`                                           | football-board football-game-details football-hub football-lineup football-self-placement football-size-copy pool-table tournament-card tournament-card-fixtures tournament-details tournament-details-fixtures tournament-half-teams tournament-home tournament-join tournament-knockout tournament-knockout-view tournament-organizer tournament-pool-draw tournament-pool-table tournament-price tournament-rounds tournament-schedule tournament-sizing                                                                                                                                                                                                                                                                                           |
| D4    | `group`, `community`, `invite`, `team`                             | active-venue-count add-player-by-phone community community-chrome community-data community-fixtures community-home-tab community-role-change community-sports group-admin group-create group-data group-empty-states group-fixtures group-home-chrome group-home-cta group-home-tab group-invite-open-graph group-invite-share-message group-join group-link-request group-members-table group-season group-settings groups-list groups-list-empty-states groups-tab initials invite-door invite-outcome-copy invite-paths invites member-count-label member-form-marks member-win-loss player-name request-meta season-standing team-avatar-people team-link-community-picker team-roster teams teams-fixtures user-display-name win-rate win-streak |
| D5    | `home`, `profile`, `onboarding`, `booking`, `notification`, `auth` | booking-copy booking-manager-actions booking-payment booking-price booking-refund booking-slots clerk-auth-error entity-list-empty glicko2 home-coming-up home-fixtures home-level home-level-chart home-next-game home-no-games home-recent-form home-seats home-standing home-state-line idle is-forbidden-error is-not-found-error notification-copy onboarding-answers onboarding-flow parse-optional-coord phone-number player-profile player-profile-fixtures player-profile-football player-profile-level player-profile-matches preferred-position preferred-seat profile-all-time profile-checklist profile-chrome profile-fixtures profile-level resend-countdown roving-radio safe-internal-redirect surface-tone terms verification-code  |

A module that calls a copy function from another slice passes `locale` through. If that function has not gained the parameter yet when you typecheck, leave your call with `locale` and move on: the orchestrator reconciles after every slice lands.

## Web slice rules (`apps/web`)

- Client Components (`"use client"`): `const m = useMessages()` and `const locale = useLocale()` from `~/components/locale-provider`. Server Components and `generateMetadata`: `await getRequestMessages()` / `await getRequestLocale()` from `~/lib/request-locale`. Hooks and `lib` helpers that produce copy take `messages` or `locale` as a parameter.
- Pass `locale` to every domain function that now takes one (typecheck lists them).
- `app/dashboard/design/**` pages are development-only previews fed by fixtures: pass `"en"` and do not translate their fixture text.
- Pages under `app/terms` and `app/privacy`: keep the legal text, translate the chrome (title, back link) and add the "English text governs" line from the catalog in Arabic.
- The auth screens (`components/auth/auth-screen.tsx` or the welcome screen) and `app/dashboard/you/settings/page.tsx` render `<LanguageToggle />` (slice W6).
- Metadata titles come from the catalog. Route segment config stays.

| Slice | Catalog file    | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1    | `webGame`       | `components/games/*` except the tournament and football files                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| W2    | `webTournament` | `components/games/tournament-*`, `components/games/football-*`, `components/games/pool-*`, `components/games/knockout-*`                                                                                                                                                                                                                                                                                                                                                                                                |
| W3    | `webDashboard`  | `app/dashboard/**` (pages, layouts, loading, error)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| W4    | `webGroup`      | `components/groups/*`, `components/communities/*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| W5    | `webUi`         | `components/ui/*`, `components/temba/*`, `components/common/*` (not `language-toggle.tsx`), `components/layout/*`, `components/players/*`, `components/notifications/*`, `components/venues/*`, `components/share-result/*`, `components/app-sidebar.tsx`, `components/nav-main.tsx`, `components/site-header.tsx`, `components/dashboard-shell.tsx`, `components/create-access-gate.tsx`, `components/operator-gate.tsx`, `components/auth-header-controls.tsx`, `components/navigation-trail.tsx`, `hooks/*`, `lib/*` |
| W6    | `webAuth`       | `components/auth/*`, `components/onboarding/*`, `components/home/*`, `components/invites/*`, `components/you/*`, `components/settings/*`, `app/login/**`, `app/signup/**`, `app/onboarding/**`, `app/invites/**`, `app/g/**`, `app/gr/**`, `app/terms/**`, `app/privacy/**`, `app/page.tsx`, `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`                                                                                                                                                               |

## Mobile slice rules (`apps/mobile`)

- `const m = useMessages()` and `const locale = useLocale()` from `src/i18n/locale-provider`. Model modules (`*-model.ts`) and other plain functions that produce copy take `locale` (or `messages`) as a parameter and keep their unit tests (English literals with `"en"`, one Arabic case each).
- The `Text` primitive already handles font and figures; Arabic falls through to the system Arabic font. Do not set `fontFamily`.
- `accessibilityLabel` and `accessibilityHint` are copy too.
- `app/(app)/profile/index.tsx` / `src/profile/settings.tsx`: add a Language row (two choices, each in its own language, `LOCALE_LABELS`) wired to `useLocaleSwitch()`, and show `m.common.restartToApplyLayout` as a muted note while `restartNeeded` is true (slice M6). The welcome screen `app/(auth)/welcome.tsx` gets the same two-choice switch (slice M6).
- Tab titles in `src/navigation/tab-list.ts` come from the catalog (`visibleTabs(messages)`).

| Slice | Catalog file        | Files                                                                                                                                                                                                                   |
| ----- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1    | `mobileGroup`       | `src/groups/**`, `app/(app)/groups/**`                                                                                                                                                                                  |
| M2    | `mobileGameDetails` | `src/game-details/**`, `app/(app)/games/**`                                                                                                                                                                             |
| M3    | `mobileCreateGame`  | `src/create-game/**`                                                                                                                                                                                                    |
| M4    | `mobileBooking`     | `src/booking/**`, `app/(app)/book/**`                                                                                                                                                                                   |
| M5    | `mobileTournament`  | `src/tournament/**`, `src/games/**`, `src/football/**`                                                                                                                                                                  |
| M6    | `mobileHome`        | `src/home/**`, `src/auth/**`, `src/profile/**`, `src/profile-tasks/**`, `src/navigation/**`, `src/legal/**`, `app/(auth)/**`, `app/(app)/(home)/**`, `app/(app)/profile/**`, `app/(app)/_layout.tsx`, `app/_layout.tsx` |
| M7    | `mobileCommunity`   | `src/communities/**`, `src/invites/**`, `src/teams/**`, `app/(app)/communities/**`                                                                                                                                      |
| M8    | `mobilePlayer`      | `src/player-profile/**`, `src/played-game/**`, `src/share-result/**`, `src/primitives/**`, `src/lib/**`, `src/trpc/**`                                                                                                  |

## Glossary (English → Arabic)

Use these exact words for the product nouns. Capitalised glossary nouns in English (Game, Match, Set, Team, Level) map to these; Arabic uses the definite article where a noun stands alone.

| English                                      | Arabic                                                    | Note                                               |
| -------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| Temba                                        | Temba                                                     | never transliterate                                |
| Game (the event players join)                | لعبة / اللعبة                                             | plural ألعاب                                       |
| Match                                        | مباراة                                                    | plural مباريات                                     |
| Set                                          | شوط                                                       | plural أشواط; "Set 1" → "الشوط 1"                  |
| Team                                         | فريق                                                      | plural فرق                                         |
| Group                                        | مجموعة                                                    | plural مجموعات; tournament pools are also "Groups" |
| Community                                    | مجتمع                                                     | plural مجتمعات                                     |
| Venue                                        | نادٍ / النادي                                             | the facility                                       |
| Court                                        | ملعب                                                      | plural ملاعب; football "pitch" is also ملعب        |
| Level                                        | المستوى                                                   | band letters stay Latin (D, D+, …, PRO)            |
| Rating / rated / Unrated                     | التصنيف / مصنّفة / غير مصنّفة                             |                                                    |
| Provisional                                  | مبدئي                                                     |                                                    |
| Waitlist                                     | قائمة الانتظار                                            |                                                    |
| Seat / seats                                 | مقعد / مقاعد                                              |                                                    |
| Partner                                      | شريك                                                      |                                                    |
| Organizer                                    | المنظّم                                                   | Appointed Organizer: منظّم معيّن                   |
| Owner / Admin / Member                       | المالك / المشرف / عضو                                     | Community roles                                    |
| Group owner / Group approver                 | مالك المجموعة / مُوافِق المجموعة                          |                                                    |
| Invite / Invite link / Lookup invite         | دعوة / رابط الدعوة / دعوة مباشرة                          |                                                    |
| Join / Leave / Kick                          | انضمام / مغادرة / إخراج                                   | as verbs: انضم، غادر، أخرِج                        |
| Register (a Team)                            | تسجيل                                                     |                                                    |
| Friendly game                                | لعبة ودية                                                 |                                                    |
| Americano                                    | أمريكانو                                                  |                                                    |
| Tournament / Knockout / Round / Final        | بطولة / خروج المغلوب / جولة / النهائي                     |                                                    |
| Season / Standing                            | الموسم / الترتيب                                          |                                                    |
| Win / Loss / Draw / not played               | فوز / خسارة / تعادل / لم تُلعب                            |                                                    |
| Win rate / Streak / Form                     | نسبة الفوز / سلسلة / الأداء الأخير                        |                                                    |
| Padel / Football                             | بادل / كرة القدم                                          |                                                    |
| Booking / Slot / Price                       | حجز / فترة / السعر                                        | prices in BHD: "د.ب" after the number              |
| Home / Games / Book / Groups / Profile / You | الرئيسية / الألعاب / حجز / المجموعات / الملف الشخصي / أنت | tab names                                          |
| Settings / Notifications / Teams / Invites   | الإعدادات / الإشعارات / الفرق / الدعوات                   |                                                    |
| Sign in / Sign up / Sign out                 | تسجيل الدخول / إنشاء حساب / تسجيل الخروج                  |                                                    |
| Phone number / Password / Code               | رقم الهاتف / كلمة المرور / الرمز                          |                                                    |
| Operator                                     | المشغّل                                                   | staff role                                         |
| Unclaimed player                             | لاعب غير مسجّل                                            |                                                    |
| Preferred Position: Left / Right / Either    | الجهة المفضّلة: يسار / يمين / أي جهة                      |                                                    |
| Terms and Conditions                         | الشروط والأحكام                                           |                                                    |

## Testing decisions

- `packages/i18n/src/messages.test.ts` is the parity gate: both catalogs carry the same keys and leaf kinds.
- Domain tests keep their English expectations and add one Arabic case per module.
- The pull request gate `pnpm exec turbo run typecheck lint test` must pass; `pnpm exec turbo run build --filter web` is run once at the end.

## Out of scope

- `apps/console` (Venue console) copy.
- API error messages (`TRPCError` text) and SMS text.
- Translating `terms.ts`.
- Bundling an Arabic font in the Mobile App (system fallback is used).
