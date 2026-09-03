Status: ready-for-agent

# Retire Volt accent

Successor visual language to `.scratch/sports-brand-system/spec.md` **Volt Lime** rules only. That document remains historical for the black/white sports surfaces it shipped (off-white page, white cards, dark desktop rail, type hierarchy, Level dark card, Group Standing strip, radius scale, Soft-archive gray, destructive red). This spec is visual language only: delete the chroma accent. Product structure, routes, flows, APIs, and schema do not change.

Tickets (Linear, `ready-for-agent`): [TEM-151](https://linear.app/temba-app/issue/TEM-151/remap-chrome-and-state-fills-off-volt) Remap chrome and state fills ∥ [TEM-152](https://linear.app/temba-app/issue/TEM-152/migrate-brand-buttons-to-default-and-delete-the-variant) Migrate brand buttons → then [TEM-153](https://linear.app/temba-app/issue/TEM-153/delete-volt-tokens-and-close-the-lime-grep-gate) Delete Volt tokens and grep QA gate.

## Problem Statement

The shipped App already looks like a sports product in black and white, but it still paints a Volt Lime accent on primary actions, selected nav bars, vacant joinable seats, occupancy “open”, the login geometric mark, and the viewer Standing row. A signed-in User asked for a simple, clean black and white App. Lime no longer means “active / important”; it is leftover chroma.

## Solution

Delete chroma accent. Black (`#0A0A0A`) and white (`#FFFFFF`), plus the existing gray ramp and off-white page (`#F6F6F3`), are the palette. Destructive stays red. Soft-archive stays muted gray.

`--primary` stays near-black. `--color-volt*` and `--temba-volt*` are deleted, not aliased. `Button variant="brand"` is migrated to `default` and removed. Selected nav keeps its bar + weight + filled icon, painted white on the dark rail and black on the light bottom nav. Auth’s geometric square becomes a white mark on the dark panel. Clerk’s primary button is black fill, white text. State that used lime (open occupancy, joinable vacant seats, Level-range tile, “you” on Standing) keeps its meaning through weight, border, fill, or copy — never leftover lime.

This is not a revert to the old blue SaaS look and not a full redesign.

## User Stories

1. As a signed-in User, I want the App to use only black, white, and gray (plus red for danger), so that the product feels simple and clean.
2. As a signed-in User, I want primary actions (Create Game, Join, Register, Accept, Declare Level, Complete Match) to be black with white text, so that I can act without a second brand colour.
3. As a signed-in User on a large screen, I want the selected rail item to stay white, semibold, with a 3px left bar that is white — not lime — so that location is obvious without chroma.
4. As a signed-in User on a phone, I want the selected bottom-nav item to stay black, semibold, filled icon, with a 2px top bar that is black — not lime — so that selection is not colour-only.
5. As a visitor on login or signup, I want the dark left panel to keep a small geometric square that is white on black, so that auth still has a sports mark without lime.
6. As a visitor on login or signup, I want Clerk’s Continue / Sign in / Sign up button to be black with white text, so that auth matches the App primary.
7. As an invitee, I want Accept / Join waitlist to be the same black primary as the rest of the App, so that join flows are not a leftover lime island.
8. As a signed-in User, I want a joinable vacant seat to read as open via a black hairline, muted fill, and Open copy — not a lime wash — so that I can still see where I can sit.
9. As a signed-in User on Game home, I want occupancy “open” to fill the existing bar in black on a muted track, so that plenty-of-seats still scans without lime.
10. As a signed-in User, I want occupancy “filling” and “full” to keep their existing warning/success treatment and copy, so that urgency is not flattened into the same black as “open”.
11. As a signed-in User, I want the Level-range detail tile icon well to match the other neutral tiles, so that Level is not a lime callout.
12. As a Group member, I want my Standing row marked with a quiet muted fill, a black left bar, and a You label, so that I can find myself without colour-only meaning.
13. As a signed-in User, I want positive Level movement (when shown) to use a black outline or black type plus ↑, so that a gain is visible without lime or a second brand green.
14. As a signed-in User, I want Cancel, See all, Retry, View, and outline actions to stay black/white/gray as they are today, so that secondary actions do not change role.
15. As a Community Owner or Admin, I want Soft-archive to stay muted gray with icon and copy, so that caution is unchanged.
16. As a User facing Leave / Delete / Dissolve, I want those actions to stay red, so that danger is not flattened into gray.
17. As a keyboard User, I want a dark focus ring on light surfaces and a light ring on the dark rail, so that focus stays visible.
18. As a User who cannot rely on colour, I want selected nav to keep bar + weight + filled icon, so that current location does not depend on lime.
19. As an Operator, I want Venues to pick up the same tokens with no new Operator IA, so that staff surfaces are not a leftover lime island.
20. As a signed-in User, I want the off-white page, white cards, hairline borders, dark rail, editorial type, Level dark card, and Group Standing dark strip to stay, so that retiring lime is not a redesign.
21. As a signed-in User, I want no blue brand to return, so that this is not a revert to the old SaaS look.

## Implementation Decisions

### What this is

A wide visual contract of the sports brand: delete Volt Lime, keep the black/white sports surfaces already shipped. No new libraries, folders, routes, or page architecture. No tRPC, schema, or permission changes.

### What stays (already black/white sports brand)

- Page `#F6F6F3`, cards `#FFFFFF`, hairline `#E5E5E2`, radius scale (sm 8 / md 10 / lg 12 / xl 16)
- `--primary` `#0A0A0A` / `--primary-foreground` `#FFFFFF` / `--ring` `#0A0A0A`
- Dark desktop rail `#0A0A0A`, white labels, hover `--sidebar-accent`
- White mobile bottom nav and top bar against the off-white page
- Geist type scale, editorial titles, tabular stats
- You Level card on dark `#0A0A0A` with large white Level numeral (no lime underline was ever shipped)
- Group home Standing StatStrip on a dark surface
- LevelBandBadge monochrome D/C/B/A ramp
- Soft-archive muted gray + icon + copy
- `--destructive` red
- Five bottom-nav slots; no Create FAB
- `.dark` tokens exist with no toggle — retune only if a volt reference would otherwise remain

### Token replacement

Delete these. Do not leave unused aliases.

| Retire | Replacement | Use |
|---|---|---|
| `--color-volt` `#C8F135` | none | Delete |
| `--color-volt-hover` | none | Delete |
| `--color-volt-soft` | none | Delete |
| `--color-volt-foreground` | none | Delete |
| `--temba-volt*` | none | Never shipped; do not add |
| `--chart-1: var(--color-volt)` (light and `.dark`) | `--chart-1: #0A0A0A` (light) and a near-white gray in `.dark` | Future charts; no charting library to restyle |
| Clerk `colorPrimary #C8F135` (commented today) | `#0A0A0A` | Clerk primary fill |
| Clerk `colorPrimaryForeground #0A0A0A` (commented today) | `#FFFFFF` | Text on Clerk primary |
| `bg-volt` / `border-volt` / `border-l-volt` / `text-volt-*` / `hover:bg-volt-hover` / `bg-volt-soft` | black / white / muted / foreground as in the remap table below | No lime utilities |

`--primary` is already black. Do **not** map `--primary` to lime. Do **not** reintroduce `--color-brand*` or `#0000FF`.

Named palette that remains (documentation only; `--temba-*` docs tokens were never shipped and are not required): black `#0A0A0A`, black-soft `#171717`, white `#FFFFFF`, background `#F6F6F3`, surface `#FFFFFF`, gray-50 `#FAFAF8`, gray-100 `#F1F1EE`, gray-200 `#E5E5E2`, gray-300 `#D4D4D0`, gray-500 `#737373`, gray-700 `#404040`.

`--sidebar-primary` is already white in the token file; the lime rail bar is a hard-coded `border-l-volt` class, not that token. After this work, selected rail uses the existing white sidebar foreground for the 3px bar.

Token comments that mention Volt Lime are rewritten or removed so `apps/temba` greps clean.

### Button `brand`

`default` is already black fill, white text, `hover:bg-primary/90`. `brand` is lime fill, black text. After this change they would be a visual no-op if `brand` were aliased to `default`.

**Decision:** migrate every `variant="brand"` to `default` (or omit the prop), then **delete** the `brand` variant from the Button primitive. Do not keep an unused alias.

Hover, radius, and weight then follow `default`. Primary actions stay high-contrast (white on `#0A0A0A`), never gray-on-gray.

### Chrome

- **AppRail selected:** keep 3px left bar + `font-semibold` + white label/icon. Paint the bar **white** (`border-l-sidebar-foreground` or equivalent). Do not remove the bar. Do not fill the row lime. Do not colour the icon lime.
- **BottomNav selected:** keep 2px top bar + black filled icon + `font-semibold`. Paint the bar **black** (`bg-foreground` / `bg-primary`). Inactive stays muted. Five slots. No Create control.
- **AuthShell geometric square:** **white** mark on the existing dark `#0A0A0A` panel (`bg-primary-foreground` on `bg-primary`). Not lime. Not a new logo.
- **InviteShell:** already off-white page + white card; no lime of its own. Accept CTAs follow the Button migration.
- **Clerk appearance:** set (or uncomment and correct) `colorPrimary #0A0A0A`, `colorPrimaryForeground #FFFFFF`. Background white, text near-black, secondary at least `#404040`, danger red, radius `0.75rem`. Do not leave a commented `#C8F135` in App source.

### State meaning that used lime (preserve without chroma)

Lime was used as state, not only as brand. Replacements:

| Meaning today | Lime treatment | After |
|---|---|---|
| Joinable vacant seat (Game card roster + seat grid) | `border-volt bg-volt-soft` dashed circle, Open copy | Black dashed hairline (`border-foreground` / `border-primary`) + `bg-muted` fill + foreground `+` / Open copy. Non-joinable vacant stays muted dashed. |
| Occupancy bar “open” | `bg-volt` fill on muted track | `bg-foreground` / `bg-primary` fill on the same muted track. Copy unchanged. |
| Occupancy “filling” / “full” | warning / success (not volt) | **Unchanged.** Not this spec. |
| Level-range detail tile | `tone="volt"` → `bg-volt-soft` icon well | Use existing `neutral` well (`bg-background text-muted-foreground`). Delete the `volt` tile tone. Imminent date/time warning and free-price success stay. |
| Viewer Standing row | `bg-muted border-l-volt` + You badge | Keep muted fill + You outline badge; paint the 2px left bar **black** (`border-l-foreground` / `border-l-primary`). |
| Positive Level movement | Sports spec wanted a volt chip; shipped as `text-success` + icon | Black outline chip or `text-foreground` + ↑ / delta. Not lime. Not a leftover brand green. Unchanged / down stays muted. |
| Current-Level mark on You dark card | Optional 4px volt underline in the old spec | **Never shipped.** Do not add one. |
| Home Level band progress | Already `bg-foreground` on muted track | Unchanged. |

Registration status Open (success dot), Match won (`success-subtle`), Game completed (`text-success`), and “today” warning type are **semantic status**, not the Volt brand accent. Leave them unless a later spec flattens all chroma.

### Allowlist / denylist after this spec

**Allow (the whole App):** black, white, gray ramp, off-white page, destructive red, existing warning/success **status** (occupancy filling/full, Open badge, Match won, imminent). Soft-archive gray.

**Deny (must not exist in `apps/temba` after ticket 03):**

- `volt`, `volt-hover`, `volt-soft`, `volt-foreground`
- `bg-volt`, `border-volt`, `border-l-volt`, `text-volt`, `hover:bg-volt-hover`
- `--color-volt`, `--color-volt-hover`, `--color-volt-soft`, `--color-volt-foreground`
- `--temba-volt*`
- `#C8F135`, `#c8f135`, `#B2DB25`, `#b3d928`, `#F2FBD5`, `#eef8c9`
- `Button` variant `brand`
- Lime Clerk `colorPrimary`

Historical `.scratch/sports-brand-system/` may still say “volt”.

### Unchanged behavior

Join / Create / Register / Accept / Declare Level / Complete Match **product rules** are unchanged; only colour. IA and routes unchanged. No dark-mode toggle. No new Create nav control. No nested bordered cards introduced.

### What this supersedes

From `.scratch/sports-brand-system/spec.md`: scarce Volt Lime (~5–10%); `Button variant="brand"` lime; Clerk lime primary; rail/bottom-nav lime bars; AuthShell volt square; viewer Standing volt bar; volt-soft seat/occupancy/tile fills; `--chart-1` = volt; lime movement chips; “the interface must still look like Temba if every Volt Lime element were temporarily gray” is now the **default** — those elements are gray/black/white.

Does **not** supersede that spec’s black/white surfaces, type, radius, Soft-archive, destructive, or “do not map `--primary` to lime”.

Ticket 03 prepends a short historical banner on the sports-brand spec: Volt Lime is superseded by this document.

### Decision priority when uncertain

1. Contrast (black on white / white on black for primary actions)
2. Existing shape (keep the bar, the square, the hairline)
3. Black / white
4. Neutral gray
5. Never chroma to solve hierarchy

## Testing Decisions

Good tests assert **user-visible visual language**, not CSS variable names.

Highest seam: a signed-in User opens Home, Games, Group Standing, You, and login and sees **zero lime**. Primary actions are black with white text. Selected nav is black/white with the existing bar + weight + filled icon. Vacant joinable seats and occupancy “open” still read as available via hairline/fill/copy. Viewer Standing row still reads as “you” via bar + You + muted fill.

- Existing unit/integration tests stay green. No new API tests. No tests exist that assert volt classes today; none should be added.
- No visual-regression harness required.
- Closing gate writes `.scratch/retire-volt-accent/qa-gate.md`:
  - Grep under `apps/temba`: `volt`, `volt-hover`, `volt-soft`, `volt-foreground`, `bg-volt`, `border-l-volt`, `--color-volt`, `#c8f135`, `#C8F135`, `variant="brand"`, `variant: "brand"`
  - Grep: `#0000FF` still absent (do not regress to blue)
  - Contrast: primary CTAs white on `#0A0A0A`; meta 12–13px still ≥ 4.5:1; rail labels ≥ 4.5:1 on `#0A0A0A`; Clerk primary white on black
  - Destructive red and Soft-archive gray unchanged on sampled screens
  - Occupancy filling/full still distinguishable from open (warning/success vs black fill)
  - Screenshots at 390 / 768 / 1024 / 1440 for Home, Games hub, Game home, Group home Standing, You, login, invite accept — when Clerk keys allow; otherwise static grep + typecheck/lint/test/build as TEM-127 did
- Prior art: `.scratch/sports-brand-system/qa-gate.md` (update any lime assertions in that historical note only by pointing at this spec; do not keep a live “volt occupancy 5–10%” gate)

Approving this spec approves the Test seams in Testing Decisions.

## Out of Scope

- Product IA, routes, flows, backend, schema, permissions, tRPC
- New components, libraries, charting, Create FAB / extra nav slot
- Dark-mode toggle; photography; motion redesign; icon set change
- Revert to blue `#0000FF` brand
- Flattening non-volt semantic chroma (occupancy filling/full, Open success badge, Match won, imminent warning, sonner success toasts)
- Rewriting `.scratch/sports-brand-system/spec.md` beyond a supersession banner
- New Level/Standing movement API
- Operator IA changes

## Further Notes

### Risks

- **Lime used as state:** vacant seats, occupancy open, Level-range tile, and viewer Standing used lime as “this is you / this is available”. Replacements above must ship with copy or shape, not colour-only, or Users lose that scan.
- **Leftover `brand` variant:** if call sites migrate but the variant remains, a future screen can reintroduce lime. Ticket 02 deletes the variant. Ticket 03 greps it.
- **Clerk:** appearance variables are currently **commented out**, so live Clerk may already be the shadcn default rather than lime. Ticket 01 still sets black fill / white text explicitly and removes the commented `#C8F135` so auth cannot regress to lime. If Clerk ignores `colorPrimaryForeground`, confirm white text on black (not black-on-black).
- **Token deletion while classes remain:** Tailwind will silently drop `bg-volt` if tokens die first. Ticket 03 is blocked by 01 and 02 so consumers are gone first.
- **Tests / QA notes that assert lime:** no production tests assert volt; sports-brand `qa-gate.md` and issue files do. They stay historical. Do not copy their lime occupancy checks into this gate.
- **Games hub double Create Game:** header and empty-state both use `variant="brand"` today. After migration both become `default` (visual no-op with each other). Do not use this spec to re-litigate “one brand CTA per screen”; that rule dies with the variant.
- **Home Create Game:** sports-brand QA listed a Home brand Create Game; current Home has no Create Game control. Do not add one.
- **Success green on Level trend:** shipping `text-success` was not volt, but leaving it would keep a chroma “gain” colour after lime is gone. Ticket 01 restyles it to black/outline.
- **Gray-on-gray CTAs:** do not “soften” primary actions when removing lime. `default` black/white is the target.

### Occupancy (production, `apps/temba`)

Volt **classes / tokens / comments:** 11 files (globals, Button, AppRail, BottomNav, AuthShell, LeaderboardRow, GameOccupancyCard, GameSummaryCard vacant seat, GameSeatGrid vacant avatar, GameDetailTiles, root layout Clerk comment).

`variant="brand"`: 18 files, ~20 buttons (hub Create actions, create-form submits, Join / Request to join, Invite Accept / Join waitlist, Game card Join/Register, seat-grid Join, Complete Match, level-range request, Declare Level on Home and You, game-invite Accept).

No Storybook. No `--temba-volt*` in CSS. No unit test asserts volt.

### Phased tickets

Three tickets, expand–contract. Full bodies in `.scratch/retire-volt-accent/issues/`. Frontier at approval: 01 and 02 in parallel.

| Ticket | Title | Blocked by |
|---|---|---|
| [TEM-151](https://linear.app/temba-app/issue/TEM-151/remap-chrome-and-state-fills-off-volt) | Remap chrome and state fills off Volt | — |
| [TEM-152](https://linear.app/temba-app/issue/TEM-152/migrate-brand-buttons-to-default-and-delete-the-variant) | Migrate `variant="brand"` to `default` and delete `brand` | — |
| [TEM-153](https://linear.app/temba-app/issue/TEM-153/delete-volt-tokens-and-close-the-lime-grep-gate) | Delete Volt tokens and close the lime grep gate | TEM-151, TEM-152 |
