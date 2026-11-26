Status: built in code, DL-1 to DL-9 (TEM-497 … TEM-505), not yet tried on a device or with two
signed-in sessions. The product owner settled the seven open questions on 2026-11-21 (section 16).
The glossary entries are in `CONTEXT.md`, the decisions are ADR-0107, ADR-0108 and ADR-0109, and
the tickets are in Linear (section 18). Migration 0136 holds the schema.

How a rule below was decided is marked on it: *Settled, 1a* means the design settles it on that
screen; *Settled by the product owner (decision N)* points at section 16; *Planning decision*
means the design is silent and planning chose, and section 16 lists those.

Design: `.scratch/design-import/football-draft-line-up.html` ("Draft line-up", screens 1a–1c, 2a–2b,
3a–3c, 4a–4d). Screen ids used below are the design's: `dl-make` 1a, `dl-captain` 1b, `dl-hub` 1c,
`dl-captain-view` 2a, `dl-player` 2b, `dl-share` 3a, `dl-card-both` 3b, `dl-card-one` 3c,
`dl-pick-setup` 4a, `dl-pick-wait` 4b, `dl-pick-live` 4c, `dl-pick-org` 4d. The import is a
bundled page to open in a browser; for reading, `.scratch/football-draft-line-up/design/` holds
`draft-line-up.copy.txt` (every visible string in order, with the screen ids and the designer's
rule notes) and `draft-line-up.source.html` (the markup, with the prototype's state script at the
end; search it by `data-screen-label`).

Builds on `.scratch/football/spec.md` (the football Game, Make teams, the Score), the Share result
screen, `.scratch/in-app-notifications/spec.md` and the polling the Live board settled
([ADR-0102](../../docs/adr/0102-a-live-board-is-a-web-page-a-tv-opens-with-a-board-code.md)).

# Football: Draft line-up, captains, and Captain pick

## 1. Problem

An Organizer of a football Game splits the roster into two teams and publishes. Publishing is the
only way to show the teams to anyone, so Organizers screenshot Make teams and send it to the two
players they trust to run each side, argue the balance on WhatsApp, then come back and publish. In
many groups the Organizer does not pick the teams at all: two captains pick in turn, on the pitch
or in a call, and the Organizer types the result in.

Three flows, all on the football Make teams step:

1. **Draft line-up.** Save the teams without publishing, see the draft on the Game, share it as an
   image.
2. **Captains.** Name one captain per team; a captain sees the draft and approves their own team
   or asks for a change. Approval never blocks publishing.
3. **Captain pick.** A third way to make teams beside By level and Manual: two captains pick
   players one at a time in a room they share, the Organizer watching and able to step in. The
   result is a saved draft.

## 2. Current behaviour (read in the code)

- **A football Game** is a Friendly game with Roster registration (`game_players` rows with
  `football_role`, `football_position`). It has no Game teams and no Match until its Organizer
  publishes.
- **Make teams** exists on both Apps: mobile `apps/mobile/app/(app)/games/[id]/teams.tsx` →
  `apps/mobile/src/football/make-teams-screen.tsx`; web
  `apps/web/src/app/dashboard/games/[id]/teams/page.tsx` →
  `apps/web/src/components/games/football-make-teams.tsx`. Two methods, `level` and `manual`
  (`FOOTBALL_TEAMS_METHODS` in `packages/domain/src/football-lineup.ts`, a Postgres enum
  `football_teams_method`). By level is a keepers-first snake split (`balanceFootballSides`) with
  Shuffle and a move-across arrow; Manual places each player by tapping a bib swatch. The screen's
  unsaved state is `TeamsDraft` in `packages/domain/src/football-board.ts`; it lives in memory only.
- **Publish** is `games.publishFootballTeams`
  (`packages/api/src/routers/games/publishFootballTeams.ts`): Organizer only
  (`assertGameOrganizer`), refused on a Challenge Game (`requireNotChallengeGame`) and on a
  cancelled Game; the two bibs must differ; every registered player on exactly one side; sides may
  differ by one (`footballSidesProblem`). It upserts two `game_teams` rows (side index 1 and 2, a
  bib), rewrites `game_team_players`, sets `games.football_teams_method`, and on the first publish
  inserts the Game's one Match. Publishing again replaces the split and deletes the Match's result
  confirmations; it is refused once a Score is in or the Match is completed. It sends no
  Notification.
- **The read** is `games.footballBoard` (`packages/api/src/routers/games/footballBoard.ts`): the
  roster with each player's role, position, OVR, Group Tier and `sideIndex`; `teams` (method and
  bibs) only when both sides and a Match exist; `viewer.canMakeTeams` (Organizer, not a Challenge
  Game, not cancelled, no Score, at least two registered). `balanceStrength` goes to Organizers
  only. Who may call it is `gameReach` (`packages/api/src/games/verifier-stamp.ts`): anyone who can
  view the Game, plus a Verifier of the Venue as `stamp_only`.
- **The Game screen**: mobile `apps/mobile/src/game-details/football-details-screen.tsx` shows
  `TeamColumns` when `board.teams` is set, otherwise the pool; the Organizer card
  (`football-organizer-card.tsx`) carries Make teams or Edit teams. Web is
  `apps/web/src/components/games/football-game-details.tsx`.
- **Roster changes after publish.** Leave and kick delete the `game_players` row and the foreign
  key cascade removes the player from their side; nothing rebalances. A player who joins, is added
  or is promoted from the Waitlist lands on no side (`sideIndex: null`) and Make teams refuses to
  publish again until they are placed. A Football role may change at any time before the Game is
  cancelled; keeper seats are two per Game, not one per side. Edit game refuses a new Side size
  once any `game_teams` row exists.
- **Who is an Organizer.** `isGameOrganizer` (`packages/api/src/games/access.ts`): on a Group Game
  the Group creator and Appointed Organizers, which is the same set as Group approvers and Game
  admins; on a Booking Game or Public Game the creator alone; on a Challenge Game whoever acts for
  either Team.
- **Share result**: mobile `apps/mobile/src/share-result/*` (route `games/[id]/share`), web
  `apps/web/src/components/share-result/*`; the card model is
  `packages/domain/src/game-result-share.ts`; PNG by `react-native-view-shot` on mobile and
  `html-to-image` on web. A second 1080 by 1920 teams image already exists for Alone-only Socials
  (`games/[id]/share-teams`, ADR-0096).
- **Live updates.** There is no websocket, SSE or subscription anywhere; ADR-0102 turned them
  down. Everything live is polled: the Live board every 5 s, payment state every 2 s. The Live
  board already has presence by heartbeat on read (`live_board_tvs.last_seen_at`, seen within
  45 s). There is no push (Phase 7 not started). In-app Notifications (`notify` in
  `packages/api/src/notifications/notify.ts`) each send a Notification email automatically. A
  "Remind" precedent exists (`gamePayments.remind`, once a day by dedupe key).
- **"Captain" in code today** always means a Team's creator (`teams.created_by`, ADR-0059) and
  the Captain who names a Matchday squad on a Challenge Game. Friendly football carries captain
  copy with no data behind it: "Captains pick starters before kick-off."
  (`mobileGameDetails.football.captainsNote`) and `captainsPickStarters` on Game cards.

