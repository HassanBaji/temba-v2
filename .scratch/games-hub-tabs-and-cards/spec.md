Status: approved

# Games hub tabs and richer Game cards

## Problem Statement

A signed-in User opening Games sees only a thin Public pickup list: Game name, day/time, Group or “Pickup”, and a sport badge. The whole row is a link to Game home. There is no tab for upcoming Games on Groups they already belong to, no Venue-forward card, no visible roster of who is already seated, and no way to Join from the list. Home’s upcoming rows have the same thin card. Discovering a public Game and joining a Friendly game both require opening Game home first.

## Solution

Evolve the Games hub into two tabs — **My Groups** (default) and **Public** — and grow the existing Game summary card (optional props, one component) so Hub and Home can show Venue-led cards with roster and join actions for individual Friendly games.

**My Groups** lists live upcoming Games on Groups the User is a member of (same visibility rules as Home upcoming, including Soft-archived Club Group Games). **Public** lists public pickup Games that are live, not Soft-archived via a Club Group’s Community, and not already listed on My Groups.

For an individual **Friendly game**, the rich card shows Venue as title, optional Game name, a 2v2 roster (filled seats with avatar + name; empty as Available / “+”), footer meta (date, time window, player count, location), and a primary Join control. Join opens a seat picker (sheet/dialog) that calls the existing seat-register door; when the Game is full, Join waitlist is one tap. Other formats keep a reduced card with View (and unambiguous waitlist / Americano pool Register where applicable). Price, payment, and filter chips stay out of this slice.

Approving this spec approves the Test seams in Testing Decisions.

## User Stories

1. As a signed-in User on Games, I want tabs labelled **My Groups** and **Public**, so that I can switch between my Groups’ Games and public pickup.

2. As a signed-in User opening Games, I want **My Groups** selected by default, so that my schedule is first.

3. As a Group member, I want **My Groups** to list live upcoming Games on Groups I belong to (Club Group and Loose Group), so that I see the same membership set as Home upcoming.

4. As a Community Member who is not a member of a Club Group, I want that Club Group’s Games absent from My Groups, so that Community membership alone does not widen the list.

5. As a Group member of a Soft-archived Club Group Game that is still live by the Home filter, I want that Game on My Groups with **View** only (no Join or Join waitlist), so that archive freezes join doors without hiding history I can still open.

6. As a signed-in User, I want **Public** to list `isPublic` Games that are live, whose Club Group Community is not Soft-archived (groupless public included), so that pickup stays a real discovery door.

7. As a Group member of a public Game that also appears on My Groups, I want that Game **only on My Groups** and excluded from Public, so that My is preferred and Public is not a duplicate.

8. As a signed-in User, I want a public Game on a Group I am not a member of to appear on Public only, so that discovery still works outside my Groups.

9. As a signed-in User, I want a groupless public Game on Public only, so that pickup without a Group is still listed.

10. As a User viewing either tab when the filtered list is empty, I want an empty state that names the tab (no public Games / no Games in my Groups), so that I know which filter is empty.

11. As a User who may create Games, I want Create Game to remain available from the Games hub chrome, so that organizing is unchanged.

12. As a User scanning a card, I want the **Venue** name as the card title, so that I know where play is.

13. As a User when the Game has a name, I want that name secondary under the Venue, so that the event label is still visible.

14. As a User when the Game name is null, I want no secondary “Untitled Game” line required on the rich card (Venue remains the title), so that empty names do not clutter the card.

15. As a User, I want footer meta with date, time range when a window exists (else the list start time), player occupancy when caps/counts exist, and location (Venue city or Venue name fallback), so that I can judge the Game from the outside.

16. As a User on an individual Friendly game card (Hub or Home rich row), I want a 2v2 roster with a visual divider between sides, filled seats showing avatar and name, and empty seats showing Available / “+”, so that I see who is already in.

17. As a User who can register on an open individual Friendly game, I want a primary **Join** on the card that opens a seat picker without navigating away, so that I can take a vacant Position from the list.

18. As a User in that seat picker, I want to choose a vacant side and Position and have the existing seat-register door run, so that list join and Game home join share one admit path.

