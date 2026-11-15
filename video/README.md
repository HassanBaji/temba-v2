# Temba demo video

A 34-second vertical (1080×1920, 30 fps) product demo built with Remotion. It stands outside the pnpm Workspace and has its own `package-lock.json`.

```bash
cd video
npm install
npm run studio     # preview in the browser
npm run stills     # one PNG per scene in out/stills/ for review
npm run render     # out/temba-demo.mp4 (H.264, CRF 18, AAC audio)
```

On a machine without Remotion's own Chrome download, point it at a local Chrome Headless Shell with `REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell`.

## Scenes

| Time | Caption | Screen |
| --- | --- | --- |
| 0–3 s | | Logo intro |
| 3.0–7.2 s | نزّل القيم والشباب يسجلون | Game details: ten seats fill, Game full |
| 7.2–11.2 s | تقسيمة متوازنة بضغطة | Make teams on group tier points, Faisal and قاسم swap, 1,302 / 1,301, locked |
| 11.2–16.4 s | صوّتوا لأفضل لاعب، ووزّعوا الأوسمة | Result: MVP vote, then the Marks coins and Share result |
| 16.4–20.4 s | موسم وترتيب لكل قروب | Standing: Yousif +3 climbs to third, Share standings |
| 20.4–24.4 s | فئة لكل لاعب: من صافي إلى قرش | Members: the tier ladder, Faisal +38 from Safi to Kanaad |
| 24.4–30.0 s | كوّن فريقك وتحدّى الفرق، وخصومك راس براس | Challenges: a proposal accepted into a Challenge game, then Rivals |
| 30–34 s | | Logo end card, حمّل التطبيق with App Store and Google Play |

Screens crossfade over 0.2 s while the phone, status bar and tab bar stay fixed. Timings are `scenes` in `src/theme.ts`; captions and sample data are in `src/data.ts`. The sample Tier points are chosen so every figure agrees across scenes: the team averages, Faisal's move and the band cuts.

## Audio

All audio is synthesized by `scripts/make-audio.mjs` (plain Node, no dependencies) into `public/audio/`, so it is original, royalty-free and the same on every run. `npm run studio` and `npm run render` regenerate it first; `npm run audio` does it on its own.

- **Music bed** (`bed.wav`): 120 BPM in A minor, Am–F–C–G. One beat is 15 frames, so every scene change lands on a beat. A low swell under the intro logo, the groove from the first app screen, and a ringing chord on the end card.
- **Sound effects**: a rising note per seat and a chime when the game fills, swishes and a lock click for Make teams, vote ticks and a coin ding for the MVP, pops for the Marks coins, ticks and a swish for the Standing, a climbing note per tier and a pluck for the promotion, a confirm chime for the accepted Challenge and ticks for the Rivals form, and impacts with a shimmer on the logo.

Every cue is in `src/cues.ts`, built from the timing constants the scenes export, so moving an animation moves its sound. Levels are set for phone speakers: about −15 LUFS with 3 dB of headroom.

To use your own track, drop it at `public/music.mp3`. It replaces the generated bed, keeps the sound effects, and fades out over the last second.

## Where things come from

- Radii, hatch geometry, the result-mark arc, type scale, numeral sizes and the expanded width come from `packages/design-tokens/src/tokens.ts`; the Tier band fish from `packages/design-tokens/src/fish.ts`.
- The Group is a tier Group (a football Group that is not Verified, ADR-0066): Make teams balances on Tier points and the Members tab shows fish, places and points. `src/tiers.ts` cuts the bands with the same rule as `@repo/domain/tier-bands` (top three Sharks, Hamour the next 15%, Kanaad the next 35%, Safi the rest).
- Colors are the launch palette in `src/theme.ts`: the app's roles in pure black and white.
- Screens are static rebuilds of the mobile App's primitives (`Text`, `Surface`, `Hatch`, `Avatar`, `ResultMark`, `FormSlot`, tab bar), because the originals are React Native. Icons are Lucide, as in the App.
- Scene timings live in `scenes` in `src/theme.ts`; sample data in `src/data.ts`.
