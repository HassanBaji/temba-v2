# Partner registration books both seats, with no partner confirmation

A User registering onto an individual Friendly game may name a partner and take **both Positions on
one fully vacant side** in a single action. **The partner's seat is booked outright: they are seated
on commit and are never asked to accept.** Whoever registers the pair decides for both of them.

The designed alternative exists and was deliberately not built. The Claude Design canvas for this
flow (`.scratch/design/register-with-partner/`) carries two further artboards — `03f Waiting on
partner` and `03g Partner confirms` — describing a hold: the caller registers, both seats are held
for 12 hours, the partner gets a request, and declining releases both seats. That is a better product
for a stranger you found in a group; it is worse for the common case of two people standing next to
each other agreeing to play, and it puts a pending state in front of every partner registration
before anyone has asked for one. It is deferred until there is evidence people are being seated
against their will.

**No schema change was made for this feature.** Partner registration writes exactly the rows two
independent seat-joins would write — one `game_teams` row for the side, two `game_players`, two
`game_team_players` carrying `left` and `right`. This is the point worth recording: it would have
been easy to encode "always confirmed" into the model (a `confirmed boolean NOT NULL DEFAULT true`,
or a status enum whose only value is `confirmed`), and that is exactly what a later confirmation flow
would have to unwind. Instead the schema says nothing about confirmation at all, so adding it later
is additive — a nullable `game_team_players.confirmed_at`, or a `game_seat_confirmations` table
following the per-User-row precedent of `match_result_confirmations` (ADR-0011), plus a nullable
`game_players.registered_by_user_id` if "who brought whom" is needed. Existing rows read as confirmed
by backfilling `created_at`. No rewrite.

`registered_by_user_id` was likewise **not** added ahead of need. With no confirmation and no
team-level cancellation, nothing would read it, and a column nothing reads is a claim the next
engineer has to disprove before touching it.

The seat semantics are the same as every other seat: leave frees only the leaver's Position, the
remaining User keeps theirs, and the Game team survives as incomplete. A partner registration is not
a **Team** — it creates no persistent partnership, and the `game_teams.team_id` it writes stays
`NULL`.
