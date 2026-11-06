# Temba marks

Status: draft for the product owner's review. Every open question carries a recommended call (section 5); the ones the owner should confirm are listed in section 14. Nothing in this spec is implemented.

Tickets: TEM-418 … TEM-429 in Linear (created 2026-11-07), listed in section 16 with their blocking relations.

Design reference: `.scratch/design-import/marks-flow.html` (self-extracting bundle; its coins are extracted to `.scratch/design-import/marks/<slug>.svg`, 120×120). Screen labels 0a, 1a, 2a–2f and 3a–3d below are the mockup's own section labels; every screen's copy was extracted from the bundle during planning and is quoted in section 7.6. Related: [mobile-and-api-server](../mobile-and-api-server/spec.md) (section 4, the locked design system), [player-profile](../player-profile/spec.md) (the profile the cabinet slots into), [in-app-notifications](../in-app-notifications/spec.md), [email-notifications](../email-notifications/spec.md), [retire-volt-accent](../retire-volt-accent/spec.md), ADR-0011, ADR-0030, ADR-0040, ADR-0042, ADR-0044, ADR-0052.

## 1. Problem

A Game ends with a score, a rating change and a Result card. Nothing records how people played: who ran all night, who held the net, who dropped the easy one. Players tell each other in the group chat and it is gone the next day.

The owner's request, in their words: "I want to introduce Temba marks, which are like honor badges. After each game players should be able to give marks to each other, with the MVP mark being either by vote or set by organizer. Marks should be shown on players' profiles and players can collect them."

The mockup fixes the set: thirteen coins, twelve of them **Marks** players give each other after the score, and one **MVP** per Game decided by vote or by the Organizer. Each Mark belongs to a giver group (teammate, anyone, opponent) and some belong to one sport. Two are **Roasts** the receiver may hide from their profile. The coins are coloured; everything else in the app stays black and white.

## 2. Discovery findings

### 2.1 What exists

| Need | Existing piece | Fit |
| --- | --- | --- |
| The moment "the score is confirmed" | `confirmMatchResult` (`packages/api/src/routers/games/confirmMatchResult.ts:100-106`): a seated User's confirmation is recorded, and `runMatchCompletionEffect` runs when the result is fully confirmed or the confirmer is an Organizer (ADR-0044). `scoreSet` and `completeMatch` reach the same effect. | The completion effect is the one place to open the Marks window. |
| Completion moment | `runMatchCompletionEffect` (`packages/api/src/games/run-match-completion-effect.ts:62-71`) sets `status = completed` and `updatedAt` inside a transaction. No `completed_at` column. `matchResultConfirmationCompletedAt` (`packages/api/src/games/match-result-confirmations.ts:188`) reconstructs it from the latest confirmation row, and `games.byId` shows no date when an Organizer settled it (`byId.ts:558-566`). | Not reliable enough to anchor a 48-hour window: an Organizer who is not seated writes no confirmation row (`confirmMatchResult.ts:100`), and `updatedAt` moves on later edits. A `matches.completed_at` column is needed. |
| Wrong score | `reportWrongScore` (`packages/api/src/routers/games/reportWrongScore.ts:220`) puts the Match back to `pending` and reverses rating events. | The Marks window must suspend with it and restart when the Match completes again. |
| Who sat on which side | `game_team_players` → `game_players` → `user`, read by `matchSideSeats` (`match-result-confirmations.ts:26-71`), which also separates account holders from Unclaimed players. Football sides are Game teams with `side_index` 1 or 2 (`publishFootballTeams.ts:160-166`, `game-teams.ts:28`). | Gives the participant set, each participant's side and whether they can act. Reused as is. |
| Sport | `games.sport` (`padel` \| `football`, `game-enums.ts:10`), `isFootballGame` in `@repo/domain/game-shape`. | Decides Smash Machine vs Goal Machine. |
| Goals and keeper hints | `match_goals` unique per (Match, User) (`match-goals.ts:33`), `football_role` on the seat. `games.footballBoard` already assembles goals per player (`footballBoard.ts:127-185`). | Hints on the Organizer pick sheet. |
| Scheduled work | Graphile Worker on Postgres (ADR-0030): `enqueueAt(tx, job, runAt)` (`packages/api/src/jobs/enqueue.ts:19`), job specs in `jobs/specs.ts`, handlers in `jobs/handlers/`, registered in `jobs/task-list.ts`. Tests use `RecordingJobSink`. | The brief assumed Temba has no scheduler. It has one. "Closes 48 hours later" can be a Job, with a read-time fallback. |
| Notifications | `notify()` is the only writer (`packages/api/src/notifications/notify.ts:68`); types are a `pgEnum` (`notifications.ts:20-29`); `notifyIfGameFinished` fires in the completion transaction with a dedupe key (`notify-game-finished.ts:47-80`). Copy lives in `@repo/domain/notification-copy` and the catalog. The email channel (email-notifications spec) sends every type. | New types are additive enum values plus copy. |
| Who may see a Game | `canViewGame` (`packages/api/src/games/access.ts:251`), `isGameOrganizer` (`:153`). | Reused for Game-screen marks. |
| Who may see a profile | `mayViewPlayer` and `matchHistoryHidden` (`packages/api/src/routers/users/playerProfile.ts:97`, `:80`); `user.match_history_visibility` (`user.ts:106`); `users.setMatchHistoryVisibility` is the one-column settings pattern. | Reused for the cabinet. `hide_roasts` follows the same column-plus-setter pattern. |
| Colour as data | `bibColors` in `@repo/design-tokens` (`tokens.ts:103-118`): "data, not chrome: ... the one place colour appears". The mobile `react-native-svg` dependency exists (`apps/mobile/package.json:56`); `ResultMark` paths and Hatch geometry already live in `@repo/design-tokens` (mobile spec 4.3). | Coins follow the Bib precedent. |
| Game creation step 4 | `createGameInputSchema` (`create.ts:52-69`); mobile `details-step.tsx` (step 4 holds name, Level range, price, rated); web step 4 per `.scratch/create-game-flow/spec.md:102`. | The MVP picker is one more field on step 4. |
| Played game screen | Mobile `played-game/played-game-view.tsx` (hero, columns, facts, Share) and `played-friendly-game.tsx`; web `components/games/played/`. Tapping a player opens `PlayedPlayerSheet`. | The marks rows slot in between the columns and the facts. |
| Result card | `@repo/domain/game-result-share` `PadelResultCard` / `FootballResultCard` (`:57`, `:71`); mobile `share-result/story-cards.tsx`; web share page. | An optional MVP line on the card. |
| Profile | Mobile `profile/profile-sections.tsx`, `player-profile/`; web `components/you/`, `components/players/`. Routes `players/[userId]` per tab on mobile, `/dashboard/players/[userId]` on web. | The cabinet row and screens are new sections and routes beside Last 10. |
| Short names | `shortPlayerName` (`@repo/domain/player-name.ts:17`). Product timezone `Asia/Bahrain` (`product-timezone.ts:1`). | "Make Yousif the MVP", "closes Fri 7:00 PM". |

### 2.2 What is missing

- No table records a mark, a vote or an MVP. No column says how a Game decides its MVP.
- No column records when a Match completed.
- No notification type for a received mark or a decided MVP.
- No colour asset pipeline: the two colour exceptions so far (Bib) are flat fills, not illustrations.
- No per-sport "collection" view of anything on a profile.
- Nothing in the codebase mentions MVP or marks. `member-form-marks.ts` and `ResultMark` are the W/L glyphs of Standing and Recent form, a naming collision the glossary must settle.

## 3. Goals

1. After a Friendly game's score is confirmed, every seated account holder can give up to three Marks to others on the Match for 48 hours, within the giver-group and sport rules, on mobile and on web.
2. Each Friendly game decides its MVP the way its Organizer chose at creation: players vote, the Organizer picks, or no MVP. Votes stay hidden until voting closes. Ties go to the Organizer. The MVP shows on the Played game screen and the Result card.
3. A player's profile carries a cabinet: a summary row, an all-marks screen per sport, and a per-mark detail listing the Games it came from. Roasts can be hidden from other viewers.
4. Every rule (who may give what to whom, caps, window, tally, tie) is a pure function in `@repo/domain` with unit tests. Every door is a procedure tested against PGlite.
5. Coins are illustrated assets shipped as data, rendered the same on both clients, and recorded as an explicit exception to the black-and-white design system.
6. Everything is additive. No existing procedure path or output changes shape; `games.create` and `games.listMyGames` gain optional fields only.

## 4. Non-goals

Deferred, not rejected:

- Marks on Friendly tournaments and Americano (many Matches per Game; decision 4). The data model keys marks to a Match so this can follow.
- Marks on tournament Knockout Matches, Walkovers (never a Match result) and cancelled Matches.
- A per-mark hide (the toggle is per User; decision 6).
- Push notifications for marks (Phase 7 decides which events push).
- A leaderboard, season totals, or Marks in Standing.
- Giving a Mark to an Unclaimed player's claimant retroactively beyond what ADR-0042 already does (marks hang off the `user` row, so a claim carries them).
- An Operator tool to remove abusive marks. v1 relies on the giver's retract and the 48-hour window.
- Custom or Group-specific marks. The set is fixed at thirteen.
- Changing the window length per Game.
- Animated coins. Coins are static; `MountFill` and `MountDraw` stay the only motion.

