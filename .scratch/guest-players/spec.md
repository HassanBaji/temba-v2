Status: built on branch `claude/gifted-brahmagupta-5ehno5`, waiting for the owner's review. No Linear tickets yet. ADR-0079 is a draft.

# Guest players: Organizers add someone to a Game by name only

## 1. Problem

The owner's ask:

> Allow organizers/admins to add guests to the games just by name, and calculate levels for players based on any guest player being an average level of the players involved.

The design ("Guest players", 1a to 1e) adds a Guest tab to Add a player. Two of its choices are overridden by the ask above:

- **No Level picker.** The design has the Organizer choose a guest's Level. The ask says name only.
- **Levels move.** The design leaves every Level unmoved when a guest plays. The ask rates the Match, with each guest counted at the average.

## 2. Decisions

- **G1. Who adds.** An Organizer of the Game, which on a Group Game includes the Group approvers and Appointed Organizers (`isGameOrganizer`). Not on a Challenge Game.
- **G2. Formats and timing.** The same as an add by phone: padel Friendly game (seat), Americano (roster), Friendly tournament (side), football (Football role and position), Booking Game. Refused when full, after a completed Match, after a posted Pool draw, or on a cancelled Game.
- **G3. Model.** A `user` row with `guest_at`, `added_at`, `added_by_user_id` and a name; no phone, email or clerkId (ADR-0079). One row per add.
- **G4. Rating.** On a Rated Match each guest plays at the mean μ, φ and σ of the Users with an account in it. Only those Users move, on Temba Ratings and Group Levels alike. Four guests rate nobody.
- **G5. Display.** A dashed avatar and the Guest tag. Seats and the football board show the mean Level band of the other players in the Game, which is also what Make teams balances on. Players tap a guest and nothing opens; the Organizer gets the player sheet with Edit name and Kick, without a profile link. A guest has no Player profile (`mayViewPlayer` refuses one), never appears as a profile's partner, and is linked nowhere, including Match history and tournament sides.
- **G5a. Marks.** A guest is not a Match participant for Marks: they give and receive none and are never MVP.
- **G6. Counts.** The Match counts for every User's record. Group Standing ranks Group members only, so a guest is never in it.
- **G7. Not built.** Invite to Temba (turning a guest into a real player), Move from the guest menu (Edit teams already moves any player), "has played N games as a guest", and an Organizer-chosen Level.

## 3. Doors

- **New:** `games.addGuestPlayer` `{ gameId, name, seat?, side?, football? }` returns `{ userId, name }`.
- **Changed, additive:** `games.byId` and `games.footballBoard` players gain `guest: boolean`. For a guest, `unclaimed` is false and `levelBand` is the stand-in band. Match slot members (`listMyMatchHistory`, `groups.byId` played rows) and Player profile match players gain `guest`.
- **Reused:** `users.renameUnclaimedPlayer`, `games.kick`.

## 4. Tests

- `packages/domain/src/guest-player.test.ts`: the stand-in band.
- `packages/api/src/ratings/guest-stand-ins.test.ts`: the stand-in state, and one, two and three guests in a Match.
- `packages/api/src/routers/games/addGuestPlayer.test.ts`: the row, no Rating or membership or Notification, the guest flag and band on `byId`, a new row per add, the organizer rule, refusals, rename, search exclusion, kick, football.
- `packages/api/src/ratings/rated-match-with-guest.test.ts`: Temba events for the three Users only, equal to `rateDoublesMatch` with the guest at the mean; Group Levels likewise; the guest in Match history, with no profile and no Marks.