Inferred, not read line by line: the web Make teams screen mirrors the mobile one (same domain
functions, same door); the web Share result page mirrors mobile.

### Where a draft stored as Game teams would leak

A draft kept as unpublished `game_teams` rows would be read by doors that do not check for a
Match: `games.byId` returns every Game team with its members to any viewer;
`games.previewInviteLink` reports `teamsSet` from the two rows; `game-payments/ledger.ts` groups
payers by side; `games.updateCaps` locks the Side size; `listPartnerSuggestions` counts shared
Game teams; the hub list's `isSeated` and `registeredTeamCount`. This is why the draft gets its
own tables (section 7).

## 3. Terms

The design says "captain" and "squad". Both collide with the glossary: **Captain** is a Team's
creator (ADR-0059), **Matchday squad** is what that Captain names for a Challenge Game, and
**Football side** says to avoid "squad". Bare "draft" is taken too ("Round drafts" on a Friendly
tournament). This spec uses:

| Term | Meaning | Product copy |
| --- | --- | --- |
| **Draft line-up** | The two Football sides an Organizer saved without publishing | "Draft line-up", "draft" |
| **Side captain** | The registered player an Organizer names for one Football side of one Game | "captain" |
| **Captain's answer** | A Side captain's approval of their own side, or their request for a change | "Approved", "Change asked", "Waiting" |
| **Captain pick** | The third way to make the Football sides: the two Side captains pick in turn | "Captain pick" |
| **Pick room** | The shared screen a Captain pick happens on | "the pick room" |
| **Draft card** | The 1080 by 1920 picture of a Draft line-up | "Share draft" |

- Product copy says "team" where the design says "squad" ("Approve my team", "Your team, Black"),
  as the Football side entry requires. "Squad" stays the Challenge word. *Settled by the product owner, 2026-11-21 (decision 5).*
- A Side captain is not a Captain: they hold no Team, act for nobody and gain no Organizer power.
- A **Challenge Game** has none of this. Its sides are the two Teams' Matchday squads, named by
  each Team's Captain; `publishFootballTeams` already refuses it and every new door does the same.

## 4. Actors

| Actor | Who | Sees a draft | May do |
| --- | --- | --- | --- |
| Organizer | `isGameOrganizer`: Group creator and Appointed Organizers; the creator of a Booking Game or Public Game | Yes | Save and edit the draft, name captains, publish, share, open a Pick room, pick for a captain, undo a pick, stop the pick |
| Side captain | The player named on a side of the draft | Yes, both sides | Approve or ask for a change on their own side, undo either, share, pick on their turn, remind the other captain |
| Any other player or viewer | Everyone else who can open the Game, a Verifier included | No | Nothing new |

The design's "organizers and admins of the group" is one set in the code: on a Group Game the
Organizers, Group approvers and Game admins are the same Users. A Booking Game and a Public Game
get all three flows with the creator as the only Organizer, and the copy drops "the group's
admins" ("Only you and the captains do"). *Settled by the product owner, 2026-11-21 (decision 6).*

## 5. Flows

### 5.1 Draft line-up (1a, 1c, 2b)

- **Save draft** sits beside Publish teams in the Make teams footer (1a): Shuffle or Clear, Save
  draft, Publish teams. *Settled, 1a.*
- A draft keeps the two sides, the bib colours and the captains, and nothing reaches the players.
  *Settled, design note "Save draft".*
- **One draft per Game, and only before the teams are published.** Once teams are published, Make
  teams offers Publish only, as today. Publishing deletes the draft. *Settled by the product owner, 2026-11-21 (decision 3).*
- **A draft may be incomplete.** *Planning decision.* Save draft needs at least one player placed and
  refuses only what could never be true (a player on both sides, someone not registered, equal
  bibs). Publish keeps today's rule. Drafts become incomplete anyway when the roster moves
  (section 10), so the saved state has to allow it.
- **The Organizer's Game screen (1c)** replaces the pool with the draft teams under the status
  "Draft, not published", then a line saying who can see it, then the draft card: a DRAFT tag,
  "Draft line-up", when it was saved, the summary line, one row per side with its captain and the
  Captain's answer, then **Publish teams**, **Share draft** and **Edit draft**. *Settled, 1c.*
  - Summary line, from the design: "No captains picked, so only you and the group's admins can see
    this draft." / "1 of 2 captains have approved. You can publish without waiting." / "Both
    captains approved their team. Publish when you're ready." With players still to place it reads
    the Make teams problem instead ("2 still to place") and Publish teams is disabled.
  - **Publish teams** publishes the draft as saved. **Edit draft** opens Make teams from the
    draft.
- **Everyone else (2b)** sees the Game exactly as today before teams are set, with "Teams aren't
  published yet. The organizer is making them. You'll see your team and bib colour here as soon as
  they are published." and the info row "Teams: Not published". This block is shown whenever teams
  are not published, whether or not a draft exists, so its presence says nothing. *Settled, 2b.*

### 5.2 Captains (1a, 1b, 2a)

- **Captains row** on Make teams (1a): "Captains, optional, one per team", one chip per side
  reading the captain's name or "Add a captain". A chip opens the **Captains sheet** (1b): a
  Black / White switch, that side's players, and "No captain for Black". *Settled, 1a and 1b.*
- A captain is picked from that side's players. A **C** marks them wherever the teams are shown.
  If a captain is moved to the other team, or unplaced, the pick is cleared. *Settled, design note
  "Captains".* Shuffle and a method switch clear both.
- A captain must have an account: a Guest player or an Unclaimed player cannot open the draft.
  *Planning decision.*
- An Organizer may captain a side. Such a side has nobody to ask and reads "nobody to ask", as a
  side with no captain does. *Planning decision.*
- **A captain opens the Game (2a)**: status "Draft, you captain Black", both teams, "A draft from
  Hassan H. Only the two captains and the organizers can see it.", then their own side's panel:
  "Your team, Black. 8 players, avg 63", **Approve my team**, **Ask for a change**. Under it the
  other side with its captain and that captain's answer, and **Share draft**. *Settled, 2a.*
  - **Approve** is one tap: "You approved Black. Hassan publishes when he is ready." with Undo.
  - **Ask for a change** takes a short note, 1 to 140 characters (the length is a planning
    decision): "You asked
    for a change. Hassan sees your note on the draft." with Undo.
  - A captain sees both sides, to judge the balance, and answers for their own only. The other
    captain's note is not shown to them, only that a change was asked. *Settled, 2a and design note
    "One squad each".*
- **Approval does not block.** The Organizer publishes at any time. *Settled, 1c.*
- **Changing a side after its captain answered asks that captain again.** *Settled, 1c.* An answer
  belongs to the exact set of players it was given for; when the side's players differ, by an edit
  or because someone left, the answer no longer counts and the side reads Waiting.