## 5. Decisions

The owner was not available during planning. Each decision below is a recommended call with its reasoning. Section 14 lists the ones to confirm.

**D1. Coins are illustrated assets, not theme colour (ADR-0055, section 12).** The design system stays black and white with no accent. A coin is a picture of a thing a player earned, like a Bib is the colour a team wears. Both are data in `@repo/design-tokens`, never chrome: no coin colour is ever used on a button, a bar, a background or text. The glossary's Bib entry changes from "the only place colour appears" to one of two.

- **Shipping.** The thirteen SVGs (about 12 KB in all, two tones plus black and white each) are committed under `packages/design-tokens/marks/<slug>.svg` as the source and transcribed once into `packages/design-tokens/src/marks.ts` as data: per coin, `{ disc, shade, elements: [{ shape, attrs, tone: "disc" | "shade" | "ink" | "paper" }] }` in the 120×120 viewBox. A unit test checks every coin kind has an entry and every fill in the SVG file maps to one of the four tones. `@repo/design-tokens` keeps its no-Workspace-imports rule.
- **Rendering.** Each client has one `MarkCoin` primitive with the same props: `kind`, `size` (20 row, 28 roster, 44 cabinet, 64 sheet, 120 set) and `state: "earned" | "notYet"`. Mobile draws through `react-native-svg`; web draws an inline `<svg>`. Neither client ever imports the `.svg` files or a bitmap, so the two Apps cannot drift.
- **Not yet.** `notYet` renders the disc as a `Hatch` clipped to a circle with a hairline border, the glyph in `muted` for its ink parts and `paper` for its paper parts, and the two coin tones dropped. Hatch means "not yet" in the locked system, and the glyph stays recognisable without colour. The implementer compares it with the mockup's 3b rows and adjusts the glyph tone if the mockup renders the glyph differently; the decision that stands is "hatched disc, no colour".
- **Accessibility.** The coin is decorative to a screen reader (`accessibilityElementsHidden` / `aria-hidden`); the adjacent text carries the mark name, as Hatch does today.
- **Lint.** The mobile ban on hex literals outside `@repo/design-tokens` is unchanged: coin colours live in the tokens Package.

**D2. A Mark is a Match fact; the MVP is a Game fact.** A mark row records `(match_id, giver_user_id, receiver_user_id, kind)`. Giver groups (teammate, opponent) are only meaningful against a Match's two Game teams, and a Friendly game has exactly one Match, so for v1 Match and Game coincide. The MVP is one per Game: `games.mvp_mode`, `games.mvp_user_id` and how it was decided. Votes are `(game_id, voter_user_id, candidate_user_id)`. This keeps tournaments possible later without a migration of the marks table.

**D3. The window is anchored on `matches.completed_at` and closed by a Job plus a read-time rule.**

- `runMatchCompletionEffect` and `completeMatch` set `matches.completed_at = now()` when they set `status = completed`. `reportWrongScore` clears it when it sets the Match back to `pending`. The migration backfills `completed_at = updated_at` for Matches already completed, so every completed Match has one.
- The **Marks window** is `[completed_at, completed_at + 48h)`. `marksWindow(completedAt, now)` in `@repo/domain/marks` returns `null` (no completion), `open` with `closesAt`, or `closed`. Every write door checks it with the server clock. Clients render `closesAt`; they never decide openness themselves.
- The completion transaction enqueues the Job `marks.settle-mvp` (key `mvp:settle:<gameId>`, mode `replace`) at `closesAt`. `reportWrongScore` removes it. The handler settles the MVP (D5) and sends the notifications. The settle rule is the same pure function the read door uses, so if the worker is late, `marks.forGame` shows the settled state anyway and, when the window is closed and `mvp_settled_at` is null, settles lazily on read. Belt and braces: the Job exists for notifications and the lazy path for correctness.
- "Or earlier when everyone has voted": `castMvpVote` counts eligible voters after each vote and settles at once when all have voted, then removes the Job. The Marks window itself always runs the full 48 hours; only the vote can close early.
- A wrong-score report inside the window suspends it: `completed_at` null means `marksWindow` returns `null`, writes are refused, the Job is removed, and the MVP decision and `mvp_settled_at` are cleared. Marks and votes already given are kept. When the Match completes again, the window restarts from the new `completed_at` and the Job is enqueued again.

**D4. Game shapes in v1: Friendly games only, both sports.**

| Shape | v1 | Participants, givers, receivers |
| --- | --- | --- |
| Padel Friendly game (2 Game teams of up to 2, including Partner registration and Either side) | In | Participants: Users seated on the Match's two Game teams. Givers and voters: participants with an account. Receivers and MVP candidates: all participants, Unclaimed players included. |
| Football Friendly game (two Football sides of N, substitutes included) | In | Same, with `side_index` naming the side. Roster members not placed on a side are not participants. |
| Booking Game (groupless Friendly game, ADR-0029) | In | Same. Its creator is its Organizer. |
| Friendly tournament, Americano | Out | Many Matches per Game; the teammate and opponent sets change per Match and the mockup shows one result. Marks keyed to a Match keep the door open. `mvp_mode` is stored `none` on these formats. |
| Walkover, cancelled Match | Out | Never completed, never a window. |
| Unclaimed player (ADR-0042) | Receives, never gives or votes | Not an eligible voter, never notified. A claim carries their marks with the row. |
| Organizer who is not seated | Does not give or vote | Picks or tie-breaks the MVP, changes the MVP mode before the score. |

**D5. MVP mode and settlement.**

- `mvp_mode` is `vote` (default for a new Friendly game), `organizer` or `none`. Chosen on create step 4 (1a). `marks.setMvpMode` lets an Organizer change it until the Match is completed; after that it is fixed. The DB default is `none`; `games.create` writes `input.mvpMode ?? "vote"` for a Friendly game and `none` for other formats. The Booking Game create path writes `vote` too. The migration sets every existing Game to `none`, so no legacy Game grows a surprise vote.
- **Vote.** Eligible voters are the participants with an account. Each casts one vote for any participant except themselves and may change it while the vote is open. Nobody sees the tally until it is settled: `marks.forGame` returns only `votes: { cast, eligible }` and the viewer's own vote before then.
- **Settle rule** (`mvpOutcome` in `@repo/domain/marks`, pure):
  - `none` → no MVP.
  - `organizer` → the Organizer's pick when one exists; the pick may change until the window closes; the question settles at `closesAt`. No pick by then → no MVP.
  - `vote`, window open and `cast < eligible` → pending.
  - `vote`, all voted or window closed → tally. Zero votes → no MVP. One leader → MVP by vote. Tie → the Organizer is asked (state `tie`, `mvp_tie_break` notification once) and may pick among the tied until `closesAt` (`marks.setMvp` refuses anyone else). A pick settles as `tie_break`. No pick by `closesAt` → no MVP, never a guess.
- `mvp_settled_at` records that the question is final (with or without an MVP) and that the `mvp_decided` notification was sent. The Job and the lazy read path are idempotent on it.
- An Organizer who is also seated votes like any player in `vote` mode. In `organizer` mode an Organizer may not pick themselves; in a tie-break they may, if they are among the tied, because the players put them there. Section 14 asks the owner to confirm the self-pick rule.
- The settled MVP shows "By vote, 7 of 12", "Organizer's pick" or "Tied vote, Organizer's pick", followed by the MVP's goals and marks on that Game as the mockup's "Three goals and four marks."

**D6. Roasts hide per User, not per mark.** `user.hide_roasts` boolean, default false, set by `users.setHideRoasts`, shown as the "Hide roasts from my profile" toggle at the foot of the owner's own all-marks screen (3a), where the mockup places it, captioned "Mr Fumble and Sayed Malek. Still visible inside each game." When true, Mr Fumble and Sayed Malek are left out of the cabinet other viewers see: not in the count, not in the kinds list, not as "Not yet" (that would reveal them). The owner's own cabinet shows them with a "Hidden from others" caption. On the Game screen every viewer who can see the Game sees every mark, roasts included, because that is "the people in that game". A per-mark flag was rejected: the mockup has one toggle, and a per-mark model needs a management screen.

**D7. Who sees what.**

| Surface | Rule |
| --- | --- |
| `marks.forGame` | `canViewGame`. Participants, marks, the window and the MVP state are visible to anyone who can open the Game. Vote tallies only after settlement. The `tiedUserIds` list only to Organizers while the state is `tie`. |
| `marks.cabinet`, `marks.kindDetail` | `mayViewPlayer`, then `matchHistoryHidden`: a viewer the owner's Match history visibility excludes sees no cabinet at all, because marks are history. D6 applies on top. |
| Kind detail rows | Each row names the Game, score, date and giver; "Open game" shows only when `canViewGame`. The same accepted leak as the Player profile's E9: anyone allowed to see the profile sees the Games the marks came from. |
| Writes | `give`, `retract`, `castMvpVote`: a participant with an account, window open. `setMvp`: an Organizer, window open, mode `organizer` or state `tie`. `setMvpMode`: an Organizer, Match not completed. `setHideRoasts`: the User themself. |

