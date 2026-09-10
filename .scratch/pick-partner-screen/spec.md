Status: ready for tickets

Tickets (Linear, `ready-for-agent`):

- [TEM-211](https://linear.app/temba-app/issue/TEM-211/1-dedicated-pick-a-partner-screen-for-an-individual-friendly-game) Dedicated Pick a partner screen for an individual Friendly game
- [TEM-212](https://linear.app/temba-app/issue/TEM-212/2-showcase-recent-partners-for-a-quick-pick) Showcase recent partners for a quick pick
- [TEM-213](https://linear.app/temba-app/issue/TEM-213/3-join-with-a-partner-on-the-games-hub-card) Join with a partner on the Games hub card

Design source: `.scratch/design/register-with-partner/partner-flow-screens.html` (artboards `02b`, `03d`, `03e`)

Amends:

- `.scratch/register-with-partner/spec.md` (TEM-207…TEM-210) — Pick a partner and Register the team leave the join sheet
- `.scratch/game-card-side-join/spec.md` (TEM-192) — Join with a partner on the hub card where partner join is offered
- `.scratch/games-hub-tabs-and-cards/spec.md` — hub card CTA only; Home and Group home stay as shipped

This spec does not replace those parents. Unamended Partner registration rules (ADR-0013, vacant-side gate, individual Friendly games only, D1–D9) stay in force.

# Pick a partner screen

## Problem Statement

A User who already has someone to play with still has to open Game home, open the join sheet, choose Join with a partner, then dig through a Search-first list to find a familiar partner. Pick a partner is a nested sheet step, so it never owns the screen the artboard drew. Recents exist as “Played with before” but sit below Search, so a quick pick of someone they recently shared a Game team with is slower than it should be. On the Games hub card they can one-tap a vacant Position for themselves, but there is no Join with a partner control even when a whole side is empty.

## Solution

Give Pick a partner its own App route under Game home. The join sheet keeps Join alone / Join with a partner; the partner option leaves the sheet and opens that screen. Recents from the existing suggestions door are the first, glanceable affordance (horizontal one-tap chips). Search and From your groups remain. Register-the-team review stays on the same route as a second step; commit still calls the existing Partner registration door. On Games hub cards that already one-tap solo Join, show Join with a partner when the Game offers partner join, and send that tap to the new screen.

## User Stories

1. As a User who can register on an individual Friendly game with a fully vacant side, I want Pick a partner to be its own screen, so that choosing a partner has back, title, recents, search, and continue without living inside the join sheet.

2. As that User, I want the screen to live on a real App route under that Game’s home, so that I can open it from Game home or from a card and the browser back stack is a page, not a sheet step.

3. As that User on Game home, I want Join to still open the join sheet’s How do you want to join chooser, so that Join alone and Join with a partner stay visible where they already shipped.

4. As that User tapping Join with a partner in the chooser, I want the sheet to close and the Pick a partner screen to open, so that I do not finish Partner registration inside the sheet.

5. As that User tapping Join alone, I want the existing seat picker in the sheet, so that solo Game admit is unchanged.

6. As that User on a Game with no fully vacant side, I want the sheet to skip the chooser and open the seat picker, so that a half-full Game does not grow a dead-end partner path.

7. As that User on Pick a partner, I want a back control that returns me to the surface I came from (Game home or the Games hub), so that I can abandon the flow.

8. As that User, I want a close control that dismisses to Game home, so that I can leave the flow even when history is empty.

9. As that User, I want the title Pick a partner and the D1 subtitle that both seats are booked now and the partner is in straight away, so that the screen does not lie about confirmation.

10. As that User, I want a seats-open chip and the Game summary row (time, Venue, price when set), so that I still know which Game I am joining.

11. As that User who has recently shared a Game team with other Users, I want those people showcased first as horizontal avatar chips, so that picking a familiar partner is faster than searching.

12. As that User, I want tapping an eligible recent partner to select them (not submit Partner registration), so that a quick pick is one tap to select, then Continue, then Keep/Swap review.

13. As that User, I do not want tapping a recent partner to call Partner registration immediately, so that I still confirm sides on Register the team.

14. As that User looking at a recent partner who is already on the Game, waitlisted, or outside the Game Level range, I want that chip greyed and not selectable, so that ineligible recents stay visible instead of silently missing.

15. As that User with no recent partners, I want the recents showcase hidden, so that Search is the first control.

16. As that User, I want Search after recents, backed by the existing partner search door, so that I can still find a User who is not in recents.

17. As that User, I want From your groups after Search, so that Group members of this Game’s Group remain a section.

18. As that User, I do not want a second vertical Played with before list of the same people as the recents chips, so that recents are not duplicated.

19. As that User with a partner selected, I want Continue with {name} and the caption that no seat is taken until I register the team, so that selection is distinct from Game admit.

20. As that User on Continue, I want Register the team on the same route (second step), with Keep/Swap and Register us as a team, so that I never return to the join sheet to finish.

21. As that User on Register the team, I want in-page Back to Pick a partner, so that I can change the partner without losing the Game.

22. As that User committing Register us as a team, I want both Positions on one fully vacant side booked immediately via the existing Partner registration door, so that ADR-0013 still holds.

23. As that User after a successful Partner registration, I want the Registered toast and Game home in the booked-with-a-partner state, so that I see myself seated next to the partner.

24. As that User when the vacant side is taken while I am on the screen, I want an in-screen error, and if no fully vacant side remains I want to be sent to Game home with a toast, so that I do not dead-end.

25. As a User opening the partner route when the Game no longer offers partner join (full, half-full sides only, cannot register, wrong format, already seated or waitlisted, Soft-archived, cancelled), I want a toast and redirect to Game home, so that a stale deep link recovers.

26. As a User on Games hub looking at an open individual Friendly game I can register for, with at least one fully vacant side, I want Join with a partner on that Game’s card, so that I can start Partner registration from the list.

27. As that User tapping Join with a partner on the card, I want the Pick a partner screen for that Game, so that the card does not admit a mystery partner and does not open the solo side Join.

28. As that User, I still want vacant Positions to one-tap solo Join, so that partner join does not replace TEM-192 side Join.

29. As a User on a card with no fully vacant side, I want no partner CTA, so that a half-full Game only offers solo Join on the remaining Positions.

30. As a User who cannot register, or who is already seated, registered, or waitlisted, I want no partner CTA, so that the card does not offer a door the server would refuse.

31. As a User on a full Game, waitlist card, Americano, Friendly tournament, or team-only card, I want no partner CTA, so that the control stays on individual Friendly games with a vacant side.

32. As a User tapping time, Venue, occupied seats, or other non-CTA card surface, I want Game home, so that the overlay Link still works.

33. As a User tapping Join with a partner, I want no nested button-inside-Link, so that the existing overlay Link plus pointer-events-auto pattern holds.

34. As a User on Home upcoming (hero or Coming up) or Group home, I want those surfaces unchanged in this feature, so that partner join does not invent a second Game card personality.

35. As a User on an individual Friendly tournament, I want the legacy Partner register card unchanged, so that this screen does not pretend to cover that format.

36. As a User on a full Game, I want Join waitlist to stay solo, so that Waitlist-with-a-partner stays unsurfaced.

37. As a developer, I want no new tRPC door whose only job is the partner-join predicate, so that the card derives applicability from list payload sides plus the existing can-register-equivalent.

38. As a developer, I want the existing Partner registration, partner search, and partner suggestion doors called as they are, so that Partner registration rules are not reimplemented.

## Implementation Decisions

- **Route.** Add a dedicated App route under Game home: Pick a partner for one Game. Pattern is a real page (Create Game is the dedicated-screen precedent); the path is Game-scoped because the flow is per Game. Do not add another sheet step.

- **Chrome.** The page owns the viewport: existing picker/review header (back, seats chip, close, title) is the chrome. Hide the generic Game-detail mobile top bar on this route so Back does not skip Game home and land on the Games hub. Hide bottom nav the same way Game home already does, so the sticky Continue footer does not fight it.

- **Back vs close.** Back uses history when present (hub card → hub, Game home chooser → Game home) and falls back to Game home. Close always goes to Game home.

- **Join sheet.** Keep the How do you want to join chooser and its D1 copy. Join alone stays the seat picker. Join with a partner closes the sheet and navigates to the new route. Remove picker and review as sheet steps. Remove the sheet’s Partner registration mutation; the new page owns commit.

- **Review.** Register the team is step 2 of the same route (client state). Do not add a second URL. Do not send the User back into the join sheet. Keep/Swap, seeding from Preferred Position, first fully vacant side, and D1 footer copy stay as shipped.

- **Success.** Toast Registered, invalidate Game home, hub lists, Home, and partner suggestion/search caches, then replace-navigate to Game home so the booked-with-a-partner hero is visible.

- **Recents.** No new door. Render played-with suggestions as a horizontal, one-tap avatar-and-name strip above Search. Same cap and order as the door (most recent shared Game team first, max 20). Ineligible rows stay in the strip, greyed and non-selectable, with the existing reason in the accessible name. Hide the strip when the array is empty. Remove the vertical Played with before list so the same people are not listed twice. Search and From your groups stay. Do not auto-submit.

- **Card CTA.** Only on Game summary card surfaces that already one-tap join from the list — today that is Games hub My Groups and Public. Home upcoming is a reduced Coming up list with no join; do not add a partner CTA there. Group home stays reduced. Do not create a second Game card component.

- **When the card shows Join with a partner.** The same partner-join predicate already used by the sheet: viewer can register, individual Friendly game, at least one fully vacant side. Derive it on the client from the hub row. Do not add a server boolean. Pass an optional partner href into the card; presence of the href is what renders the control.

- **Card layout.** Side Join on vacant Positions is unchanged. Partner control sits in the footer (the slot that currently has no Join game button when the roster is the join affordance). It is a secondary control, not a replacement for side Join. Tapping it navigates to the partner route and must not call seat-register.

- **Overlay Link.** Keep the absolute overlay Link to Game home. Partner control uses pointer-events-auto like side Join and waitlist. Forbidden: nested button inside that Link.

- **Deep link recovery.** The partner page loads Game by-id. If partner join is not offered, or the suggestions door refuses because the caller cannot register with a partner, toast and replace-navigate to Game home. Do not render an empty picker.

- **Vacant-side race.** Keep the existing race helper and in-screen error copy. If a fully vacant side remains, stay on Pick a partner. If not, toast and go to Game home.

- **tRPC.** No new procedure. No schema or migration. No service, repository, or domain-verb twin. Shared glossary modules stay shared (Game admit, seats, register-with-partner guards, partner-join predicate).

- **Copy.** Keep D1. Do not ship artboard copy about partner confirmation, 12h hold, or invite-by-phone.

- **Domain language.** Partner registration, Game team, Position, side, User. Avoid event, club for Community, match for Game, team registration.

## Testing Decisions

- Test external behaviour, not CSS pixels, and not “the page file exists.”

- **Seam 1 (already shipped):** partner-join / vacant-side helpers. Do not re-test the whole matrix unless the predicate gains inputs. Prior art: the Friendly-game partner unit tests.

- **Seam 2 (card CTA):** a small pure helper next to the existing card CTA helpers: partner footer is shown only when primary action is join and a fully vacant side exists; hidden for waitlist, view, register, half-full sides, and no roster. Prior art: game-summary CTA tests and side-join Position tests. Do not add a PGLite test whose only point is that the card navigates.

- **Seam 3 (doors):** partner suggestions already cover recents order, cap, ineligible grey, and From your groups exclusion. Do not add a new suggestions door or a test that only asserts the UI reads the same array. Partner registration and search stay covered by existing PGLite tests.

- **Do not** add component snapshot tests for the screen or card. Manual check: chooser → new screen → recents / search / groups → review → booked Game home; hub card partner CTA vs side Join vs overlay Link; deep link when the side has filled; tournament Partner register card still present.

## Out of Scope

- Partner confirmation, 12h hold, artboards `03f` / `03g`
- Phone invite, Lookup invite as the partner picker, messaging, payment
- Waitlist-with-a-partner
- Retiring the legacy Partner register card / Friendly tournament partner UI
- Home hero, Home Coming up, Group home cards
- A recents door without a Game id, or a server flag whose only job is the partner-join predicate
- Auto-submit of Partner registration from a recents tap
- Win count in recents meta (“6 won”)
- Preferred Position auto-submit on card side Join
- Nested button inside the card overlay Link
- Schema, migrations, new tRPC procedures, service layers

## Further Notes

Settled from shipped code, parent specs, ADR-0013, and the three asks (no live grill):

| # | Decision |
| --- | --- |
| S1 | Dedicated route under Game home, not a sheet step. Review is step 2 on that route. |
| S2 | Recents are a horizontal quick-pick of played-with suggestions. One tap selects; Continue + Keep/Swap still run. |
| S3 | Join with a partner on hub Game summary cards only, navigating to the new screen. Solo side Join stays. |
| S4 | Home upcoming is not a rich join card in the shipped App; do not grow it here. |
| S5 | No new API. Call existing Partner registration doors. |

**Regression risks**

- Card overlay Link: partner CTA must use the same pointer-events-auto pattern as side Join, or the whole card becomes a fight between navigation and buttons.
- Side Join must remain one-tap solo seat-register; partner CTA must not call that door.
- Join sheet must still work for Join alone, including Games that do not offer partner join (chooser skipped).
- Partner-suggestion ineligible rows must remain visible and non-selectable in the recents strip.
- Vacant-side race: gate is computed on open; the side can fill before commit; recover, do not dead-end.
- Game-detail back today treats any Game-home nested path as “back to hub”. This page must not use that generic top bar, or Back from Pick a partner skips Game home.

## Tickets

Implement in order. Ticket 1 is demoable from Game home without the card CTA. Tickets 2 and 3 both block only on 1.

| # | Ticket | Blocked by |
| --- | --- | --- |
| 1 | [TEM-211](https://linear.app/temba-app/issue/TEM-211/1-dedicated-pick-a-partner-screen-for-an-individual-friendly-game) Dedicated Pick a partner screen for an individual Friendly game | — |
| 2 | [TEM-212](https://linear.app/temba-app/issue/TEM-212/2-showcase-recent-partners-for-a-quick-pick) Showcase recent partners for a quick pick | TEM-211 |
| 3 | [TEM-213](https://linear.app/temba-app/issue/TEM-213/3-join-with-a-partner-on-the-games-hub-card) Join with a partner on the Games hub card | TEM-211 |
