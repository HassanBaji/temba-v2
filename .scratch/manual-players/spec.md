Status: approved on 2026-10-28. Every decision in section 2 was accepted by the product owner as recommended, except D22 (no daily cap on adds).

Tickets: created in Linear (section 10 maps each to its id). Blocking edges are native Linear relations.

# Manual players: Organizers add people by phone and name

## 1. Problem

The product owner's ask:

> Allow manual players addition in groups and games. The organizer can add the players with their phone number and name. If the player exists, link them to the game. If they don't, keep it saved based on phone number, and when they sign up they should be able to find it and view previous game history as well.

Today every way onto a Game or Group needs the person to hold a Temba account and act: register, accept a Lookup invite, open an Invite link. A padel Organizer who books four friends, two of them not on Temba, cannot record that Game. Its Matches, Sets and ratings have nowhere to go.

## 2. Decisions

**Model**

- **D1. An Unclaimed player is a `user` row with no Clerk account.** It is identified by an E.164 phone number. Every seat, membership, Rating, Match result and Standing query keeps working unchanged. Rejected: a separate table with nullable links on every seat and membership table, which touches every history and stats query. Recorded as ADR-0042.
- **D2. One Unclaimed player per phone.** The first name entered stays. A later Organizer who types the same number sees "Already on Temba as Ali (no account yet)" before confirming.
- **D3. The phone is assembled with `assembleE164` from `@repo/domain/phone-number`.** Only the supported calling countries are accepted.

**Adding**

- **D4. Who may add.** On a Game, its Organizers, which includes a Booking Game's holder. On a Group, its Group approvers.
- **D5. Club Groups.** A Community Owner or Admin may add an Unclaimed player to a Club Group. The add also creates their Member seat on the Community, the same auto-admit their Lookup invites already do. The Club Group creator may only add Unclaimed players who are already Community Members. Every add is refused while the Community is Soft-archived.
- **D6. When the phone matches a User with an account, the Organizer first sees their name** ("This is Ahmed Ali (has an account)"). On confirm:
  - **Game:** the User is seated straight away and gets a Notification, as with Partner registration (ADR-0013). They may leave as usual.
  - **Group:** the add sends a Lookup invite, which they must accept. Group membership is standing, so it needs consent.

  Lookup search already reveals names by phone, so this exposes nothing new.
- **D7. Starting Level.** When adding an Unclaimed player, the Organizer picks their starting Level from the Onboarding questionnaire choices:
  - **Padel:** a Level band, or **Not sure** (D+, the default).
  - **Football:** Beginner, Casual, Competitive or Pro, defaulting to Beginner.

  This writes the Rating through the same one-time self-declare onboarding uses (`selfDeclareRating`). The Organizer picks no Level for a User who already has an account. A Level setter may still correct it with a Level override.
- **D8. Football role.** The Organizer picks keeper or outfield and a Preferred football position. The default is outfield with no position. After claiming, the player may change it under the usual rule (until the Score is in).
- **D9. Group Games don't require Group membership for an Organizer's add.** This applies to Unclaimed players and existing Users alike. The add seats them on the Game only and never adds them to the Group. They take part in that Game's Matches. Standing ranks only Group members, so they're not in it unless they're members.
- **D10. Formats and timing.** Supported formats:
  - padel Friendly game: the Organizer picks the side and Position
  - Americano: Roster registration
  - Friendly tournament: alone as a Half team, or as a pair, before the Pool draw is posted
  - football Game: Roster registration with a Football role
  - Booking Game

  Adds are allowed until the Game has a completed Match (and, for a tournament, until the Pool draw is posted), whether registration is open or closed. Adds are refused on a cancelled Game.
- **D11. Capacity and gates.** An add counts against players allowed and is refused when the Game is full; there is no Waitlist entry for a manual add. The Game Level range doesn't apply, since the Organizer is choosing on purpose.
- **D12. One player per submit.** An "Add player" sheet asks for phone, name, Level, and the seat or role where relevant. It stays open for the next player.

**While unclaimed**

