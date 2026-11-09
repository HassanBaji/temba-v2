# Marks launch video

A 20-second vertical video (1080×1920, 30 fps, H.264 + AAC) that introduces Marks for Instagram Reels and TikTok.

- **Video:** `out/marks-launch-en.mp4`
- **Source:** an HTML composition. All text is live text. Copy is in `copy.js` and cue times are in `timing.js`.

This folder is outside the pnpm Workspace (`apps/*`, `packages/*`), so it does not take part in `turbo run typecheck lint test`.

## Files

| File | What it holds |
| --- | --- |
| `copy.js` | Every on-screen string, per language. Mark names, descriptions and giver groups match `packages/i18n/src/messages/{en,ar}/marks.ts`. |
| `timing.js` | Every cue in seconds. The picture and the music both read it, so moving a cue moves the hit with it. |
| `index.html` | Layout and type: Archivo at 115% width, 700 weight, −0.03em tracking for headlines (the `expanded` token), and Sora 300 for the wordmark. |
| `main.js` | The animation. `render(t)` computes every frame from the time alone: coin physics, springs, the iris and the stamp. |
| `music/score.py` | The music bed, synthesised with numpy at 120 BPM in A minor. Writes `music/music.wav`. |
| `render.cjs` | Draws each frame in headless Chromium and pipes it to ffmpeg. |
| `coins/` | The mark coin artwork, copied from `packages/design-tokens/marks/` (ADR-0056). |
| `fonts/` | Archivo (variable, with width axis), Sora 300 and Noto Sans Arabic, all under the OFL. |

## Preview and edit

Open `index.html` in Chrome. The bar at the bottom plays the video with the music, scrubs frame by frame and switches language. The space bar plays and pauses, and `?frame=150` opens on a given frame.

## Render

From this folder, with Playwright (Chromium) and ffmpeg installed:

```bash
python3 music/score.py
```

```bash
node render.cjs
```

To check single frames before a full render:

```bash
node render.cjs --stills 150,300,470
```

Stills go to `out/stills/`. A full render takes about 90 seconds.

## Storyboard as built

| Time | Scene | Sound |
| --- | --- | --- |
| 0–3 s | Black. "Great games deserve more than a score." arrives one word per eighth note. Its full stop grows into the circle that opens onto the next scene. | Low pad, a tick per word, a riser |
| 3–7 s | A padel result card draws in on white. The MVP coin spins down onto Yousif's seat and stamps it: a hairline ring, a card shake, a settling wobble. The seat now reads "MVP, by vote 3 of 4". The card settles as "Introducing Marks" rises in. | Kick on the cut; the spin whirrs; a big hit with a coin clink on the stamp at 5.0 s |
| 7–13 s | Six marks, one per second, alternating black and white. Each enters with its own physics: Clutch is tossed and flips, Mr Ice glides in and stops dead, Let him cook spins like a top, The Great Wall drops heavy and shakes the frame, Comeback King overshoots and turns back, Sayed Malek rolls in late and nods off. | A chord stab on each cut and a clink on each landing. Sayed Malek's stab sags in pitch. |
| 13–16 s | Yousif's cabinet: twelve hatched slots. Eight coins drop in on eighth notes with gravity and bounce, and the count climbs to 11 received. Four slots stay hatched ("Not yet"). | Each clink a step up the A minor pentatonic, a riser, then a silent eighth note before 16 s |
| 16–18 s | "Give them. Earn them. Keep them." Each line wipes on with a beat, and earlier lines step back to grey. | Three hits: F, G, A minor |
| 18–20 s | End card: the Temba ball springs in and its arc draws, "TEMBA" in Sora tightens its tracking, then "LIVE THE GAME" and "Download on the App Store and Google Play". | A final chord and a coin ringing out |

The only colour in the video is the coins. Everything else uses #000000, #FFFFFF, #6E6E6E and #E6E6E6. There are no shadows, gradients or glows.

## Making the Arabic version

1. In `copy.js`, fill the `null` entries under `ar`: `intro`, `card`, `headline`, `subline`, `cabinet`, `outro` and `end`. Mark names, descriptions and giver groups already come from the Arabic catalog. A `null` falls back to English.
2. Preview with `index.html?lang=ar`. The layout mirrors for right-to-left text, coin targets are measured from the layout, and Arabic text sets in Noto Sans Arabic.
3. Run `node render.cjs --lang ar` to write `out/marks-launch-ar.mp4`.

If a translated line is longer or shorter than the English, adjust its cue in `timing.js` and re-run `music/score.py` so the music follows.

## Music

The bed is synthesised: kick, clap, hats, bass, saw stabs, coin clinks and risers, with no samples and no licensing. To use a licensed track instead, replace `music/music.wav` with a 20-second, 44.1 kHz WAV and render again. The hit points in the table above are the cue sheet.