**D8. A new `marks` router.** `packages/api/src/routers/marks/`, one procedure per file, mounted as `marks` in `root.ts`. Marks are their own door set used from the Game screen, the profile and the all-marks screen; putting eight procedures under `games` and `users` would scatter them. Two shared modules under `packages/api/src/marks/` because two or more doors and the Job handler use them: `match-participants.ts` (participants with side, account flag, goals, keeper) and `settle-mvp.ts` (load, compute with the domain rule, write, notify). The window and every eligibility rule are pure and live in `@repo/domain/marks`. No Zod schema is shared: each door's input is inline. `games.byId` is not widened; the Game screen runs a second query.

**D9. Caps are enforced in the transaction.** `marks.give` locks the Match row `for update`, counts the giver's marks on the Match, refuses at three, and relies on the unique `(match_id, giver_user_id, receiver_user_id)` for one-per-receiver. A giver may `retract` their own mark while the window is open and give it to someone else; a mistap should not be permanent for 48 hours.

**D10. Notifications.** Three new types, all through `notify()`:

- `mark_received` to the receiver, actor = giver, with a new nullable `notifications.mark_kind` column. One row per mark, dedupe key `mark_received:<markId>`. A retracted mark leaves its row; the copy reads from `mark_kind`, not from the mark. Section 14 asks whether to digest instead.
- `mvp_decided` to every participant with an account when the MVP settles with a winner, actor = the MVP, dedupe `mvp_decided:<gameId>`. The MVP's own row reads "You're the MVP of <Game>".
- `mvp_tie_break` to the Organizers (admin audience) once when a vote ties, dedupe `mvp_tie_break:<gameId>`.
- "Marks are open" rides on the existing `game_finished` Notification, whose player subline gains "Give your marks before <closes>" when the Game has a window. No new row at completion.
- `gameNotificationsSuppressed` applies as everywhere. Email follows automatically (email spec: every type), so the email ticket set needs the three new copy entries; this spec lists them (section 9).

**D11. Create flow and Edit.** `createGameInputSchema` gains `mvpMode: z.enum(["vote","organizer","none"]).optional()`, refused when `format !== "friendly_game"`. Step 4 on both clients shows the three-option picker with the mockup's labels and help, and the read-only "Marks · Open 48h after the score" row. The Edit game sheet gains the same picker while the Match is not completed, through `marks.setMvpMode`. Tournament and Americano create flows show nothing.

**D12. Where the MVP and marks show beyond the Game screen.**

- Result card: `ResultCardBase` gains `mvp: { name, decidedBy } | null`. Both story canvases draw one line with the gold coin when set. The sticker does not change.
- Games hub history card: `games.listMyGames` history rows gain `viewerMarks: MarkKind[]` (the kinds the viewer received on that Game, up to three shown) and `viewerIsMvp: boolean`. The card shows the coins at size 20 after the score. This is the mockup's "games list strip".
- Profile: one "Marks, N received" row near the top of the Player profile (own and others), the top coins with ×N (four in the mockup), opening the all-marks screen (3a) with Football / Padel tabs, each listing the twelve kinds of that sport grouped by giver group, with count, "last from <name>, <Game>" and "Not yet", and a footer "N of 12 kinds not yet". Tapping a kind opens the detail (3b).

**D13. Domain module `@repo/domain/marks`.** Clients and the server both use it, so it qualifies.

| Export | Meaning |
| --- | --- |
| `MARK_KINDS`, `MarkKind` | The twelve givable kinds, in display order. |
| `COIN_KINDS`, `CoinKind` | `MarkKind` plus `"mvp"`, for coins and the cabinet. |
| `MARK_META[kind]` | `{ group: "teammate" \| "anyone" \| "opponent", sports: Sport[], roast: boolean }`. |
| `MARKS_PER_GAME = 3`, `MARKS_WINDOW_HOURS = 48` | Constants. |
| `marksWindow(completedAt, now)` | `null` \| `{ state: "open", opensAt, closesAt }` \| `{ state: "closed", opensAt, closesAt }`. |
| `markRelation(giverSlot, receiverSlot)` | `"teammate"` \| `"opponent"`. |
| `givableKinds({ sport, relation })` | The kinds a giver may give a receiver: teammate group when teammate, opponent group when opponent, anyone group always, filtered by sport. |
| `canGiveMark(args)` | `{ ok: true }` or `{ ok: false, reason }` with reasons `self`, `not_participant`, `window_closed`, `cap_reached`, `already_marked_receiver`, `kind_not_allowed`. |
| `remainingMarks(given)` | `3 − given.length`, floored at 0. |
| `mvpTally(votes)` | Counts per candidate, leaders. |
| `mvpOutcome(args)` | The D5 rule: `{ state: "none" \| "pending" \| "tie" \| "decided", userId, decidedBy, tiedUserIds }`. |
| `cabinetKinds(sport)` | The twelve `CoinKind`s shown on that sport's tab, grouped. |
| `cabinetView(rows, sport, viewerIsOwner, hideRoasts)` | Counts, "not yet" tally, roast filtering for the 3a, 3c and 3d screens. |
| Copy: `markName`, `markDescription`, `giverGroupLabel`, `mvpModeCopy`, `mvpDecidedByCopy`, `marksClosesCopy(closesAt, locale)`, `voteProgressCopy` | Read the catalog; every takes `locale` last. |
| `marks-fixtures.ts` | Every state in section 6 for both clients' tests. |

The reasoning that needs the database (who sat where, goals, votes) stays in the procedure files and the two shared modules.

**D14. Sport on the cabinet.** A mark's sport is its Game's sport. Clutch received in a football Game counts on the Football tab only. MVP counts per sport the same way. Tabs shown: the sports the User has marks in, plus their Sports played, Padel first; a User with nothing shows both tabs empty with twelve "Not yet" rows each.

**D15. Everything renders from ids and numbers.** Procedures return kinds, ids, counts and dates. Names, descriptions, group labels and relative times come from the catalog through `@repo/domain/marks` on the client, per ADR-0052. Mark names in Arabic are the set's Arabic names; player, Group and Venue names stay as typed; counts and scores stay left to right in Archivo.

## 6. Edge cases

| # | Case | Handling |
| --- | --- | --- |
| E1 | Organizer confirms the score and is not seated | `completed_at` set anyway; window opens for the seated players; the Organizer gives nothing. |
| E2 | Wrong score reported 10 hours into the window | Window suspended, Job removed, MVP decision cleared, marks and votes kept. Re-completion restarts a full 48 hours. |
| E3 | Give a fourth mark | Refused `cap_reached`; the sheet already hides "Choose a player" at 0 remaining. |
| E4 | Give a second mark to the same receiver | Refused `already_marked_receiver` (unique constraint backs the rule). |
| E5 | Give a mark to yourself | Refused `self`; the sheet never lists the viewer. |
| E6 | Smash Machine in a football Game | Not in `givableKinds`; refused `kind_not_allowed` if forced. |
| E7 | Opponent mark to a teammate | Refused `kind_not_allowed`; the sheet shows the opponent group only when an opponent is picked. |
| E8 | Both padel players on one side answered Either, no Position recorded | Irrelevant: the relation is by Game team, not Position. |
| E9 | Receiver is an Unclaimed player | Allowed. Shown "Not on Temba yet". Not notified. May be voted MVP. |
| E10 | Giver leaves the Group after the Game | Still seated on the Match; may give. The roster is the record. |
| E11 | Organizer removes a player from a Played game | The seat row goes; marks to and from that User stay as history and still count in their cabinet. Accepted. |
| E12 | Everyone voted, tie, Organizer never picks | State `tie` until `closesAt`, then no MVP. |
| E13 | Everyone voted, one leader | Settled at once; Job removed; `mvp_decided` goes out early. |
| E14 | Zero eligible voters (all Unclaimed) | Vote settles at `closesAt` with no MVP. |
| E15 | Organizer mode, Organizer changes the pick three times | Screen shows the current pick with "can change until <closes>"; one `mvp_decided` at `closesAt`. |
| E16 | Mode `none` | No MVP row anywhere; marks unchanged. |
| E17 | Legacy Game completed before this ships | `mvp_mode = none`, window closed, zero marks: the Game screen shows no marks section at all. |
| E18 | Worker down past `closesAt` | `forGame` settles lazily; notifications go out when the Job finally runs (idempotent on `mvp_settled_at`). |
| E19 | Viewer excluded by Match history visibility | No cabinet row, no cabinet screens, `NOT_FOUND` on the kind detail. |
| E20 | Owner hides roasts after receiving two | Other viewers' counts drop by two at once; the owner's own view keeps them with the caption. Game screens unchanged. |
| E21 | Soft-archived Community | Giving is allowed (a player act on their own history); Notifications suppressed per the existing rule. |
| E22 | Two devices give at the same second | The Match row lock serialises; the second sees `cap_reached` or the unique conflict. |
| E23 | Client clock ahead | Writes are judged by the server clock; the client shows `closesAt` and refreshes on a refused write. |
| E24 | Tapping a coin on the roster | Shows the givers of that kind to that receiver, with "teammate" or "opponent". |
| E25 | Arabic | Mark names from the set; "×3" and "7 of 12" in Archivo, left to right; coin glyphs not mirrored. |

