# TEM-172 screenshot capture

Headless Chrome against `http://localhost:3000`.

- `login-390.png` — Clerk SignIn (Archivo, black Continue) at 390px
- `preview-390.png` — `/dashboard/design/home` Provisional column at 390px (bottom nav, five tabs)
- `preview-1440.png` — same route at 1440×1100 (rail + side-by-side columns, fold)
- `preview-1440-full.png` — same route at 1440×2800 (Level, Recent form, All time, Standing, empty scaffolds)

Authenticated live Home (`/dashboard`) still needs a Clerk `dev-browser` session. The design preview is reachable without one in development (middleware skip + page `notFound` outside development).