19. As a User joining a vacant Position from the picker, I want success to toast, stay on the current page (Hub or Home), invalidate list queries, and show the card in a joined state with **View**, so that I can keep browsing.

20. As a User when seat-register fails (conflict, closed, gate), I want an error toast and the list to refresh, so that stale vacancies do not look joinable.

21. As a User on an individual Friendly game that is **full**, I want one-tap **Join waitlist** on the card (no seat picker), so that overflow matches Game home.

22. As a User already registered, seated, or waitlisted, I want the primary action to be **View** (not Join), so that I do not double-register.

23. As a User on a closed or cancelled Game shown where lists allow, I want **View** only, so that closed doors are obvious.

24. As a User on team-only, Americano, or Friendly tournament cards, I want a **reduced** card without the Friendly 2v2 join sheet, so that only individual Friendly game gets rich roster join.

25. As a User on an open Americano I may join, I want an unambiguous one-tap **Register** (pool) or **Join waitlist** when full, without a seat sheet, so that individual pool admit stays available from the list.

26. As a User on an open team-only Game, I want **View** as the primary action, so that Team selection stays on Game home.

27. As a User tapping the non-CTA card surface or Game name, I want to open Game home, so that detail, invites, scoring, and organizer tools remain one tap away.

28. As a User tapping Join, seat controls, or Join waitlist, I want no navigation to Game home, so that join does not fight the list.

29. As a User on Home, I want the Upcoming `GameSummaryCard` rows (non-hero) to use the same rich optional props and join behavior as the Hub for individual Friendly games, so that Home and Hub stay consistent.

30. As a User on Home, I want the elevated hero upcoming Game to remain a navigation highlight without a seat sheet this slice, so that Home’s first slot stays simple.

31. As a Group member on Group home Games lists, I want the **reduced** card to remain (no rich roster/join this slice), so that Group home scope does not expand.

32. As a User, I want no price on the Join CTA and no Date/Price/Location filter chips or sport pills this slice, so that payment and filters stay deferred.

33. As a User, I want list cards to omit fabricating Court, Level, or payment fields when absent, so that the card only shows real data.

34. As a developer, I want a single Game summary card component grown via optional props (never a second parallel Game card), so that Home, Hub, and Group home stay one component family.

35. As a User after Join waitlist from a card, I want to stay on the list with toast and refreshed waitlisted/View state, so that waitlist matches seat-join stay-on-list behavior.

## Implementation Decisions

- **Surface:** Games hub at the existing Games route gains two tabs using the existing Tabs primitive (same pattern as Group/Community homes): default value **My Groups**; second **Public**. Create Game chrome unchanged when create access exists.

- **My Groups query:** Add a protected list procedure for the signed-in User’s membership-scoped live upcoming Games (reuse the Home upcoming filter: member `groupId` set, not cancelled, `isGameLive`). Include Soft-archived Club Group Games. Enrich each row for the card (below). Prefer a dedicated games-router list (or a shared helper used by Home) over duplicating filter logic in the client.

- **Public query:** Extend or replace the public pickup list so it: (1) keeps `isPublic`, not cancelled, Club Group Community not Soft-archived, groupless allowed; (2) keeps only live Games (`isGameLive`); (3) **excludes** Games whose `groupId` is in the User’s Group membership set (My preferred). Enrich rows like My Groups.

- **Home data:** Enrich Home upcoming payloads used by non-hero `GameSummaryCard` rows with the same card fields needed for rich/join (Venue, counts, registration affordances, sides for individual Friendly game). Hero layout stays the existing elevated link card without seat picker.

- **Group home:** Keep reduced props only (name, start, group, sport, cancelled, href).

- **Card component:** Grow the existing Game summary card with optional props. Forbidden: a second parallel Game card component. Reduced mode remains for Group home and for Hub/Home rows that are not individual Friendly game rich mode.

