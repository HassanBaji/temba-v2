Status: ready-for-agent

## Problem Statement

Organizers copy a Game **Invite link** to WhatsApp (and similar chats). Today the clipboard is only a long token URL (`/invites/game/link/{token}`), and the page has no Open Graph tags — paste shows the generic Temba title. Recipients cannot see venue, court, day, time, or who is sitting until they open Temba.

Organizers want a **short** join URL, a **nice English emoji message** with two Game teams, and a **thin unfurl card** when someone pastes the URL alone.

## Solution

Keep Game Invite link mint/accept/consent as shipped (6-hour tokens, mint-on-copy, many live rows, no revoke). Add a public **short code** on the same `game_invite_links` row and a first-class join URL `/g/{code}`.

For an **individual Friendly game** (two sides, four Positions), Copy puts a formatted message on the clipboard, ending with `join:` and the short URL. Other Game formats copy the short URL only (no roster layout). Community, Group, and Team Invite links stay long token paths.

`/g/{code}` is a join page (same admit as the token path) with **SSR** `generateMetadata`: `og:title` is the Venue name; `og:description` is an absolute day, the time window, and `{occupied}/4 sitting`. No User names in Open Graph. Crawlers do not run JS.

Approving this spec approves the Test seams in Testing Decisions. It **amends** Invite link copy behaviour for Game only (`.scratch/invite-lookup-and-link/spec.md` “copy newest URL”). It does **not** replace Invite doors, Game admit, or Friendly-only UI.

## User Stories

1. As an organizer of an individual Friendly game, I want Copy to mint a new Invite link row with both a token and a short code, so that I get a short join URL without changing the 6-hour door.

2. As that organizer, I want the clipboard to be an English emoji message plus that short URL, so that WhatsApp shows venue, court, day, time, and who is sitting without opening Temba.

3. As that organizer, I want empty Positions to read `Open`, so that people see vacant seats.

4. As that organizer, I want the court line omitted when the Friendly game’s Match has no Court, so that skip-Court Games do not show a blank court.

5. As that organizer, I want occupied Positions to show that User’s `name`, so that the message matches who is sitting on Game home.

6. As that organizer, I want Team 1 to be side index 1 (Left then Right) and Team 2 to be side index 2 (Left then Right), so that the message matches Positions on the Game.

7. As that organizer, I want `join:` to contain only the short URL (`{origin}/g/{code}`), so that the link stays short and simple.

8. As that organizer, I want the Invite link panel to show the newest short URL, so that I am not copying a 43-character token path.

9. As that organizer copying again during the 6-hour window, I want a **new** token and a **new** short code, so that recopy is not revoke and does not extend old doors.

10. As a recipient who still has an older short URL, I want that code to work until its own 6 hours elapse, so that recopy does not kill a message I already sent.

11. As a recipient who still has `/invites/game/link/{token}`, I want that long URL to keep working until the same row expires, so that in-flight shares are not broken.

12. As a recipient opening `/g/{code}` or the long token URL, I want **no redirect** between them, so that WhatsApp does not replace the short URL with the long path.

13. As a signed-out recipient opening a live `/g/{code}`, I want to sign in or sign up with Clerk and return to `/g/{code}`, so that the short URL stays the door.

14. As an authenticated recipient opening a live `/g/{code}` on an individual Friendly game, I want the same seat-pick (or waitlist) join as the token Invite link page, so that the short URL is not a second admit implementation.

15. As a User opening an expired, unknown, or unavailable short code, I want the existing dead Invite copy (no join), so that a stale `/g/{code}` is not a door and does not become a different Game.

16. As a recipient who pastes **only** the short URL into WhatsApp or iMessage, I want a thin unfurl card whose title is the Venue name and whose description is day, time window, and `{occupied}/4 sitting` with **no names**, so that Facebook’s cache does not store a roster.

17. As that recipient, I want that card to come from HTML metadata on `/g/{code}` without running JavaScript, so that crawlers can unfurl.

18. As a recipient of a dead or cancelled Invite link short URL, I want generic Temba metadata (no Venue, no occupancy), so that a stale crawl does not leak Game details.

19. As an organizer of a cancelled, closed, or Soft-archived (join-frozen) Game, I want Copy to stay unavailable, so that mint rules do not change.

20. As an organizer of a team-only Friendly game, Americano, or Friendly tournament, I want Copy to put the **short URL only** on the clipboard (no two-team message), so that the roster layout is not invented for those formats.

21. As an Owner or Admin copying a Community, Group, or Team Invite link, I want behaviour unchanged (long token URL, no short code, no Game message), so that this slice is Game-only.

22. As a User who is not the Game organizer, I want minting still refused, so that who may copy does not widen.

23. As a crawler or client requesting `/g/{code}` with different letter case, I want lookup to be case-insensitive, so that `a3f8k2pq` and `A3F8K2PQ` are the same door.

