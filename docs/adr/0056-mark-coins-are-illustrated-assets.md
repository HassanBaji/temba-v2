# Mark coins are illustrated assets, the second place colour appears

**Status:** accepted. Spec: `.scratch/temba-marks/spec.md`. Amends the "no accent colour" rule of `.scratch/mobile-and-api-server/spec.md` section 4 and `.scratch/retire-volt-accent/spec.md`, and the Bib entry in `CONTEXT.md`.

Temba's design system is black and white: ink, paper, a grey ramp, red for danger, and no accent. Marks are coins, and a coin without colour is a grey disc. The mockup makes the coins the only colour in the app.

## Decision

- **A coin is an illustrated asset, like a Bib colour: data a player earned, never chrome.** Its colours appear only inside the coin. No button, bar, background, text or badge takes a coin colour, and no theme token is derived from one.
- **Coins ship as data in `@repo/design-tokens`**, beside `bibColors`: the thirteen SVGs are committed as source under `packages/design-tokens/marks/` and transcribed into `src/marks.ts` (`@repo/design-tokens/marks`) as geometry plus four tones (disc, shade, ink, paper). Each client renders them through one `MarkCoin` primitive (`react-native-svg` on mobile, inline SVG on web) with the same `kind`, `size` and `state` props. Clients never import the SVG files or a bitmap; the client lint refuses any `.svg` import.
- **"Not yet" is hatched.** A coin not yet earned is drawn as a hatched disc with a hairline, carrying no coin colour, so the one meaning Hatch has stays intact. Its glyph stays in greys: ink parts in `muted`, paper parts in the surface colour, and the shade in `rule`, so a paper glyph (Dynamo's bolt, the chef's hat) keeps an edge against the hatch. The mockup draws the coin in greyscale at reduced opacity; the hatched disc gives the same reading inside the locked system.
- **Coins are decorative to assistive technology.** The adjacent text carries the mark name.
- **The hex-literal lint stays.** Coin colours live in the tokens Package, where hex literals are allowed.

**Considered options**: PNG or bitmap sprites per App (two copies to drift, blurry at 120 and heavier than 12 KB of paths); a monochrome coin set (every coin becomes the same grey disc, the set stops being collectible); a themed accent per coin (reintroduces chroma into chrome, which the retire-volt-accent work removed).

## Consequences

- The glossary's Bib is no longer "the only place colour appears"; Bib and Mark coins are the two.
- Adding a coin means adding an SVG and its data entry; the tokens test checks each entry against its file and guards the four-tone rule.
- A design review of any surface asks: is this colour inside a coin? If not, it is a defect.
