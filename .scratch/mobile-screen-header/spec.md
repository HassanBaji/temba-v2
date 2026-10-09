# Mobile screen header

## Problem

Every stacked route in the mobile App shows two headers. `TabStack` (`apps/mobile/src/navigation/tab-stack.tsx`) renders a native stack bar, and the screens also render their own title row: "Games" in `games-view.tsx`, "Groups" in `groups-view.tsx`, the Communities, Teams and Invites titles, and the identity block on Group, Team and Community home.

The top spacing is uneven for the same reason. `Screen` (`src/primitives/screen.tsx`) pads `insets.top + spacing.compact`. That is right only when nothing sits above it, as on the auth screens. Under a native bar the safe area is already used, so stacked screens get an extra status-bar-height gap.

## Design source

The design is `Temba.dc.html` in Claude Design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`. This spec was written from the local export in `.scratch/profile-settings-redesign/design/Temba.dc.html` (17 Sep) and `.scratch/design-import/create-game-flow.html`, because the live project could not be read. The designs have no native navigation bar. Each screen draws its header as the first thing in its content:

| Shape | Design screens | Geometry |
| --- | --- | --- |
| Tab root | 02 Games list, 04 Player profile, 05 Groups list | Padding 22 top and sides. Title left, 26 bold. 44pt icon actions right (`plus`, `sliders-horizontal`, `settings`). |
| Detail | 06a Group standing, 08a New tournament | Row of 40pt square icon buttons: `chevron-left` left, optional action right, hairline border, radius 10. Title 28 bold, 20 below the row. |
| Flow | 04a Create game, 08a New tournament | Same row with `x` instead of `chevron-left`. |

Content gutter in the designs is 22 on both sides (`spacing.surface`).

## Decisions

1. **Home keeps today's header.** It shows avatar, name and state line (`HomeHeader`), with no native bar above it. The design's wordmark, bell and avatar row is not adopted.
2. **Side gutter matches the designs.** The page gutter moves from 18 (`spacing.compact`) to 22 (`spacing.surface`) on both sides, top included.
3. **Game details gets a plain back row above its hero, on paper.** The design's ink hero with back and share inside it is deferred.
4. **The header scrolls with content.** It is the first child of `Screen`, not sticky, as in the design frames.
5. **No native stack header anywhere in the signed-in App.** iOS edge-swipe back keeps working because it does not depend on the header.

## Behaviour

### `ScreenHeader` primitive

New file `apps/mobile/src/primitives/screen-header.tsx`.

- Props: `title?: string`, `nav?: "back" | "close"`, `actions?: React.ReactNode`, and `children?: React.ReactNode` for screens whose title block is richer than a string (Group, Team and Community home keep their avatar and meta line).
- Layout:
  - With `nav`: a row with the 40pt nav button on the left and `actions` on the right. The title, if any, sits below the row, `h1`, with 20 between them.
  - Without `nav` (tab roots): a single row with the title (`h1`) on the left and `actions` on the right, vertically centred.
- Nav button: a 40pt square, radius 10 (`radii.lg` or the nearest existing token), hairline border `colors.rule`, Lucide `ChevronLeft` or `X` at `sizes.iconAction`, with a hit slop that reaches 44. Accessibility label "Back" or "Close", role `button`.
- The nav button calls `router.back()` when `router.canGoBack()`. Otherwise it calls `router.replace` to the owning tab root, because a deep link into `/games/[id]` has no history. The caller passes that fallback `href`.
- Title: `Text size="h1" weight="bold" accessibilityRole="header"`, `numberOfLines={2}`. There is no 26 type token, and none is added.
- Export a small `HeaderIconButton` (44pt, icon only, `accessibilityLabel` required) for tab-root actions such as `plus`. This is the 44pt borderless icon in the designs.
- No hex literals, no `fontFamily` or `fontWeight`, no shadows.

### `Screen`

- `paddingHorizontal: spacing.surface` (22).
- `paddingTop: insets.top + spacing.surface` (22).
- Bottom and gap are unchanged (`insets.bottom + spacing.section`, gap `spacing.section`).
- `Screen` is the only place that adds the top inset. No screen adds its own top padding.

### Navigation

- `TabStack`: `headerShown: false` in `screenOptions`. Remove the `index` `headerTitle` option. Keep `contentStyle`.
- `app/(app)/profile/_layout.tsx`: drop the per-route `title` options, which become meaningless without a header.
- Remove every `<Stack.Screen options={{ title / headerTitle }} />` in screen files: game details, group home, team home, community home, and the create screens for Game, Group, Community and Team.

### Screens

| Screen | Header |
| --- | --- |
| Home (`home-view.tsx`) | Unchanged `HomeHeader` as first child. Only the native bar goes. |
| Games (`games-view.tsx`) | `ScreenHeader title="Games"`. "Create Game" outline button becomes `HeaderIconButton` `Plus`, label "Create Game", still gated by `hasCreateAccess`. |
| Groups (`groups-view.tsx`) | Same, "Groups", `Plus` "Create Group" behind `hasCreateAccess`. |
| Communities (`communities-view.tsx`) | `ScreenHeader title={COMMUNITIES_TITLE}`. |
| Profile (`profile-view.tsx`) | Add `ScreenHeader title="Profile"` above the unchanged `ProfileHeader` block, to match 04 Player profile. Profile has no in-content title today, so this replaces the native "Profile" bar. The settings icon is out of scope because Settings is a section on the same screen. |
| Teams, Invites, Invite link | `nav="back"` with the screen's current title. The in-content h1 is replaced. Fallback is `/profile`. |
| Game details | `nav="back"`, no title. The hero follows. Fallback is `/games`. |
| Group home | `nav="back"`. Children are the existing avatar, name and meta block. Fallback is `/groups`. The existing Invite and Leave button row stays where it is. |
| Team home, Community home | Same pattern. The fallbacks are `/profile/teams` and `/communities`. |
| Create Game, Group, Community, Team | `nav="close"`. Create Game keeps its ink step surface as the title. The others keep their in-content h1 as `title`. Fallback is the owning tab root. |
| Placeholder screen | `ScreenHeader title`. |
| Auth screens | Unchanged. They already draw their own back row. Their top and side padding moves to 22 through `Screen`, which matches 00b/00c/00d in the design. |

Every loading, error and not-found branch of these screens renders the same `ScreenHeader`, so the user can always go back.

### Gutter consistency

Bottom bars that bleed edge to edge align their inner padding with the new gutter: `tournament/tournament-bar.tsx` and `game-details/bottom-bar.tsx` move from `spacing.compact` to `spacing.surface` horizontally. Sheets are unchanged.

### Galleries

`app/gallery-*.tsx` render views inside `Screen`. Add the matching `ScreenHeader` where the view no longer carries its own title, so the galleries stay a faithful visual check.

## Acceptance criteria

- No signed-in screen shows a native navigation bar, and no screen shows its title twice.
- The distance from the status bar to the first header element is `22` on every tab root, detail, flow and auth screen.
- The page gutter is 22 on both sides on every screen.
- Back and close work from every stacked screen, including after a cold deep link into a detail route, where they go to the tab root.
- iOS edge-swipe back still works on stacked screens.
- Create Game and Create Group actions are still hidden without `groupCreator`.
- `pnpm exec turbo run typecheck lint test` passes.
- Simulator screenshots of Home, Games, Groups, Communities, Profile, a Game, a Group, Teams and Create Game show the same top rhythm.

## Tests

- Unit test the pure back-target choice if it is extracted (`canGoBack` → back, otherwise replace with the fallback). Do not add rendering tests for the primitive. The mobile App tests pure logic only.
- Existing tests must keep passing.

## Non-goals

- The Home wordmark, bell and avatar row.
- The ink-hero header on Game details and Tournament.
- The `sliders-horizontal` filter on Games, and a Settings screen behind a Profile icon.
- Sticky or collapsing headers.
- Web App changes.

## Risks

- Removing the native bar removes the native back button on every stacked route. The `ScreenHeader` rollout must cover every stacked screen in the same pull request.
- The 22 gutter makes content 8pt narrower. Check that dense rows (seat chips, knockout tree, standings tables) still fit at 375 width.