## 7. Server and client design

### 7.1 Schema

New file `packages/db/src/schema/marks.ts` and new columns on existing tables. One generated migration (`0078_temba_marks.sql`) followed by its backfill statements in the same file; existing migrations are not edited.

```ts
export const MARK_KIND_VALUES = [
  "dynamo", "let_him_cook", "mr_fumble", "sayed_malek",
  "clutch", "mr_ice", "smash_machine", "goal_machine",
  "great_wall", "comeback_king", "underdog", "good_game",
] as const;
export const markKinds = pgEnum("mark_kind", MARK_KIND_VALUES);
export const mvpModes = pgEnum("mvp_mode", ["vote", "organizer", "none"]);
export const mvpDecidedBy = pgEnum("mvp_decided_by", ["vote", "organizer", "tie_break"]);

export const marks = pgTable("marks", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  giverUserId: uuid("giver_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  receiverUserId: uuid("receiver_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: markKinds("kind").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  oneMarkPerReceiver: unique("marks_match_giver_receiver_unique").on(t.matchId, t.giverUserId, t.receiverUserId),
  notSelf: check("marks_not_self_check", sql`${t.giverUserId} <> ${t.receiverUserId}`),
  receiverIdx: index("marks_receiver_user_id_idx").on(t.receiverUserId),
  matchIdx: index("marks_match_id_idx").on(t.matchId),
}));

export const gameMvpVotes = pgTable("game_mvp_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  voterUserId: uuid("voter_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  candidateUserId: uuid("candidate_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  oneVote: unique("game_mvp_votes_game_voter_unique").on(t.gameId, t.voterUserId),
  notSelf: check("game_mvp_votes_not_self_check", sql`${t.voterUserId} <> ${t.candidateUserId}`),
}));
```

Columns added:

| Table | Column | Type | Note |
| --- | --- | --- | --- |
| `matches` | `completed_at` | `timestamp` null | Set with `status = completed`, cleared with the wrong-score reopen. Backfill: `update matches set completed_at = updated_at where status = 'completed'`. |
| `games` | `mvp_mode` | `mvp_mode` not null default `'none'` | Backfill: all existing rows `'none'`. |
| `games` | `mvp_user_id` | `uuid` null, fk `user` on delete set null | The decided MVP. |
| `games` | `mvp_decided_by` | `mvp_decided_by` null | |
| `games` | `mvp_decided_at` | `timestamp` null | |
| `games` | `mvp_settled_at` | `timestamp` null | The question is final; notifications sent. |
| `user` | `hide_roasts` | `boolean` not null default false | |
| `notifications` | `mark_kind` | `mark_kind` null | For `mark_received`. |
| `notification_type` enum | `mark_received`, `mvp_decided`, `mvp_tie_break` | added values | |

Also `matchRelations` gains `marks: many(marks)`; `userRelations` gains `marksReceived`, `marksGiven`; `gameRelations` gains `mvpVotes`, `mvp: one(user)`. `packages/db/src/schema/index.ts` exports the new file. The domain enum parity test pattern (`packages/api/src/domain-enum-parity.ts`) gets a case asserting `MARK_KIND_VALUES` equals `MARK_KINDS`.

### 7.2 Procedures

All under `packages/api/src/routers/marks/`, each file exporting the plain function and the procedure, mounted in `marks/index.ts`, added to `root.ts` as `marks`. Field names are indicative until the first release.

**`marks.forGame({ gameId })`** — query, `canViewGame` or `NOT_FOUND`. Calls `settleMvpIfDue` (shared module) when the window is closed and `mvp_settled_at` is null.

```text
sport, matchId | null
window:  null | { state: "open" | "closed", opensAt, closesAt }
participants: Array<{ userId, name, image, slot: 1 | 2, sideLabel: string | null,  // bib or "Team A/B" key, from existing side-label rules
                      isUnclaimed, isViewer, goals: number | null, keeper: boolean,
                      received: Array<{ kind, count }> }>
marks:   Array<{ id, kind, giverUserId, receiverUserId, createdAt }>
summary: { given: number, givers: number }
viewer:  { isParticipant, canGive, remaining, given: Array<{ receiverUserId, kind }>,
           canVote, vote: string | null, isOrganizer, canPickMvp }
mvp:     { mode, state: "none" | "pending" | "tie" | "decided", userId | null, decidedBy | null,
           decidedAt | null, votes: { cast, eligible }, tally: Array<{ userId, votes }> | null,
           tiedUserIds: string[] | null, closesAt | null }
```

`tally` is non-null only once settled; `tiedUserIds` only to an Organizer while `state === "tie"`.

**`marks.give({ gameId, receiverUserId, kind })`** — mutation. Participant with an account; window open; `canGiveMark` in a transaction with the Match row locked; inserts; `notify(mark_received)`. Returns `{ markId }`. Errors: `FORBIDDEN` with the reason code in `message` for the client's refused-state copy.

**`marks.retract({ gameId, receiverUserId })`** — mutation. The giver's own mark, window open. Returns `{ ok }`.

**`marks.castMvpVote({ gameId, candidateUserId })`** — mutation. Eligible voter, mode `vote`, state `pending`; upsert on `(game_id, voter_user_id)`; then, if `cast === eligible`, `settleMvp` in the same transaction and `removeJob`. Returns `{ ok }`.

**`marks.setMvp({ gameId, userId })`** — mutation. Organizer; window open; mode `organizer` (any participant but the Organizer themself) or state `tie` (one of `tiedUserIds`). Writes `mvp_user_id`, `mvp_decided_by`, `mvp_decided_at`; in a tie-break also settles. Returns `{ ok }`.

**`marks.setMvpMode({ gameId, mode })`** — mutation. Organizer; Friendly game; Match not completed. Returns `{ mode }`.

**`marks.cabinet({ userId })`** — query, `mayViewPlayer`; `matchHistoryHidden` → `{ hidden: true }`. Otherwise:

```text
hidden: false
isOwner, hideRoasts (owner only, else null)
sports: Sport[]                               // tabs, D14
perSport: Record<Sport, { total, mvpCount,
   kinds: Array<{ kind: CoinKind, count, lastFrom: { giverUserId | null, giverName | null, gameId, gameName, playedAt } | null }> }>
```

Roast kinds are omitted from `kinds` for a non-owner viewer when `hideRoasts`.

**`marks.kindDetail({ userId, kind, sport })`** — query, same gates; `NOT_FOUND` for a hidden roast asked by a non-owner. Rows newest first:

```text
rows: Array<{ gameId, matchId, gameName, groupName | null, venueName, playedAt, sport,
              score: string | null,          // "6–4 6–3" or "3–1", from existing result formatting inputs
              outcome: "won" | "lost" | "draw" | null,
              giver: { userId, name, image } | null,   // null for MVP by vote
              relation: "teammate" | "opponent" | null,
              decidedBy: "vote" | "organizer" | "tie_break" | null,   // MVP rows
              canOpenGame }>
```

**`users.setHideRoasts({ hide })`** — mutation in `packages/api/src/routers/users/setHideRoasts.ts`, the `setMatchHistoryVisibility` pattern. `users.myProfile` and `users.profileDetails` gain `hideRoasts` as an additive field for the Settings toggle.

**`games.create`** — input gains `mvpMode` (D11). **`games.listMyGames`** — history rows gain `viewerMarks`, `viewerIsMvp` (D12).

### 7.3 Shared server modules

- `packages/api/src/marks/match-participants.ts`: `loadMatchParticipants(db, match, game)` → side, account flag, goals, keeper, names. Built on `matchSideSeats`.
- `packages/api/src/marks/settle-mvp.ts`: `settleMvp(tx, gameId, now)` loads votes, participants and the window, runs `mvpOutcome`, writes the decision and `mvp_settled_at`, sends `mvp_decided` or `mvp_tie_break`. `settleMvpIfDue` wraps it for the read door.
- `packages/api/src/jobs/handlers/marks.settle-mvp.ts`: `jobName`, `payloadSchema { gameId }`, `handle` → `settleMvp`. Spec `settleMvpJob(gameId, closesAt)` in `jobs/specs.ts`, registered in `task-list.ts`.
- `runMatchCompletionEffect`, `completeMatch`, `reportWrongScore`: the `completed_at` writes and the enqueue/remove calls (three small edits in existing files).

### 7.4 Mobile

