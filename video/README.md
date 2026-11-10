# Temba demo video

A 30-second vertical (1080×1920, 30 fps) product demo built with Remotion. It stands outside the pnpm Workspace and has its own `package-lock.json`.

```bash
cd video
npm install
npm run studio     # preview in the browser
npm run stills     # one PNG per scene in out/stills/ for review
npm run render     # out/temba-demo.mp4 (H.264, CRF 18)
```

On a machine without Remotion's own Chrome download, point it at a local Chrome Headless Shell with `REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell`.

## Music

Drop a track at `public/music.mp3` and render again. It plays from the start and fades out over the last second. Without it the video renders with a silent audio track, so messengers do not treat it as a GIF.

## Where things come from

- Radii, hatch geometry, the result-mark arc, type scale, numeral sizes and the expanded width come from `packages/design-tokens/src/tokens.ts`.
- Colors are the launch palette in `src/theme.ts`: the app's roles in pure black and white.
- Screens are static rebuilds of the mobile App's primitives (`Text`, `Surface`, `Hatch`, `Avatar`, `ResultMark`, `FormSlot`, tab bar), because the originals are React Native. Icons are Lucide, as in the App.
- Scene timings live in `scenes` in `src/theme.ts`; sample data in `src/data.ts`.
