# Temba demo video

A 30-second vertical (1080×1920, 30 fps) product demo built with Remotion. It stands outside the pnpm Workspace and has its own `package-lock.json`.

```bash
cd video
npm install
npm run studio     # preview in the browser
npm run stills     # one PNG per scene in out/stills/ for review
npm run render     # out/temba-demo.mp4 (H.264, CRF 18, AAC audio)
```

On a machine without Remotion's own Chrome download, point it at a local Chrome Headless Shell with `REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell`.

## Audio

All audio is synthesized by `scripts/make-audio.mjs` (plain Node, no dependencies) into `public/audio/`, so it is original, royalty-free and the same on every run. `npm run studio` and `npm run render` regenerate it first; `npm run audio` does it on its own.

- **Music bed** (`bed.wav`): 120 BPM in A minor, Am–F–C–G. One beat is 15 frames, so every scene change lands on a beat. A low swell under the intro logo, the groove from the first app screen, and a ringing chord on the end card.
- **Sound effects**: screen whooshes, typing clicks, member pops, a rising note per seat and a chime when the game fills, swishes for the team split and shuffle, a lock click, score ticks and a confirm chime, form ticks (brighter for a win), a glide as the chart draws, row ticks and a flip hit for the #1 row, and impacts with a shimmer on the logo.

Every cue is in `src/cues.ts`, built from the timing constants the scenes export, so moving an animation moves its sound. Levels are set for phone speakers: about −15 LUFS with 3 dB of headroom.

To use your own track, drop it at `public/music.mp3`. It replaces the generated bed, keeps the sound effects, and fades out over the last second.

## Where things come from

- Radii, hatch geometry, the result-mark arc, type scale, numeral sizes and the expanded width come from `packages/design-tokens/src/tokens.ts`.
- Colors are the launch palette in `src/theme.ts`: the app's roles in pure black and white.
- Screens are static rebuilds of the mobile App's primitives (`Text`, `Surface`, `Hatch`, `Avatar`, `ResultMark`, `FormSlot`, tab bar), because the originals are React Native. Icons are Lucide, as in the App.
- Scene timings live in `scenes` in `src/theme.ts`; sample data in `src/data.ts`.
