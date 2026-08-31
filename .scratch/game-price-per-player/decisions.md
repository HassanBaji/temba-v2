# Game price per player — settled decisions

Status: spec draft — `.scratch/game-price-per-player/spec.md`. No Linear tickets until the spec is approved.

## Settled (round 1)

1. **Optional.** Null = unset. 0 = explicitly free. Required would force junk zeros onto pickup Games and every backfilled row. “Able to input” is a capability, not a mandate.
2. **No currency column.** No currency symbol this slice. Copy says “whole currency units.” **Needs confirmation** if a symbol (e.g. ₪) should appear in labels.
3. **Nullable integer whole units** on Game (`price_per_player`). Matches unused `coaching_session.price`. Stay off `numeric` and off cents. **Needs confirmation** only if a later payments slice needs minor units (a ×100 backfill is possible then; cents now is premature).
4. **Per User occupying a seat** (Game admit), including team-only (a complete Team is two Users). Not per Game team. No `totalPrice` this slice. Copy remains “Price per player” even on team-only.
5. **Editable after create** by organizers (same people as `updateWindow`). Display-only, so no payment lock-in. Existing Games are null; without an editor they could never show a price. Not folded into `updateWindow`.
6. **Display:** Create form + Game home (viewer line + organizer field). Also `GameSummaryCard` and Home hero when set; omit when unset. Pickup / Home / Group lists pick it up via the card. Do not add Venue/Court to cards.
7. **Validation:** Empty → null (omit the key; do not coerce `""` to 0). Integer only; reject decimals and non-numeric. Min 0, max 1_000_000. App `Input type="number"` `step="1"` `min="0"`, same Field/FieldLabel pattern as Venue.
8. **`pricePerPlayer` optional on `games.create`** for every format. App Friendly form sends it. Crafted Americano / tournament clients may send it too.
9. **No payments.** Register, waitlist, Lookup, Invite link, caps, Soft-archive join freeze unchanged. Price does not gate Game admit. No paid flags, no Stripe, no guest pricing.
10. **Copy:** Label **Price per player**. Description: optional, whole currency units, blank = unset, zero = free, Temba does not collect payment. Viewer: omit when null; `Price per player Free` when 0; `Price per player 50` when 50. Cards/hero meta: omit when null; `Free` or `50 / player`. Avoid “registration price” (registration is the open/closed window).
11. **Existing Games:** New nullable column, no default 0, no backfill. Existing rows stay null (omit on display). Organizers can set later.
12. **New field on Game only.** Match has no price columns after migration 0020. Do not revive or dual-write. Later cleanup of `coaching_session.price` is unrelated.

## Glossary (ships with spec approval)

**Price per player**:
The display-only amount one User pays to occupy a seat on that Game. Optional on the Game; zero means free; unset means the organizer did not state an amount. Not a payment, not per Game team, and not a total for the Game.
_Avoid_: fee, cost, entry fee, registration price (registration is the open/closed window), total price, price per team, Match price, player (when you mean User outside this term)

**ADR: no.** Integer whole units on Game is reversible, matches unused `coaching_session.price`, and is not surprising. Implicit currency without a column is deferred, not a locked trade-off. Match-vs-Game was already decided by ADR-0008.

## Ticket sketch (not published)

After spec approval, one vertical ticket:

| # | Title | Notes |
|---|--------|--------|
| 1 | Game price per player: column, create, display, organizer edit | DB Package column + migration; `games.create` + by-id + list payloads + organizer update; Create Game Field; Game home line/editor; `GameSummaryCard` + Home hero. Blocked by: nothing. |
