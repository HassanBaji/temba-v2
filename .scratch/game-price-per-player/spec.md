Status: draft

## Problem Statement

Organizers creating a **Game** cannot record what it costs a person to occupy a seat. Viewers on Game home, Home, public pickup, and Group lists cannot see a **price per player**. The amount is communication only: Temba does not collect payment. games-matches left prices out; the redesign Game card already named the field and then omitted it for that reason.

## Solution

Ship optional **price per player** on Game in the DB Package and App.

The organizer may enter it on Create Game (Friendly game in the App; any format on tRPC). Blank means unset. Zero means free. A positive whole amount is display-only. Organizers may set, change, or clear it after create. Viewers see it on Game home, `GameSummaryCard` lists, and the Home hero when it is set; unset Games omit it. Register, waitlist, and Game invites stay as they are. Price does not gate **Game admit**.

This amends games-matches (it excluded prices) and the redesign Games contract (it told implementers not to surface price). It does not replace those specs. It does not revive dropped contest price columns on **Match**.

Approving this spec approves the Test seams in Testing Decisions. Glossary edits in root `CONTEXT.md` ship in the same planning commit.

## User Stories

1. As an Owner, Admin, or that Club Group’s creator, I want to enter a price per player when I create a Friendly game from the App, so that people who open the Game know what occupying a seat costs.

2. As that organizer, I want the field optional, so that I can create a Game without a price.

3. As that organizer, I want a blank field stored as unset (null), so that “I did not say” is not the same as free.

4. As that organizer, I want to enter 0, so that I can say the Game is free.

5. As that organizer, I want to enter a positive whole amount (for example 50), so that the Game shows that amount per person.

6. As that organizer, I want the Create Game label to be “Price per player”, so that copy matches the glossary and is not “fee”, “cost”, “entry fee”, or “registration price”.

7. As that organizer, I want helper copy that the field is optional, whole currency units, blank means unset, zero means free, and Temba does not collect payment, so that I do not expect checkout.

8. As that organizer, I want the field among Venue, Court, and window, using the same Field / FieldLabel / FieldError pattern as Venue, so that Create Game stays one form.

9. As that organizer, I want invalid input (negative, decimal, non-numeric, above 1_000_000) refused with a field error, so that junk amounts do not persist.

10. As that organizer, I want leaving the field blank still creating the Game, so that price cannot block Venue, Court, or window.

11. As the creator of a Loose Group, I want the same optional price per player field when I create a Game from the App.

12. As an authenticated User creating a groupless Game, I want the same optional field.

13. As a Member who is not Owner, Admin, or that Club Group’s creator, I want creating a Club Group Game to still be refused, so that who may create Games does not change.

14. As a Loose Group member who is not the creator, I want creating a Game to still be refused.

15. As an Owner or Admin of a Soft-archived Community, I want creating a new Club Group Game to still be refused.

16. As a crafted client creating a Friendly game, Americano, or Friendly tournament, I want optional `pricePerPlayer` accepted on `games.create`, so that every format can carry the same display amount.

17. As a crafted client omitting `pricePerPlayer`, I want the Game stored with null, so that crafted create matches a blank App field.

18. As a crafted client sending `pricePerPlayer: 0`, I want that stored as free.

19. As a crafted client sending a negative number, a non-integer, or a value above 1_000_000, I want create refused.

20. As a crafted client sending team-only on a Friendly tournament, I want price per player still meaning per User occupying a seat, not per Team, so that a partnership of two Users is two amounts, not one.

21. As a viewer of Game home, I want to see “Price per player 50” when the amount is 50, so that I know what occupying a seat costs before I join.

22. As a viewer of Game home, I want to see “Price per player Free” when the amount is 0.

23. As a viewer of Game home, I want no price line when the amount is unset, so that historical Games and skipped fields stay quiet.

24. As a viewer of Home upcoming, public pickup, or Group Games, I want `GameSummaryCard` to append `50 / player` or `Free` in meta when set, and to omit that segment when unset, so that list cards stay thin unless there is a price.

25. As a viewer of the Home next-Game hero, I want the same amount shown when set, so that the hero and the upcoming rows do not disagree.

26. As a User looking at a cancelled Game I may still open, I want a stored price still visible, so that cancel does not erase the communication.

27. As a User looking at a Soft-archived Club Group Game I may still open, I want a stored price still visible, and I want register / waitlist / invites to stay closed as today, so that price is not a join door.

