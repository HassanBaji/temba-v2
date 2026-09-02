Status: ready-for-agent

Tickets (Linear, `ready-for-agent`): [TEM-130](https://linear.app/temba-app/issue/TEM-130/optional-level-range-on-game-columns-create-display-organizer-edit) Optional Level range on Game → [TEM-131](https://linear.app/temba-app/issue/TEM-131/gate-individual-game-admit-requestapprovereject-game-home-ui) Gate individual Game admit + request/approve/reject → [TEM-132](https://linear.app/temba-app/issue/TEM-132/partner-and-team-only-level-gate) Partner and team-only Level gate and [TEM-133](https://linear.app/temba-app/issue/TEM-133/lookup-waiver-invite-link-gate-preview-promote-grandfather-lifecycle) Lookup waiver, Invite link gate, preview, promote grandfather (both blocked by TEM-131).

## Problem Statement

Organizers creating a **Game** cannot say which **Level** the Game is for. Anyone who passes the join gate can **Game admit** or enter the **Waitlist**, including Users with no Rating and Users far above or below the intended skill. Viewers on Game home and list cards cannot see a Level range. Community Public already has request-to-join; Games have no equivalent exception path.

## Solution

Ship an optional **Game Level range** (inclusive continuous Level min and/or max) on Game in the DB Package and App, plus a **Game Level range request** that Organizers approve into a **Game Level waiver**.

Blank min and max means no Level gate. When a range is set, a User whose displayed Level for the Game’s sport is outside it — or who has no Rating — cannot Game admit or enqueue on the Waitlist, unless they have a waiver, a live Organizer Lookup invite (which grants a waiver at send), or they are an Organizer of that Game (Organizers bypass for themselves only). Approve does **not** seat them. After a waiver they use the normal Game admit / Waitlist path. Reject may re-request. Ignore leaves pending. No message. No expiry.

Organizers set, change, or clear the range after create like **price per player**. Viewers see it on Game home, `GameSummaryCard` lists, Home hero, and Invite link preview when set; unset Games omit it.

This amends user-ratings (no Rating may now be blocked **when a range is set**), games-matches (Level range is an extra gate on Game admit doors), games-hub-tabs-and-cards (cards may show the Game’s range when set; still no per-User Level chip), and game-invite-share-preview (preview / Open Graph may include the range when set). It does not replace those specs. It does not change Glicko-2 (ADR-0009) or Game-as-parent (ADR-0008).

Approving this spec approves the Test seams in Testing Decisions. Glossary edits in root `CONTEXT.md` ship in the same planning commit.

## User Stories

1. As an Organizer, I want optional Minimum Level and Maximum Level fields when I create a Friendly game from the App, so that I can state who the Game is for.

2. As that Organizer, I want both fields blank to mean no Level gate, so that I can create a Game without a range.

3. As that Organizer, I want to set only a minimum, only a maximum, or both, so that I can say “3.0 and up”, “4.5 and under”, or “3.0–4.5”.

4. As that Organizer, I want min > max refused with a field error, so that an inverted range cannot persist.

5. As that Organizer, I want values from 0.0 through 7.0 inclusive with one decimal (for example 0, 3, 3.0, 4.2), so that the picker matches the You-page Level face.

6. As that Organizer, I want more than one decimal place, negatives, and values above 7.0 refused, so that junk bounds do not persist.

7. As that Organizer, I want 0.0 stored as a real minimum, not as unset, so that “Level 0.0+” is not the same as “no range”.

8. As that Organizer, I want the Create Game labels to be “Minimum Level” and “Maximum Level”, so that copy says Level, not rank or ELO.

9. As that Organizer, I want helper copy that the fields are optional, inclusive, one decimal, blank = no bound, and that Users without a Level must request to play when a range is set, so that I do not expect a Level band picker or matchmaking.

10. As that Organizer, I want those fields among Venue, Court, price per player, and window, using the same Field / FieldLabel / FieldError pattern, so that Create Game stays one form.

11. As that Organizer, I want leaving both fields blank still creating the Game, so that Level range cannot block Venue, Court, price, or window.

12. As the creator of a Loose Group, I want the same optional fields when I create a Game from the App.

13. As an authenticated User creating a groupless Game, I want the same optional fields.

14. As a Member who is not Owner, Admin, or that Club Group’s creator, I want creating a Club Group Game to still be refused, so that who may create Games does not change.

15. As a Loose Group member who is not the creator, I want creating a Game to still be refused.

16. As an Owner or Admin of a Soft-archived Community, I want creating a new Club Group Game to still be refused.

17. As a crafted client creating a Friendly game, Americano, or Friendly tournament, I want optional `levelMinTenths` and `levelMaxTenths` (integers 0…70 or null) accepted on `games.create`, so that every format can carry the same bounds.

18. As a crafted client omitting both keys, I want both stored null, so that crafted create matches blank App fields.

19. As a crafted client sending min 42 and max 30, I want create refused.

20. As a crafted client sending `levelMinTenths: 0` and no max, I want that stored as a minimum of 0.0 with no maximum.

21. As a viewer of Game home, I want to see “Level 3.0–4.5” when both bounds are set, “Level 3.0+” when only min is set, and “Level 4.5 and under” when only max is set, so that the range is readable without a currency-style symbol or a band letter.

22. As a viewer of Game home, I want no Level range line when both bounds are unset, so that historical Games and skipped fields stay quiet.

23. As a viewer of Home upcoming, public pickup, or Group Games, I want `GameSummaryCard` to append the same range string in meta when set, and to omit it when unset, so that list cards stay thin unless there is a range.

24. As a viewer of the Home next-Game hero, I want the same range shown when set, so that the hero and the upcoming rows do not disagree.

25. As a User looking at a cancelled Game I may still open, I want a stored range still visible, so that cancel does not erase the communication.

26. As a User looking at a Soft-archived Club Group Game I may still open, I want a stored range still visible, and I want register / waitlist / invites to stay closed as today, so that the range is not a join door.

27. As an Organizer on Game home, I want to set, change, or clear the range after create, so that I can fill it on Games created before these columns and correct a typo without recreating the Game.

28. As an Organizer, I want that editor using the same Field pattern in major Level units (4.2, not 42 tenths), with both blank saving as unset, so that I can clear a range.

29. As a User who is not an Organizer, I want no range editor, so that only Organizers change the bounds.

30. As an Organizer, I want Venue still immutable, format / public / mode still immutable, and window and price per player still editable, so that this slice does not change those rules.

31. As an Organizer of a cancelled Game, I want range edit refused, so that cancelled Games match window and price-per-player edit.

32. As an Organizer of a Soft-archived Club Group Game, I want to still edit the range (join doors stay frozen), so that archive matches price-per-player edit.

33. As a caller of Game by-id, I want `levelMinTenths` and `levelMaxTenths` on the payload (`number` or `null`), so that Game home does not need a second query.

34. As a caller of Home upcoming, public pickup, and Group Game lists, I want those tenths on each Game row, so that cards and the hero can render the range.

35. As a User of a Game created before these columns, I want both bounds unset (null) until an Organizer saves a range, so that we do not pretend old Games had a gate.

36. As a developer migrating, I want two new nullable integer tenths columns with no default 0, so that existing rows stay ungated.

37. As a User whose displayed padel Level is inside the range, I want to Game admit and Waitlist as today, so that the range does not bother people it was meant for.

38. As a User whose displayed Level is below the minimum or above the maximum, I want seat-register, Americano pool-register, and waitlist enqueue refused, so that the range is a real gate.

39. As a User with no Rating for the Game’s sport, I want those same doors refused when a range is set, so that Temba does not invent Level 3.0 to let me in.

40. As a User with no Rating when the Game has no range, I want Game admit still allowed, so that unset Games stay as shipped.

41. As a User whose Rating is Provisional, I want the gate to use my displayed Level anyway, so that Provisional is not a bypass and not an extra block.

42. As a User who self-declared D3 (midpoint 0.35, You shows 0.4), I want the gate to compare **0.4**, so that the number I see on You is the number the Game uses.

43. As a User looking at a Game whose range is 0.0–7.0, I want a Rating still required, so that “everyone with a Level” is not the same as “no range”.

44. As an Organizer registering myself, I want the range not to block my own Game admit or Waitlist, so that I can play on a Game I run without requesting an exception.

45. As an Organizer registering with a partner who is out of range and has no waiver, I want register-with-partner refused for that partner, so that my bypass does not cover them.

46. As an Organizer on a team-only Game whose Team partner is out of range without a waiver, I want the Team refused, so that the partnership cannot sneak the partner in.

47. As a User in range whose partner is out of range without a waiver, I want register-with-partner refused, and I still want to solo seat-register, so that I am not stuck because my partner needs an exception.

48. As a User on a team-only Game, I want the Team refused if either member is out of range without a waiver, so that both members are gated.

49. As a User already registered or waitlisted, I want a later Level drift or a tightened range not to kick me or skip my Waitlist promote, so that occupancy I already earned is grandfathered.

50. As a User who leaves and tries to Game admit again after my Level has drifted out, I want the gate applied again, so that grandfathering is occupancy, not a lifetime pass.

51. As a User out of range, I want Game home to hide Join / Join waitlist / Register and show “Request to play”, so that I am not offered a door that will fail.

52. As a User out of range on Hub or Home cards, I want the primary action to be **View** (not Join), so that request stays on Game home and we do not invent a new card CTA.

53. As a User out of range, I want copy “This Game is for Level 3.0–4.5. Your Level is 5.2.” (or “You don’t have a Level yet. Declare one on You, or request to play.”), so that I know why I cannot sit.

54. As a User who can view the Game (or hold a live Invite link), I want to submit a Game Level range request with no message and no expiry, so that Organizers can grant an exception.

55. As a User who already has a pending request, I want a second submit to return that pending row, so that I cannot stack requests.

56. As a User whose request is pending, I want Game home to show “Request pending”, so that I know Organizers have not decided.

57. As a User whose request was rejected, I want to see that and to request again on the same row, so that reject is not a permanent ban.

58. As a User whose request was ignored, I want it to stay pending, so that Organizers are not forced to reject.

59. As a User whose request was approved, I want a Game Level waiver, not a seat, so that I still pick a vacant Position / partner / Team / Waitlist like everyone else.

60. As a User with a waiver when the Game is full, I want to enter the Waitlist, so that the exception is about Level, not the cap.

61. As a User with a waiver when the Game is open, I want Join to work even if I am still out of range, so that the exception is usable.

62. As a User already in range, I want requesting refused (“Your Level is already within this Game’s range”), so that the queue is only for exceptions.

63. As a User on a Game with no range, I want requesting refused (“This Game has no Level range”).

64. As a User already registered or waitlisted, I want requesting refused.

65. As an Organizer, I want requesting refused for myself, because I already bypass.

66. As a User when the Game is closed, cancelled, or join-frozen, I want new requests refused with the same “not open for registration” idea as register.

67. As a User when the Game is full but still open, I want to still request, so that I can Waitlist after a waiver.

68. As a groupless Game viewer who only has a live Invite link, I want to request from the Invite preview by sending that token, so that I can ask without Game home access.

69. As an Organizer, I want a pending queue on Game home using `RequestRow` (Approve / Reject), titled “Level range requests”, so that I do not need a new inbox.

70. As an Organizer in that queue, I want each row’s meta to show the requester’s displayed Level (one decimal) or “No Level”, and Provisional when it would show on You, so that I can decide without raw μ/φ/σ.

71. As an Organizer, I want Approve to set status approved and `decidedBy` me, without inserting a Game player or Waitlist row.

72. As an Organizer, I want Reject to set status rejected without a waiver, so that they remain gated.

73. As a Member who is not an Organizer, I want list / approve / reject refused.

74. As an Organizer when the Game is closed but not cancelled or join-frozen, I want to still approve or reject, so that a waiver is ready if I reopen.

75. As an Organizer when the Game is cancelled or join-frozen, I want approve and reject refused.

76. As an Organizer sending a Lookup invite, I want that send to upsert an approved waiver for each successfully invited User, so that they do not need a separate request.

77. As an Organizer revoking an unused Lookup invite, I want the waiver to remain, so that v1 has no un-waive (I can kick after they sit).

78. As a User accepting a Lookup invite, I want Game admit / Waitlist to succeed even if I am out of range, because the invite already waived me.

79. As a User opening an Invite link when I am out of range and have no waiver, I want accept refused and the preview to offer Request to play, so that a public door does not skip the range.

80. As a User opening an Invite link when I already have a waiver, I want accept to work as today.

81. As a User on a team-only Invite link, I want my click refused if I fail the range without a waiver, and I want the Team refused at the second consent if my partner still fails, so that pair-consent cannot bypass Level.

82. As a waitlisted User who passed the gate (or was grandfathered), I want auto-promote to skip the Level re-check, so that a tightened range or Level drift does not strand me in line.

83. As a User moving seats, occupying a leftover unseated registration, leaving, or being kicked, I want those actions unchanged by Level range, so that the gate is only for new occupancy and new Waitlist rows.

84. As a User who later self-declares into range while a request is pending, I want Join to work without waiting for Approve, so that earning a Level is enough.

85. As a football-sport Rating holder on a padel Game, I want the padel Rating (or lack of one) to be what the gate uses, so that sports stay keyed.

86. As a User of the App, I want no Level band range picker, no matchmaking, no Directory of Games by Level, no payment, no auto-kick, and no request message field.

87. As a reader of CONTEXT.md, I want **Game Level range**, **Game Level range request**, **Game Level waiver**, and **Organizer** defined, so that “join” and “creator” do not drift.

## Implementation Decisions

- Schema, migrations, and kit live in the DB Package. App tRPC and dashboard UI stay in the Temba App. No new Package. Follow existing Drizzle style: uuid PKs, timestamps. Do not edit existing migrations. Clerk remains the only identity provider. Who may create Games, join gates, price per player, Positions, padel-only UI, Friendly-only App create, Venue/Court rules, and Soft-archive stay as shipped except for the extra Level gate and request path named here.

- **Game.levelMinTenths** (`level_min_tenths`) and **Game.levelMaxTenths** (`level_max_tenths`): nullable integers 0…70. Null bound = that end unset. Both null = no gate. 0 = Level 0.0 (a real bound). Store tenths so tRPC stays on integers (same idea as `pricePerPlayerCents`). Do not use `numeric` or Level floats on the wire. Do not store Level bands as the range.

- **Conversion:** 1.0 Level = 10 tenths. App Fields collect major-unit text (`3`, `3.0`, `4.2`) and convert with integer arithmetic (blank → omit/null), same idea as `parseOptionalPricePerPlayerCents`. Refuse more than one decimal place. One helper parses optional Level input to tenths; one helper formats tenths for display (`42` → `4.2`).

- **Comparison:** Use the **displayed** Level, not raw μ. Reuse `formatLevel(levelFromMu(mu))` (round to one decimal, clamp 0.0–7.0). A self-declared D3 midpoint 0.35 gates as **0.4**. Inclusive: tenths >= min (if set) and <= max (if set). No Rating row for `game.sport` → fail (do not lazy-create a 3.0 Rating). Idle inflation is not required for the gate (it does not change μ). Provisional (`φ > 200`) is ignored by the gate.

- **0.0–7.0 both set still requires a Rating.** Unset (both null) does not.

- **Migration:** `ALTER TABLE games ADD COLUMN level_min_tenths integer; ADD COLUMN level_max_tenths integer;` nullable, no default, no backfill, no CHECK required (validate at tRPC like price). Existing Games remain ungated.

- **`game_level_range_requests` table:** uuid id; `game_id` → games restrict; `user_id` → user cascade; status enum `pending` | `approved` | `rejected` (new enum, do not reuse `community_join_request_status`); `decided_by` → user set null; timestamps. Unique `(game_id, user_id)`. Approved status **is** the Game Level waiver. No message column. No expiry column. Export from the DB Package schema index. Relations on Game.

- **Create tRPC (`games.create`):** optional `levelMinTenths` / `levelMaxTenths`: integer 0…70 or null. Omit or null → store null. Refine: when both present, min <= max. Accepted on Friendly game, Americano, and Friendly tournament. App Create Game still sends Friendly game, individual, `isPublic: false`. Do not change Venue/Court, format, caps, or `isPublic`. Pre-existing: Americano/tournament create still persists `registrationMode` individual even if a crafted client sent `team_only` — do not “fix” that in this slice.

- **Update tRPC:** new `games.updateLevelRange` `{ gameId, levelMinTenths, levelMaxTenths }` (each integer 0…70 or null). Same Organizer set as `updateWindow`. Same cancelled refusal as price/window (“Cannot edit a cancelled Game”). Soft-archived Club Group Game: Organizers may still edit (join doors stay frozen). Do not fold into `updateWindow` or `updatePricePerPlayer`. Non-organizers refused. Both null clears the gate. Tightening does not kick or dequeue.

- **Read payloads:** `games.byId` includes tenths plus viewer fields: `viewerLevelTenths` (`number` | `null`), `viewerPassesLevelRange` (true if no gate, in range, waived, or Organizer), `levelRangeRequest` (`{ id, status }` | `null`), `canRequestLevelRange`, and for Organizers `pendingLevelRangeRequests` (id, createdAt, user `{ id, name, image }`, `levelTenths`, `provisional`). `users.home` upcoming, `games.listPublicPickup`, `games.listMyGames`, and `groups.byId` upcoming/history include the tenths. Hub `canRegister` / `canWaitlist` must AND `viewerPassesLevelRange` so out-of-range cards show View.

- **Gate helper:** one function, e.g. `userAllowedByLevelRange`, returning whether the User may occupy or enqueue. Allowed when: both bounds null; OR Organizer (self); OR approved waiver row; OR live unused Lookup invite for that Game+User; OR displayed Level in range. Call it on every register / waitlist-enqueue / Lookup-accept / Invite-link-accept path for **each** User in the party **before** writing occupancy or Waitlist. Put a backstop on `admit` when `door === "register"` (new `AdmitReason` `"level_range"`) and teach `throwIfAdmitRefused` to FORBIDDEN `"Your Level is outside this Game’s range"` (pair/Team: `"A User’s Level is outside this Game’s range"`). **Do not** call it from `admit` when `door === "promote"`, and **do not** re-check on promoteWaitlist (grandfather). Move, leftover occupy-seat, leave, and kick stay ungated.

- **Waitlist enqueue leak:** `registerSeat` today enqueues when remaining capacity is 0 **without** going through `admit`. That path must call the helper (or be reordered to match Americano `register`, which admits first then waitlists on `full`). Same for partner/team full enqueue.

- **Request tRPC:**
  - `games.requestLevelRange` `{ gameId, inviteToken?: string }` — no message. Idempotent pending; rejected → pending (clear `decidedBy`); approved leftover → return approved (do not flip back). Authorize: Game has a range; not Organizer; not registered/waitlisted; not in range; Game not cancelled/closed/join-frozen; caller `canViewGame` **or** supplies a live Invite link token for that Game **or** holds a live unused Lookup invite (Lookup already waives, so this last door is belt-and-braces). Groupless Invite preview passes `inviteToken`.
  - `games.listLevelRangeRequests` `{ gameId }` — Organizer, pending only, oldest first.
  - `games.approveLevelRangeRequest` `{ requestId }` — Organizer of that Game; pending only; set approved + `decidedBy`; **do not** call `admit` / waitlist.
  - `games.rejectLevelRangeRequest` `{ requestId }` — same staff; pending only; set rejected. Closed: decisions still allowed. Cancelled or join-frozen: refuse decisions.

- **Lookup send:** after today’s join-gate / already-on-game / unused-invite checks succeed and the invite is minted, upsert the request row to `approved` with `decidedBy` = sender (insert if missing, including flipping pending/rejected). Do not refuse send because the invitee is out of range. Revoke unused invite does **not** delete or reject the waiver. v1 has no un-waive mutation.

- **Invite link accept / preview:** range still applies unless waiver/Organizer/in-range. `games.previewInviteLink` adds tenths, viewer pass/request state, and `canRequestLevelRange`. Out of range: do not seat-pick; show Request to play. Open Graph: append the formatted range when set (`Level 3.0–4.5`); never User names or User Levels.

- **UI — Create Game:** two optional `Input type="number"` `step="0.1"` `min="0"` `max="7"` after price per player, before window. Wire both keys in `focusFormFailure`. Do not add Format select, Individual vs Team-only, public flag, or a Level band `<Select>`.

- **UI — Game home:** viewer tile beside price when set (stories 21–22). Organizer `GameEditDialog` gains a Level range form (major units, blank clears) with its own save, like price. Requester panel when `canRequestLevelRange` or a non-approved `levelRangeRequest` exists. CTA copy: **Request to play** / **Request pending** / **Request rejected** + **Request again**. Organizer section **Level range requests** reuses `RequestRow` (Approve / Reject). Do not add an Invites-tab inbox.

- **UI — lists:** extend `GameSummaryCard` with optional tenths props; append formatted range when not null. Home upcoming, Games hub, Group Games, Home hero. Out of range viewers: `canRegister`/`canWaitlist` false → existing **View** CTA. Do not add a Request CTA on cards. Do not add per-User Level chips (games-hub-tabs and user-ratings still forbid those).

- **Partner search / eligible Teams:** search picker stays as shipped (join gate only). `byId` eligible Teams must require both members pass the Level helper. Refuse register-with-partner / register-team with a specific message when a named partner fails (`That User’s Level is outside this Game’s range` / `A Team partner’s Level is outside this Game’s range`).

- **Authorization (product):** create/update range and decide requests = Organizers. Viewing range = people who may already see that Game (plus Invite preview). Requesting = story 54 authorization. Game admit still also needs today’s join gate.

- **ADR:** none.

- **Amends:** `.scratch/user-ratings/spec.md` self-declare “does not block Game register” — still true when no range; when a range is set, no Rating cannot Game admit without a waiver. `.scratch/games-matches/spec.md` join gate — Level range is an additional gate on occupy/enqueue; promote grandfathered. `.scratch/games-hub-tabs-and-cards/spec.md` — cards may show **Game** Level range when set; still no User Level chip; out-of-range Join becomes View. `.scratch/game-invite-share-preview/spec.md` — preview and OG may include Game Level range when set. `.scratch/redesign/games-and-rankings-contract.md` — optional Game Level range field when present. Does not replace those specs.

## Testing Decisions

### What a good test is

Temba has Vitest + PGLite suites. Test external behavior: displayed Level comparison, persist/read of tenths, refuse/allow on each admit door, request state machine, Organizer bypass, Lookup waiver at send, Invite link still gated, grandfathered promote. Do not assert exact table JSON or router file names except as those flows fail. Pure parse/format helpers deserve unit tests like `price-per-player.test.ts`.

### Test seams

Highest seam (one): an Organizer can create a Friendly game with an optional Level range, viewers see it when set, an in-range User can Game admit, an out-of-range or no-Rating User cannot and can request, Organizer approve grants a waiver without seating them, then that User can sit or Waitlist — without matchmaking, without auto-kick, without Community-style auto-Member, and without a Level band picker.

If you implement this spec, you implement these seams:

- Create Game: optional min/max Fields; both blank → ungated; 3 and 4.2 persist 30 and 42 and show `Level 3.0–4.5`; min-only / max-only display strings; 4.25, negatives, 7.1, min > max refused; Venue/Court/price/window still required as today
- Game home tile + organizer editor set/change/clear; cancelled refuses edit; non-organizer has no editor; existing Games omit until saved
- Cards / hero / Group lists show the range when set and omit when unset; out-of-range viewer gets View not Join
- `games.byId` and list payloads include tenths; by-id includes viewer pass/request fields
- Crafted create: optional tenths on Friendly game, Americano, and Friendly tournament; omit → null; out-of-range integers refused
- Gate: in-range admits; out-of-range and no-Rating refuse occupy and waitlist enqueue; Provisional in-range admits; displayed rounding (0.35 → 0.4); 0.0–7.0 still needs a Rating; unset range does not; Organizer self bypass; partner/Team both-must-pass; leftover occupy / move / leave / kick ungated
- Request: pending idempotent; reject then re-request; ignore stays pending; approve = waiver not seat; full still requestable; closed/cancelled/join-frozen refuse new requests; cancelled/join-frozen refuse decisions; closed allows decisions; Invite token path for groupless preview
- Lookup send upserts approved waiver; revoke does not remove it; Invite link accept still gated without waiver
- Promote after tighten/drift still seats a waitlisted User; leave then re-register re-checks
- Soft-archive Club Group Game: range visible; register/waitlist/invites/new requests frozen as today
- Friendly-only App create, padel-only UI, price per player, Route `/public` unchanged

Manual check: Community join requests, Group/Team invites, You self-declare, Home, Soft-archive still work.

### Modules under that seam

DB Package Game tenths columns, `game_level_range_requests`, new migration; games create / by-id / lists / `updateLevelRange` / request-approve-reject; Level tenths parse/format; gate helper; admit refuse reason; App Create Game Fields, Game home tile/editor/request queue, `GameSummaryCard`, Invite preview; hub `canRegister` — only as they affect the flows above.

### Prior art

`create-friendly.test.ts` (optional `pricePerPlayerCents`). `admit.test.ts` (doors, full, closed, join_frozen). `price-per-player.test.ts` (parse/format). `game-summary-cta.test.ts` (Join vs View). `doors.test.ts` (Lookup / Invite link). Community `requestJoin` / `approveJoinRequest` / `rejectJoinRequest` / `RequestRow` (state machine and UI, **not** auto-admit). `updatePricePerPlayer` organizer + cancelled. games-matches Testing Decisions for join freeze.

## Out of Scope

- Matchmaking, discovery filters, Directory of Games by Level
- Level band as the range picker; storing bands instead of tenths
- Per-User Level chips on Game cards (still out, per user-ratings / hub-tabs)
- Auto-kick or Waitlist skip when Level drifts or the range tightens
- Auto-seating or auto-waitlisting on approve (Community Member behavior)
- Request message, expiry, un-waive mutation, revoke-lookup clearing the waiver
- Payments; gating Game admit on price
- Football App UI (schema stays sport-keyed)
- App format picker; Individual vs Team-only or public flag on Create Game
- Changing who may create Games; inventing a new Organizer definition
- Self-declare UI on Game home (You page remains the declare door)
- A new ADR
- CI beyond existing Vitest

## Further Notes

Glossary: apply the Language patch in root `CONTEXT.md` in the same planning commit (**Organizer**, **Game Level range**, **Game Level range request**, **Game Level waiver**, Avoid patches). Architecture: ADR-0008 unchanged (bounds live on Game, not Match). ADR-0009 unchanged (Glicko-2 / Level map). Community join request remains a different entity.

Settled grilling: `.scratch/game-level-range/decisions.md`.

**Community contrast (intentional):** Community Public approve → Member immediately. Game Level range approve → waiver only, because Game admit needs a vacant Position / partner / Team path.

**Promote vs enqueue:** enqueue is gated; promote is grandfathered. Already-on-Game occupancy is not re-validated.

Create Game on current `dev` has Venue, Court, price per player, and window (always Friendly game, individual, not public). Implementers add Level fields and must not reintroduce a Format select.

## Implementation tickets (local)

All labelled `ready-for-agent`. Spec: `.scratch/game-level-range/spec.md`.

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-130](https://linear.app/temba-app/issue/TEM-130/optional-level-range-on-game-columns-create-display-organizer-edit) Optional Level range on Game | — |
| 2 | [TEM-131](https://linear.app/temba-app/issue/TEM-131/gate-individual-game-admit-requestapprovereject-game-home-ui) Gate individual Game admit + request | TEM-130 |
| 3 | [TEM-132](https://linear.app/temba-app/issue/TEM-132/partner-and-team-only-level-gate) Partner and team-only Level gate | TEM-131 |
| 4 | [TEM-133](https://linear.app/temba-app/issue/TEM-133/lookup-waiver-invite-link-gate-preview-promote-grandfather-lifecycle) Lookup waiver, Invite link, promote | TEM-131 |

Frontier: **TEM-130**. Orchestrator runs TEM-130 → TEM-131 then TEM-132 and TEM-133 (those two may proceed in either order after TEM-131).

## Comments

Planner session locked v1 defaults without an interactive grill (autonomous Cloud Agent).
