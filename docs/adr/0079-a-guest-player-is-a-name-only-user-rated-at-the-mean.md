# A Guest player is a name-only User, rated at the mean of the others

**Status:** proposed (draft for the owner's review). Spec: `.scratch/guest-players/spec.md`. Builds on [ADR-0042](./0042-an-unclaimed-player-is-a-user-without-an-account.md).

Organizers book a court with three friends and a fourth whose number they don't have, or who will never join Temba. Adding by phone (ADR-0042) needs a number. Without one, the Game cannot record its Match.

## Decision

- **A Guest player is a `user` row with `guest_at` set.** It also has `added_at`, `added_by_user_id` and no clerkId, so the Unclaimed predicate in `unclaimed-players/is-unclaimed.ts` covers it: it is never found by Lookup invite or Partner search, never sent a Notification, and never a required Match result confirmer. A check, `user_guest_has_no_account`, keeps a Guest player without a phone, email or clerkId, so no sign-up can claim it.
- **One row per add.** A Guest player belongs to the Game it was added to. Adding "Fahad" twice makes two rows.
- **Organizers add one by name only**, through `games.addGuestPlayer`. It takes the same placement as `addPlayerByPhone` (seat, tournament side or Football role) and seats through the same `organizer_add` door, so its timing, capacity and Group Game rules are those of an Organizer add. It never writes `group_members`.
- **A Guest player has no Rating.** On a Rated Match, each Guest player plays at the mean μ, φ and σ of the Users with an account in that Match (`guestStandInState` in `packages/api/src/ratings/guest-stand-ins.ts`). Those Users' Temba Ratings and Group Levels move as usual; the Guest player gets no rating event. A Match of four Guest players rates nobody.
- **Shown at the mean band.** `games.byId` seats and the football board give a Guest player the mean Level band of the other players in the Game (`guestStandInBand`), so Make teams balances them at the average and the line-up shows a Level.
- **Renamed and removed like an Unclaimed player**: `users.renameUnclaimedPlayer` under the same rule, and the Organizer kick door.
- **Clients mark it** with a dashed avatar and the word Guest, and open nothing when a player taps it.

**Considered Options**: a nullable name on `game_players` with no User (every seat, Match, confirmation and stats reader joins `user`, as ADR-0042 already found); an Organizer-picked Level for each guest, as in the design (the owner chose name only and the mean, so nobody types a number that moves real Levels); leaving Levels unmoved on a Match with a guest (the owner wants those Matches to count).

## Consequences

- A Match with a guest moves real Levels. A strong player partnered with a weak guest is expected to do as well as if the guest were average, and loses Level for it. A guest who is far from average moves everyone by more than they earned, on the Organizer's choice to record the Match.
- The Unclaimed predicate now also means "Guest player". Code that treats Unclaimed players as people to claim (`resolve-phone-player`, `merge-into-account`) works only by phone, which a Guest player never has.
- A Guest player row stays after a kick, for the Matches that reference it.
- Turning a Guest player into a real player (the design's Invite to Temba) is not built. It would attach a phone to the row and make it an Unclaimed player.
