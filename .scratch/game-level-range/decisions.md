# Game Level range — settled decisions

Status: spec published — `.scratch/game-level-range/spec.md` (ready-for-agent). Tickets: [TEM-130](https://linear.app/temba-app/issue/TEM-130/optional-level-range-on-game-columns-create-display-organizer-edit) → [TEM-131](https://linear.app/temba-app/issue/TEM-131/gate-individual-game-admit-requestapprovereject-game-home-ui) → [TEM-132](https://linear.app/temba-app/issue/TEM-132/partner-and-team-only-level-gate) and [TEM-133](https://linear.app/temba-app/issue/TEM-133/lookup-waiver-invite-link-gate-preview-promote-grandfather-lifecycle). Frontier TEM-130.

## Settled (planner lock, no interactive grill)

1. **Continuous Level, not bands.** Inclusive min/max, one decimal, matching You. Bands stay labels.
2. **Optional.** Both null = no gate. Min-only / max-only / both. Refuse min > max. `0.0` is a bound, not unset.
3. **Integer tenths on Game** (`level_min_tenths` / `level_max_tenths`, 0…70). Same integer-boundary idea as `pricePerPlayerCents`. Compare **displayed** tenths (`formatLevel`), so D3 midpoint 0.35 gates as 0.4.
4. **Organizer set** (not `createdBy` only). Same people as window / price / kick / invites.
5. **No Rating = fail** when a range is set. Do not invent 3.0. Unset range does not require a Rating. **0.0–7.0 still requires a Rating.**
6. **Provisional ignored** by the gate. Idle inflation does not change μ.
7. **Game.sport Rating.** App padel-only.
8. **Approve = waiver, not seat.** Community contrast is intentional. Reject may re-request. Ignore = pending. No message, no expiry. One row per Game+User; approved **is** the waiver.
9. **Lookup send upserts approved waiver.** Revoke does not un-waive. Invite link is still gated.
10. **Organizers bypass for themselves only**, not partners.
11. **Enqueue gated; promote grandfathered.** Tightening does not kick. Leave-then-rejoin re-checks.
12. **Request UI on Game home** (+ Invite preview with optional token). Hub cards: View, not a new Request CTA. Reuse `RequestRow`.
13. **Editable** like price. Cancelled refuses edit (shipped price/window). Soft-archive allows edit, join doors frozen.
14. **Copy:** Minimum Level / Maximum Level; viewer `Level 3.0–4.5` / `Level 3.0+` / `Level 4.5 and under`; CTA **Request to play**.
15. **No ADR.** Waiver-not-seat is surprising vs Community but easy to reverse. Integer tenths follow price-per-player cents. Range-on-Game follows ADR-0008. Glicko/Level map stays ADR-0009.

**App min/max UI (user override):** Organizer Create/Edit uses a Level band `<Select>` mapping to tenths. Storage and admit-gate tenths are unchanged.

## Glossary (ships with spec approval)

**Organizer**, **Game Level range**, **Game Level range request**, **Game Level waiver** in root `CONTEXT.md`, plus Avoid patches on Venue link request and Game admit.

## Risks

- `registerSeat` waitlists on full **before** `admit`; easy to miss the gate. Spec calls this out; ticket 02 must close it.
- Displayed-Level rounding (0.35 → 0.4) will surprise anyone who gates on band midpoints. Tests must lock it.
- Lookup-send waiver + no un-waive means an accidental invite is a durable exception; kick after sit is the v1 undo.
- Ticket 01 is display-only until 02; orchestrator must not stop at 01 in production.
- Hub `canRegister` needs the viewer’s Rating + waivers or Join will show and then fail.
- Groupless Invite request needs `inviteToken`; omitting it 404s Game home.

## Unchanged

Join gate, caps, close/reopen, cancel, kick, leave, move seat, price per player, Venue immutability, format/public/mode immutability, Lookup/Invite token TTL, team-only Lookup refusal, pair-consent, Soft-archive freeze, padel-only UI, Friendly-only App create, You self-declare UI, Community join requests, Glicko-2.

**Known shipped quirk (do not fix here):** `games.create` for Americano/Friendly tournament persists `registrationMode` individual even if the client sent `team_only`. Team-only remain a live admit path for existing rows; ticket 03 still gates them.
