# Demo data and flow recordings

## `pnpm --filter temba db:seed`

Wipes the database at `DATABASE_URL` and fills it with demo data that covers every App flow. It refuses any host other than `localhost` unless `SEED_ALLOW_REMOTE=1` is set.

Writes go through the router functions the tRPC doors call (the same ones the tests use), so admit, pool draw, Match result confirmation and Glicko-2 ratings stay consistent. Two things are written directly:

- **Venues and Courts.** Operator doors read Clerk metadata.
- **Past Games.** Each is created in the future, seated, then moved into the past.

### Signing in as a seeded User

Users are matched on `user.clerk_id`, and the Clerk webhook cannot reach a local App. To use the seed:

1. Create a User with username + password on your Clerk **development** instance. With Clerk test mode on, sign up at `/signup` using a test number `+1 555 555 01xx` (US) and code `424242`. Numbers already used on the instance are refused, so pick an unused one. Copy the User's id (`user_…`) from the dashboard, or from `window.Clerk.user.id` in the browser.
2. Seed with that id on the `me` persona:
   ```bash
   SEED_CLERK_ID_ME=user_xxx pnpm --filter temba db:seed
   ```
   Any persona can be linked the same way with `SEED_CLERK_ID_<KEY>`, for example `SEED_CLERK_ID_NEWBIE` for the onboarding flow or `SEED_CLERK_ID_MARCO`.
3. For Operator screens and create doors, set this on that Clerk User's **public metadata**:
   ```json
   { "operator": true, "groupCreator": true }
   ```

### What `me` (Sam Rivera) sees

| Area | Seeded state |
|---|---|
| Home | Friday Cup pool Match card (drawn tournament under way); two Games needing results; C2 Level with 7 rated Matches; Recent form; Standing; 3 pending invites |
| Games | Full Game with a waitlist; half-full Game with Sam + partner; one seat left; empty Game; cancelled Game; Level-locked Game (B-level Session); Sam's Game with a pending Level range request (Intermediate Night) |
| Results | "Friday rematch": sets entered, waiting on Sam's confirmation. "Yesterday's ladder": played, no score yet. Seven final Games in History |
| Tournaments | Club Championship: open, 4 pairs + 2 half teams (merge). Autumn Cup: draw drafted, not posted. Friday Cup: posted, round 1 completed, round 2 part-scored |
| Americano | Autumn Americano, 5/8 registered |
| Groups | Club Public (Tuesday Ladder); Club Public with Require approval + 3 requests (Advanced Squad); Club Private; Loose Public; Public list with join / request rows; pending Loose Private invite |
| Communities | Owner of Lisbon Padel Club (Admin, members, linked Venue, 2 join requests, a Team link request, a Lookup invite out). Member of Sunset Social (private). Outsider on Porto Padel Collective (pending Venue link request). Invite to Harbour Circle. Owner of a Soft-archived Community (with a rejected Venue link request) |
| Teams | Complete Club Team; incomplete Team with an invite + Invite link; pending invite to Lob Stars |
| Venues (Operator) | 3 live Venues with Courts, 1 archived, 1 pending link request |
| Invite links | Game `/g/{code}`, Group `/gr/{code}`, Community and Team token links |

`newbie` (Nora Newman) has not done the onboarding questionnaire.

## `pnpm --filter temba record:flows`

Plays each flow in Chromium and saves one video per flow to `apps/temba/recordings/` (gitignored). Needs the dev server running and a browser that can reach Clerk: in development every page load does a Clerk handshake. Behind a TLS-inspecting proxy, Chromium must trust the proxy CA in its NSS store (`~/.pki/nssdb`).

Clerk's new-device check (`/login/factor-two`) is answered with `424242`, the test-mode code. Set `RECORD_OTP` to use a different one.

Record twice for clean videos. The first run compiles each route on the dev server, so its videos show loading skeletons. Re-seed between runs.

```bash
RECORD_USERNAME=sam RECORD_PASSWORD=... \
RECORD_NEWBIE_USERNAME=nora RECORD_NEWBIE_PASSWORD=... \
pnpm --filter temba record:flows
```

Options:

- `RECORD_ONLY=04-home,09-friendly-tournaments` records a subset.
- `RECORD_HEADED=1` shows the browser.
- `RECORD_BASE_URL` points at another host.

Flows without credentials are skipped.

A few flows click through (confirm a result, approve a join request), so re-seed before recording again.
