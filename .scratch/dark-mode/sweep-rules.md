# Dark-mode sweep rules (for the per-file pass)

Read `.scratch/dark-mode/spec.md` first (the roles table is the contract), and look at `.scratch/dark-mode/design.png` if a case is unclear. The foundation is already committed: tokens in `packages/design-tokens/src/tokens.ts`, web utilities in `packages/design-tokens/theme.css` + `apps/web/src/styles/globals.css`, mobile `apps/mobile/src/theme/theme-provider.tsx` (`useColors()`, `useColorSchemeName()`) and `apps/mobile/src/primitives/tone-palette.ts` (`tonePalette(tone, colors)`, now with `control`/`onControl`).

Light mode must look exactly as it does today. Every change below is chosen so the light values are identical; only dark moves.

## Mobile (`apps/mobile`)

1. **Colors come from the hook.** Replace `import { colors } from "@repo/design-tokens"` with `const colors = useColors();` from `../theme/theme-provider` (adjust the relative path), called at the top of each component that reads a color. Keep the other token imports (`radii`, `spacing`, `sizes`, ...) as they are.
   - Module-level objects that read colors (variant maps, style constants) become functions of `colors: Palette` (`import type { Palette } from "@repo/design-tokens"`) called inside the component, or move into the component.
   - Plain helper functions outside components that read colors take `colors: Palette` as a parameter.
   - Hooks only at the top level of components/hooks, never inside callbacks, loops or conditions. If a `.map` callback needs colors, read the hook once in the enclosing component.
   - `tonePalette(tone)` calls become `tonePalette(tone, colors)`. Prefer `useTonePalette()` where the tone comes from context.
2. **Pick the role by what the thing is, not by its light color:**
   - `backgroundColor: colors.ink` on a hero / full focused panel → `colors.focus` (and its text/icon `colors.paper` → `colors.onFocus`). In dark, a focused panel that is not drawn through `<Surface tone="ink">` also needs `borderWidth: hairline, borderColor: colors.dimrule` when `useColorSchemeName() === "dark"`; prefer using `<Surface tone="ink">` where it fits.
   - `backgroundColor: colors.ink` on a button, a selected chip/option/segment, your own avatar/initials tile, a count badge, a pill, a tooltip → `colors.control`; the text/icon on it `colors.paper` → `colors.onControl`. A border that equals the fill (`borderColor: colors.ink` on a selected chip) stays `colors.ink` (the selection edge reads in dark). Primary buttons get `borderColor: colors.controlEdge` with a hairline when they had no border.
   - A control on the focused surface that was `colors.paper` fill with `colors.ink` text (the inverse button, the active cell on a hero) → `colors.focusControl` / `colors.onFocusControl`, or `palette.control` / `palette.onControl` from `useTonePalette()` when the code is tone-aware.
   - Solid marks stay `colors.ink`: progress/bar fills, dots, carets, slider fills and thumbs, a filled seat, a won mark, a selected radio's dot. Their cut-out/letter stays `colors.paper`.
   - Text drawn on the focused surface that reads `colors.paper` → `colors.onFocus`. `colors.dim`, `colors.dimrule`, `colors.raised` already mean "on the focused surface" and stay.
   - Sheet/dialog/modal bodies `colors.paper` → `colors.sheet`. Scrims built from `colors.ink` + opacity → `colors.scrim` with no extra opacity.
   - Page and card backgrounds `colors.paper`, hairlines `colors.rule`, `colors.wash`, `colors.muted`, `colors.inputBorder`, `colors.danger` stay as they are (their dark values are already right).
   - Where a component branches on `onInk`/`tone === "ink"` and picks `colors.paper` vs `colors.ink` for a *fill*, the ink-tone branch's solid mark is `colors.onFocus` (it was white-on-black; in dark it is #e6e6e6 on #141414).
3. **Share output stays black.** Anything rendered into the shared image or story card (the `share-result` card/sticker views and the games-list result strip) keeps the light palette in both modes: use `palettes.light` (or keep the static `colors` import, which is the light palette) for those views only, with a one-line comment that share cards render on black in both modes. The screen chrome around them (headers, buttons, sheets) uses `useColors()`.
4. Do not add hex literals. Do not set `fontFamily`/`fontWeight`. No shadows. Do not touch files outside your assigned list unless a signature change forces it (then tell me which).

## Web (`apps/web/src`)

Utilities available: `bg-focus`/`text-on-focus` (prefer the `surface-focus` utility, which sets the background, text, ring scope and the dark hairline), `bg-control`/`text-on-control`/`border-control-edge`, `bg-focus-control`/`text-on-focus-control`, `bg-on-focus` (a solid mark on the focused surface), `bg-sheet`, `bg-scrim`. `ink`, `paper`, `rule`, `wash`, `dim`, `dimrule`, `raised` keep their names; their dark values are already right.

1. Hero/focused panels (`bg-ink text-paper` on a header, card or full-screen panel; `surface-ink bg-ink text-paper`; things the code calls `tone="ink"`/`onInk`) → `surface-focus` (drop `bg-ink text-paper`; keep `surface-ink` only where it is used alone as a ring scope). Inside them, `text-paper` → `text-on-focus`; a `bg-paper text-ink` cell or button → `bg-focus-control text-on-focus-control`; a `bg-paper` solid dot/mark → `bg-on-focus`.
2. Controls (`bg-ink text-paper` on a button, selected chip/option/segment, a count badge, a pill, a tooltip, your own avatar fallback, a numbered marker) → `bg-control text-on-control`. Keep `border-ink` on selected chips. Primary full-width buttons that had no border get `border border-control-edge`.
3. Solid marks keep `bg-ink` (and `text-paper` on a won mark): progress and bar fills, dots, carets, slider ranges and thumbs, filled seats, won result cells, `index < done ? "bg-ink" : "bg-rule"` segment bars.
4. Scrims `bg-ink/50`, `bg-ink/45`, etc. → `bg-scrim`. Sheet/dialog/drawer content `bg-background`/`bg-paper` → `bg-sheet`.
5. Share cards, story cards, stickers and the result image keep black in both modes: add the class `light` on their root element (theme.css re-declares the light palette under `.light`), and leave their inner classes alone.
6. shadcn leftovers: remove `dark:` variants in `components/ui/*` that fight the palette (`dark:bg-input/30`, `dark:border-input`, `dark:hover:bg-input/50`, `dark:data-[state=active]:bg-input/30`, ...). Keep ones that only tune ring opacity.
7. Hex literals in components: replace with a token utility if it is chrome; leave it if it is data (bib colours, coin art, an image route that is always light).

## Done means

- `pnpm --filter <app> typecheck`, `lint` and `test` pass for the App you touched (mobile filter `mobile`, web filter `web`).
- `grep -rn 'from "@repo/design-tokens"' <your files> | grep '\bcolors\b'` only finds share-output files (mobile).
- Report: files changed, any judgment call you were unsure of (file:line and what you chose), any file outside your list you had to touch.