- **Captains stay on the published teams.** Publishing carries each captain onto their Football
  side; the C shows on the Game screen's teams, for everyone, and on Make teams, and nowhere else:
  not the Result card, the played board or the Live board. *Settled by the product owner, 2026-11-21 (decision 4).* A captain may also be named and
  published without a draft ever being saved. After publishing a captain has no power: the C is a
  label, and "they still pick the starters on the day" stays copy.

### 5.3 Share draft (3a, 3b, 3c)

- **Share draft** opens the Share result screen with other content: header "Share draft" and Done,
  a switch **Both teams / Black / White**, the preview with "1080 × 1920" and Full size, a note,
  **Share image**, then **Save**, **Copy link** and **Message**. *Settled, 3a.*
- **The Draft card** is on ink like the Result card. It carries names, positions and captains
  only: no Level, OVR, Tier or average leaves the app. Captains carry a C. Every card is stamped
  "DRAFT, NOT FINAL". Nobody is highlighted: the sharer's own row is not marked and never reads
  "You". *Settled, design notes "The card" and "Nobody highlighted".*
  - Both teams (3b): wordmark, "DRAFT / FOOTBALL / 7-A-SIDE", each side's bib, name, "CAPTAIN
    RASHID N" or "NO CAPTAIN", "8 PLAYERS", the two lists, the Venue and pitch, the date and time.
  - One side (3c): the same header for that side, its list, "against White, 7 start, the captain
    picks them".
- **The note under the preview** says where it goes: "Both teams on one image, stamped as a draft.
  In Temba only organizers, admins and captains see it; an image goes wherever you send it."
  *Settled, 3a.*
- **Copy link** copies the Game page link (the one Share on a football Game already shares). It
  admits nobody and shows the draft only to those who may see it. **Message** hands the share
  sheet a text line ("Draft teams for Friday Football, Sat 18 Oct, 8:00 PM. Not final.") with that
  link. *Planning decision*; the design draws the two buttons and does not say what they carry.
- Organizers and Side captains may share, each with all three tabs.
- An incomplete draft shares what is placed.

### 5.4 Captain pick (4a–4d)

- **A third method** on Make teams: By level, Manual, Captain pick. *Settled, 4a.*
- **Setup (4a).** Captains, "one for each side", both required, chosen from the whole roster;
  First pick: **Toss**, Black or White; the bib colours; the list "To be picked, 14 players, 7
  each", best level first. **Open the pick room**: "Rashid N and Faisal A are told. The pick starts
  when both are in." Needs at least four registered players (a planning decision: two captains
  and two to pick). Opening replaces a saved draft, after a confirm.
- **The room, waiting (4b).** Each captain's card reads "In the room" or "Not here yet"; First
  pick "Tossed when both are in"; Order "One each, in turn"; To pick "14 players, 7 each"; the pool
  preview. The captain who is in sees "Waiting for Faisal" and **Remind Faisal**. *Settled, 4b.*
- **It starts when both are in.** The server tosses if the first pick is a toss, and the pick is
  live. Beyond the design: the Organizer, who also sees the waiting room, may **Start the pick
  now** without a missing captain, since they can pick for that side. *Settled by the product owner, 2026-11-21 (decision 7).*