24. As a maintainer, I want already-live Game Invite link rows without a short code to keep working on the long path until they expire, so that we do not backfill or invalidate in-flight tokens.

25. As a User joining via either URL, I want join gates, Game admit, Waitlist, and team-only partner consent unchanged, so that shortening is not a new admit product.

## Implementation Decisions

- Schema, migrations, and kit stay in the DB Package. App tRPC, join pages, and Game home stay in the Temba App. No new Package. No new glossary noun: the door remains **Invite link**; `/g/{code}` is that Game Invite link’s public URL. Do not name “shortener”, “short link”, or “magic link” in `CONTEXT.md`. Optional one-line CONTEXT patch under Invite link: Game Invite links may be opened at `/g/{code}` (eight-character public alias on the same 6-hour row); Community, Group, and Team stay token-path only.

- **Column:** Add a unique nullable `short_code` (varchar, length 8) on `game_invite_links` only. Existing rows stay `NULL` (Postgres unique allows many nulls). Do not add short codes to Community, Group, or Team Invite link tables. Do not replace `token`. Same `expiresAt` (mint + 6 hours, check-on-read, no worker).

- **Alphabet:** Eight characters from `23456789ABCDEFGHJKMNPQRSTVWXYZ` (Crockford-style; no `0/O/1/I/L/U`). Store uppercase. Generate with `crypto` randomness in the existing Invite-link mint helper (no nanoid/hashids library). On unique violation, retry mint. Do not recycle a code onto another live row. Expired rows keep their code so a stale WhatsApp URL stays dead. No expiry worker and no Game-delete product; cascade-on-Game-delete may free a code later — accept that rarity.

- **Lookup:** Normalize incoming path to uppercase. Characters outside the alphabet → invalid. Case-insensitive match on the stored code.

- **Mint:** Game `mintLink` / `createInviteLink` always writes a new token **and** a new short code. Return both the long token URL (unchanged helper) and the short URL `{origin}/g/{code}` using existing `getAppOrigin`. `getInviteLink` returns the newest live row; for display/copy prefer `shortUrl` when `short_code` is set, else the long `inviteUrl` (legacy null-code rows).

- **Routes:** Add `/g/[code]` as a **first-class join page** (not under `/dashboard`, not Clerk-protected). Reuse `InviteShell` + the existing Game accept UI. Resolve the row by short code on the server; pass the row’s `token` into the existing preview/accept client (do not fork Game admit). `forceRedirectUrl` for Clerk is `/g/{code}`. Keep `/invites/game/link/[token]`. **No 302/307 either way.**

- **Copy (Game home):** Individual Friendly game (`format` Friendly game **and** `registrationMode` individual): after a successful mint, `clipboard.writeText` the **share message** (not the URL alone). Other Game formats: clipboard is the short URL only. Community/Group/Team copy stays URL-only long token. Toast stays “Invite link copied”. The readonly panel shows the URL (short when present), not the full message.

- **Share message (client):** Compose on the client from Game home payload already loaded (`venue.name`, the one Match’s `courtName`, `windowStart`/`windowEnd`, `sides` occupants). Use existing day/clock helpers so timezone matches the organizer’s browser. English only. Canonical body (blank line between blocks; court line omitted when `courtName` is null):

```
📍 {venueName}
🎾 {courtName}
📅 {relativeDay}
🕗 {timeWindow}

👕 Team 1
- {leftName or Open}
- {rightName or Open}

👕 Team 2
- {leftName or Open}
- {rightName or Open}

🔗 Join:
{shortUrl}
```

Court line uses the stored Court name with the tennis-ball emoji (if the catalog name is `Court 2`, the line is `🎾 Court 2`, not `🎾 Court Court 2` — do not prepend `Court ` when the name already starts with `Court`). `{relativeDay}` is `Tonight` / `Tomorrow` / short date from the existing relative-day helper. `{timeWindow}` is the existing clock window (`7:00 – 8:00 PM` style). Extract a small pure formatter for the message string so it can be unit-tested; do not add a new public tRPC “shareText” procedure.

- **Open Graph (SSR only):** `generateMetadata` on `/g/[code]`. Crawlers do not run JS; do not rely on `previewInviteLink` in the client for unfurl. Live individual Friendly game: `og:title` = Venue name; `og:description` = absolute English day (not Tonight/Tomorrow — WhatsApp caches) + time window + `{occupied}/4 sitting`. Occupied = Positions filled on the two sides (Waitlist does not count). **No User names, no Team bullets, no court required.** Other Game formats that have a short code: Venue + absolute day + time window, **no** occupancy fraction. Invalid, expired, cancelled, or unavailable: root/generic Temba title and description, no Game fields. No `og:image` beyond the existing favicon. Long token path does not need Open Graph in this slice (copy uses the short URL).

