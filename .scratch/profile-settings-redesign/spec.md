Status: ready-for-agent

# Settings screen redesign

Design source: claude.ai/design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`, file **`settings.dc.html`**, screen **09 Settings**. The markup is saved at `design/09-settings.html`, and the note copy comes from the file's `sideVals()` script. `support.js` is only the design-canvas runtime and has no screen content.

Parent: `.scratch/profile-redesign/spec.md` (TEM-229 created `/dashboard/you/settings` with the old rows moved "unchanged").

## Problem Statement

`/dashboard/you/settings` still uses the old `RowList` / `ListRow` look. It does not match the redesigned Profile (04). Setting Preferred Position takes two steps (a "Not set" button, then a dialog). The rows also have a layout bug: `ListRow`'s text block has no `flex-1 min-w-0`, so with `justify-between` the title and subtitle float to the middle of the row, and each row puts them at a different x (see `design/upload-2026-09-17.png`).

## Solution

Rebuild the Settings page from design 09, using the Home/Profile design system (`ink` / `paper` / `rule` / `wash` tokens, 22px gutters). Preferred Position is edited inline with a three-way segmented control. Teams, Invites and Venues become grouped link rows that show a count. Sign out moves to a footer with an identity line under it.

## Current behaviour

- Route `/dashboard/you/settings`, reached from the Profile gear (`ProfileHeader`). `DashboardShell title="Settings" isSubPage` supplies a generic sub-page top bar.
- `YouPreferredPositionRow` reads `users.onboardingState`, shows the label on an outline button, and opens `PreferredPositionDialog`, which saves through `users.setPreferredPosition`. It shows the toast "Preferred Position saved". Editing is disabled while `state.data` is null or `provisioning`.
- Teams → `/dashboard/teams`. Invites → `/dashboard/invites`, with the `usePendingInviteCount` badge or a skeleton. Venues (only when `publicMetadata.operator === true`) → `/dashboard/venues`.
- Full-width outline "Sign out" calls `clerk.signOut({ redirectUrl: "/login" })`.
- A skeleton shows while Clerk loads.

## Screen spec: Settings (`/dashboard/you/settings`)

Use `DashboardShell width="content" hidePageHeader hideMobileTopBar`, like Profile, and render the page's own header.

1. **Header.** A 44×44 back link (lucide `arrow-left`, 20px, `aria-label="Back to Profile"`, href `/dashboard/you`) with a -12px left offset so the icon lines up with the gutter. Next to it, a 6px gap, then `<h1>` "Settings" at 26px / 700 / -0.01em. Follow `GroupHomeTopBar`'s back-link styling and focus ring.
2. **Body.** 26px top padding, 28px gap between sections. Each section has an **eyebrow** label (monospace, 11px, uppercase, 0.04em tracking) with a 12px gap above its group. Groups: 1px `rule` border, 14px radius, `overflow-hidden`.
3. **PLAYING: Preferred Position card.** Padding 18px 20px 20px.
   - Top row: title "Preferred Position" (16px / 600) with the subtitle "Your default side when you pick a Game seat" (13px, muted, line-height 1.45) under it. On the right, a decorative `arrow-left-right` icon (20px, muted, `aria-hidden`).
   - 16px below: a segmented control. It is a 3-column grid with a 6px gap, a `wash` background, 12px radius and 5px padding. The options are Left / Right / Either, from `PREFERRED_POSITION_CHOICES`, each at least 44px tall with a 9px radius and 14px text. The selected option has an `ink` background, `paper` text and weight 600. The others have a transparent background and muted text that turns `ink` on hover.
   - Semantics: `role="radiogroup"` labelled by the title. Each option is `role="radio"` with `aria-checked`, and arrow keys move the selection (or use the existing Radix `ToggleGroup` / `RadioGroup` primitive if the repo has one).
   - **Save on tap.** Tapping an unselected option calls `users.setPreferredPosition` right away and shows the new selection optimistically. On error, roll back and call `toastGlobalFormError`. On success, invalidate `users.onboardingState`; the success toast is dropped, because the selection itself confirms the save. The control is disabled while the mutation is pending, and while editing is not allowed (`state.data == null || provisioning`).
   - **Unset:** no option is selected.
   - **Loading:** a skeleton the height of the control.
   - **Note line** (12px, muted, 10px margin-top), using the copy in Decision 1. It shows the stored value, or the optimistic value while a save is pending.
     - Keep the map (`preferredPositionNote(value)`) in `lib/preferred-position.ts` next to the labels, with a unit test.
4. **PEOPLE group.** Two link rows, separated by a `rule` top border.
   - Row anatomy: padding 16px 18px, 14px gap. Leading lucide icon (20px, `ink`). A text block with `flex-1 min-w-0`: the title (16px / 600) and the subtitle (13px, muted, 2px margin-top), both truncated. Then a trailing value, then a `chevron-right` (18px, muted). Hover uses the `wash` background, and the whole row is the link with a visible focus ring.
   - **Teams** (`users` icon), "Partnerships you play as", → `/dashboard/teams`. The trailing value is the Team count from `teams.mine` (`data.length`), as plain muted 13px text. Show nothing while loading, on error, or when the count is 0.
   - **Invites** (`mail` icon), "Lookup invites addressed to you", → `/dashboard/invites`. When `invites.showCount` is true, the trailing value is a pill: at least 22px wide and 22px tall, 7px horizontal padding, 11px radius, `ink` background, `paper` text, 12px / 600. Keep the existing `role="status"` / `aria-label="{n} pending invites"` wrapper. While loading, show a small skeleton pill.
5. **OPERATOR TOOLS group** (only when `publicMetadata.operator === true`). One row: **Venues** (`building-2` icon), "Venue and Court catalogue", → `/dashboard/venues`. The trailing value is `"{n} venues"` / `"1 venue"` from `venues.list`. Count per Decision 2.
6. **Footer.** Pushed to the bottom of the viewport on tall screens (`mt-auto`), with a `rule` top border and padding 20px 22px 26px.
   - A full-width "Sign out" button: 52px tall, 12px radius, `rule` border, `paper` background, 15px / 500, `wash` background on hover. Same `clerk.signOut` behaviour as today.
   - Under it, with a 10px gap, a centred identity line (monospace, 11px, uppercase, muted): `{DISPLAY NAME} · {PHONE}`, per Decision 3.
7. **Loading (Clerk not loaded).** A skeleton that follows the new layout: header, one card, and a 2-row group. Keep `aria-busy`.

### Token mapping (no hex literals; the TEM-72 gate greps for them)

| Design | Token |
| --- | --- |
| `#000000` | `ink` |
| `#FFFFFF` | `paper` |
| `#E6E6E6` | `rule` |
| `#F4F4F4` | `wash` |
| `#6E6E6E` | `muted-foreground` |
| `#9A9A9A` (eyebrows, counts, chevrons, note, footer, decorative icon) | **`muted-foreground`**. `globals.css` forbids the faint grey (2.56:1 on wash). |

