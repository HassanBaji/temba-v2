# Dark mode

Source: the "Temba Sports Community App, Dark Mode" design board (rendered in `design.png` beside this file). ADR-0064 records the decision.

## The rule

Tokens are named by role. Dark mode swaps the values; screens do not branch on the scheme. Nothing in dark is `#ffffff`: ink is `#e6e6e6`, and the focused hero lifts to `#141414` with a `#3a3a3a` hairline instead of inverting. The depth ladder is 000 page, 0f sheet, 14 focus, 1c raised, 26 control.

## Roles (`@repo/design-tokens`, `colors` = light, `darkColors` = dark)

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `ink` | #0a0a0a | #e6e6e6 | Text, icons, selection borders, and solid marks: a won ResultMark/FormSlot, progress and bar fills, dots, a filled seat, a slider fill, a caret |
| `paper` | #ffffff | #000000 | Page and card surfaces. Also the cut-out on a solid ink mark (the arc on a won disc, the letter on a won slot) |
| `rule` | #e5e5e2 | #2e2e2e | Hairlines on paper, lost outline |
| `wash` | #f5f5f5 | #1c1c1c | Raised: selected row, chip fill, segmented track |
| `muted` | #6e6e6e | #8e8e8e | Secondary text on paper |
| `dim` / `dimrule` / `raised` | | #8e8e8e / #3a3a3a / #262626 | Muted text, hairline and raised fill **inside** the focused surface |
| `inputBorder` | #8c8c8c | #6e6e6e | Control boundaries |
| `surfaceRaised` | #fafaf8 | #0f0f0f | |
| `focus` / `onFocus` | #0a0a0a / #ffffff | #141414 / #e6e6e6 | The focused surface (`Surface tone="ink"`, heroes) and the text on it |
| `control` / `onControl` / `controlEdge` | #0a0a0a / #ffffff / #0a0a0a | #262626 / #e6e6e6 / #3a3a3a | Primary buttons, the active segment, a selected chip or option, your own avatar, count badges, pills |
| `focusControl` / `onFocusControl` | #ffffff / #0a0a0a | #262626 / #e6e6e6 | A control sitting on the focused surface (the hero's Vote button, the active cell of a segmented control on a hero) |
| `sheet` | #ffffff | #0f0f0f | Bottom sheets, dialogs, popovers |
| `scrim` | rgba(10,10,10,.5) | rgba(0,0,0,.72) | Behind sheets and dialogs (already includes its opacity) |
| `hatchStroke` / `hatchStrokeOnInk` | | #2e2e2e / #3a3a3a | Hatch |
| `danger` | #b42318 | #f97066 | Destructive action only |

## What does not flip

The result share card, story cards, stickers and the games-list result strip render on black in both modes: they leave the App. Photos, the 13 mark coins and bib colours are data and never change.

## Setting

Appearance in Settings: Match my phone (default), Light, Dark. Stored per device (web: next-themes in localStorage; mobile: AsyncStorage `temba.appearance`).

## Scope

Web App and mobile App. The Venue console stays light for now: it imports the same `theme.css` but never sets the `dark` class.
