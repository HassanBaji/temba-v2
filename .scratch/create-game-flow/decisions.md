# Create game flow: decisions

Settled with the product owner on 2026-09-22 while planning `spec.md`.

1. **Format picker.** Show Pools only. No picker until a second format ships. This follows ADR-0017
   ("no picker with dead options"). Rounds (05c) is out of scope. Knockout stays deferred.
2. **Rating.** Friendly tournaments stay rated. The design's "Friendly, no rating change" copy is
   wrong. Both type cards say "Counts for your rating".
3. **Fields kept from today's tournament create:** Name, Who can take a seat (`isPublic`), and How
   people join (`allowSoloRegister`, TEM-256, already shipped).
4. **One-day only.** "A few weeks" is removed. Friendly tournaments are always a one-day event.
   `createTournament` refuses windows longer than 24 hours.
5. **Game length.** Stored per tournament (`games.match_minutes`). Suggestion chips are 20 / 30 / 45
   min, plus a custom value (10–120, multiples of 5). Set at create only.
6. **Courts.** The Organizer picks named Courts (multi-select chips), not a Court count. No schema
   change for Courts.
7. **Organizer seat.** Create does not seat the Organizer. The review shows "4 open seats".
8. **Routes.** One route (`/dashboard/games/new`) and one Create action. `/new-tournament` redirects
   with `type=friendly_tournament`.
9. **Copy.** Use glossary terms (Friendly game, Price per player, Game teams). The exception is Pools,
   which are labelled "groups" **everywhere in the UI**. Code, schema, and the CONTEXT.md term stay
   `Pool`, and CONTEXT.md records the display label.
10. **Tournament finish time.** Manual finish is kept. The schedule line warns on overrun, as
    `oneDayFit` does today.
11. **Dropped design extras:** Venue distance and usual price, Group member count, and the "Sign up
    closes" date.
12. **Price suggestions.** Free, 3.500, 4.250, 4.500, 5.250, 6.000, 6.500, 7.000, 7.500 BD. Each chip
    fills the input, and the input stays editable.
13. **Level range chips** use the existing seven display bands (D, D+, C, C+, B, B+, A). The design
    shows six.
