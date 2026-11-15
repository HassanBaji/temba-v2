# Dark mode moves values, not roles

**Status:** accepted. Design: "Temba Sports Community App, Dark Mode" (`.scratch/dark-mode/`). Supersedes the "no dark theme" line of the locked mobile design system.

Players use Temba on court at night, and both phones and browsers ask for dark. The design system was locked to black and white with no dark theme.

## Decision

- **One rule, two sets of values.** Every color token is a Color role. `@repo/design-tokens` exports `colors` (light, unchanged) and `darkColors` with the same keys. Screens name roles and never branch on the Color scheme.
- **No white in dark.** Ink is `#e6e6e6`, page and cards are true black. The focused surface does not invert to white: it lifts to `#141414` with a `#3a3a3a` hairline. Depths are 000 page, 0f sheet, 14 focus, 1c raised, 26 control.
- **New roles where light hid a difference.** In light, ink was both the text color and the fill of heroes and primary buttons. Dark separates them, so the tokens gain `focus`/`onFocus` (the focused surface), `control`/`onControl`/`controlEdge` (primary buttons, the active cell, your avatar), `focusControl`/`onFocusControl` (a control on the focused surface), `sheet` and `scrim`. Their light values equal today's, so light does not change.
- **Solid marks follow ink.** Won marks, bars, dots and progress fills are ink in both schemes; the hatch is page over rule.
- **What leaves the App stays black.** Share cards, story cards, stickers and the result strip render on the light palette in both schemes. Photos, mark coins and bib colours are data and never change.
- **Appearance is per device.** Settings offers Match my phone (default), Light, Dark. The Web App stores it with next-themes and sets the `dark` class on `<html>`; `theme.css` declares light under `:root, .light` and dark under `.dark`. The Mobile App stores it in AsyncStorage, reads palettes through `useColors()`, and sets `Appearance.setColorScheme` so native chrome follows.
- **The Venue console stays light** for now; it shares `theme.css` but never sets the class.

**Considered Options**: inverting the palette (white heroes and buttons glare on black and break the "attention from the lift" principle); a second set of dark token names (screens would branch on the scheme everywhere); storing Appearance on the account (a laptop and a phone often want different answers).

## Consequences

- Mobile screens read colors from `useColors()`; a static `colors` import is only for output that must stay light (share images).
- Contrast is checked in dark too: muted `#8e8e8e` is 6.4:1 on black and 5.6:1 on focus; input borders are 4.1:1.
- New screens must choose between `ink` (text and solid marks), `control` and `focus` for anything that was black in light.
