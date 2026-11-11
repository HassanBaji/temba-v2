# The focused surface lifts in light too

**Status:** accepted. Design: "Temba Sports Community App, Palette v2". Amends [ADR-0055](./0055-dark-mode-moves-values-not-roles.md) for the light scheme.

ADR-0055 kept light unchanged: the focused surface (`Surface tone="ink"`) inverted to black, while dark lifted it to `#141414`. Palette v2 drops the inversion. A focus card is now one step off the page in the same direction as the theme, so both schemes read the same way: attention comes from the lift and its hairline, not from a black slab.

## Decision

- **Light values for the existing roles.** Ink and control are `#000000`, rule is `#e6e6e6`, wash (the row highlight) is `#f4f4f4`. The focused surface is Lifted: `focus` `#f4f4f4`, `onFocus` ink. The roles that sit on it move with it: `dim` `#6e6e6e`, `dimrule` `#e0e0e0`, `raised` `#ffffff` (with a `dimrule` hairline), `hatchStrokeOnInk` `#d4d4d4`, and `focusControl` becomes Solid (black, white text). Dark values do not change.
- **Lifted has an edge in both schemes.** The new `focusEdge` role is `#e6e6e6` in light and `#3a3a3a` in dark. The web `surface-focus` utility always draws it as an inset hairline.
- **Solid gets its own secondary roles.** In light, content on a black control can no longer borrow the focused-surface roles. `onControlMuted`, `controlRule`, `controlRaised` and `hatchStrokeOnControl` (with the `hatch-on-control` utility) carry what used to be `dim`, `dimrule`, `raised` and the ink hatch on a selected chip, your own tile, the Venue console rail and share cards. Their light values are the old on-ink values, so those surfaces look as before. Share cards and stickers stay black in both schemes.
- **Solid stays small.** Black is for the main button, the selected side of a toggle, a won Set and your own chip, never a whole card. Your row in a table is the row highlight (`wash`), not a black row.
- **The mobile App keeps the inverted focus for now.** Its screens use the ink tone for both the focused surface and solid controls, so moving its light `focus` would put black text on black chips. It reads `invertedFocusPalettes`, which holds the pre-v2 focused-surface values for light. When the mobile screens are redrawn with a separate solid tone, it moves to `palettes` and `invertedFocusColors` is deleted.
- **Faint stays out.** Palette v2 shows a faint grey (`#9a9a9a`) for captions and column heads. It is 2.8:1 on paper and fails WCAG AA for text, so captions keep `muted`.

## Consequences

- Web code picks between `focus` roles (on the Lifted card) and `control` roles (on a Solid fill). `text-dim` on a selected chip is a bug; use `text-on-control-muted`.
- Comparing a bib fill with `colors.ink` no longer finds the black bib (`#0a0a0a`); compare the bib name.
- Upcoming and finished games are both meant to be Lifted in Palette v2. The Friendly Game hero still uses `paper` for a final game (`surfaceToneForPhase`); changing that is a separate decision because it also moves the mobile App.
