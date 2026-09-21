# Allow registering alone — settled decisions

Status: requirements settled across three grilling rounds. Spec published.
Spec: `.scratch/tournament-allow-registering-alone/spec.md`

Amends: `.scratch/friendly-tournaments/spec.md` (decisions 9, 26),
`.scratch/friendly-tournament-redesign/spec.md` (create “How people join”;
Start a team on your own), `.scratch/register-with-partner/spec.md` (D3/D4),
`.scratch/individual-game-seats/spec.md` (leave / Waitlist on this flag),
`.scratch/games-matches/spec.md` (tournament create no longer offers `team_only`).
Note on ADR-0013 (exception, not a reversal). ADR-0017 / ADR-0018 stay closed.

## Round 1

1. **“Matchmaking” is the Friendly-game join sheet.** Join alone (`registerSeat`)
   or Join with a partner (`registerWithPartner`). Ad-hoc Game team, not a
   persistent Team, not a matcher.
2. **Tournament-only.** Friendly games unchanged.
3. **Replace** Individual seats vs Complete Teams on tournament create. Copy:
   **How people join** → **Alone or with a partner** (default) vs **With a
   partner only**. New tournaments always `registration_mode = individual`.
   Do not add a third option. Do not reuse `team_only`.
4. **Default = allow alone.** Partner-required is opt-in.
5. **Immutable after create**, same as today’s mode.
6. **Partner-required = pairs-only** onto fully vacant sides. `registerSeat`
   refused. No Half teams at join. Merge unused there.
7. **Allow-alone tournaments get both Friendly-game doors.** Partner-required
   skips Join alone and opens Pick a partner.

## Round 2

8. **Pre-draw leave or kick** on partner-required **removes the whole Game
   team** (both Users). Allow-alone and Friendly games keep leave-only-the-leaver.
   After the draw: self-leave frozen; organizer kick stays the withdrawal door.
9. **No Waitlist** on partner-required. `registerWithPartner` when full
   **refuses** (does not enqueue two solo rows). Allow-alone keep solo Waitlist.
10. **Refuse Lookup** on partner-required. Allow-alone keep Lookup.
11. **Invite link still mints and shares.** Accept does not solo-seat; the
    invitee uses Partner registration. Do not copy Team two-consent. Allow-alone
    keep seat-pick accept.
12. **Storage:** `games.allow_solo_register` boolean, `NOT NULL DEFAULT true`.
    Existing rows stay allow-alone, no backfill. Only `createTournament` may
    write `false`. Friendly games, Americano, leftover `team_only` ignore it.
    Glossary: **Allow registering alone**.
13. **Leftover `team_only` Pool tournaments** keep Register Team / no Lookup /
    two-consent Invite link. `createTournament` stops accepting `team_only`.
    Do not change `games.create` in this slice.

## Round 3

14. **Refuse `moveSeat`** on partner-required (server + hide UI). No pair-move.
15. **Defense in depth:** hide merge banner/drawer; `mergeHalfTeams` refuses;
    early Pool draw unchanged (≥4 complete Game teams, refuse while any Half
    team exists); after-draw withdrawal unchanged; Waitlist promote must not
    solo-seat; crafted `registerSeat` (including leftover occupy) stays refused.
16. **Invite landing:** no seat grid, no auto-accept, no waitlist-from-accept.
    Preview; signed-in CTA goes to Game home with Pick a partner open.
    `acceptInviteLink` with or without a seat refuses to seat.
17. **Copy:** Allow-alone join sheet starts with Join alone / Join with a
    partner. Partner-required skips that chooser. Hide Sit with someone, Start a
    team on your own, Take seat, Join waitlist. Vacant-side race copy must not
    say Join alone. Leave/kick confirm says the partner is unseated too.