- **D13. Unclaimed players are rated like anyone else in Rated Games.** The history they claim includes the Level it earned.
- **D14. Match result confirmation.** Only seated Users with an account are required confirmers. If a side has no account holder, an Organizer's confirmation counts for that side. Football's "one player from each side" rule reads the same way. This applies to padel and football Matches alike.
- **D15. Where they show up.**
  - **Shown:** rosters, seat diagrams, Group member lists, member counts and Standings, with a "Not on Temba yet" mark. The mark is a hairline-outlined label (black and white, no accent). Tapping one opens their Player profile under the usual visibility rule.
  - **Never shown:** Lookup invite search, Partner search and Partner suggestions.
  - **No Notifications:** they never receive one.
- **D16. Phone visibility.** Only people who could add them see the phone: Organizers and Group approvers on a Game or Group the player is on. It is masked, as "+973 •••• 4408". Members never see it.
- **D17. Fixing mistakes.**
  - **Name:** any Organizer or Group approver of a Game or Group the player is on may correct it while the player is unclaimed.
  - **Phone:** never editable. A wrong phone is fixed by removing the player and adding them again. Editing would quietly hand the history to whoever owns the new number.
- **D18. Removing.**
  - **From a Game:** the existing Organizer kick door, whose rules apply unchanged.
  - **From a Group:** a new Remove door for Group approvers, limited to Unclaimed players. Removing account holders stays out of scope.

  Past Matches stay in history. An Unclaimed player with no seats or memberships left keeps their row, so the number can still claim it.

**Claiming**

- **D19. The claim at sign-up is automatic** when the new account's Clerk primary phone is *verified* and matches an Unclaimed player's phone. The SMS code proves ownership. Today's sync also links an unverified phone; that is tightened to verified only. The Clerk name replaces the name the Organizer typed. The Onboarding questionnaire still runs and keeps any Rating that already exists (it already skips the declare for a sport that has one).
- **D20. "We found your history".** After the claim, one in-app Notification reads "We linked N Games played under your number" and opens Match history. Home, Last 10, All time and Group memberships just include the history.
- **D21. An existing account that verifies the same phone later is merged.** This covers someone who signed up with email while an Unclaimed player holds their number. Rules:
  - **Same Game, both seated:** the account's seat stays and the Unclaimed seat is dropped. Completed Matches stay as recorded.
  - **Rating per sport:** the Rating with more Rated Matches wins, and the account's wins a tie. The other is discarded, never averaged.
  - **Group and Community memberships:** combined. Where both are in one Group, that Group's member stats are recalculated from Matches.
  - **Execution:** one transaction, run from the Clerk sync, leaving an audit record. It runs on `user.updated`, and on `user.created` when the account matched by email.
- **D22. "That wasn't me".** After claiming, the player can leave upcoming Games and Groups as usual. Past Matches go through the existing wrong-score report, and support handles anything beyond it. There is no "Not me" door and no daily cap on adds in v1 (section 12).

**Delivery**

- **D23. Each ticket ships the API, the web screens and the mobile screens together.** The Venue console isn't involved.
- **D24. The API change is additive only.** New procedures and optional output fields. No procedure path is renamed.

## 3. Glossary and ADR

- **Written with this spec:**
  - `CONTEXT.md`: the **Unclaimed player** term, an edit to **User**, and an avoid-note on **Guest**.
  - `docs/adr/0042-an-unclaimed-player-is-a-user-without-an-account.md`.
- **Left to the tickets that change the behaviour:**
  - **Match result confirmation:** MP-4 rewords it to "every seated User with an account".
  - **Organizer** and **Group approver**: MP-2 and MP-5 add "add players by phone".

## 4. What the codebase already gives us

- **`user.clerk_id` is nullable** and `user.phone_number` is unique. The `user_email_or_phone_number` check is met by a phone alone.
- **`upsertUserFromClerk` already falls back by phone** (`packages/api/src/auth/sync-clerk-user.ts`). It tries clerkId, then email, then phone, and attaches to a row without a clerkId. Two gaps:
  - It links by phone whether or not Clerk verified it.
  - On `user.updated`, a phone held by another row is silently dropped (`availablePhoneNumber`). That's the case D21 merges.