- **Timezone:** Clipboard uses organizer-local helpers. Open Graph runs on the server (Node TZ, typically UTC) and uses an **absolute** date plus clock window; v1 accepts that the card’s clock may differ from the WhatsApp message. Do not add a Venue timezone column.

- **Unchanged:** Invite doors mint/preview/accept semantics, Game admit, seat-pick, team-only consent, join gates, Soft-archive freeze, 6-hour TTL, no revoke/rotate, Lookup invite, padel-only UI, Friendly-only create. No rate limiter.

## Testing Decisions

### What a good test is

Assert observable behaviour: minted codes, lookup/expiry, clipboard/share string, and Open Graph fields. Prefer PGLite + Invite doors (`mintLink`) and pure formatters. Do not assert WhatsApp/iMessage crawls, private file paths as the product, or UI component trees. Do not add a rate-limit harness.

### Test seams

Highest seam (one): an organizer of an individual Friendly game copies an Invite link and gets a 6-hour `/g/{code}` plus an English emoji roster message with `Open` seats and `join:` that short URL; opening `/g/{code}` joins like `/invites/game/link/{token}` (no redirect); HTML metadata on the short URL names the Venue, day, time, and `n/4 sitting` and **never** User names — without changing Community/Group/Team Invite links or Game admit.

If you implement this spec, you implement these seams (approved):

- Game mint writes unique 8-character uppercase `short_code` on the same row as `token`; Community/Group/Team mint unchanged
- Case-insensitive `/g/{code}` lookup; alphabet violations and unknown/expired codes → dead invite, no Game leak in metadata
- Recopy: new token and new code; older code and older token both admit until each `expiresAt`
- Null `short_code` legacy rows: long token path still works; no backfill required
- Individual Friendly game share formatter: venue; court line omitted when no Court; Team 1/2 Left/Right; `Open`; `join:` short URL only
- Other Game formats: no roster message (short URL only)
- `generateMetadata` helper: live Friendly game → title Venue, description absolute day + window + `{occupied}/4 sitting`, no names; dead/cancelled → generic Temba metadata
- `/g/{code}` join uses existing preview/accept + Game admit (seat-pick / waitlist / team-only consent); Clerk return path is `/g/{code}`
- Cancelled / join-frozen / non-organizer: mint still refused
- Manual: Copy on Game home, paste message, open short URL signed-out then signed-in, paste URL-only and inspect page source for `og:title` / `og:description` (not a live WhatsApp crawl)

### Modules under that seam

DB Package `game_invite_links` column + migration; Invite doors mint; App `/g/[code]` page + `generateMetadata`; Game home Copy + share formatter; `createInviteLink` / `getInviteLink` short URL fields — only as they affect the flows above.

### Prior art

Invite doors PGLite suite (`mintLink` / `previewLink`); Game Invite link accept page; `InviteLinkPanel` mint-on-copy; Game home `sides` + Match `courtName`; `formatRelativeDay` / `formatGameTimeWindow`. Root layout metadata is the generic fallback. No WhatsApp crawler tests exist — do not add any.

## Out of Scope

- Community, Group, or Team short codes or share messages
- Replacing Game `token` with the short code
- Redirects between `/g/{code}` and `/invites/game/link/{token}`
- Backfill of short codes onto already-live rows
- Rate limiting / bot throttling
- Bitly, branded short domain, or a second App
- Generated Open Graph images or Venue logos in the card
- Arabic or any i18n
- Americano / Friendly tournament / team-only roster layouts
- Venue timezone field
- Changing 6-hour TTL, mint-on-copy, no-revoke, Game admit, Lookup invite, or join gates
- WhatsApp Business API, iMessage extensions, SMS, Web Share API
- Invite-link revoke/rotate UI
- New glossary entity for the code

## Further Notes

Glossary: Root `CONTEXT.md` (Game, Venue, Court, Position, Game team, User, Friendly game, Invite link). Architecture: ADR-0002 (one App), ADR-0008 (Game is the parent). Invite doors: `.scratch/invite-lookup-and-link/spec.md` and `.scratch/deepen-domain-modules/spec.md`. Seats: `.scratch/individual-game-seats/spec.md`. Venue/Court: `.scratch/game-create-venue-court/spec.md`. Friendly-only App create: `.scratch/friendly-only-ui/spec.md`.

Settled grilling: two rounds (message+OG; short code on the same row; 8-char Crockford-style; both URLs first-class; no rate limit; mint-on-copy; OG occupancy without names).

Residual risk: short codes are more guessable than 32-byte tokens; mitigation is 8-character alphabet + 6-hour TTL + Clerk + existing join gates. Public Game + guessed live code can still admit. Open Graph occupancy and clocks can go stale in WhatsApp’s cache.