- **Rich card fields (individual Friendly game):**
  - Title: Venue name (required on Game; show available Venue identity).
  - Secondary: Game name if non-null.
  - Roster: two sides × left/right from existing side listing; User `image` + name when occupied; Available / “+” when vacant; visual divider between sides.
  - Meta: date, time range from window when set else list start time, `registered/cap` players when known, location from Venue city (fallback Venue name).
  - CTA: Join | Join waitlist | View | Register (Americano pool only) per stories; no price.

- **Reduced card fields (non–individual-Friendly on Hub/Home, and all Group home):** Venue title when enrichment present (else keep today’s name-led reduced row if Venue absent from that payload); Game name secondary when present; meta without 2v2; CTA View / Join waitlist / Americano Register as applicable; row still links to Game home except on CTA controls.

- **Join interactions:**
  - Open individual Friendly game + can register → Join opens `ResponsiveDialog` (or equivalent existing sheet/dialog) with vacant Positions; confirm calls existing `registerSeat`; do not navigate.
  - Full + can waitlist → one-tap existing waitlist/register-full path; no seat picker.
  - Soft-archived / closed / cancelled / already in → View only.
  - Team-only open → View.
  - Americano open + can register → one-tap pool Register; full → Join waitlist.
  - Friendly tournament → reduced; View / waitlist only (no rich seat sheet this slice).

- **Navigation:** Card body / Game name use the Game home href. CTA buttons and seat picker controls `stopPropagation` / are outside the link hit target.

- **Cache:** On join or waitlist success/error from Hub or Home, invalidate the Hub list queries and Home query (and Game-by-id if warm) so roster and CTAs refresh.

- **Schema:** No migration. No price columns. No filter tables.

- **Auth / gates:** Do not weaken join gates. Card CTAs only offer actions the server would allow; server remains source of truth.

- **Copy:** Tab labels exactly **Public** and **My Groups**. Primary actions: **Join**, **Join waitlist**, **View**, **Register** (Americano pool).

## Testing Decisions

- Test external behavior through the highest seams: list procedure outputs (membership, live, Soft-archive exclusion, Public dedup vs My) and card/join UI behavior against those payloads; prefer existing Vitest + PGLite / router test patterns where present for games and home lists.
- **Seams:**
  1. My Groups list: member Games in, non-member Club Group Games out, Soft-archived member Games in, non-live out.
  2. Public list: public live in; Soft-archived Club Group public out; member-Group public out (dedup); groupless public in.
  3. Card affordances from enriched row: individual Friendly open → Join; full → Join waitlist; seated/waitlisted/closed/archived → View; team-only → View; Americano open → Register.
  4. Seat picker calls the same register-seat contract as Game home; success leaves the User on Hub/Home.
- Prior art: Home upcoming filter tests / games access and seats tests; Games hub and Home page patterns for query + mutation invalidation.
- Do not assert CSS pixel-perfection against the reference image; assert structure (Venue title, roster sides, CTA verbs, tabs).

## Out of Scope

- Date / Price / Location filter chips and sport-type pills
- Payment, price display, guests
- Rich roster + seat join for Friendly tournament, Americano pool grid, or team-only Team picker on the card
- Changing Group home cards to rich mode
- Seat sheet on the Home elevated hero
- Directory, Community-wide Game lists without Group membership
- New Game formats, Court-required display, Level / Level band on cards
- Search on the Games hub
- Remembering last-selected tab across sessions
- Redesign of Game home itself beyond what list join already shares

## Further Notes

- Domain vocabulary: Game, Match, Friendly game, Americano, Friendly tournament, Group, Club Group, Loose Group, Community, Soft-archive, Venue, Position, Game team, Waitlist, Game admit. Avoid “club” for Community, “match” for Game, “event” for Game.
- Aligns with ADR-0008 (Game parent / Match contest) and redesign contract: one Game summary card, optional props, do not surface price.
- Reference image informs layout (Venue, 2v2, footer meta, Join) but tab semantics and no-price are product decisions above.
- Suggested ticket cut after approval: (1) list APIs + Public dedup + enrichment, (2) rich/reduced card + seat sheet + CTAs on Hub, (3) Home upcoming enrichment + rich rows + invalidation. Adjust only at `/to-tickets` time without changing requirements.
