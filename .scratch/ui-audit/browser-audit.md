# Browser audit — current Temba UI (observed, not inferred)

Captured against `pnpm --filter temba dev` on `localhost:3000`, signed in as the Temba User
`baji2` (Clerk test account `hassan+clerk_test@example.com`), a non-Operator.

Screenshots live in `.scratch/ui-audit/shots/`. Widths were forced by rendering the app in
fixed-width iframes (`tools/ui-audit-harness.html`) because CDP device emulation tiled the
capture surface.

## Data situation

The dev database was effectively empty (3 users, 2 unnamed test Groups, 1 Team, 0 Games,
0 Communities, plus a real catalogue of 52 Venues / 130 Courts). Every screen rendered an
empty state, so realistic data was seeded with `tools/seed-dev-data.mjs`:

- 10 synthetic players (mix of avatar image present / absent, to exercise the initials fallback)
- 2 Communities — `Bahrain Padel Club` (Public, Venue-linked) and `Seef Racket Society` (Private)
- 4 Groups — 2 Club Groups, 2 Loose Groups, 6–14 members each with varied standing counters
- 10 Games — pending, confirmed, completed (with `game_teams` scores) and cancelled
- 3 Teams, 3 pending Community join requests

All three real accounts were added to the main Community and Groups so any of them shows data.

Schema drift found while seeding: `game_team_players` is declared in the Drizzle schema but
**no migration has created it in the database**, so Game teams cannot be joined to Game players.

## What the UI actually looks like

### Shell and navigation

- Desktop (1440px): a ~250px permanent sidebar with brand wordmark, 5 flat nav items and a
  Clerk `UserButton` pinned bottom-left. Content is full-bleed inside the inset with **no
  max-width**, so a leaderboard row stretches ~1200px to hold two lines of `text-sm`.
- Mobile (390px): the same sidebar becomes a 3/4-width off-canvas Sheet behind a hamburger.
  There is no bottom navigation. The header is a 48px bar with hamburger, page title and avatar.
- The user control is duplicated: `UserButton` renders in both the sidebar footer and the header.
- No active-route highlighting anywhere in the nav.

### Home (`/dashboard`)

Three stacked sections, all equal visual weight:
1. `Overview` — a 3-cell stat list (Games played / Communities / Groups). On mobile it is three
   full-width rows separated by hairlines, each showing a label and a number. `Games played`
   reads `0` even for a seeded account because it reads `user.numberOfGamesPlayed`, a counter
   nothing increments.
2. `Upcoming Games` — bordered rows showing only name, "Group · date, time", and two small
   badges (sport, status). No Venue, no Court, no players, no spots remaining, no price, no
   join/RSVP action, and no link to a Game.
3. `Standing` — per-Group position rows.

Nothing on Home is actionable. It reads as a database summary, not a player's home screen.

### Lists (Groups / Communities / Teams)

Identical pattern on all three: page title, one-line muted description, a small primary button,
then a `divide-y rounded-xl border` list of rows containing a name, a "Type · Community · role"
meta line and a tiny lowercase sport badge. No avatars, no logos, no member counts, no activity,
no next-game hint. Communities nests its Club Groups as indented sub-rows.

Empty states are inconsistent: Home uses a bordered card with a CTA, while Groups, Communities
and Teams use a single line of muted grey text with no CTA.

### Group detail

The clearest example of the "rectangles inside rectangles" problem:

- Header with name, a meta line, two badges, and 3 action buttons that wrap onto separate rows
  on mobile (`Leave Group`, `Community`, `Communities` — unclear grouping and near-duplicate labels).
- `Group stats` — a bordered card containing a single metric (`Games played 0`).
- `Your standing` — four separate stacked single-metric cards (Position / Sets won / Points won /
  Games played), consuming most of a mobile viewport to convey four numbers.
- `Standing leaderboard` — text rows, `#1 Yousif Mansoor` over `19 sets · 575 points · 25 Games`.
  No avatars, no level, no form, no visual ranking treatment.
- Upcoming Games and Game history as more plain rows with no scores shown.

### Community detail

Card inside card inside card: a `Venue` card, a `Groups` card whose children are themselves
bordered cards each with an `Open` button, and an inline `Create Club Group Public` form
embedded as yet another nested card with its own input and button.

### Loading and empty states

Loading is skeleton-based and reasonably consistent (captured on Community detail), but only the
header is skeletonised on detail pages — the rest of the page pops in. There are no `loading.tsx`,
`error.tsx` or `not-found.tsx` files, and no Suspense boundaries.

### Operator-gated Venues

Non-Operators who reach `/dashboard/venues` get the full dashboard chrome with one line of body
text: "You do not have access to this area." No illustration, no redirect, no explanation.

## Corrections to the static code reports

The three exploration reports in this folder (`shell-routing.md`, `design-system.md`,
`feature-pages.md`) are accurate on tokens, primitives and layout, but **stale on invites**:

- `/dashboard/invites` exists (a unified pending-invite inbox for Community + Group + Team) and is
  in the sidebar. The route map in `shell-routing.md` omits it.
- Email invites have been retired from the Community and Group APIs in favour of **Lookup invites**
  (`sendLookupInvite`, `listLookupInvites`, `revokeLookupInvite`, `pendingLookupInvites`,
  `acceptLookupInvite`). `feature-pages.md` still describes `sendEmailInvite`.
- Invite links no longer rotate or revoke; each copy mints a token that expires after 6 hours.
  `rotateInviteLink` / `revokeInviteLink` no longer exist anywhere in `src`.
- Legacy dead surface remains: `src/app/invites/{community,group,team}/email/[token]/page.tsx` and
  the matching `accept-*-email-invite.tsx` components, plus `src/lib/invite-paths.ts` helpers.
- `CONTEXT.md` now distinguishes **Game** (the parent event) from **Match** (a contest with two
  sides belonging to a Game). There is no `matches` table in the Drizzle schema yet — the concept
  is specified but unimplemented.