- **Phone sign-up with an SMS code exists on web and mobile**, and phones are stored in E.164 (`@repo/domain/phone-number`).
- **Seats.** `game_players.user_id` is the seat. Padel Positions hang off it through `game_team_players`. `admit` (`packages/api/src/games/admit.ts`) handles user, pair and team parties for the `register` and `promote` doors (`AdmitDoor` in `games/utils/index.ts:228`).
- **Partner registration** seats a second User without asking (`routers/games/registerWithPartner.ts`). It's the precedent for D6 on Games.
- **The Group Game join gate** (`assertUserPassesJoinGate`, `games/access.ts:215`) refuses non-members. D9 bypasses it for the Organizer's add only.
- **Ratings.** `selfDeclareRating` (`routers/ratings/selfDeclare.ts`) writes a one-time Rating. `completeOnboarding` skips the declare when a Rating already exists (`routers/users/completeOnboarding.ts:210`).
- **Confirmation.** The required confirmers come from `matchSeatedUserIds` in `games/match-result-confirmations.ts`, and the football side check sits in the same file.
- **Lookup search** filters in `invites/search-lookup-users.ts` (`lookupUserTextFilter` and `queryLookupUsers`). Partner search lives in `routers/games/searchPartnerUsers.ts` and `listPartnerSuggestions.ts`.
- **Notifications** are fan-out rows (`notifications.ts` schema, `notifications/notify.ts`). Their types are an enum: `group_member_joined`, `game_player_joined`, `game_player_left`, `game_finished`.
- **There is no door to remove a member from a Group**, only `groups.leave`.

## 5. Data model

One migration in `@repo/db` (never edit an existing one):

- **`user.added_by_user_id uuid null`**, referencing `user(id)` with `on delete set null`. Records which Organizer created the Unclaimed player.
- **`user.added_at timestamp null`.**
- **Unclaimed is derived:** `clerk_id is null and added_at is not null`. An explicit marker keeps any legacy row without a clerkId from being read as Unclaimed.
- **Check `user_unclaimed_has_phone`:** `added_at is null or clerk_id is not null or phone_number is not null`.
- **`user.claimed_at timestamp null`**, set when D19 or D21 attaches an account.
- **New table `user_merges`:**
  - `id`, `survivor_user_id` (FK to `user`, `on delete cascade`)
  - `merged_user_id uuid` (no FK, since the row is deleted)
  - `phone_number`, `merged_at`
  - `summary jsonb`: counts of seats moved, seats dropped, memberships moved, and the Rating kept per sport.
- **Two values added to `notification_type`:**
  - `game_seated_by_organizer`: an account holder was seated by an Organizer (D6).
  - `history_linked`: D20, with the Game count in the payload.

## 6. Doors

One procedure per file (`.cursor/rules/api-one-endpoint-per-file.mdc`). Shared modules have two or more callers.

**Shared modules (new, `packages/api/src/unclaimed-players/`)**

- **`resolve-phone-player.ts`:** given an E.164 phone, returns `{ kind: "account", user }`, `{ kind: "unclaimed", user }` or `{ kind: "new" }`. Used by both preview doors and both add doors.
- **`create-unclaimed-player.ts`:** inserts the row and declares the Rating (D7), in the caller's transaction. Used by the Game and Group add doors.
- **`is-unclaimed.ts`:** the SQL predicate and a row predicate, for search exclusion, Notifications and output marks.
- **`mask-phone.ts`:** "+973 •••• 4408". It lives in `@repo/api`; clients get the masked string, never the raw one.
- **`merge-into-account.ts`:** D21. Its only caller is the sync, but it is large enough to test alone, and the claim path in MP-7 shares its "attach" half.

**Games (`packages/api/src/routers/games/`)**

- **`previewPlayerByPhone`** (query, Organizer only): `{ gameId, countryIso, nationalNumber }` returns:
  - `kind`: account, unclaimed or new
  - `name`
  - `alreadyOnGame`
  - for an Unclaimed player, `phoneMasked`
- **`addPlayerByPhone`** (mutation, Organizer only). Input:
  - `gameId`, `countryIso`, `nationalNumber`
  - `name`: required when `kind` is new, ignored otherwise
  - `level`: the padel band, Not sure, or the football self-placement; new only
  - padel seat `{ sideIndex, position }` where the format seats, or a tournament `{ sideIndex }`
  - football `{ footballRole, footballPosition }`

  It admits through `admit` with a new `AdmitDoor` value, `"organizer_add"`, that:
  - skips the registration window, the join gate (D9) and the Level range (D11)
  - never waitlists
  - refuses when the Game has a completed Match, a posted Pool draw or is cancelled

  On a Group Game it never writes `group_members`. For an account holder it sends the `game_seated_by_organizer` Notification. Game admins hear about the join as they do today.