28. As a User registering, waitlisting, or accepting a Game Lookup invite or Invite link, I want those actions unchanged by price, so that Game admit is not gated on payment.

29. As a User on a full Game, I want the Waitlist still unbounded FIFO with no paid fast-lane.

30. As an organizer on Game home, I want to set, change, or clear price per player after create, so that I can fill it on Games created before this column and correct a typo without recreating the Game.

31. As an organizer, I want that editor using the same Field pattern, with blank saving as unset, so that I can clear a price.

32. As a User who is not an organizer, I want no price editor, so that only organizers change the amount.

33. As an organizer, I want Venue still immutable and window still editable, so that this slice does not change those rules.

34. As a caller of Game by-id, I want `pricePerPlayer` on the payload (`number` or `null`), so that Game home does not need a second query.

35. As a caller of Home upcoming, public pickup, and Group Game lists, I want `pricePerPlayer` on each Game row, so that cards and the hero can render it.

36. As a User of a Game created before this column, I want that Game unset (null) until an organizer saves a price, so that we do not pretend old Games were free.

37. As a developer migrating, I want a new nullable integer column with no default 0, so that existing rows stay unset.

38. As a developer, I want price stored on Game, not on Match, so that one parent event has one amount and dropped contest columns stay dead.

39. As a User of the App, I want no checkout, no paid badge, no guest price, no currency picker, and no total for the Game, so that this slice stays display-only.

40. As a User on Create Game, I want no Format select and no reintroduction of Individual vs Team-only or public flag, so that this slice only adds price per player to the fields that already exist.

41. As a reader of CONTEXT.md, I want **price per player** defined as the display-only amount one User pays to occupy a seat on that Game, so that “player” here is not a synonym for User elsewhere and “registration price” is not used.

## Implementation Decisions

- Schema, migrations, and kit live in the DB Package. App tRPC and dashboard UI stay in the Temba App. No new Package. No money library. Follow existing Drizzle style: uuid PKs, timestamps. Do not edit existing migrations. Clerk remains the only identity provider. Who may create Games, join gates, Game admit, Waitlist, invites, Positions, padel-only UI, Friendly-only App create, Venue/Court rules, and Soft-archive stay as shipped.

- **Game.pricePerPlayer** (`price_per_player`): nullable integer, whole currency units. Null = unset. 0 = free. Positive = display amount per User occupying a seat. No currency column. No `totalPrice`. Not on Match. Not on Game team.

- **Migration:** `ALTER TABLE games ADD COLUMN price_per_player integer;` nullable, no default, no backfill. Existing Games remain null. Do not fail if Games exist.

- **Create tRPC (`games.create`):** optional `pricePerPlayer`: integer, min 0, max 1_000_000. Omit or null → store null. Accepted on Friendly game, Americano, and Friendly tournament. Team-only does not change the unit (still per User). Do not change Venue/Court, format, caps, or `isPublic` behavior. App Create Game still sends Friendly game, individual, `isPublic: false`.

- **Update tRPC:** new organizer mutation to set `pricePerPlayer` (integer 0…1_000_000 or null to clear). Same organizer set as `updateWindow` (Club Group: Group creator and Community Owner/Admin; Loose Group: Group creator; groupless: creator). Do not fold into `updateWindow`. Non-organizers refused. Cancelled Game: still allow organizers to edit price this slice (display-only; keep the implementation consistent with window unless window already refuses on cancel — then match window). Soft-archived Club Group Game: organizers may still edit price (join doors stay frozen).

- **Read payloads:** `games.byId` includes `pricePerPlayer`. `users.home` upcoming Games, `games.listPublicPickup`, and `groups.byId` upcoming/history include `pricePerPlayer`. List helpers that only compute liveness do not need the column for sorting.

- **UI — Create Game:** optional `Input type="number"` after Court, before window. Label “Price per player”. FieldDescription as story 7. Empty string is not sent (omit). Reuse `Field`, `FieldLabel`, `FieldError`, `FieldDescription`. Wire `pricePerPlayer` in `focusFormFailure`. Do not add Format select, Individual vs Team-only, or public flag.

- **UI — Game home:** viewer line with Venue when set (stories 21–23). Organizer card: Field + save, blank clears. Non-organizers see the line only.

