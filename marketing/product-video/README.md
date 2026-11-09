# Temba product video

A 60-second vertical product video (1080×1920, 30 fps, H.264 + AAC) and a 15-second cut, in Arabic and laid out right to left. The pitch: from zero to a full 5-a-side game in under a minute.

| File | What it is |
| --- | --- |
| `out/temba-60s.mp4` | Full video: hook, sign-up, group, game, play, end card |
| `out/temba-15s.mp4` | 15 s cut: hook, seats filling, end card |

Everything is generated from code. Nothing is stock or recorded.

## How it is made

- `timeline.json` holds every event in beats at 124 BPM. The picture, the soundtrack and the 15 s cut all read it, so every cut and seat tick lands on the beat.
- `scene.html` + `scene.js` draw each frame. `renderAt(t)` is a pure function of time and uses no CSS animation, so frames render the same in any order.
- `render.mjs` serves the page locally, takes a screenshot of each frame with Playwright (six pages in parallel) and pipes the PNGs to ffmpeg.
- `audio.py` (numpy + scipy) synthesizes the track: a four-on-the-floor electronic groove in D minor; a Khaleeji layer of frame-drum dum/tak and layered group claps on a swung 16th pattern; UI taps; one tick per seat, rising in pitch; a referee-whistle hit when the stopwatch stops; impacts on each scene cut.
- `build.py` runs all of the above and muxes both MP4s. The 15 s cut joins beat-aligned ranges from `cut15`, rounded to frames, with 10 ms audio fades at each join.

```bash
pip install numpy scipy
python3 build.py              # about 70 s: frames, audio, both MP4s
python3 build.py --mux-only   # reuse out/frames.mp4 and out/track.wav
node render.mjs --stills 10,44.6,57   # PNG stills into out/stills/
```

To scrub through the scene in a browser, serve this folder (`python3 -m http.server`) and open `scene.html`.

## Style rules applied

- Black `#000000`, white `#FFFFFF`, muted `#6E6E6E`, hairlines `#E6E6E6`. No other colours, no gradients or shadows. The mark coins are redrawn in black and white.
- IBM Plex Sans Arabic: Bold for headlines, Regular for the UI. All Western digits fall back to Archivo Expanded Bold through a `unicode-range` face. The only Latin word is the logotype `TEMBA`, set in Sora.
- A 45° hairline hatch means "not yet". Each field, seat, avatar, form slot and progress segment fills solid black with a right-to-left wipe once it is done. The game card is white while seats fill and flips to black with «قادمة» on the tenth seat.
- Pushed screens enter from the left (RTL navigation). The progress bar fills from the right.
- The bottom ~270 px holds no content, because Reels and TikTok overlay captions there.

## Decisions to review

- **Stopwatch and hook.** The hook says «خلّها 40 ثانية.», but the brief also says the stopwatch stops at about 00:52, so the two numbers disagree. The stopwatch starts at sign-up and runs about 1.28× real time so it reads 00:52 exactly on the tenth seat. To make it agree with the hook, change `stopwatch.stopValue` in `timeline.json` to `40` and rebuild.
- **Copy outside the brief.** A few UI labels were needed and are not in the brief. Where the app catalogs (`packages/i18n/src/messages/ar`) already have one, it is used: «مبتدئ / هاوٍ / تنافسي / محترف», «أسود / أبيض», «آخر 10», «7 فوز، 3 خسارة», «ماكينة أهداف». New labels: «أضف برقم الجوال», «بادل», «سباعي», «ملعب النخيل», «الجمعة، 8:00 م», «الأعضاء», and the badge lines «حمّله من آب ستور» and «احصل عليه من جوجل بلاي».
- **Store badges.** These are drawn placeholders. Apple and Google require their official badge artwork. Swap in the official Arabic badges before paid distribution.
- **Soundtrack.** The track is synthesized for timing and mood. For a polished release, a composer or a licensed track can replace it. The beat grid in `timeline.json` is the brief to hand over.