## Components

- **New:** `components/settings/settings-section.tsx` (eyebrow plus bordered group), `settings-link-row.tsx` (the row anatomy above), `preferred-position-control.tsx` (card plus segmented control plus mutation), and `settings-footer.tsx`. Keep them small. Do not generalise them beyond Settings until a second screen needs them.
- **Deleted:** `components/you/you-preferred-position-row.tsx` and `components/you/preferred-position-dialog.tsx`, which have no other callers (checked). `PREFERRED_POSITION_CHOICES` and `preferredPositionLabel` stay in `lib/preferred-position.ts`.
- **Unchanged:** `ProfileHeader`, `usePendingInviteCount`, `users.setPreferredPosition`, `users.onboardingState`, `teams.mine`, `venues.list`. No server changes are needed.

## `ListRow` alignment fix (separate ticket)

`components/common/row-list.tsx`: the text wrapper `<div className="flex items-center gap-4">` needs `min-w-0 flex-1`. Without it, `justify-between` centres the text and `truncate` never takes effect. `ListRow` is still used on Teams, Team detail, Invites, Venues, Venue detail, Communities, and the community tabs. After this redesign Settings no longer uses it, but those screens show the same bug.

## Decisions (settled with the product owner, 2026-09-17)

1. **Note line: use accurate copy, not the design's.** The design's copy promises seat auto-picking and Organizer placement, and neither exists. Preferred Position only seeds the starting side on the register-with-a-partner review (`seedPartnerCallerPosition`: your side wins, otherwise the opposite of your partner's side, otherwise Left). Copy:
   - Unset: "Not set. We start you on the left when you register with a partner."
   - Left: "We start you on the left when you register with a partner."
   - Right: "We start you on the right when you register with a partner."
   - Either: "Either side. Your partner's preference decides."
   - Tell the designer so `settings.dc.html` matches.
2. **Venues count: active only** (`archivedAt == null`). Text: `1 venue` / `{n} venues`. Hide it when the count is 0, while loading, or on error.
3. **Footer identity line: name · phone as stored.** Use the Clerk display name (same fallback chain as Profile: `fullName ?? firstName ?? username ?? "You"`) and `user.primaryPhoneNumber?.phoneNumber` in E.164 as stored, with no formatting library. If there is no phone, show the name only. Render it uppercase through CSS.
4. **Save on tap, no success toast.** The selection changes optimistically and rolls back with `toastGlobalFormError` on failure. The dialog is removed. The Onboarding questionnaire keeps its own picker.

## Non-goals

- Changes to Profile (04), Home, or the Onboarding questionnaire.
- New settings (notifications, account editing, delete account). Clerk still owns name, photo and phone.
- Server or schema changes.
- Dark-mode polish beyond what the tokens already give.
- Restyling the Teams, Invites or Venues screens (only the `ListRow` alignment bug is fixed).

## Risks

- **Accidental taps change Preferred Position.** This is low impact because it is re-editable and only a default. Optimistic rollback covers failures.
- **Extra queries.** `teams.mine` loads members for every Team the User is in, and `venues.list` (operators only) loads all Venues, just to show a count. Both lists are small today. If they grow, add a count endpoint later.
- **`ListRow` fix touches shared UI.** Check the screens listed above for layout regressions, especially rows that have both `leading` and `icon`.
- **Tests.** No component tests cover the Settings page today (`lib/preferred-position.test.ts` covers only the label map). Add a unit test for the note-line copy and the Venues-count helper if they are extracted as pure functions.

## Tickets

1. **[TEM-235](https://linear.app/temba-app/issue/TEM-235) Settings screen redesign (design 09).** The whole screen above in one vertical slice: header, Preferred Position segmented control with save-on-tap, PEOPLE and OPERATOR TOOLS groups with counts, footer, skeleton, and deleting the dialog and old row. No blockers.
2. **[TEM-236](https://linear.app/temba-app/issue/TEM-236) Fix `ListRow` text alignment.** Add `min-w-0 flex-1` to the text wrapper and check the listed screens. No blockers; independent of ticket 1.