- **UI — lists:** extend `GameSummaryCard` with optional `pricePerPlayer`. Append meta `Free` or `{n} / player` when not null. Home upcoming, Games hub pickup, Group Games tab pass the prop. Home hero shows the same when set. Do not add Venue or Court to cards.

- **Formatting:** one small helper next to existing Game start formatters. Null → no string. 0 → `Free`. Positive → decimal-free integer text. No `Intl.NumberFormat` currency. No ₪/€/$ this slice.

- **Authorization (product):** create and update price = people who may create / organize that Game today. Viewing price = people who may already see that Game.

- **ADR:** none. Integer whole units on Game is the obvious display-only column; Match leftovers are gone.

- **Amends:** `.scratch/games-matches/spec.md` payment unread bullet and Out of Scope “Payment, prices, guests” — prices may now display; payments remain out. `.scratch/redesign/games-and-rankings-contract.md` field 10 and `.scratch/redesign/spec.md` price row — surface Game.pricePerPlayer when present; still no payments. Does not replace those specs. Does not reopen friendly-only-ui or game-create-venue-court except to add this field beside Venue/Court.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist, plus the same tRPC writes a crafted client can still make. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): an organizer can create a Friendly game from the App with an optional price per player, see that amount on Game home and on list cards / Home hero, and change or clear it later — without checkout, without gating Game admit, without a currency picker, and without writing price on Match.

If you implement this spec, you implement these seams:

- Create Game: optional Price per player Field; blank creates unset; 0 persists free; 50 persists 50; invalid refused; Venue/Court/window still required as today
- Game home shows Free / 50 / omits unset; organizer can set, change, and clear; non-organizer has no editor
- Home upcoming `GameSummaryCard`, public pickup cards, Group Games cards, and Home hero show the amount when set and omit when unset
- `games.byId` and list payloads include `pricePerPlayer`
- Crafted create: optional on Friendly game, Americano, and Friendly tournament; omit → null; 0 → free; out-of-range refused
- Team-only crafted create still stores per-User amount, not a Team total
- Existing Games (null column) omit price until an organizer saves
- Register, waitlist, Lookup, Invite link, caps, cancel, Soft-archive join freeze, who may create, Venue immutability, window edit, Friendly-only App create, and Route `/public` still behave as their specs
- Match rows gain no price columns; create does not write leftover contest names

Manual check: existing Community, Group, Team, Venue catalog, login, Invites, Home, and Soft-archive flows still work.

### Modules under that seam

DB Package Game.pricePerPlayer and new migration; `games.create` / by-id / lists / organizer update; App Create Game Field; Game home line and editor; `GameSummaryCard` and Home hero — only as they affect the flows above.

### Prior art

Create Game Venue/Court Field pattern. Optional Venue latitude (`parseOptionalCoord`, blank persists null). `updateWindow` organizer card. `GameSummaryCard` meta join. games-matches Testing Decisions (no runner). No automated tests.

## Out of Scope

- Payments, checkout, Stripe, invoices, refunds, paid flags, “has paid”
- Gating Game admit, Waitlist, or invites on price
- Guest pricing; splitting court hire; total price for the Game
- Currency column, currency picker, currency symbol in copy (unless Q2 is confirmed otherwise)
- Decimal / minor-unit storage
- Price on Match; reviving `games_legacy` / `total_price` / `paid_amount`
- App format picker; Individual vs Team-only or public flag on Create Game
- Venue/Court on list cards; visual redesign of Game home
- Changing who may create Games
- Coaching session price
- CI; test runner
- A new ADR

## Further Notes

Glossary: apply the Language patch in root `CONTEXT.md` in the same planning commit (**price per player**). Architecture: ADR-0008 unchanged (Game is the parent; price lives on Game, not Match).

Settled grilling: `.scratch/game-price-per-player/decisions.md`.

**Amends** `.scratch/games-matches/spec.md` (prices may display; payments stay out) and `.scratch/redesign/games-and-rankings-contract.md` field 10 / redesign spec price row (surface when Game.pricePerPlayer is set). Same amend pattern as `.scratch/game-create-venue-court/spec.md`. Does not replace those specs.

Create Game on current `dev` has Venue, Court, and window only (always Friendly game, individual, not public). Implementers add price per player and must not reintroduce a Format select.

## Comments

Draft from `/planner`. Two decisions flagged needs-confirmation in `decisions.md`: implicit currency with no symbol this slice (Q2), and integer whole units rather than cents (Q3). Linear tickets wait on spec approval.
