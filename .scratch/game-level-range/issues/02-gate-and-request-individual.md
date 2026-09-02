# 02: Gate individual Game admit + request/approve/reject + Game home UI

**Linear:** [TEM-131](https://linear.app/temba-app/issue/TEM-131/gate-individual-game-admit-requestapprovereject-game-home-ui)

**Spec:** `.scratch/game-level-range/spec.md`

**What to build:** When a Game has a Level range, a User who is out of range or has no Rating cannot seat-register, Americano-register, or enter the Waitlist on those doors. They can Request to play. Organizers approve a waiver (no seat) or reject (may re-request). In-range Users and Organizers (themselves) still Game admit as today. Hub/Home Join becomes View for an out-of-range viewer.

**Blocked by:** [TEM-130](https://linear.app/temba-app/issue/TEM-130/optional-level-range-on-game-columns-create-display-organizer-edit) Optional Level range on Game (columns, create, display, organizer edit)

**Status:** ready-for-agent

- [ ] Displayed Level (one decimal from μ, same as You) is compared inclusively to the Game’s tenths; no Rating fails when a range is set; Provisional does not change the result; unset range still admits Users with no Rating
- [ ] A Game with min 0.0 and max 7.0 still requires a Rating
- [ ] Seat-register, Americano `register`, and waitlist enqueue on those doors refuse out-of-range / no-Rating Users with a Level-range error; Organizers bypass for themselves
- [ ] `game_level_range_requests` exists (unique Game+User, pending/approved/rejected, no message, no expiry); approved **is** the waiver
- [ ] `games.requestLevelRange`, `listLevelRangeRequests`, `approveLevelRangeRequest`, `rejectLevelRangeRequest` follow Community request mechanics except approve does not Game admit or waitlist
- [ ] Game home shows Request to play / pending / rejected+request again; Organizer queue reuses RequestRow; `byId` exposes viewer pass/request fields
- [ ] `canRegister` / `canWaitlist` on by-id and hub rows are false when the viewer fails the range (unless Organizer or waived), so cards show View
- [ ] Full Games still accept a request; closed/cancelled/join-frozen refuse new requests; cancelled and join-frozen refuse decisions; closed still allows approve/reject
- [ ] Already registered or waitlisted Users are not re-checked; leftover occupy-seat, move, leave, and kick stay ungated
- [ ] PGLite tests cover in-range admit, no-Rating refuse, displayed rounding (0.35 → 0.4), Organizer bypass, request state machine, and approve-does-not-seat