- **`kick`:** unchanged. It already removes any seated User.

**Groups (`packages/api/src/routers/groups/`)**

- **`previewPlayerByPhone`** (query, Group approver only): the same output, with `alreadyInGroup`.
- **`addPlayerByPhone`** (mutation, Group approver only):
  - **New or Unclaimed:** inserts `group_members` (and `community_members` per D5).
  - **Account:** sends a Lookup invite through the existing Group Lookup invite door logic. It returns `{ outcome: "added" | "invited" }`.
- **`removeUnclaimedPlayer`** (mutation, Group approver only): deletes the `group_members` row. It refuses an account holder with "Only players not on Temba yet can be removed".

**Users (`packages/api/src/routers/users/`)**

- **`renameUnclaimedPlayer`** (mutation): `{ userId, name }`. The caller must be an Organizer or Group approver of a Game or Group the player is on (D17). It refuses once the player is claimed.

**Changed doors**

- **Lookup search** (`invites/search-lookup-users.ts`), `searchPartnerUsers` and `listPartnerSuggestions` exclude Unclaimed players.
- **`notify.ts`** drops recipients who are Unclaimed.
- **`games.byId`, `groups.byId` and the Standing rows** gain `unclaimed: boolean` per player. They also gain `phoneMasked`, but only when the caller may add (D16).
- **`confirmMatchResult`** and the agreement check implement D14. An Organizer's confirmation is recorded for a side with no account holder.
- **`upsertUserFromClerk`:**
  - **Phone fallback:** links only a verified phone to an Unclaimed row (D19), and sets `claimed_at`.
  - **History Notification:** enqueues the `history_linked` Notification when the claimed row has at least one seat.
  - **Merge:** on `user.updated` with a verified primary phone held by an Unclaimed row, calls `merge-into-account` (D21).

## 7. Clients

Web (`apps/web`) and mobile (`apps/mobile`) in the same ticket (D23). The design system rules for mobile apply: tokens only, `Text` primitive, hairlines, no new animation.

- **Game details (Organizer):** an "Add player" action opens the sheet. The sheet has:
  - a phone field reusing the auth `PhoneField` and country picker
  - a preview line after the number is complete
  - a name field, when new
  - Level choices, when new, with copy from `@repo/domain/onboarding-flow`
  - the seat picker (padel) or the role picker (football)
- **Group home (Group approver):** the same sheet without seat or role. Also a Remove action on Unclaimed rows.
- **Marks:** the "Not on Temba yet" mark on every roster, seat and member row, and the masked phone for those allowed to see it.
- **Rename:** an Edit name action on an Unclaimed player's row.
- **History Notification:** a Notifications page row for `history_linked` that opens Match history.

## 8. Tests

Procedures are tested through their plain exported function against PGlite.

- **Add to Games:**
  - each format
  - seating and refusal when full
  - refusal after a completed Match or posted Pool draw
  - bypass of the join gate and Level range
  - no `group_members` write on a Group Game
  - the account-holder path seats and notifies
  - the same phone twice reuses one row
- **Add to Groups:**
  - Loose and Club Groups
  - the Community Member seat on Club Groups
  - the Club Group creator limited to existing Members
  - Soft-archive refusal
  - the account-holder path sends a Lookup invite
- **Confirmation:**
  - a Match with one Unclaimed player completes on the three account holders' confirmations
  - a side made only of Unclaimed players completes on an Organizer's confirmation
  - football
- **Search and Notifications:** Lookup and Partner search exclude Unclaimed players. `notify` skips them.
- **Sync:**
  - a verified-phone sign-up claims the row, keeps seats and Ratings, sets `claimed_at` and sends `history_linked`
  - an unverified phone doesn't claim
  - a merge covers each rule in D21 and writes `user_merges`
- **Unit tests:** `mask-phone`.

## 9. Slicing and order

MP-1 lands first. MP-2 builds the sheet and the Game path that MP-3, MP-5 and MP-6 reuse. MP-4 and MP-7 need only MP-1. MP-8 follows MP-7 because both change `sync-clerk-user.ts`.

## 10. Tickets

