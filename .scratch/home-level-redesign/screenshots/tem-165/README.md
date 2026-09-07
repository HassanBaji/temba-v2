# TEM-165 screenshot record

App-wide visual diff after Archivo + near-monochrome tokens.

Clerk-authenticated App routes (`/dashboard`, Games, Groups, …) are not reachable in this Cloud Agent session (`x-clerk-auth-reason: protect-rewrite, dev-browser-missing` on `/dashboard`). Public routes `/login` and `/signup` render.

## Files

Directory: `.scratch/home-level-redesign/screenshots/tem-165/`

| File | Notes |
| --- | --- |
| `before/login-390.png` | Geist, captured before `fonts.ts` change |
| `after/login-390.png` | Archivo + `tnum` |
| `before/login-1024.png`, `signup-390.png`, `signup-1024.png` | Captured after hot-reload; same bytes as after (Archivo already live) |
| `after/login-1024.png`, `signup-390.png`, `signup-1024.png` | Archivo |

The only pre-swap capture is `before/login-390.png`. Desktop login and both signup widths were shot after the font swap had already applied via Next.js HMR.

## Served CSS (post-change)

- `font-family: Archivo` / `--font-sans: "Archivo", "Archivo Fallback"`
- `font-feature-settings: "tnum" 1` on `body`
- `--color-ink: #000` and the rest of the near-monochrome set