- `apps/mobile/src/marks/`: `mark-coin.tsx` (primitive, D1), `marks-section.tsx` (2a rows), `give-marks-sheet.tsx` (2b pick a player, 2c pick the mark), `marks-roster.tsx` (the Marks so far roster on 2a and 2f), `mvp-vote-sheet.tsx` (2d), `mvp-pick-sheet.tsx` (2e), `marks-closed-card.tsx` (2f), `coin-givers-sheet.tsx` (E24), `marks-model.ts` (+ test), `cabinet-row.tsx` (3c, 3d), `cabinet-screen.tsx` (3a), `mark-detail-screen.tsx` (3b).
- Routes: each tab stack gets `players/[userId]/marks.tsx` and `players/[userId]/marks/[kind].tsx` (the `playerPath` helper grows two segments). The own-profile tab reuses them with the viewer's id.
- The Played game screen keeps its one ink `Surface` (the hero). The MVP row while pending is `paper`; after settlement the MVP line joins the hero text. Marks rows are `paper` with hairlines. Sheets use `Sheet`. No new mount animation.
- Create step 4: a `ChoiceCard` group for the MVP mode, with the help lines, plus the read-only Marks row. Edit sheet: the same group while allowed.
- All marks (3a), owner only: the "Hide roasts from my profile" toggle at the foot, with its caption.
- Pull to refresh and refetch on focus as the Played game screen does; `forGame` refetches after every mutation and when `closesAt` passes while the screen is open (one timer, cleared on unmount).

### 7.5 Web

- `apps/web/src/components/marks/`: the same component set, with the web `Surface` wrapper, the drawer and dialog pattern of `friendly-game-join-sheet.tsx` for sheets, and inline SVG coins.
- Routes: `/dashboard/players/[userId]/marks` and `/dashboard/players/[userId]/marks/[kind]`; `dashboard-paths.ts` gains titles "Marks" and the mark name (resolved client-side) and back targets.
- `/dashboard/games/[id]` renders the marks section under the result; `/dashboard/games/[id]/share` draws the MVP line.
- Create step 4 and the Edit game sheet gain the picker; the owner's all-marks page carries the roasts toggle at its foot.

### 7.6 Screens keyed to the mockup

The labels and quoted copy are the mockup's own (English; the Arabic set follows section 9). The bundle also shows the same screens in Arabic (sections 04–06 of the page).

| Label | Screen | Content | Data |
| --- | --- | --- | --- |
| 0a | The set, 13 marks | Thirteen coins at 120 with English and Arabic names, descriptions and eligibility, grouped by giver group, followed by the rules the screens assume. Not a product screen: it is the fixture gallery (`/dashboard/design/marks` on web, the mobile gallery) used to verify coins against the mockup. | `COIN_KINDS`, `MARK_META`, catalog. |
| 1a | Create game, step 4 of 4 | Under Price per player, an "MVP, Decided after the game" picker: "Players vote" (default), "Organizer picks", "No MVP", each with its one-line description and a help line that changes with the pick; a read-only "Marks, Open 48h after the score" row in the summary. | `mvpMode` on create; `marks.setMvpMode` on edit. |
| 2a | Played game, marks open, you haven't given yet | Hero with the score; "MVP not decided yet, Players vote. 7 of 12 have voted, closes Fri 7:00 PM" + Vote; "Give your marks, 3 to give, one per player. Closes Fri 7:00 PM" + Choose a player; "Marks so far, 9 given by 5 players" roster per side, each participant with position, goals, their coins and ×N; Share result. | `forGame` `mvp`, `viewer`, `summary`, `window`, `participants[].received`. |
| 2b | Give marks, pick a player | "Who earned one? 3 marks left. One per player, and not yourself." Participants grouped "Your side, Black (teammate marks and shared marks)" and "Other side, White (opponent marks and shared marks)", the viewer absent; already-marked participants offer Take back. | `give`, `retract`, `participants`. |
| 2c | Give marks, pick the mark | "A mark for Ali. Teammate. Pick one, he'll see who it came from." Kinds from `givableKinds` as coin tiles grouped "For a teammate" (or "For an opponent") and "Roasts, he can hide these from his profile"; a footnote names absent kinds ("Smash Machine isn't here: it's padel only. Opponent marks like The Great Wall only show when you pick someone from the other side."); the picked line, "2 left after this", CTA "Give <mark>". | `givableKinds`, `give`. |
| 2d | MVP, players vote | "Vote for the MVP. One vote, either side, not yourself. Votes stay hidden until it closes Fri 7:00 PM." Radio rows of participants with side, position, goals and coins; "7 of 12 have voted"; "Tie goes to the organizer"; CTA "Vote for <first name>". | `castMvpVote`, `mvp.votes`. |
| 2e | MVP, organizer picks (also the tie-break) | "Pick the MVP. You set this game to organizer's pick. Marks and goals are hints, the call is yours." Radio rows sorted by marks received with hints ("3 goals, Black", "Keeper, White") and "N marks"; in a tie only the tied players; CTA "Make <first name> the MVP". | `setMvp`, `participants`, `mvp.tiedUserIds`. |
| 2f | Played game, closed, MVP decided | Hero with "Yousif Kadhem, MVP. By vote, 7 of 12. Three goals and four marks."; "You gave 2 of 3. Dynamo to Ali, Good Game to Bo. Closed Fri 7:00 PM."; "Marks, 16 given by 11 players" roster as 2a, read-only, the MVP's row carrying the gold coin; footnote "Tap a coin to see who gave it. Roasts a player has hidden still show here, to the people who were in the game." | `mvp`, `viewer.given`, `window.closesAt`, `marks`. |
| 3c | Your profile, marks cabinet at the top | Under the header and sports: "Marks, 11 received" row with the top coins and ×N (MVP ×3, Clutch ×3, Dynamo ×2, Mr Ice ×2 in the mockup), above the Level card. Hidden entirely when `cabinet.hidden`. | `cabinet` |
| 3d | Another player's profile, marks cabinet | The same row on another player's profile, after their Level card and before streaks; roasts absent when hidden. | `cabinet` |
| 3a | Profile, all marks (own profile) | Football / Padel tabs; first the MVP row ("×3 MVP. Twice by vote, once by the organizer. Last one Wed 4 Nov, Gooz of Arad."); "11 marks received in 24 games" and "4 of 12 kinds not yet"; sections "From teammates, 4 kinds", "From anyone, 3 kinds in football", "From opponents, 4 kinds", each kind with coin (earned or `notYet`), name, "Last from Ali M, 4 Nov" or "Not yet", ×N; owner only: "Hide roasts from my profile. Mr Fumble and Sayed Malek. Still visible inside each game." toggle at the foot. | `cabinet.perSport`, `setHideRoasts` |
| 3b | Mark detail, who gave it and when | Coin, name, ×N, description with the giver group ("Won the points that mattered. Anyone in the game can give it."); rows per Game: giver, teammate or opponent, Game and Venue, score, date; "Open game" when allowed; footer "First one Tue 27 Oct. Padel Clutches show under the Padel tab." MVP rows show how each was decided. | `kindDetail` |

## 8. Domain docs

### 8.1 Proposed `CONTEXT.md` additions (the implementer records them in ticket 1; the planner proposes)

**Mark**:
One of twelve honours a player gives another on a completed Friendly game, during the Marks window: a coin with a name, a description, a giver group (teammate, anyone, opponent) and the sports it applies to. Each giver gives at most three per Game and at most one to any one player, never to themselves. A Mark is a Match fact that hangs off both Users' rows. Distinct from the MVP, which nobody gives. Product copy says mark.
_Avoid_: badge, trophy, award, honor (bare), ResultMark or form mark (those are the W/L glyphs), sticker

**Roast**:
A Mark that teases rather than praises: Mr Fumble and Sayed Malek. Counts like any Mark on the Game screen. Its receiver may hide every Roast from their Player profile with one setting; hidden Roasts still show to everyone who can open that Game.
_Avoid_: negative mark, penalty, insult

**MVP**:
The one player of a Friendly game named most valuable after the score, decided the way the Organizer chose at create (**MVP mode**: players vote, Organizer picks, or no MVP). A vote is one per seated account holder, hidden until it closes; a tie goes to the Organizer; no pick by the close means no MVP. Shown on the Played game, the Result card and the cabinet with the gold coin. Not a Mark: nobody gives it.
_Avoid_: man of the match, player of the game, best player, star (bare)

**Marks window**:
The 48 hours after a Match's completion during which Marks are given and the MVP is decided. Anchored on the Match's completion moment, suspended by a wrong-score report, restarted by the next completion. The vote may close earlier when everyone has voted; the window never does. Closed by a Job and by the read-time rule.
_Avoid_: voting period, deadline, grace period

**Cabinet**:
The Marks and MVPs a User has collected, shown on their Player profile per sport: a summary row, every kind with its count or "Not yet", and per kind the Games it came from. Follows Match history visibility; hides Roasts when the owner says so.
_Avoid_: trophy case, collection, badge wall, achievements

**Giver group**:
Who may give a Mark: your teammate or partner (same Game team), anyone in the game, or the other side (the opposing Game team). The giving sheet is grouped by it.
_Avoid_: category, tier

