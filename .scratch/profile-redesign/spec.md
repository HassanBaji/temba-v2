Status: ready-for-agent

# Profile screen redesign

Design source: claude.ai/design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`, `Temba.dc.html`, screen **04 Player profile**. The relevant markup is saved at `design/04-player-profile.html`. The remote file is larger than the 256 KiB read cap, but screen 04 falls inside the part that was read.

## Problem Statement

`/dashboard/you` is a list of links: a small avatar, a solid-black Level card, and rows for Preferred Position, Teams, Invites, Operator tools and Sign out. It does not look like the redesigned Home. It also shows nothing about how the User plays: no recent form and no all-time record.

## Solution

Rebuild `/dashboard/you` as the **Profile** screen from design 04. It is stats-only: identity, a Level card, a Form strip and an All time card. A settings gear in the header opens a new **Settings** page (`/dashboard/you/settings`). Today's rows move there unchanged.

It reuses the Home design system: `ink` / `paper` / `rule` / `wash` tokens, the `hatch` utility, `font-expanded`, and 22px padding with 26px gaps. Do not hardcode any hex values; the TEM-72 gate greps for them.

## Decisions (settled with the product owner, 2026-09-17)

1. **Rows move behind the gear.** Settings holds Preferred Position, Teams, Invites (with the pending count), Operator tools → Venues (operators only), and Sign out. Profile shows no list rows.
2. **Show only data that exists. No schema changes.**
   - The design's "Right side, Stockholm" becomes the Preferred Position label only (for example "Right side"). If no Preferred Position is set, the line is omitted. The app stores no city.
   - "Playing padel since {year}" uses the year of the User's **first completed Match**. If there is none, the line is omitted.
   - "Range this season" is **dropped**. The app has no Season concept.
   - "confirmed at 20" is replaced. Confirmation depends on rating certainty (φ), not on a fixed count (see `server/ratings/level.ts`).
3. **The Level bar has two meanings:**
   - While **Provisional**: progress toward confirmation, `ratedMatchCount / (ratedMatchCount + ratedMatchesRemaining)`, drawn over the hatch. Caption: `{n} rated matches` on the left and `about {r} more to confirm` on the right.
   - When **confirmed**: progress toward the next Level band (`progressPercent`, same as Home), drawn over `wash`. Caption: `{p}% of the way to {nextBand}`. At the top band, show `Top Level band` and no bar.
4. **Rename "You" to "Profile"** in the nav label, the page title and the route-loading title. The route stays `/dashboard/you`, so no redirects are needed.

## Current behaviour (unchanged unless listed below)

- Tapping the avatar opens `clerk.openUserProfile()` to edit the photo. Keep this, including the Camera badge and its aria-labels.
- `YouPreferredPositionRow`, `DeclareLevelDialog` and `usePendingInviteCount` keep their current behaviour. Only where they appear changes.
- Home's `HomeLevel`, `HomeRecentForm` and `HomeAllTime` stay unchanged. Home is not part of this work.

## Screen spec: Profile (`/dashboard/you`)

Top to bottom, on a `paper` surface:

1. **Header.** "Profile" (26px / 700) on the left. On the right, a 44×44 icon link with the lucide `settings` icon, `aria-label="Settings"`, pointing to `/dashboard/you/settings`. When there are pending invites, show a small ink dot on the gear and change the label to `Settings, {n} pending invites`. This keeps invites discoverable now that the Invites row has moved.
2. **Identity.**
   - A 72px avatar with a 14px radius and a `rule` border. Show the photo if there is one, otherwise the initials. It stays the photo-edit button.
   - Name (22px / 700).
   - Preferred Position line (13px, muted), for example "Right side" / "Left side" / "Either side".
   - "Playing padel since {year}" (13px, muted). This depends on TEM-232.
3. **Level card.** One bordered surface with a 14px radius.
   - Top row: "Level" label, then the Level band in 60px `font-expanded`, shown with `displayLabelFromStoredBand`. On the right, the last-match movement: `up` / `down` / `held`, with "last match" underneath. It is based on the last two values of `history`, compared at display precision. With fewer than two points, omit it.
   - A 10px bar and its caption, as described in Decision 3. The fill animates from 0, and the animation is skipped when the user prefers reduced motion.
   - The numeric Level (for example `3.4`) stays available for screen readers in the card's accessible text. It is not shown as a headline.
   - **No rating, but the User can self-declare:** render the existing Declare Level empty state (`HomeDeclareLevel` or an equivalent) in place of the card.
   - **No rating and cannot declare:** omit the card.
   - Keep the loading skeleton and the `ErrorState` with a retry action.
4. **Form card.**
   - Header: "Form" (15px / 600) on the left, "last 10 matches" (12px, muted) on the right.
   - Ten 26px slots with a 4px radius:
     - won = solid ink
     - lost = 1px ink outline
     - draw = the existing diagonal-draw treatment
     - not played = hatch
   - The slots have no visible letters, but each has an sr-only label (Won / Lost / Drawn / Not played). Newest is on the left, as on Home.
   - Data comes from `games.listMyMatchHistory` through the existing `deriveRecentForm`. With zero matches, show all ten slots hatched.
5. **All time card.**
   - Header: "All time" on the left, "since {year}" on the right. Omit the right side when there is no match.
   - Body: `{matches}` (44px expanded) with "matches" next to it. On the right: `{won}–{lost}` and `{pct}% won`. Below, a 6px bar filled to `pct`.
   - Rows:
     - **Sets**: `{setsWon}–{setsLost}`
     - **Longest streak**: `{n} wins`. Use "1 win" for one, and "—" when there are no wins.
     - **Most played partner**: short name, for example "Sofia L". Show "—" when there is none.
   - Zero state: `0` matches, `0–0`, no percentage caption, an empty bar, and "—" in every row.
   - Loading skeleton and `ErrorState` with retry.
6. The bottom nav is unchanged apart from the label rename.

## Screen spec: Settings (`/dashboard/you/settings`)

- `DashboardShell` titled "Settings", with a back link to Profile (use the existing detail-page back pattern).
- The contents are today's `/dashboard/you` rows, with the same components, copy and behaviour:
  - `YouPreferredPositionRow`
  - Teams → `/dashboard/teams`
  - Invites → `/dashboard/invites`, with the count badge or skeleton
  - `Section "Operator tools"` → Venues, shown only when `publicMetadata.operator === true`
  - The full-width outline **Sign out** button
- Skeleton while Clerk loads, as `YouPageSkeleton` does today.

## Data

### `ratings.me` (additive)

Add `ratedMatchCount: number` to both branches (0 when there is no rating). It is the count of padel `ratingEvents` for the User. It is needed because `history` is capped at 15 events.

### New endpoint `users.profileStats`

File: `server/api/routers/users/profileStats.ts`, one procedure per file. The logic lives in that file.

```ts
{
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  longestWinStreak: number;
  mostPlayedPartner: { userId: string; name: string } | null;
  firstMatchAt: Date | null;
}
```

- **Scope:** the same Match population Home's All time uses. That is completed Matches the User sat on through a Game team slot; cancelled Games do not count. Profile and Home must show the same played / won / lost numbers. Draws count as played, but neither won nor lost.
- **Loading the Matches.** `users.home` already loads completed Matches and summarizes them in `summarizeCompletedMatchStats`. Two endpoints now need this, so under `.cursor/rules/api-one-endpoint-per-file.mdc` it may be extracted into a shared module, for example `server/stats/completed-matches.ts`. That module loads the Matches for a User and summarizes them. Extend the summary with `setsLost`, then have `home.ts` import it. Home's output must not change. Do not add any other layer.
- **`longestWinStreak`:** the longest run of consecutive won Matches, in chronological order. A draw or a loss breaks the run.
- **`mostPlayedPartner`:** the teammate on the User's slot who appears in the most completed Matches. Ties go to the most recent shared Match, then to `userId`. Ignore empty seats and the User's own seat. Singles or no partner gives `null`.
- **`firstMatchAt`:** the display time of the earliest Match in scope.
- **Tests** (pglite, like `home.test.ts`): zero matches, draws, sets totals, streak broken by a draw, partner tie-break, and parity with `users.home` counts.

## Non-goals

- A city or location field, Seasons and a season range, or profiles of other Users.
- Editing name or username in-app (Clerk still handles this).
- Changes to Home, or to the Level chart, which is commented out on Home.
- Adding a Communities tab or removing one from the nav. The design's four tabs are not adopted.
- Dark mode.

## Risks

- **Discoverability of Invites.** The pending-count dot on the gear reduces this risk. Check that the nav or Home header still show invites the way they do today.
- **Count mismatch with Match history.** `listMyMatchHistory`, which feeds the Form card, excludes tournament and Americano Matches, while `profileStats` / Home counts may include them. Form therefore covers "last 10 friendly matches". This is accepted and matches Home today.
- **Stale references to the moved rows.** Search for anything that deep-links to rows on `/dashboard/you`, such as onboarding redirects or tests, and update any that expect those rows there.

## Tickets

1. **TEM-229 Profile shell and Settings page.** Rename to Profile, add the header with the gear and its invite dot, the new identity block (without the "since" line), and the new `/dashboard/you/settings` page with the moved rows. Keep the existing `YouRatingSection` on Profile until ticket 2.
2. **TEM-230 Profile Level card.** `ratings.me.ratedMatchCount`, the new card, the two-meaning bar and the declare fallback. Delete `YouRatingSection` if it is no longer used. Blocked by TEM-229.
3. **TEM-231 Profile Form card.** Blocked by TEM-229.
4. **TEM-232 All time card and "since" line.** `users.profileStats` with the shared completed-match module, the card, and the "Playing padel since" line. Blocked by TEM-229.