- **The pick (4c).** Header "Pick 6 of 14" and whose turn it is ("Your pick" / "Faisal is
  picking"). The two sides fill with the pick number on each row, a hatched cell marking the next
  pick, each side's count ("4 of 8") and average. The pool lists position and level, best level
  first. The captain on turn taps a player and confirms ("Pick Omar M"); the player moves to their
  side and the other captain sees it within a couple of seconds. *Settled, 4c*, except "at once":
  see section 12.
- **Turn rule.** *Planning decision*, as the reading of "one each, in turn" and "the last player goes to
  the side that is short": the side with fewer players is on turn; when they are level, the side
  with the first pick is. In an untouched pick this alternates from the first pick, and with an odd
  pool the first picker takes the last player. After an undo, a player leaving or a late joiner it
  still names the right side with nothing stored.
- **No timer. Keepers are picked like anyone else, marked GK.** *Settled, "What I assumed".* A side
  may end with both keepers or none; the Organizer can edit the draft afterwards.
- **The Organizer (4d)** watches the same room without picking: "Pick 6 of 14, watching", "Players
  can't see the pick. You can watch it happen, or step in below." Three actions: **Pick for
  Faisal** (for the side on turn), **Undo the last pick** ("Khalid F goes back to the pool"),
  **Stop the pick** ("Keep what is picked and finish the teams yourself"). *Settled, 4d.* Pick for
  is not gated on the captain being out of the room: presence flaps, and the Organizer is trusted.
- **When it ends.** The last pick empties the pool: "Teams are picked. Eight a side. They go to the
  organizer as a draft, with both captains already agreed." The draft is saved with both answers
  Approved, the Organizers are told, and **See the draft** opens the Game. The Organizer publishes,
  shares or edits from there. *Settled, 4c and design note "When it ends".*
- **Stopping** keeps the sides as picked, closes the room for everyone ("The organizer stopped the
  pick") and leaves an ordinary Manual draft with players still to place.
- **After it ends.** "Teams are picked" stays on a screen that read the pick finish, also once
  the Organizer edits or publishes the draft; that screen moves to a new room when the Organizer
  opens one. Only a pick that was stopped, or that lost a captain, says "The organizer stopped
  the pick". A room whose finished pick was edited or published before a screen read it finish
  shows that screen "This pick room is closed" and the way back to the Game. *Planning decision*
  (section 6).
- Players never see the pick. *Settled, 4d.*

## 6. States and transitions

Teams of a football Game that is not a Challenge Game:

```text
none ──save draft──────────────► draft ──publish──► published ──score in──► fixed
  │                               ▲  │ ▲
  │                               │  └─┘ edit, answer, roster change
  ├──open pick room──► pick:waiting ──both in / start now──► pick:live ──pool empty──► draft
  │                         │                                   │                (both Approved)
  │                         └────────────stop the pick──────────┴──► draft (Manual, incomplete)
  └──publish (as today)─────────────────────────────────────────────► published
```

- `published` and `fixed` are today's states and behave as today, plus the captains' C.
- A Game in `draft` or either `pick` state has no Game teams and no Match: every existing reader
  sees a Game whose teams are not set.
- Opening Make teams while a pick is waiting or live goes to the Pick room.

Captain's answer, per side, derived on read:

| State | When |
| --- | --- |
| nobody to ask | The side has no captain, or its captain is an Organizer of the Game |
| Waiting | A captain with no answer, or an answer given for a different set of players |
| Approved | Answered approve, for the side as it stands |
| Change asked | Answered with a note, for the side as it stands |

Undo removes the answer. Changing the captain removes it.

Pick room presence: a captain is "In the room" while their room screen has polled in the last 10
seconds.

What the Pick room reads, and what a screen that was showing it does:

| The Game has | The room reads | A screen that showed the pick waiting or live | A screen that showed it done |
| --- | --- | --- | --- |
| A pick waiting, live or done | That pick, with its `pickId` | Shows it | Shows it: a new `pickId` is a new room |
| A draft whose pick was stopped or lost a captain, edited since or not | `stopped`, with that pick's `pickId` | Says "The organizer stopped the pick" and opens the Game, when it is the pick it showed; otherwise closes | Keeps "Teams are picked" |
| Any other draft: a finished pick edited since, or one that was never a pick | `closed` | Closes, with the way back to the Game | Keeps "Teams are picked" |
| No draft (teams published, or nothing saved) | `closed` to an Organizer, not found to anyone else | Closes | Keeps "Teams are picked" |

A draft reads `stopped` from the stop until a new room opens. "Teams are picked" holds only for
a screen that read the pick done itself: a screen opened afterwards shows what the room reads
now.

## 7. Data model (`@repo/db`)

One generated migration per ticket that changes the schema; never edit an existing one. The
latest is 0134.

**`football_lineup_drafts`**, at most one per Game.

| Column | Notes |
| --- | --- |
| `id`, `game_id` | `game_id` unique, cascade on Game delete |
| `method` | `football_teams_method` |
| `slot1_bib`, `slot2_bib` | `football_bib`, check they differ |
| `slot1_captain_game_player_id`, `slot2_captain_game_player_id` | FK `game_players`, on delete set null, so a captain who leaves or is kicked is cleared |
| `pick_status` | new enum `football_pick_status`: `waiting`, `live`, `done`; null when the draft was never a Captain pick or the pick was stopped |
| `first_pick` | new enum `football_first_pick`: `toss`, `slot1`, `slot2`; null outside a pick |
| `first_pick_side` | 1 or 2, set when the pick goes live |
| `pick_id` | uuid, not null, random by default. Written anew each time a Pick room opens and kept until the next one, so a reader tells a new pick from the one it watched. It says nothing on a draft that was never a Captain pick |
| `pick_stopped_at` | Set when a waiting or live pick is stopped or loses a captain; kept through later saves; null again when a new room opens. A pick that finished never has it |
| `slot1_captain_seen_at`, `slot2_captain_seen_at` | Pick room presence |
| `saved_by`, `saved_at`, `created_at`, `updated_at` | `updated_at` is the concurrency token |

**`football_lineup_draft_players`**: who is on which side of the draft.

| Column | Notes |
| --- | --- |
| `draft_id` | cascade |
| `game_player_id` | unique, cascade: leaving the Game leaves the draft |
| `side_index` | 1 or 2 |
| `pick_number` | set by a Captain pick; unique per draft where not null |

**`football_lineup_draft_answers`**: one row per side that has an answer.

| Column | Notes |
| --- | --- |
| `draft_id`, `side_index` | unique together, cascade |
| `captain_user_id` | who answered |
| `answer` | new enum `football_draft_answer`: `approved`, `change_asked` |
| `note` | varchar(140), required with `change_asked` |
| `answered_player_ids` | `uuid[]`: the side's `game_player_id`s the answer was given for |
| `answered_at` | |

**Changes to existing tables**

- `game_teams.captain_game_player_id`: nullable FK `game_players`, on delete set null. Written by
  publish; null on every Game team that is not a Football side with a captain.
- `football_teams_method` gains `captain_pick` (`ALTER TYPE … ADD VALUE`).
  `packages/api/src/football-lineup-parity.test.ts` keeps the domain list and the enum together.
- `notification_type` gains the values in section 11.

Nothing existing reads the three new tables, which is the point: `byId`, the hub lists, the
payments ledger, invite previews, the Live board, partner suggestions and `updateCaps` stay as
they are with no change and no new check.

## 8. API (`@repo/api`), one procedure per file, additive

All under `packages/api/src/routers/games/`. Every new door refuses a Challenge Game, a Game that
is not football, a cancelled Game, and a Game whose teams are published (except where stated), and
answers with copy from `football.errors`.

| Procedure | Kind | Who | What |
| --- | --- | --- | --- |
| `footballBoard` (existing) | query | as today | Gains `draft`, `teams.captains`, `viewer.captainOf`, `viewer.canSaveDraft`, `viewer.canAnswerDraft`, `viewer.canOpenPickRoom`. `draft` is null for everyone but an Organizer and the draft's captains, and null on a `stamp_only` read |
| `saveFootballDraft` | mutation | Organizer | Creates or replaces the draft: method (`level` or `manual`), bibs, the two sides, the two captains. Refused while a pick is waiting or live. Optional `draftUpdatedAt`: refused with CONFLICT when the stored draft is newer; `null` says there was no draft, and is refused when there is one now. Keeps `pick_stopped_at`, and sets it for a pick that lost a captain and that no read of the room cleared |
| `publishFootballTeams` (existing) | mutation | Organizer | Gains optional `captains` and optional `draftUpdatedAt`, `null` included as on save; accepts method `captain_pick`. Writes each side's captain, deletes the draft in the same transaction |
| `answerFootballDraft` | mutation | The side's captain | `answer`: `approved`, `change_asked` with a note, or `null` to undo. Refused while a pick is waiting or live |
| `openFootballPickRoom` | mutation | Organizer | Bibs, both captains, first pick. Replaces any draft with the two captains seated, `pick_status` `waiting`, a new `pick_id` and no `pick_stopped_at`; tells both captains |
| `footballPickRoom` | query, polled | Organizer or a captain of the draft | The room: status, `pickId`, bibs, captains with presence, first pick, each side's players with pick numbers, the pool, the side on turn, the next pick number and total, `serverNow`. Records the caller's presence at most every 3 s, and starts the pick (toss included) on the read that finds both captains present, as `liveBoards.snapshot` already writes on read. Finishes a live pick whose pool emptied without a pick (section 10). With no pick waiting, live or done it reads `{ status: "stopped", pickId }` or `{ status: "closed" }` (section 6); with no draft an Organizer reads `closed` and anyone else is told it is not found. Refuses a cancelled Game |
| `startFootballPick` | mutation | Organizer | Waiting to live without both captains (decision 7) |
| `pickFootballPlayer` | mutation | The captain on turn, or an Organizer with `forSide` | `pickedUserId` and the expected `pickNumber`. Locks the draft row; refuses a pick out of turn, a player not in the pool, and a stale pick number ("The pick moved on"). The pick that empties the pool sets `done`, writes both answers as approved and tells the Organizers |
| `undoFootballPick` | mutation | Organizer | Returns the highest pick number to the pool, named by the caller so a stale tap is refused. Live only |
| `stopFootballPick` | mutation | Organizer | Waiting or live: clears the pick fields, sets method `manual` and `pick_stopped_at`, keeps the sides |
| `remindFootballCaptain` | mutation | A captain of the pick, or an Organizer | Tells the other captain (or the named side's) once per five minutes; a second tap inside the window succeeds without sending |

`footballBoard.draft`:

```ts
draft: null | {
  updatedAt: Date; savedAt: Date; savedByName: string;
  method: FootballTeamsMethod;
  bibs: { slot1: FootballBib; slot2: FootballBib };
  sides: { slot1: string[]; slot2: string[] };          // userIds, pick order when picked
  captains: { slot1: string | null; slot2: string | null };
  answers: { slot1: DraftAnswer; slot2: DraftAnswer };  // state, answeredAt, note
  pick: null | { status: "waiting" | "live" | "done" };
};
```

A note is sent to Organizers and to the captain who wrote it; the other captain gets the state
only. Players' display fields, OVR and Group Tier come from `footballBoard.players` under today's
rules; the draft and the room carry user ids only, so neither opens a new view of anyone's level.

**Shared modules** (each used by two or more doors, so not endpoint logic):

- `packages/api/src/games/football-draft.ts`: load a Game's draft with its players and answers;
  who may see it; the guards the doors share (football, not Challenge, not cancelled, not
  published); `captainAnswerState(answer, sidePlayerIds, sideCaptain)`, which only the loader
  calls; the roster the doors that write sides read; the pool and the next pick number of a
  Captain pick.
- `packages/api/src/notifications/notify-football-draft.ts`: the wrappers of section 11, as
  `notify-challenge.ts` does for Challenges.
- `packages/validators/src/football.ts` gains the bibs, sides and captains input shared by
  `saveFootballDraft`, `publishFootballTeams` and `openFootballPickRoom`.

Everything else stays in its procedure file. No service layer, no thin assemblers.

## 9. Domain rules (`@repo/domain`)

Each of these is used by both Apps, or by an App and the server.

| Module | Rule |
| --- | --- |
| `football-lineup.ts` | `FOOTBALL_TEAMS_METHODS` gains `captain_pick`; `footballTeamsMethodLabel`; the draft and pick constants (note length, minimum players, the poll, finished-pick poll and presence windows) |
| `football-board.ts` | `TeamsDraft` gains `captains`; `moveAcross`, `placeOn`, `switchMethod` and Shuffle clear a captain who is no longer on their side (`captainsOnTheirSides`, which save and publish call too); `initialTeamsDraft` starts from the saved draft, then the published split, then a balanced one; `ofSide(pair, side)`; `lineupPlayerName` for a captain or a pool player |
| `football-draft.ts` (new) | The hub summary line; why a draft cannot be saved; the visibility line by Game kind |
| `football-captain-pick.ts` (new) | `pickTurn({ slot1, slot2, firstPickSide })`; pick progress ("Pick 6 of 14"); the pool order; whether the pick is done; the room with the caller's own pick placed, and the last pick, which Undo takes back; what a room screen shows after a read and whether it says the pick was stopped (`pickRoomAfterRead`), and how often it reads (`pickRoomPollMs`) |
| `football-draft-share.ts` (new) | `draftShareCard(game, board, mode, locale)`: the Draft card for both teams or one side, null when the viewer has no draft; how its lists are laid out and cut to "and N more" |
| `notification-copy.ts` | Copy for the new types |

**Pool order and what a captain sees.** The pool sorts by what the viewer is shown for each player:
Organizers by balance strength, as Make teams does; a captain by OVR, or in a tier Group by Tier
band and place. A captain gets exactly what any player sees on a pool tile today. A Provisional
member's Tier points stay hidden from them. Side averages use `teamsSideAverage`, which already
falls back to the mean OVR for a viewer without balance strengths.

## 10. Roster changes and other edge cases

| Event | Effect on a draft |
| --- | --- |
| A player leaves or is kicked | Falls out of their side by cascade. That side's answer no longer matches, so it reads Waiting. If they were a captain the side has none. Sides are not rebalanced |
| A player joins, is added, or comes off the Waitlist | Registered and on no side. The hub reads "1 still to place" and Publish is disabled until the Organizer edits the draft. In a live pick they join the pool and the total grows |
| A Football role changes | Nothing: the side's players are the same, so the answer stands |
| Players allowed is cut below the number joined | The latest joiners move to the Waitlist and fall out of the draft, as leaving does |
| Side size changes | Allowed, as today before publishing; a draft is two halves of the roster, not a count |
| A captain leaves or is kicked during a pick | The pick cannot go on: the room reads stopped and the draft becomes an ordinary one, as Stop the pick |
| A pick finishes and the Organizer edits or publishes the draft before a screen in the room reads it done | That screen reads `closed`, or not found once the draft is gone: it closes with the way back to the Game and does not say the pick was stopped |
| The Organizer opens a new room while a screen still shows "Teams are picked" | That screen reads the room every 15 seconds and when it comes back in front, and shows the new room |
| The last player still to be picked leaves or is kicked during a live pick | The pool is empty with no pick left to finish on. The next read of the Pick room finishes the pick as the last pick would: both answers Approved and the Game admins told, with copy that names no picker |
| The Game is cancelled | The draft is unreadable and every door refuses. The row stays until the Game is deleted |
| Kick-off passes with a draft unpublished | Nothing automatic. The Score still needs published teams, as today |
| Two Organizers edit at once | The second save or publish carries a stale `draftUpdatedAt`, or `null` for a draft it never saw, and is refused: "The draft changed. Open it again." |
| The captain and the Organizer pick at the same moment | The second carries a stale pick number and is refused; the room refreshes |
| A captain's App goes to the background | Polling stops, so after 10 seconds they read "Not here yet". The pick waits; nothing is lost |

**Payment tracking.** Keepers play free reads `game_players.football_role` only
(`playsFree` in `packages/api/src/game-payments/ledger.ts`), never sides. A draft, a captain or a
pick changes nothing about who owes.

**Rating.** Nothing here touches the Match, the Score or what counts for Temba Level.

## 11. Notifications

No push exists, so "are told" and "Remind" are an in-app Notification and its Notification email
until Phase 7. *Settled by the product owner, 2026-11-21 (decision 2).* Each type needs the enum value, copy in `notification-copy.ts` and
`messages/{en,ar}/notification.ts`, a target in `apps/web/src/lib/notification-href.ts` and
`apps/mobile/src/notifications/notification-path.ts`, and a destination in
`packages/api/src/notifications/email/render.ts`. The actor is never notified.

| Type | To | When | Opens |
| --- | --- | --- | --- |
| `football_draft_shared` | A captain | First named on a saved draft | The Game |
| `football_draft_changed` | A captain | A save changed their side after they answered | The Game |
| `football_draft_approved` | Game admins | A captain approved; once per side as it stands | The Game |
| `football_draft_change_asked` | Game admins | A captain asked for a change; once per side as it stands | The Game |
| `football_pick_room_opened` | Both captains | The Organizer opened the Pick room | The Pick room |
| `football_pick_reminder` | The other captain | Remind; at most one per five minutes | The Pick room |
| `football_pick_done` | Game admins | The last pick was made, or the pool emptied without one | The Game |

Copy names the Game and the actor and no team colour, so the row needs no new column ("Hassan Haji
saved draft teams for Friday Football. You're a captain: have a look before they are published.").
Undo sends nothing. Publishing still sends nothing to players, as today.

## 12. Screens

Both Apps get every flow; each web ticket follows its mobile one. *Settled by the product owner, 2026-11-21 (decision 1).*

| Design | Mobile (`apps/mobile`) | Web (`apps/web`) |
| --- | --- | --- |
| 1a `dl-make` | `src/football/make-teams-screen.tsx`: third method, Captains row, C on rows, Save draft | `components/games/football-make-teams.tsx` |
| 1b `dl-captain` | New `src/football/captains-sheet.tsx` | New `components/games/football-captains-dialog.tsx` |
| 1c `dl-hub` | `src/game-details/football-details-screen.tsx` and a new `src/football/draft-card.tsx` | `components/games/football-game-details.tsx` and a new `football-draft-card.tsx` |
| 2a `dl-captain-view` | Same screen, captain branch, with a note sheet for Ask for a change | Same component, captain branch |
| 2b `dl-player` | Same screen, unchanged pool plus the "not published" block and info row | Same |
| 3a–3c `dl-share`, `dl-card-both`, `dl-card-one` | New route `games/[id]/share-draft` → `src/share-draft/share-draft-screen.tsx`, reusing `share-result`'s `ScaledCanvas`, `PreviewWell`, `ActionTileRow`, mode segments and story parts | New route `dashboard/games/[id]/share-draft`, reusing `components/share-result/*` |
| 4a `dl-pick-setup` | Make teams, Captain pick branch | Same |
| 4b–4d `dl-pick-wait`, `dl-pick-live`, `dl-pick-org` | New route `games/[id]/pick` → `src/football/pick-room-screen.tsx` | New route `dashboard/games/[id]/pick` |

`share-teams` is taken on both Apps by Alone-only Socials, hence `share-draft`.

**Polling.** The Pick room polls `games.footballPickRoom` every 2 seconds while the screen is in
front, and not in the background. While a finished pick stays on the screen it reads every 15
seconds, to learn of a new room, and once the room closed it reads only when the screen comes
back in front. The caller's own pick is applied optimistically. The Game screen does not poll: a
captain's answer reaches the Organizer on refocus, as everything else there does.

**Mobile design system.** The design maps onto the locked system without exceptions:

- Answer marks follow `ResultMark`: Approved solid with a check, Change asked outline, Waiting
  `Hatch`. The next-pick cell and "Not here yet" are `Hatch` too: both mean "not yet".
- The draft card and the turn banner are `Surface` with hairline borders. The design draws a soft
  shadow on the selected share tab; the existing mode segments have none and are used as they are.
- The C badge, the DRAFT tag and every grey in the design are Color roles from `useColors()`
  (`control` and `onControl`, `rule`, `wash`, `inputBorder`); no hex in screens, and nothing in
  dark is `#ffffff`.
- The Draft card stays on ink in both schemes and imports its palette statically, as the Result
  card does.
- Text through `Text`; at most two mount animations per screen; arrows mirror in RTL.

**Copy the design gets wrong for this system.** "Faisal sees it at once" becomes "Faisal sees it
in a moment": the room is polled, and the Live board spec made the same change.

## 13. i18n (ADR-0052)

Every string in English and Arabic, counts through `plural()`.

- `messages/{en,ar}/football.ts` owns everything the domain functions and both Apps share: new
  keys `football.draft` (status, hub lines, visibility lines, answer states, the captain panel),
  `football.captains` (the row, the sheet, the C label), `football.pick` (setup, room, turn lines,
  Organizer actions), `football.draftShare` (card labels, notes, the message line), and new
  `football.errors`.
- `messages/{en,ar}/notification.ts` owns the seven Notification types.
- App-only chrome stays where each App keeps it today: `mobile-tournament.ts` (`makeTeams`),
  `mobile-game-details.ts` (`football`), `mobile-player.ts` (`share`) on mobile;
  `web-tournament.ts` and `web-ui.ts` (`shareResult`) on web.
- Plurals: "N still to place", "1 of 2 captains have approved", "14 players, 7 each", "9 left",
  "and 10 more", "8 players".
- Existing copy "Captains pick starters before kick-off." and the Game card's
  `captainsPickStarters` are about starters, not Captain pick. They stay; new copy never says
  "captains pick" for anything but the pick.

## 14. Non-goals

- Starters, substitutes and formations. "7 start, the captain picks them" stays copy.
- Any power for a Side captain after publishing: they do not score for their side, confirm, kick
  or edit.
- A draft beside published teams (decision 3), more than one draft per Game, draft history or a
  pick log.
- A discard-draft door. Editing the draft, opening a Pick room or publishing replaces it.
- A pick timer, auto-pick, snake order, or captains undoing their own picks.
- Push (decision 2). The pick room's Notifications become pushes with Phase 7.
- Websockets, SSE or subscriptions (ADR-0102).
- Challenge Games, padel, Socials.
- The C on the Result card, the Result sticker, the played board and the Live board (decision 4).
- A Notification to players when teams are published (there is none today).
- Chat between captains and the Organizer beyond the one note.

## 15. Risks

- **Reminders without push are weak.** A captain who is not in the app sees a reminder only by
  email. In practice the Organizer will message them; on a Group Game they already have the
  WhatsApp door on the player's sheet (ADR-0087).
- **A query that writes.** `footballPickRoom` records presence and starts the pick. The Live
  board's `snapshot` set the precedent; the toss must run once, under the draft row's lock.
- **Polling cost.** Three clients at one request every 2 seconds for the length of a pick. The
  read is one draft, its players and the roster's ids; it must not load ratings or the tier table.
- **Leak by omission.** The risk is a future reader of the draft tables that forgets the
  visibility check. One loader in `games/football-draft.ts` returns nothing without a viewer who
  may see it, and tests pin every existing door (section 17).
- **Image sharing.** A Draft card goes wherever it is sent. The screen says so; nothing more can
  be done.
- **Tier Groups.** Captains pick on Tier band and place, coarser than the Organizer's Tier points.
  Accepted so that no Provisional member's points are shown.
- **Two meanings of captain in one product.** Mitigated by the glossary split and by never
  offering any of this on a Challenge Game.
- **Old clients.** `captain_pick` is a new value of an enum that clients switch on; an App build
  that predates it must fall back to the Manual label. Mobile is not released, so only web's
  deploy order matters: the API first.
- **Web parity.** Each web ticket lands after its mobile one. Between the two, an Organizer on the
  web App publishes over a draft they cannot see; DL-2 should follow DL-1 closely.

## 16. Decisions

### Settled by the product owner, 2026-11-21

Each was an open question with a recommendation; the product owner accepted all seven.

1. **Both Apps.** Every flow ships on the mobile App and the web App, ticketed apart, each web
   ticket following its mobile one. The mobile App is not on the App Store yet, so players use the
   web App today.
2. **Captain pick ships before push.** "Told" and "Remind" are an in-app Notification and its
   Notification email until Phase 7; the reminder is limited to one per five minutes.
3. **One draft per Game, only before the teams are published.** No draft beside published teams.
4. **The C shows on the Game screen's teams and on Make teams**, on both Apps. Not on the Result
   card, the played board or the Live board.
5. **Names.** The glossary term is Side captain and copy says "captain"; copy says "team" where the
   design says "squad".
6. **Groupless Games.** A Booking Game and a Public Game get all three flows, with the creator as
   the only Organizer.
7. **The Organizer may start the pick without a missing captain.**

### Planning decisions

The design is silent on these and planning chose. The product owner saw the first seven listed
with the questions above and raised no objection; they are not product-owner decisions and can be
reopened without amending an ADR's intent.

- A draft may be saved incomplete; only publishing needs every player placed.
- The note on Ask for a change is 1 to 140 characters.
- A Side captain must have an account: never a Guest player or an Unclaimed player.
- A side captained by an Organizer has nobody to ask.
- Captain pick needs at least four registered players.
- Copy link on Share draft is the Game page link.
- The share tabs have no shadow; the existing mode segments are used.

Not in that list, and so decided by planning alone:

- The turn rule: the side with fewer players picks; when level, the side with the first pick.
- A Side captain sees of each player only what a pool tile already shows any player, and the pool
  sorts by that.
- Message on Share draft hands the share sheet one text line and the Game page link.
- "Faisal sees it at once" reads "in a moment".

## 17. Test plan

**Domain (Vitest, beside the source)**

- `football-board.test.ts`: a captain is cleared when moved across, unplaced, shuffled or on a
  method switch; `initialTeamsDraft` prefers the draft.
- `football-draft.test.ts`: every answer state, including an answer for a different set of
  players and an Organizer captain; the hub line for 0, 1 and 2 captains; save problems.
- `football-captain-pick.test.ts`: the turn alternates from the first pick; odd pools; after an
  undo; after a picked player leaves; with a late joiner; pool order for an Organizer and for a
  captain, in a tier Group and outside one.
- `football-draft-share.test.ts`: both-teams and one-side cards; no level fields on the model; no
  viewer highlight; captains marked; an incomplete draft.
- `notification-copy.test.ts`: the seven types in both locales.

**API (PGlite, through the plain function of each procedure file)**

- `saveFootballDraft`: creates and replaces; Organizer only; refused on a Challenge Game, a
  cancelled Game, published teams, a live pick; captain must be on their side and have an account;
  stale `draftUpdatedAt`.
- **A draft changes nothing else.** With a draft saved: no `game_teams`, no Match;
  `games.byId.gameTeams` is empty; `previewInviteLink.teamsSet` is false; the payments ledger has
  no sides; `updateCaps` still changes the Side size; the hub list and the Live board read "teams
  not set".
- **Visibility.** `footballBoard.draft` is set for an Organizer and each captain, and null for a
  registered player, a Group member, a Public Game viewer, a `stamp_only` Verifier, and a captain
  who was replaced. The other captain's note is not sent.
- `publishFootballTeams`: deletes the draft; writes captains to `game_teams`; publishing without a
  draft still works with and without `captains`; method `captain_pick`; stale token refused.
- `answerFootballDraft`: approve, ask with a note, undo; own side only; the answer reads Waiting
  after the side changes by save, by leave and by kick; a role change keeps it; notifications
  written once per side as it stands.
- Roster changes: leave, kick, join, Organizer add, Waitlist promotion and a cut to players
  allowed against a saved draft.
- Pick room: open (captains seated, both told, draft replaced); presence from the read; the pick
  starts when both are present, once; the toss sets a side; `startFootballPick`; picks in turn;
  out of turn, not in pool and stale pick number refused; the Organizer picks for a side; undo;
  stop; the last pick writes both answers and tells the Organizers; a captain leaving stops it; a
  player cannot read the room; remind is limited. The room names each opening: one `pickId`
  through reads, picks, undo and the finish, a new one on the next open. It reads stopped after a
  stop or a lost captain, also once the draft is saved, and closed after a finished pick is
  edited or published.
- `pickRoomAfterRead` and `pickRoomPollMs`: every pair of what a screen showed and what it reads.
- `football-lineup-parity.test.ts`: the new enum value and the three new enums.

**Apps.** Typecheck and lint; the existing Make teams and Share result flows by hand on both
Apps; the Pick room with two signed-in sessions and an Organizer, in English and Arabic, light and
dark.

## 18. Tickets

Vertical slices, in order, published to Linear on 2026-11-21 (team Temba, Backlog, labels
`ready-for-agent` and `Feature`, no project, as the Series tickets were). Blocking is recorded as
Linear relations. Every ticket passes `pnpm exec turbo run typecheck lint test`.

| Id | Title | Outcome | Depends on |
| --- | --- | --- | --- |
| **DL-1** ([TEM-497](https://linear.app/temba-app/issue/TEM-497/draft-line-up-dl-1-an-organizer-saves-a-draft-line-up-and-publishes)) | Save a Draft line-up and publish from it (API, mobile) | An Organizer saves the teams as a draft, sees it on the Game, edits it and publishes it; nobody else sees anything | — |
| **DL-2** ([TEM-498](https://linear.app/temba-app/issue/TEM-498/draft-line-up-dl-2-web-save-a-draft-line-up-and-publish-from-it)) | Draft line-up on the web | The same on the web App | DL-1 (TEM-497) |
| **DL-3** ([TEM-499](https://linear.app/temba-app/issue/TEM-499/draft-line-up-dl-3-side-captains-and-their-answers-on-a-draft-line-up)) | Side captains and their answers (API, mobile) | The Organizer names a captain per team; a captain sees the draft and approves or asks for a change; the C shows on published teams | DL-1 (TEM-497) |
| **DL-4** ([TEM-500](https://linear.app/temba-app/issue/TEM-500/draft-line-up-dl-4-web-side-captains-and-their-answers-on-a-draft-line)) | Side captains on the web | The same on the web App | DL-2 (TEM-498), DL-3 (TEM-499) |
| **DL-5** ([TEM-501](https://linear.app/temba-app/issue/TEM-501/draft-line-up-dl-5-share-a-draft-line-up-as-a-draft-card-domain-mobile)) | Share a draft as an image (mobile) | Organizers and captains share the Draft card, both teams or one | DL-3 (TEM-499) |
| **DL-6** ([TEM-502](https://linear.app/temba-app/issue/TEM-502/draft-line-up-dl-6-web-share-a-draft-line-up-as-a-draft-card)) | Share a draft on the web | The same on the web App | DL-4 (TEM-500), DL-5 (TEM-501) |
| **DL-7** ([TEM-503](https://linear.app/temba-app/issue/TEM-503/draft-line-up-dl-7-captain-pick-open-a-pick-room-and-wait-for-both)) | Open a Pick room and wait for both captains (API, mobile) | Captain pick is a third method; both captains are told, see who is in the room and can remind; the Organizer can start or stop | DL-3 (TEM-499) |
| **DL-8** ([TEM-504](https://linear.app/temba-app/issue/TEM-504/draft-line-up-dl-8-captain-pick-captains-pick-in-turn-and-the)) | Captains pick in turn and the Organizer steps in (API, mobile) | The pick runs to a saved draft with both captains agreed; the Organizer picks for a captain, undoes or stops | DL-7 (TEM-503) |
| **DL-9** ([TEM-505](https://linear.app/temba-app/issue/TEM-505/draft-line-up-dl-9-web-captain-pick-the-pick-room-and-the-pick)) | Captain pick on the web | Setup, the room and the pick on the web App | DL-4 (TEM-500), DL-8 (TEM-504) |

### DL-1 (TEM-497) Save a Draft line-up and publish from it (API, mobile)

- Scope: migration (`football_lineup_drafts`, `football_lineup_draft_players`);
  `games/football-draft.ts`; `saveFootballDraft`; `footballBoard.draft` and `viewer.canSaveDraft`;
  `publishFootballTeams` deletes the draft and takes `draftUpdatedAt`; domain `football-draft.ts`
  and `initialTeamsDraft`; mobile Save draft (1a), the Organizer's draft card without captain rows
  (1c), the "not published" block and info row (2b); catalog keys. Decisions:
  ADR-0107.
- Acceptance:
  - Save draft stores the sides and bibs; the Game has no Game teams and no Match.
  - The Organizer's Game screen shows the draft with Publish teams and Edit draft; a co-Organizer
    sees the same.
  - A registered player, a Group member and a Verifier get `draft: null` and an unchanged screen.
  - Publishing from the card or from Make teams creates the teams and the Match and removes the
    draft.
  - Leaving, being kicked and joining change the draft as section 10 says.
  - A stale `draftUpdatedAt` is refused.
  - The "changes nothing else" tests of section 17 pass.

### DL-2 (TEM-498) Draft line-up on the web

- Scope: web Make teams Save draft, the draft card on the Game page, the player's block.
- Acceptance: the web App does everything DL-1's mobile screens do; Make teams on the web opens
  from a draft saved on mobile.

### DL-3 (TEM-499) Side captains and their answers (API, mobile)

- Scope: migration (draft captain columns, `football_lineup_draft_answers`,
  `game_teams.captain_game_player_id`, four Notification types); captains on `saveFootballDraft`
  and `publishFootballTeams`; `answerFootballDraft`; `footballBoard` captains, answers,
  `viewer.captainOf`; domain captain rules and `captainAnswerState`; notify wrappers and copy;
  mobile Captains row and sheet (1a, 1b), C marks, hub answer rows (1c), the captain's Game screen
  (2a). Decisions: ADR-0108.
- Acceptance:
  - One captain per side or none; moving a captain to the other team clears them.
  - A captain is told, opens the Game and sees both teams; another player still sees nothing.
  - Approve, Ask for a change with a note, and Undo work for the captain's own side only.
  - The Organizer sees each answer and the note; the other captain sees the state only.
  - Editing a side, or a player leaving it, returns its answer to Waiting and tells the captain
    when the Organizer saved the change.
  - Publishing never waits on an answer and carries the captains onto the published teams, where
    the C shows for everyone.
  - A Guest player or Unclaimed player cannot be named.

### DL-4 (TEM-500) Side captains on the web

- Scope: web Captains row and dialog, C marks, hub rows, captain view, Notification targets.
- Acceptance: as DL-3 on the web App.

### DL-5 (TEM-501) Share a draft as an image (mobile)

- Scope: domain `football-draft-share.ts`; route `games/[id]/share-draft`; the three cards; Share
  image, Save, Copy link, Message; Share draft buttons on the draft card and the captain's screen.
  Decisions: ADR-0107.
- Acceptance:
  - Both teams, Black and White render at 1080 by 1920 on ink, stamped "DRAFT, NOT FINAL".
  - No Level, OVR, Tier or average appears; nobody is highlighted; captains carry a C.
  - The note under the preview changes with the tab.
  - A viewer with no draft gets the empty state, not a card.
  - Save and Share image work on a device in light and dark.

### DL-6 (TEM-502) Share a draft on the web

- Scope: route `dashboard/games/[id]/share-draft`, the cards with `html-to-image`, the actions.
- Acceptance: as DL-5 on the web App.

### DL-7 (TEM-503) Open a Pick room and wait for both captains (API, mobile)

- Scope: migration (`captain_pick` method value, pick columns and enums, the three pick
  Notification types);
  `openFootballPickRoom`, `footballPickRoom`, `startFootballPick`, `stopFootballPick`,
  `remindFootballCaptain`; domain `football-captain-pick.ts` (progress, pool order); mobile Captain
  pick setup (4a) and the waiting room for a captain and for the Organizer (4b); Notification
  targets to the Pick room. Decisions: ADR-0109.
- Acceptance:
  - Captain pick is offered beside By level and Manual; both captains and a first pick are
    required.
  - Opening the room seats the captains, tells them and replaces a saved draft after a confirm.
  - Each captain sees the other as "In the room" within a few seconds of their arrival and "Not
    here yet" within about ten seconds of their leaving.
  - Remind sends one Notification per five minutes.
  - The pick goes live when both are in, or when the Organizer starts it; a toss is made once.
  - Stop the pick leaves an ordinary Manual draft.
  - A player cannot open the room.

### DL-8 (TEM-504) Captains pick in turn and the Organizer steps in (API, mobile)

- Scope: `pickFootballPlayer`, `undoFootballPick`; `pickTurn`; `football_pick_done`; mobile live
  pick for a captain (4c) and the Organizer's view (4d); the finished state and See the draft.
- Acceptance:
  - Only the captain on turn can pick; the other captain sees the pick within about two seconds.
  - The turn follows section 5.4's rule through an odd pool, an undo, a leaver and a late joiner.
  - The Organizer picks for the side on turn, undoes the last pick, and stops the pick.
  - Two picks sent at once: one lands, the other is refused and the room refreshes.
  - The last pick saves the draft with both answers Approved and tells the Organizers.
  - A captain leaving the Game stops the pick.

### DL-9 (TEM-505) Captain pick on the web

- Scope: web setup, route `dashboard/games/[id]/pick`, the waiting room, the pick and the
  Organizer's view.
- Acceptance: as DL-7 and DL-8 on the web App; a pick can run with one captain on each App.

Suggested sequence: DL-1 → DL-3 → DL-5 and DL-7 → DL-8, with DL-2, DL-4, DL-6 and DL-9 each
following its mobile ticket.

## 19. Glossary and ADRs

Applied on 2026-11-21. The text lives in these files only.

**`CONTEXT.md`**

- New entries: **Draft line-up**, **Side captain**, **Captain's answer**, **Captain pick** and
  **Pick room** (after **Bib**), and **Draft card** (after **Result sticker**).
- Edited entries: **Football side** (by Captain pick, a Side captain, a Draft line-up; "squad"
  avoided in copy too), **Captain** and **Matchday squad** (_Avoid_ lines), **Game** (a Draft
  line-up creates nothing), **Organizer** (the new powers), **Notification** (the new events).

**ADRs**

- [ADR-0107](../../docs/adr/0107-a-draft-line-up-is-kept-apart-from-the-football-sides.md): a
  Draft line-up is kept apart from the Football sides.
- [ADR-0108](../../docs/adr/0108-a-side-captain-is-named-per-football-side-and-answers-without-blocking.md):
  a Side captain is named per Football side and answers without blocking.
- [ADR-0109](../../docs/adr/0109-captain-pick-runs-in-a-polled-pick-room-and-reads-the-turn-from-the-sides.md):
  Captain pick runs in a polled Pick room and reads the turn from the sides.

ADR-0105 and ADR-0106 are taken by the Series spec on a branch that is not merged yet
(`.scratch/series/spec.md`), so these start at 0107.

A ticket whose implementation departs from one of these amends the ADR and the glossary entry in
the same pull request.