Also: in **Bib**, replace "The only place colour appears in the product." with "One of the two places colour appears in the product; the other is a Mark coin (ADR-0055)." In **Played game**, add a sentence: "During the Marks window its screen also carries the MVP row and the marks rows."

### 8.2 ADR

ADR-0055 "Mark coins are illustrated assets, the second place colour appears" (section 12). No other ADR changes: ADR-0044 (an Organizer's confirmation is final) is the trigger, unchanged; ADR-0030 supplies the Job; ADR-0042 already says what hangs off an Unclaimed player's row.

## 9. i18n

New catalog file `marks.ts` in both `en/` and `ar/`, exported as `marks`; screen-specific copy in `mobile-marks.ts` and `web-marks.ts`; additions to `notification.ts`, `create-game.ts`, `mobile-create-game.ts`, `profile.ts` (settings toggle). Keys, indicative:

```text
marks.kind.<kind>.name                      // 13, including mvp: "MVP" / "نجم المباراة"
marks.kind.<kind>.description               // 12; mvp: "Most valuable player, one per game."
marks.group.teammate / anyone / opponent     // "From your teammate or partner", "From anyone in the game", "From the other side"
marks.roast.hiddenFromOthers                // "Hidden from others"
marks.window.closes(when)                   // "closes Fri 7:00 PM"
marks.window.closed(when)                   // "Closed Fri 7:00 PM"
marks.window.opensAfterScore                // "Open 48h after the score"
marks.give.title, toGive(n) via plural       // "3 to give, one per player"
marks.give.choosePlayer                     // "Choose a player"
marks.give.youGave(given, total)            // "You gave 2 of 3"
marks.give.gaveTo(kind, name)               // "Dynamo to Ali"
marks.give.retract                          // "Take back"
marks.give.refused.<reason>                 // one line per canGiveMark reason
marks.soFar(given, givers) via plural        // "9 given by 5 players"
marks.count(n)                              // "×3"
marks.mvp.mode.vote.label / description / help
marks.mvp.mode.organizer.label / description / help
marks.mvp.mode.none.label / description / help
marks.mvp.notDecided                        // "MVP not decided yet"
marks.mvp.vote, marks.mvp.pick, marks.mvp.changePick
marks.mvp.progress(cast, eligible, when)    // "7 of 12 have voted, closes Fri 7:00 PM"
marks.mvp.byVote(cast, eligible)            // "By vote, 7 of 12"
marks.mvp.organizerPick, marks.mvp.tieBreak // "Organizer's pick", "Tied vote, Organizer's pick"
marks.mvp.noMvp                             // "No MVP this game"
marks.mvp.make(firstName)                   // "Make Yousif the MVP"
marks.mvp.tieNotice(n)                      // "Tied vote, N players. Pick the MVP."
marks.mvp.facts(goals, marks) via plural     // "Three goals and four marks"
marks.cabinet.title, received(n)            // "Marks", "11 received"
marks.cabinet.notYet                        // "Not yet"
marks.cabinet.kindsNotYet(n, total)         // "4 of 12 kinds not yet"
marks.cabinet.lastFrom(name, game)          // "Last from Ali, Thursday padel"
marks.cabinet.fromTeammate / fromOpponent
marks.settings.hideRoasts, hideRoastsHelp
notification.title.markReceived(actor, kind, game), mvpDecided(name, game), youAreMvp(game), mvpTieBreak(game)
notification.subline.marksOpen(when)        // on game_finished, player audience
```

Arabic set names are those in the brief: الدينامو, خلّوه يطبخ, أبو زلّة, سيد مالك, رجل الحسم, أعصاب حديد, ماكينة سماش, ماكينة أهداف, سور الصين, ملك الريمونتادا, الحصان الأسود, يعطيك العافية, نجم المباراة. Counts go through `plural()`.

## 10. Notifications

| Type | Recipients | Audience | When | Dedupe | Copy |
| --- | --- | --- | --- | --- | --- |
| `game_finished` (existing) | unchanged | player | unchanged | unchanged | Player subline gains "Give your marks before Fri 7:00 PM" when the Game has a window. |
| `mark_received` | receiver | player | on `give` | `mark_received:<markId>` | "**Ali** gave you **Dynamo** on **Thursday padel**" |
| `mvp_decided` | participants with an account | player | on settle with a winner | `mvp_decided:<gameId>` | "**Yousif** is the MVP of **Thursday padel**"; the MVP reads "You're the MVP of **Thursday padel**" |
| `mvp_tie_break` | Organizers | admin | on tie | `mvp_tie_break:<gameId>` | "Tied vote on **Thursday padel**. Pick the MVP." |

All rows link to the Game. Unclaimed recipients are dropped by `notify()`. The email channel sends them once the three copy entries exist in the email templates (the email tickets own that; this spec lists it as a dependency in ticket 2).

## 11. Permissions

| Action | Who | Checked by |
| --- | --- | --- |
| See marks, window, MVP state on a Game | anyone `canViewGame` | `forGame` |
| Give, retract a mark | a participant with an account, window open | `give`, `retract` + `canGiveMark` |
| Vote | eligible voter, mode `vote`, state `pending` | `castMvpVote` |
| Pick MVP | Organizer, window open, mode `organizer` or state `tie` | `setMvp` |
| Change MVP mode | Organizer, Friendly game, Match not completed | `setMvpMode`, `games.create` |
| See a cabinet | `mayViewPlayer` and not `matchHistoryHidden` | `cabinet`, `kindDetail` |
| See hidden roasts in a cabinet | the owner | `cabinet` |
| Hide roasts | the owner | `setHideRoasts` |

## 12. ADR-0055 (draft, for `docs/adr/0055-mark-coins-are-illustrated-assets.md`)

```markdown
# Mark coins are illustrated assets, the second place colour appears

**Status:** accepted. Spec: `.scratch/temba-marks/spec.md`. Amends the "no accent colour" rule of `.scratch/mobile-and-api-server/spec.md` section 4 and `.scratch/retire-volt-accent/spec.md`, and the Bib entry in `CONTEXT.md`.

Temba's design system is black and white: ink, paper, a grey ramp, red for danger, and no accent. Marks are coins, and a coin without colour is a grey disc. The mockup makes the coins the only colour in the app.

## Decision

- **A coin is an illustrated asset, like a Bib colour: data a player earned, never chrome.** Its colours appear only inside the coin. No button, bar, background, text or badge takes a coin colour, and no theme token is derived from one.
- **Coins ship as data in `@repo/design-tokens`**, beside `bibColors`: the thirteen SVGs are committed as source and transcribed into `marks.ts` as geometry plus four tones (disc, shade, ink, paper). Each client renders them through one `MarkCoin` primitive (`react-native-svg` on mobile, inline SVG on web). Clients never import the SVG files or a bitmap.
- **"Not yet" is hatched.** A coin not yet earned is drawn as a hatched disc with its glyph in `muted`, carrying no coin colour, so the one meaning Hatch has stays intact.
- **Coins are decorative to assistive technology.** The adjacent text carries the mark name.
- **The hex-literal lint stays.** Coin colours live in the tokens Package, where hex literals are allowed.

**Considered options**: PNG or bitmap sprites per App (two copies to drift, blurry at 120 and heavier than 12 KB of paths); a monochrome coin set (every coin becomes the same grey disc, the set stops being collectible); a themed accent per coin (reintroduces chroma into chrome, which ADR retire-volt removed).

## Consequences

- The glossary's Bib is no longer "the only place colour appears"; Bib and Mark coins are the two.
- Adding a coin means adding an SVG and its data entry; the tone test guards the four-tone rule.
- A design review of any surface asks: is this colour inside a coin? If not, it is a defect.
```

## 13. Testing

- **`@repo/domain/marks`** (Vitest): `marksWindow` at the boundaries and with `null`; `givableKinds` for every (sport, relation); `canGiveMark` for every reason; `remainingMarks`; `mvpTally` and `mvpOutcome` for every row of D5 (none, pending, early close, tie then pick, tie then timeout, organizer pick and change, zero voters); `cabinetKinds` per sport (twelve each); `cabinetView` with roast hiding for owner and non-owner; copy functions in both locales; fixtures.
- **`@repo/design-tokens`**: every `CoinKind` has a coin; every fill in each SVG maps to one of its four tones; `bibColors` test unchanged.
- **Procedures** (PGlite, through the exported functions):
  - `forGame`: `NOT_FOUND` for a non-viewer; `window === null` before completion; open and closed states; tally hidden then shown; `tiedUserIds` to Organizer only; lazy settle when the window has closed.
  - `give`: happy path, each refusal, Unclaimed receiver, cap race (two sequential gives then the fourth), notification row written with `mark_kind`.
  - `retract`: own mark, someone else's, after close.
  - `castMvpVote`: upsert, self-vote refused, non-participant refused, early settle when everyone voted (Job removed via `RecordingJobSink`), tie produces `mvp_tie_break` once.
  - `setMvp`: organizer mode, self-pick refused, tie-break restricted to tied, outside window refused, change of pick.
  - `setMvpMode`: before and after completion; non-Friendly game refused.
  - `cabinet`, `kindDetail`: per-sport counts, MVP counted per sport, roast hiding for owner and viewer, `hidden: true` under Match history visibility, `NOT_FOUND` for a hidden roast detail.
  - `games.create` with `mvpMode` on each format; `games.listMyGames` additive fields.
- **Completion path**: `runMatchCompletionEffect` and `completeMatch` set `completed_at` and enqueue `marks.settle-mvp` at +48h (recorded sink); `reportWrongScore` clears it and removes the Job; re-completion enqueues again.
- **Job handler**: `handle(db, { gameId })` settles, writes `mvp_settled_at`, notifies once; a second run is a no-op.
- **Notifications**: `notification-copy` renders the three new types in both locales; `game_finished` subline with and without a window.
- **Clients**: `marks-model` tests (sheet grouping, remaining count, refused copy, countdown refresh), `playerPath` segments, `dashboard-paths` titles; the web `MarkCoin` snapshot per state; the mobile gallery screen compared with 0a by hand.
- **Manual**: an iPhone pass of 1a, 2a–2f and 3a–3d in English and Arabic, side by side with web at 390 px; the Job observed on local Postgres with a shortened window (`MARKS_WINDOW_HOURS` overridden in a dev env only).

## 14. Open questions for the owner

Each has a recommended call already in the spec; implementation proceeds on it unless the owner says otherwise.

1. **Colour exception (D1).** Confirm that coins may be the second colour exception beside Bib, and that "not yet" is a hatched disc with a grey glyph.
2. **Window after a wrong-score report (D3).** Recommended: suspend and restart a full 48 hours on re-completion, keeping marks and votes. Alternative: keep the original `closesAt`.
3. **Scope v1 (D4).** Recommended: Friendly games only, both sports, Booking Games included; tournaments and Americano later. Confirm.
4. **Retract (D9).** Recommended: a giver may take a mark back while the window is open. Alternative: marks are final on give.
5. **MVP self-pick (D5).** Recommended: an Organizer never picks themselves in organizer mode but may break a tie in their own favour when the votes tied on them.
6. **When the MVP notification goes out (D5, E15).** Recommended: at settlement (vote closes, or `closesAt` in organizer mode). Alternative: on the first organizer pick, with no further notice on changes.
7. **`mark_received` volume (D10).** Recommended: one Notification per mark received. Alternative: one digest row per Game at close ("You received 4 marks on Thursday padel").
8. **Who sees hidden roasts on the Game screen (D6).** Recommended: everyone who can open the Game, which includes Group members who did not play. Alternative: participants only.
9. **Hub strip (D12).** Confirm "the games list strip" means the viewer's own coins on the history card, not a strip of every mark on the Game.
10. **Legacy Games (E17).** Recommended: `mvp_mode = none` and no retroactive window for Games completed before release. Confirm.

## 15. Risks

- **Two colour exceptions start a trend.** Mitigation: ADR-0055 names the test ("is this colour inside a coin?") and the tokens Package is the only legal home.
- **A Job is new to the Games domain.** Payment and Booking Jobs exist; this is the first Game Job. The lazy settle on read means a worker outage degrades notifications, not correctness.
- **Settling on a read door writes.** `forGame` may write `mvp_settled_at` and Notifications. Accepted and idempotent; the alternative (clients showing "pending" past the close) is worse. Section 7.3 isolates it in `settleMvpIfDue`.
- **Marks as a social pressure surface.** Roasts can sting. Mitigation: the hide toggle, the giver-visible rule (every coin shows who gave it), the 48-hour window, and retract. An Operator removal tool is a recorded follow-up.
- **`completed_at` backfill from `updated_at`** is approximate for old Matches; it only decides that their windows are closed, which they are.
- **Additive-only API.** The mobile App is unreleased, so field names may still change before Phase 7; after release `forGame` and `cabinet` only grow.
- **Query cost of the cabinet.** One grouped count over `marks` joined to `matches` and `games` per User, plus the MVP count from `games`. Indexed on `receiver_user_id`. Fine at today's sizes.

## 16. Tickets (in Linear as TEM-418 … TEM-429)

Vertical slices in dependency order; API first, then mobile, then web, as the owner asked. Each ticket ends with `pnpm exec turbo run typecheck lint test` green. Avoid file paths in the Linear description; they are in sections 7.2–7.5 for the implementer.

| # | Linear | Title | Blocked by |
| --- | --- | --- | --- |
| 1 | TEM-418 | Give and see Marks on a completed Friendly game (API) | none |
| 2 | TEM-420 | Decide the MVP by vote or by the Organizer, with the 48-hour Job (API) | 1 |
| 3 | TEM-421 | The cabinet: Marks per sport on a profile, hide roasts (API) | 1, 2 |
| 4 | TEM-419 | Coins as data: `MarkCoin` on both clients and ADR-0055 | none |
| 5 | TEM-422 | Mobile: MVP mode on create step 4 and Edit game | 2 |
| 6 | TEM-423 | Mobile: Marks and MVP on the Played game screen | 1, 2, 4 |
| 7 | TEM-427 | Mobile: the cabinet on the profile and the roasts toggle | 3, 4 |
| 8 | TEM-424 | MVP on the Result card and coins on the games hub (API field + mobile) | 2, 4 |
| 9 | TEM-425 | Web: MVP mode on create step 4 and Edit game | 2 |
| 10 | TEM-426 | Web: Marks and MVP on the Game details page | 1, 2, 4 |
| 11 | TEM-428 | Web: the cabinet on the profile and the roasts toggle | 3, 4 |
| 12 | TEM-429 | Web: MVP on the share page and coins on the games hub | 8 |

### Ticket 1 (TEM-418): Give and see Marks on a completed Friendly game (API)

**What to build.** After a Friendly game's score is confirmed, a seated account holder can give up to three Marks to others on the Match for 48 hours, within the giver-group and sport rules, take one back, and anyone who can open the Game can read the marks, the window and who gave what.

- Schema: `marks` table, `matches.completed_at` (set by both completion paths, cleared by the wrong-score reopen, backfilled), the `mark_received` notification type with `notifications.mark_kind`; one new migration.
- `@repo/domain/marks`: kinds, meta, window, relation, `givableKinds`, `canGiveMark`, `remainingMarks`, copy functions, fixtures. `@repo/i18n` `marks.ts` in both locales (names, descriptions, groups, window and give copy) and the notification copy.
- `marks.forGame`, `marks.give`, `marks.retract`; the shared `match-participants` module; the router mounted as `marks`.
- `game_finished` player subline gains the "give your marks before" line.
- `CONTEXT.md` terms from 8.1 (Mark, Roast, Marks window, Giver group; Played game sentence).

**Acceptance criteria.**
- A seated account holder on a completed padel or football Friendly game gives a mark; a fourth mark, a second to the same receiver, a self-mark, a sport-wrong kind, a group-wrong kind, and any mark after `closesAt` or before completion are refused with the reason code.
- Unclaimed players can receive, cannot give; they get no Notification.
- `forGame` returns `window === null` before completion, `open` with `closesAt = completed_at + 48h` after, `closed` after that; `NOT_FOUND` for a viewer who cannot open the Game.
- A wrong-score report clears `completed_at`, refuses writes, keeps marks; re-completion restarts the window.
- The receiver gets one `mark_received` row per mark, rendered in both locales; a retract leaves the row.
- The domain tests in section 13 pass; every procedure test runs on PGlite through the exported function.
- `games.byId`, `games.footballBoard` and every existing procedure output are unchanged.

### Ticket 2 (TEM-420): Decide the MVP by vote or by the Organizer, with the 48-hour Job (API)

**What to build.** A Friendly game carries an MVP mode chosen at create, players vote or the Organizer picks during the window, votes stay hidden until the vote closes, a tie goes to the Organizer, and the question settles by a Job at the window's close or earlier when everyone has voted.

- Schema: `games.mvp_mode`, `mvp_user_id`, `mvp_decided_by`, `mvp_decided_at`, `mvp_settled_at`; `game_mvp_votes`; notification types `mvp_decided`, `mvp_tie_break`; migration with the `none` backfill.
- `games.create` input `mvpMode` (Friendly game only; Booking Game path writes `vote`); `marks.setMvpMode`, `marks.castMvpVote`, `marks.setMvp`; `forGame` gains `mvp` and `viewer.canVote`, `canPickMvp`.
- `@repo/domain/marks` `mvpTally`, `mvpOutcome`, MVP copy; catalog entries for the three modes with help lines and the settled lines.
- `settle-mvp` shared module, the `marks.settle-mvp` Job spec and handler, enqueued by both completion paths and removed by the wrong-score reopen; lazy settle on read.
- `CONTEXT.md`: MVP and MVP mode.

**Acceptance criteria.**
- A new Friendly game defaults to `vote`; the Organizer may set `organizer` or `none` on create and change it until the Match completes, never after; tournaments and Americano are `none` and refuse the input.
- Each eligible voter votes once, may change it, never for themselves; `forGame` shows `cast` and `eligible` and the viewer's own vote but no tally while pending.
- When all have voted, the vote settles at once and the Job is removed; otherwise the Job settles at `closesAt`; a read after `closesAt` with the Job not yet run shows the settled state and writes it.
- A tie notifies the Organizers once; `setMvp` accepts only a tied player; no pick by `closesAt` means no MVP.
- In organizer mode the Organizer picks any participant but themselves, may change until `closesAt`, and `mvp_decided` goes out once at settlement; `none` mode exposes no MVP state.
- Zero votes settles with no MVP; a wrong-score report clears the decision and `mvp_settled_at` and keeps the votes.
- Every settle path is idempotent on `mvp_settled_at`; handler tests use the recording sink; existing Game creation outputs are unchanged apart from the new optional input.

### Ticket 3 (TEM-421): The cabinet: Marks per sport on a profile, hide roasts (API)

**What to build.** Anyone who may see a player's profile and their history can read that player's collected Marks and MVPs per sport, every kind with its count and the last giver, and per kind every Game it came from; the owner can hide roasts from other viewers.

- `user.hide_roasts` and `users.setHideRoasts`; `users.myProfile` and `users.profileDetails` gain `hideRoasts`.
- `marks.cabinet` and `marks.kindDetail` with `mayViewPlayer`, `matchHistoryHidden`, roast hiding, per-sport counts, MVP counts, `canOpenGame` per row.
- `@repo/domain/marks` `cabinetKinds`, `cabinetView`, cabinet copy; `CONTEXT.md`: Cabinet.

**Acceptance criteria.**
- Counts split by the Game's sport; MVPs count on the sport they were won in; a kind never received reads as not yet; the Football tab lists twelve kinds (no Smash Machine), the Padel tab twelve (no Goal Machine).
- A non-owner viewer sees no roast kinds at all when the owner hides roasts, and the counts exclude them; the owner sees them flagged.
- A viewer excluded by Match history visibility gets `hidden: true` and `NOT_FOUND` on `kindDetail`; an unshared or unknown User gets `NOT_FOUND`.
- Kind detail rows carry giver, relation, Game, score, date and `canOpenGame`; MVP rows carry how it was decided.
- `users.setHideRoasts` writes the column; existing profile outputs only gain the new field.

### Ticket 4 (TEM-419): Coins as data: `MarkCoin` on both clients and ADR-0055

**What to build.** The thirteen coins render identically on mobile and web from one data source, in earned and not-yet states, and the colour decision is recorded.

- The SVGs committed under `@repo/design-tokens`, transcribed to `marks.ts` with the four-tone model and a test against the files.
- `MarkCoin` primitive on mobile (`react-native-svg`) and web (inline SVG) with `kind`, `size`, `state`; decorative to assistive technology.
- A gallery screen on each client showing the set (0a) in both states at 120, 44 and 20.
- `docs/adr/0055-mark-coins-are-illustrated-assets.md` from section 12; the Bib glossary sentence.

**Acceptance criteria.**
- Every `CoinKind` renders at every listed size on both clients with no visible difference from the mockup's coins at 120.
- `notYet` shows a hatched disc with a hairline and a grey glyph and no coin colour.
- The mobile lint (no hex outside tokens, no shadows) passes; no client imports an `.svg` file.
- The tokens test fails if a coin's SVG uses a fill outside its four tones.

### Ticket 5 (TEM-422): Mobile: MVP mode on create step 4 and Edit game

**What to build.** An Organizer creating a Friendly game on mobile picks how the MVP is decided on step 4 and sees that marks open 48 hours after the score; the Edit game sheet lets them change the mode until the score is confirmed.

**Acceptance criteria.**
- Step 4 shows the three options with the mockup's label, description and help, Players vote preselected, plus the read-only Marks row; the review card repeats the choice; the create call carries `mvpMode`.
- Tournament and Americano flows show nothing new.
- The Edit sheet shows the picker only while the Match is not completed and saves through `marks.setMvpMode`; after completion it shows the mode read-only.
- Every string comes from the catalog in both locales; `ChoiceCard` is the control; no new colour or motion.

### Ticket 6 (TEM-423): Mobile: Marks and MVP on the Played game screen

**What to build.** On a Played Friendly game, a seated player gives their three marks through a sheet, votes or (as Organizer) picks the MVP, watches the roster fill with coins, and after the close sees the MVP line and what they gave; everyone who can open the Game sees the marks and who gave each one.

**Acceptance criteria.**
- 2a: the MVP row and the Give your marks row appear only while `window` is open or an MVP exists; the Marks so far roster shows both sides with each participant's coins and ×N and its header counts given and givers; the section is absent when the window is `null` or closed with nothing to show.
- 2b: the sheet lists participants except the viewer, grouped "Your side" (teammate and shared marks) and "Other side" (opponent and shared marks), already-marked ones with a Take back action, and the remaining count in the subtitle.
- 2c: the kinds offered are exactly `givableKinds` for that receiver, grouped by giver group with the Roasts group captioned that the receiver can hide them; a footnote names why a kind is absent (sport, side); the "N left after this" line and the "Give <mark>" CTA update with the pick; a refused give shows the reason copy and refreshes.
- E24: tapping a coin on the roster (2a, 2f) lists the givers with teammate or opponent.
- 2d: the vote sheet shows the progress line and the viewer's current vote; votes are never shown per player before settlement.
- 2e: the Organizer sheet sorts by marks then goals, shows the hints, restricts to tied players in a tie, and the CTA reads "Make <first name> the MVP".
- 2f: the settled MVP line, "You gave N of 3" with the pairs, and "Closed <when>".
- `forGame` refetches after each mutation and when `closesAt` passes; the screen keeps one ink Surface and no new mount animation; Arabic renders names as typed and counts left to right.

### Ticket 7 (TEM-427): Mobile: the cabinet on the profile and the roasts toggle

**What to build.** A player's profile shows "Marks, N received" with the top coins, opening an all-marks screen per sport and a per-kind detail of the Games it came from; at the foot of their own all-marks screen the owner can hide roasts from others.

**Acceptance criteria.**
- 3c and 3d: the "Marks, N received" row with the top coins and ×N sits near the top of both the own profile and another player's profile; it is absent when the cabinet is hidden by Match history visibility.
- 3a: Football / Padel tabs per D14; the MVP row first ("×3 MVP, Twice by vote, once by the organizer. Last one <date>, <Group>"); "N marks received in M games" and "N of 12 kinds not yet"; kinds grouped by giver group with earned or not-yet coins, counts and last-from lines; the owner sees hidden roasts captioned and the "Hide roasts from my profile" toggle at the foot, which saves through `users.setHideRoasts`.
- 3b: coin, name, description, count; rows with giver, relation, Game, score, date, and "Open game" when allowed; a footer with the first date and a note that the other sport's marks sit under its tab; MVP detail shows how each was decided.
- 3d: another player's hidden roasts are absent from the row, the all-marks screen and the counts.
- Routes exist in every tab stack via `playerPath`; targets are 44 pt; coins are decorative with text labels.

### Ticket 8 (TEM-424): MVP on the Result card and coins on the games hub (API field + mobile)

**What to build.** A shared Result card names the MVP with the gold coin when one is decided, and the games hub history card shows the coins the viewer received on that Game and whether they were MVP.

- `ResultCardBase.mvp`; `games.listMyGames` history rows gain `viewerMarks` and `viewerIsMvp`; the mobile story canvas and history card render them.

**Acceptance criteria.**
- The story shows one MVP line when settled with a winner and nothing otherwise; the sticker is unchanged.
- The history card shows up to three coins at 20 and the MVP coin first when `viewerIsMvp`; cards without marks are unchanged.
- `listMyGames` existing fields are unchanged; the new fields are tested on PGlite.

### Ticket 9 (TEM-425): Web: MVP mode on create step 4 and Edit game

**What to build.** The same as ticket 5 on the web create flow and the Edit game sheet.

**Acceptance criteria.** As ticket 5, with the web choice controls, keyboard reachable with a visible focus ring, and the `createGame` catalog entries shared with mobile.

### Ticket 10 (TEM-426): Web: Marks and MVP on the Game details page

**What to build.** The same as ticket 6 on `/dashboard/games/[id]`, with sheets as drawers and dialogs.

**Acceptance criteria.** As ticket 6; plus keyboard operation of every sheet, coin givers in a popover or dialog, and a side-by-side match with mobile at 390 px.

### Ticket 11 (TEM-428): Web: the cabinet on the profile and the roasts toggle

**What to build.** The same as ticket 7 on `/dashboard/players/[userId]`, `/marks`, `/marks/[kind]`, and the toggle at the foot of the owner's own all-marks page.

**Acceptance criteria.** As ticket 7; `dashboard-paths.ts` titles and back targets tested; the design gallery page shows the set (0a).

### Ticket 12 (TEM-429): Web: MVP on the share page and coins on the games hub

**What to build.** The same as ticket 8 on `/dashboard/games/[id]/share` and the web games hub cards.

**Acceptance criteria.** As ticket 8 for the web canvases and cards.

## Comments

_None yet._