| Id | Title | Scope | Blocked by |
| --- | --- | --- | --- |
| **MP-1** ([TEM-389](https://linear.app/temba-app/issue/TEM-389)) | An Unclaimed player is a User without an account (model and exclusions) | Migration (section 5); `unclaimed-players/` modules `is-unclaimed`, `resolve-phone-player`, `create-unclaimed-player`, `mask-phone`; Lookup and Partner search exclusion; `notify` skip; tests; seed one Unclaimed player | — |
| **MP-2** ([TEM-390](https://linear.app/temba-app/issue/TEM-390)) | Organizers add players by phone to a padel Friendly game or Booking Game (web, mobile, server) | `games.previewPlayerByPhone`, `games.addPlayerByPhone` for padel Friendly and Booking Games; `"organizer_add"` door; `game_seated_by_organizer`; `unclaimed` and `phoneMasked` on `games.byId`; the Add player sheet and Not on Temba yet mark on web and mobile; `CONTEXT.md` Organizer edit | MP-1 |
| **MP-3** ([TEM-391](https://linear.app/temba-app/issue/TEM-391)) | Add players by phone to Americano, Friendly tournament and football Games | Widen `addPlayerByPhone` to roster, Half team and pair placement and to Football role; the sheet's role picker and tournament side choice | MP-2 |
| **MP-4** ([TEM-392](https://linear.app/temba-app/issue/TEM-392)) | Matches with Unclaimed players complete on account holders' confirmations | Required confirmers exclude Unclaimed players; Organizer confirmation counts for a side with no account holder; padel and football; Game details confirmation copy on web and mobile; `CONTEXT.md` Match result confirmation edit | MP-1 |
| **MP-5** ([TEM-393](https://linear.app/temba-app/issue/TEM-393)) | Group approvers add players by phone to a Group and remove Unclaimed ones | `groups.previewPlayerByPhone`, `groups.addPlayerByPhone`, `groups.removeUnclaimedPlayer`; Club Group and Soft-archive rules; `unclaimed` and `phoneMasked` on `groups.byId` and Standing rows; Group home sheet and Remove on web and mobile; `CONTEXT.md` Group approver edit | MP-2 |
| **MP-6** ([TEM-394](https://linear.app/temba-app/issue/TEM-394)) | Organizers and Group approvers correct an Unclaimed player's name | `users.renameUnclaimedPlayer`; Edit name action on web and mobile | MP-2 |
| **MP-7** ([TEM-395](https://linear.app/temba-app/issue/TEM-395)) | Signing up with a verified phone claims an Unclaimed player's history | `upsertUserFromClerk` verified-only phone fallback, `claimed_at`, `history_linked` Notification and its row on web and mobile | MP-1 |
| **MP-8** ([TEM-396](https://linear.app/temba-app/issue/TEM-396)) | An existing account that verifies the phone later absorbs the Unclaimed player | `merge-into-account` per D21; `user_merges` audit; call from `user.updated` | MP-7 |

## 11. Non-goals

- Telling an Unclaimed player about their adds, by SMS or otherwise. The Organizer shares the Game or Group Invite link themselves.
- Adding Unclaimed players to Teams or coaching sessions.
- Linking Venue console Guests to Unclaimed players by phone.
- Removing account holders from a Group.
- Editing an Unclaimed player's phone.
- Players (rather than Organizers) registering an Unclaimed partner.
- A "Not me" door, or a cap on adds.

## 12. Risks

- **Wrong or malicious numbers.** An Organizer can attach Games and a Rating to a real person's number. The claimer inherits them and has only leave and the wrong-score report. If this shows up in support, the follow-up is a "Not me" door that hands a seat back to a fresh Unclaimed player and reverses its rating effect, plus a per-Organizer daily cap.
- **The merge.** D21 rewrites seats, memberships and Ratings across many tables in one transaction. Every unique index on `game_players`, `group_members`, `community_members`, `ratings` and `match_result_confirmations` must be handled, with a test per collision.
- **Rating inflation.** Unclaimed players start at the Level an Organizer picked, without the player's own say. Level setters can correct it, and onboarding won't overwrite it.
- **Legacy rows without a clerkId.** These aren't Unclaimed, because `added_at` is null. The verified-phone tightening in D19 also changes how such a legacy row is linked by phone: it now needs a verified phone.

## Comments
