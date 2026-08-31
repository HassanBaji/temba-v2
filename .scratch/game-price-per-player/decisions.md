# Game price per player — settled decisions

Status: spec draft — `.scratch/game-price-per-player/spec.md`. No Linear tickets until the spec is approved.

## Settled (round 1)

1. **Optional.** Null = unset. 0 = explicitly free. Required would force junk zeros onto pickup Games and every backfilled row. “Able to input” is a capability, not a mandate.
2. **No currency column.** No currency symbol this slice. **Confirmed (recommended).** Display is `50.00` / `12.50` / `Free`, not `₪50.00`.
3. **Nullable integer minor units (cents)** on Game (`price_per_player_cents`). **Confirmed: allow cents.** App and organizer fields accept major units with up to two decimal places (`50`, `50.5`, `12.50`); persist `5000` / `5050` / `1250`. Stay off `numeric` and off JS floats at the tRPC boundary (`pricePerPlayerCents` integer). Max `1_000_000.00` major units (`100_000_000` cents). More than two decimal places refused.
4. **Per User occupying a seat** (Game admit), including team-only (a complete Team is two Users). Not per Game team. No `totalPrice` this slice. Copy remains “Price per player” even on team-only.
5. **Editable after create** by organizers (same people as `updateWindow`). Display-only, so no payment lock-in. Existing Games are null; without an editor they could never show a price. Not folded into `updateWindow`.
6. **Display:** Create form + Game home (viewer line + organizer field). Also `GameSummaryCard` and Home hero when set; omit when unset. Pickup / Home / Group lists pick it up via the card. Do not add Venue/Court to cards.
7. **Validation:** Empty → null (omit the key; do not coerce `""` to 0). Parse major-unit text to cents; reject negative, non-numeric, more than two decimal places, and above `1_000_000.00`. App `Input type="number"` `step="0.01"` `min="0"`, same Field/FieldLabel pattern as Venue.
8. **`pricePerPlayerCents` optional on `games.create`** for every format. App Friendly form converts the Field to cents. Crafted Americano / tournament clients may send cents too.
9. **No payments.** Register, waitlist, Lookup, Invite link, caps, Soft-archive join freeze unchanged. Price does not gate Game admit. No paid flags, no Stripe, no guest pricing.
10. **Copy:** Label **Price per player**. Description: optional, up to two decimal places, blank = unset, zero = free, Temba does not collect payment. No currency symbol. Viewer: omit when null; `Price per player Free` when 0; `Price per player 50.00` / `12.50` when set (always two fraction digits). Cards/hero meta: omit when null; `Free` or `50.00 / player`. Avoid “registration price” (registration is the open/closed window).
11. **Existing Games:** New nullable column, no default 0, no backfill. Existing rows stay null (omit on display). Organizers can set later.
12. **New field on Game only.** Match has no price columns after migration 0020. Do not revive or dual-write. Later cleanup of `coaching_session.price` is unrelated.

## Settled (round 2)

13. **Q2 confirmed:** implicit currency, no symbol this slice.
14. **Q3 confirmed: allow cents.** Integer cents in the DB Package and tRPC, not `numeric(10,2)`, not whole units. UI talks in major units.

## Glossary (ships with spec approval)

**Price per player**:
The display-only amount one User pays to occupy a seat on that Game. Optional on the Game; zero means free; unset means the organizer did not state an amount. Stored as integer cents; shown with two decimal places and no currency symbol. Not a payment, not per Game team, and not a total for the Game.
_Avoid_: fee, cost, entry fee, registration price (registration is the open/closed window), total price, price per team, Match price, player (when you mean User outside this term)

**ADR: no.** Integer cents on Game is the usual way to keep two decimal places without `numeric` or floats. Implicit currency without a column is deferred, not a locked trade-off. Match-vs-Game was already decided by ADR-0008.

## Ticket sketch (not published)

After spec approval, one vertical ticket:

| # | Title | Notes |
|---|--------|--------|
| 1 | Game price per player: column, create, display, organizer edit | DB Package `price_per_player_cents` + migration; `games.create` + by-id + list payloads + organizer update; Create Game Field in major units; Game home line/editor; `GameSummaryCard` + Home hero. Blocked by: nothing. |
