# Payment tracking is a ledger, not a checkout

**Status:** accepted.

Organizers collect each player's share of the pitch or court outside Temba, in cash or by transfer,
and lose track of who has paid. The design ("Payments") adds a way to track it on a Game: players say
when they have paid, the Organizer confirms, and a football Game may leave its keepers out.

## Decision

- **Temba moves no money.** Payment tracking records who has paid the Organizer. No provider, no
  charge, no refund. It is unrelated to a Booking's Payment.
- **Opt in at create, only with a price.** `games.track_payments` is set when the Game is made, on
  any format with a Price per player: a Friendly game, a Friendly tournament or a Booking Game.
  Tracking is in force only while the price is above zero, so a Game made free later shows nothing.
  No payment screen or door answers for a Game that does not track.
- **Only a confirmation makes it paid.** A player's claim is its own state (`claimed`) and never
  counts as money in. The Organizer or a Group admin (whoever may organize the Game) confirms it,
  marks money already handed over, sends a claim back with a reason or note, or takes a paid one
  back. No row means not paid: taking back deletes the row.
- **Every change is kept with who made it.** `game_payment_events` gets one row per change (claimed,
  unclaimed, paid, not received, undone) with the actor. It is never rewritten, so deleting the
  state row loses nothing.
- **Changes to one Game's payments run one at a time.** Each door locks the Game row, then reads and
  writes. A player's undo cannot delete a payment confirmed a moment earlier, and Confirm all reads
  the claims it confirms under the same lock.
- **Keepers play free follows the spot until kick-off, then is fixed.** Before `window_start` a
  player is free while their role is keeper. From kick-off, the player who held the spot then stays
  free and nobody else becomes free: a role change after kick-off writes the role held at kick-off
  to `game_players.kickoff_football_role` once, and a player who joined after kick-off never held
  the spot.
- **A recorded payment outlives the exemption.** A player who paid or claimed and then comes to
  play free reads as free, but the record stays, counts as money in, and the Organizer can still
  take it back or send the claim back.
- **What players see of each other is the mark.** `gamePayments.forGame` returns marks and counts to
  everyone who may view the Game. Amounts in and expected, claim times, who confirmed and the
  reminder counts go only to those who may manage. The note on a sent-back claim goes only to its
  player.
- **Notifications.** A claim tells the Game admins once per claim: taking it back and claiming
  again is silent, a new claim after it is sent back tells them again. Sending a claim back tells
  the player. A reminder reaches each player who has not paid at most once a day per Game, never
  the sender, never a player without an account; the button counts only who a press would reach.

## Consequences

- A tracked Game costs one extra read on its page, `gamePayments.forGame`.
- A record left by a player who leaves the Game stays in the table and is not listed; if they
  rejoin, it is theirs again.
- Kick-off is the Game's `window_start`. Moving the window moves when the keeper rule is fixed.

## Considered and rejected

- **Collecting the money in Temba.** Out of scope: the product has no payout account for an
  Organizer, and most groups settle in cash.
- **Keeping an undone payment as a `due` row.** It records only the last change. The event log
  records all of them and keeps the state table to what is true now.
- **Refusing role changes after kick-off.** Players do swap in goal mid-game, and the line-up
  should say who actually played there.
