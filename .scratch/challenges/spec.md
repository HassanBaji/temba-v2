# Challenges: Teams look for opponents and schedule a Game

Status: approved, ready for implementation. Every open question in section 15 was settled on 2026-11-08 with its recommended default; tickets are in Linear (see `tickets.md`). First draft 2026-11-08; **revised the same day** for the owner's two rules ("max team 20 players"; "the owner selects the squad after the challenge is accepted, with a max of 3 reserve") and the v2b mockup. Revised passages are marked **(revised 2026-11-08)**. Decisions are in `decisions.md`; tickets in `tickets.md`. `CONTEXT.md` and `docs/adr/` are unchanged; section 13 lists what the tickets will change.

Design: "Temba Sports Community App Challenges v2b" (the owner's mockup). Its copy is the source of truth for screens and states; where it conflicts with the glossary, `decisions.md` section 1 records the call.

**Design v2.2 (2026-11-09)** supersedes v2b for screens, layout and copy: `.scratch/design/challenges-v2-2/Challenges v2.2.html`. The domain rules in this spec still hold; where v2.2 shows something the data cannot back (a Season lens on Team form, "who booked" the court, free-text times such as "after 8 PM"), the screens show the nearest honest version.

Audited at `cb1776ef` on `claude/temba-challenges-flow-3898a4` (dev + the seat-tile join work).

## 1. Problem

A Team on Temba today is a roster with a record it cannot earn: nothing lets it find another Team and play. Players arrange opponents on WhatsApp, book a court themselves, then have nowhere to record the result as *their Team's* result. Football Teams cannot register on any Game at all (ADR-0038).

The owner wants a board where a Team posts a **Challenge** with its preferences, another Team **proposes** a time and venue, the poster **confirms** one proposal, and that confirmation is a Game between the two Teams. Teams become persistent identities with a record, a form line, **Rivals** and head-to-head. **(revised 2026-11-08)** A football Team is a flat **Roster** of up to twenty that plays any format; the people who play one Game are its **Matchday squad**, named by the Captain after the Game exists.

## 2. Solution in one paragraph

A **Challenge** is a request posted by a Team: sport (from the Team), for football a **Format** (5, 6 or 7-a-side), Level wanted (a band range), preferred Venues, days and timings or exact slots, a 140-character line, open for 7 days. Any other Team of that sport whose Team Level sits in the range, and whose Roster holds at least the Format's side, may send a **Proposal**: one Venue and one date-time, nothing else. A Proposal waits 48 hours. The posting Team confirms one Proposal; the others are told. Confirming creates a **Challenge Game**: a Friendly game with no Group, both Game teams bound to the two Teams, registration closed, no invites. **(revised 2026-11-08)** On padel both members are the squad and are seated at confirm. On football the Game opens with two empty sides of `side + 3` seats, hatched; each Captain names a Matchday squad from the Roster in the "Name your squad" sheet, at least the side and at most three Reserves, and may change it until the Score is entered. Named players are told and see the Game in Games; only they get the result, Marks, MVP and head-to-head. From there everything is the normal Game. Nothing is booked by Temba.

## 3. Glossary additions (to land in `CONTEXT.md` with the tickets)

- **Challenge**: a Team's open request for an opponent: sport, Format (football), Level wanted, preferred Venues, days and timings, a line from the Team. Open for 7 days after posting, longer only while a Proposal is pending. Confirming one Proposal closes it and creates the Challenge Game. A request, never a Game.
  _Avoid_: match request, open game, fixture, invitation.
- **Proposal**: one Team's answer to a Challenge: a Venue and a date-time. Pending for 48 hours; confirmed, declined, withdrawn, expired or passed over. At most one pending Proposal per Team per Challenge.
  _Avoid_: accept (the button says Accept; the entity is a Proposal), bid, offer, counter.
- **Challenge Game**: the Friendly game a confirmed Proposal creates. Groupless, both Game teams bound to Teams, registration closed, no Waitlist, no Invite doors, nobody joins. Padel seats both members at create; football seats whoever each Captain names. Its Organizers are the people who act for either Team. Padel is Rated at the groupless weight; football is Unrated (ADR-0039).
  _Avoid_: challenge match, team game (that is a team-only Game), friendly (bare).
- **Challenge format** **(revised 2026-11-08)**: the football Side size a Challenge asks for: 5, 6 or 7-a-side. Product copy says Format. Stored as `challenges.side_size` and copied to the Game's Side size. Not the Game format enum (`friendly_game`, `americano`, …).
  _Avoid_: game format (that enum), team size, squad size.
- **Roster** **(revised 2026-11-08)**: the members of a Team: who is *on* the Team. Padel exactly two; football two to twenty, flat, whatever Format the Team plays. A football Team may post a Challenge in a Format when its Roster holds at least that Format's side ("Plays 5, 6 and 7-a-side" lists the Formats it can post). The Roster is not who plays a given Game.
  _Avoid_: squad (that is the Matchday squad), line-up, members (bare, in product copy).
- **Matchday squad** **(revised 2026-11-08)**: the players a Captain names from the Roster for one Challenge Game: the side plus up to three Reserves (8 for 5-a-side, 9 for 6-a-side, 10 for 7-a-side). Named after the Game exists, editable until the Score is entered. A side is *named* once at least the side's worth of players is on it; a Score cannot be entered until both are. Only named players are seated, get the result, Marks, MVP and head-to-head. On padel the squad is the whole Roster, seated at confirm.
  _Avoid_: roster, line-up, Football side (the Game team row), registered players.
- **Reserve** **(revised 2026-11-08)**: one of the up to three seats beyond the side on a Matchday squad. A labelled seat, so an empty Reserve never looks like a missing player. A named Reserve is a seated player like any other: same result, Marks and head-to-head. No stored flag; the first `side` named players are the side and the rest are Reserves for display.
  _Avoid_: substitute, bench (as an entity), extra.
- **Captain**: the product name for a Team's creator. Acts for the Team: posts and withdraws Challenges, proposes, confirms and declines, names the Matchday squad. On a padel Team both members act for the Team; on a football Team the Captain and, when the Team carries a Group tag, that Group's Organizers do.
  _Avoid_: owner, admin, creator (in product copy), organizer (when you mean this).
- **Acts for the Team**: the set of Users who may use a Team's Challenge doors. Padel: both members. Football: the Captain and the tagged Group's Organizers.
- **Group tag**: an optional reference from a Team to one Group of the same sport (`teams.group_id`). The Group does not own the Team: the record and Rivals belong to the Team, the tag shows the Team on the Group page and lets the Group's Organizers act for it. Set by a Group Organizer at create or later; cleared by them or when the Group is deleted. **(revised 2026-11-08, owner)** The tag may be set only to a Group the Team's Captain is a member of, whoever sets it.
  _Avoid_: Group team, Club Team (retired), owned by, parent.
- **Team Level**: the mean displayed Level (tenths) of a Team's Roster members who hold a Rating for the Team's sport, shown as a Level band ("C, avg 2.8"). A Team with no rated member has no Team Level. Used only by the Challenge Level gate; never a Rating.
  _Avoid_: team rating, average rank, squad level.
- **Level wanted**: a Challenge's inclusive Level band range, stored as tenths like a Game Level range. A Team whose Team Level is outside it, or has none, sees the card greyed and cannot propose. No request or waiver path.
- **Rival**: another Team this Team has completed two or more Matches against. Shown with **head-to-head**, the wins–losses (–draws in football) from this Team's side, derived from Matches on every read. A Team played once is the "closest" candidate in the empty state.
  _Avoid_: opponent (any Team on the other side of one Match), nemesis, rivalry (as an entity).
- **Rematch**: posting a Challenge pre-filled from a Team you have played, with a nudge Notification to the Users who act for it. It still sits on the open board.
- **Team record**: wins–losses (padel) or wins–draws–losses (football) over the Team's completed Matches on non-cancelled Games, derived on read. Already how `teams.byId` works; this spec adds draws and names it.

Edits to existing entries: **Team** (Captain, Group tag, Roster, football two to twenty), **Team roster rule** (football max 20, complete at 5 = the smallest side), **Side size** (also a Challenge format), **Game** (a Challenge Game is a second groupless kind beside a Booking Game), **Organizer** (of a Challenge Game: whoever acts for either Team), **Notification** (the Challenge kinds), **Invite doors** and **Game admit** (refused on a Challenge Game).

## 4. Actors

| Actor | May |
| --- | --- |
| Any signed-in User | browse the open board; open any Team's detail (name, sport, Roster, record, form, Rivals, Challenge Games); open a Challenge's detail; see the Teams segment |
| Member of a padel Team | everything "acts for the Team" below |
| Captain of a football Team | act for the Team, and manage the Roster: invite, add by phone, remove an Unclaimed player, set or clear the Group tag (with the Group's Organizers) |
| Organizer of a Team's tagged Group | act for the Team on Challenge doors only (post, withdraw, propose, change, withdraw proposal, confirm, decline, name the squad) |
| Acts for the Team | post a Challenge (one open at a time per Team), withdraw it, propose on others' Challenges, change or withdraw the Proposal, confirm or decline Proposals on the Team's Challenge, name and edit the Matchday squad **(revised)**, cancel a Challenge Game |
| Roster member not named | sees the Game on the Challenge detail, Mine and the Team's Games list; not in Games tab; cannot score, mark or vote |
| Named player | the normal player on a Game: Games tab, score and confirm, Marks, MVP vote, result card |
| Organizer of a Challenge Game | the Game's existing Organizer doors (score, confirm for a side without accounts, cancel, edit name, window, price) minus add/kick/invite/publish sides; plus the squad door for their own side |

## 5. Domain model and schema

All new tables in `@repo/db`, one new migration per ticket, never editing an existing one. Naming follows `games`, `game_teams`: unprefixed table names, uuid ids, `created_at`/`updated_at`.

### 5.1 Team changes

```text
teams
  + group_id      uuid null -> groups.id  on delete set null     -- Group tag (D2)
```

- **(revised 2026-11-08)** Football Team roster rule becomes `{ min 2, max 20, completeAt 5, pairIsUnique false }` in `@repo/domain/team-roster` (D3). `completeAt 5` keeps today's meaning for `teamIsComplete` (the Team can post *some* Format); the posting gate for a given Format is `rosterCount >= sideSize` (`teamCanPostFormat` in `@repo/domain/team-roster`). Existing larger Teams (max was 25) are not shrunk; the rule gates joins, invites and adds, and the detail shows "22 of 20" honestly.
- No captain column: Captain is `teams.created_by` (D1). No football role column on `team_members`: a member's role and position read from `user.preferred_football_role` / `user.preferred_football_position` (D4).
- `teams.games_played`, `wins`, `losses` stay as dead stored columns (already unused by reads). Not removed in this spec.

### 5.2 Challenge

```text
challenge_status      enum: open | confirmed | expired | withdrawn
challenge_timing      enum: morning | afternoon | evening          -- before noon, noon to 6 PM, after 6 PM (same cuts as Play windows)
weekday               enum: mon | tue | wed | thu | fri | sat | sun

challenges
  id                  uuid pk
  team_id             uuid not null -> teams.id        on delete cascade
  sport               group_sport not null             -- snapshot of the Team's sport at post
  status              challenge_status not null default 'open'
  posted_by           uuid not null -> user.id         on delete restrict
  level_min_tenths    integer null                     -- Level wanted, same units as games.level_min_tenths
  level_max_tenths    integer null
  days                weekday[] not null default '{}'  -- empty = any day
  timings             challenge_timing[] not null default '{}'   -- empty = any time
  exact_slots         timestamp[] not null default '{}'          -- optional exact start times
  duration_minutes    integer not null                 -- padel 90, football 60 by default; the Game window
  side_size           integer null                     -- football only: the Challenge format, 5, 6 or 7 (check); null on padel
  note                varchar(140) null                -- "a line about you"
  nudge_team_id       uuid null -> teams.id            on delete set null   -- Rematch target
  expires_at          timestamp not null               -- posted + 7 days
  confirmed_proposal_id uuid null -> challenge_proposals.id  on delete set null
  game_id             uuid null -> games.id            on delete set null
  withdrawn_at, expired_at, confirmed_at   timestamp null
  created_at, updated_at

challenge_venues                                        -- preferred Venues, ordered
  challenge_id        uuid not null -> challenges.id   on delete cascade
  venue_id            uuid not null -> venues.id       on delete cascade
  rank                integer not null
  primary key (challenge_id, venue_id)

indexes
  challenges_open_board_idx   (status, sport, expires_at)    -- the board query
  challenges_team_open_uq     unique (team_id) where status = 'open'   -- one open Challenge per Team (D19)
```

### 5.3 Proposal

```text
proposal_status   enum: pending | confirmed | declined | withdrawn | expired | passed_over

challenge_proposals
  id              uuid pk
  challenge_id    uuid not null -> challenges.id   on delete cascade
  team_id         uuid not null -> teams.id        on delete cascade
  proposed_by     uuid not null -> user.id         on delete restrict
  status          proposal_status not null default 'pending'
  venue_id        uuid not null -> venues.id       on delete restrict
  court_id        uuid null -> courts.id           on delete set null   -- optional, must be on venue_id with the sport
  starts_at       timestamp not null
  price_per_player_fils integer null               -- (revised) optional: "1.500 BD each"; copied to the Game
  expires_at      timestamp not null               -- sent (or last change) + 48 hours
  decided_by      uuid null -> user.id             on delete set null
  decided_at      timestamp null
  created_at, updated_at

indexes
  proposals_pending_team_uq   unique (challenge_id, team_id) where status = 'pending'
  proposals_challenge_idx     (challenge_id, status)
```

### 5.4 Game and Notification columns

```text
games
  + challenge_id   uuid null -> challenges.id   on delete set null   -- set on a Challenge Game

notifications
  + challenge_id   uuid null -> challenges.id   on delete cascade
notification_type + challenge_proposal_received | challenge_proposal_confirmed | challenge_proposal_declined
                  | challenge_proposal_expired | challenge_proposal_passed_over | challenge_expired
                  | challenge_rematch_nudge | challenge_squad_named | challenge_squad_due | team_invite_received
```

`notifications.team_id` already exists and names the *other* Team in Challenge copy ("Riffa Rackets accepted your challenge"); `game_id` is set once a Game exists.

### 5.5 The Matchday squad in Game rows **(revised 2026-11-08)**

No new table. A football Challenge Game at confirm has:

- `games`: `sport football`, `side_size` from the Challenge, `players_allowed = 2 × (side_size + 3)`, `registration_closed_at = now`, `challenge_id`, `venue_id` from the Proposal, `price_per_player_fils` from the Proposal, window `starts_at` to `+ duration`.
- two `game_teams` rows with `side_index 1 | 2`, `team_id`, bibs black and white, **no players**.
- one Match with both slots set to those Game teams and its one Set shell (the Score), `court_id` from the Proposal in `game_courts`/`matches.court_id`.
- **no** `game_players` rows.

Naming a squad writes one `game_players` row (with `football_role/position` from the User's preferences) and one `game_team_players` link per named User; un-naming deletes them. The seat grid is derived: `side_size + 3` seats per side, the first `side_size` labelled side and the rest Reserve, filled in naming order, hatched when empty. No `reserve` flag is stored (D24); if a Captain ever needs to pick *who* is a Reserve, a boolean on `game_team_players` is an additive step.

A padel Challenge Game is seated at confirm exactly as today's team-only registration does (both members, Positions from Preferred Position, either → left then right).

### 5.6 Derived, never stored

- **Team record** and **Rivals**: from completed Matches of non-cancelled Games where a `game_teams.team_id` is the Team. Both sides of a Challenge Game carry a `team_id`, so the opponent Team of each Match is known. Rival = opponent with two or more such Matches. Draws come from `matchOutcome` returning `draw`. Moves out of `routers/teams/byId.ts` into a shared server module `packages/api/src/teams/team-record.ts` because `challenges.byId`, `challenges.listOpen`, `games.byId` (challenge variant) and `teams.byId` all read it (D12).
- **Formats a Team plays** **(revised)**: `FOOTBALL_CHALLENGE_SIDE_SIZES.filter(side => rosterCount >= side)`; pure, in `@repo/domain/team-roster`.
- **Team Level**: mean of Roster members' displayed Level tenths for the Team's sport; pure function in `@repo/domain/team-level`. Null when no member is rated.
- **Form**: the Team's last ten Match results, newest last, for `FormSlot`. No Season lens (non-goal).
- **Squad state** **(revised)**: `squadState(namedCount, sideSize)` in `@repo/domain/matchday-squad`: `empty | partial | named`; `locked` when the Match's Score Set has values or the Match is completed.
- **Expiry**: `isChallengeOpen(row, now)` and `isProposalPending(row, now)` in `@repo/domain/challenge-clock` are consulted by every read and every door, so a stale row never acts. A Graphile job per Challenge and per Proposal, scheduled at `expires_at` with `mode: "replace"`, stamps the status and sends the expiry Notifications (D8). Precedent: `settleMvpJob` and Invite link check-on-read.

## 6. State machines

### 6.1 Challenge

```text
open ──confirmProposal──▶ confirmed  (game_id set; the Game lives its own life, cancel included)
open ──withdraw (acts for Team)──▶ withdrawn   (every pending Proposal → passed_over, and its Team is told)
open ──clock: expires_at passed AND no pending Proposal──▶ expired
```

Rules:
- A Challenge never expires while a Proposal is pending. The clock job re-checks; a Proposal that lands at day 6 keeps the Challenge alive until that Proposal is decided or expires (48 h), then the Challenge expires if `expires_at` has passed.
- `confirmed` is terminal. If the Game is later cancelled the Challenge stays `confirmed` and the detail shows the cancelled Game; a new Challenge is a new post.
- Expired and withdrawn Challenges leave the board and Mine quietly (no row in Mine; Notifications carry the news).

### 6.2 Proposal

```text
pending ──confirm (poster)──▶ confirmed          every other pending Proposal on the Challenge → passed_over
pending ──decline "Another time" (poster)──▶ declined     the proposer's Team may propose again
pending ──change (proposer)──▶ pending            starts_at / venue / price replaced, expires_at = now + 48 h, poster re-notified
pending ──withdraw (proposer)──▶ withdrawn
pending ──clock: 48 h──▶ expired
pending ──Challenge withdrawn──▶ passed_over
```

Rules:
- One pending Proposal per Team per Challenge (unique index). A Team may propose on many Challenges at once.
- A Team cannot propose on its own Challenge, nor on a Challenge posted by a Team that shares a member with it (football Rosters can overlap).
- **(revised)** Proposing requires: Challenge open; proposer's Team of the same sport; padel Roster complete (two); football Roster at least the Challenge format's side; Team Level inside Level wanted (if set); `starts_at` at least one hour ahead and within 30 days; Venue offers the sport; Court, if given, on that Venue with that sport. Nothing about who will play.
- Confirm re-checks everything propose checked, for both Teams, at confirm time (a member may have left). Refusal names the reason; nothing is written.

### 6.3 Game side (football Challenge Game) **(revised 2026-11-08)**

```text
empty (0 named) ──nameSquad──▶ partial (1 … side−1) ──nameSquad──▶ named (side … side+3)
   ▲                 │                                      │
   └── nameSquad with fewer names (any pre-locked state may go back) ◀┘
named ──Score entered (saveFootballScore writes the Set)──▶ locked
locked ──reportWrongScore clears the Score──▶ named (editable again)
```

Rules:
- `games.nameChallengeSquad` replaces the side's whole list: 0 to `side_size + 3` Roster members of that Team. Partial saves are allowed (the opponent's "4 + 5 to name" state in the mockup).
- A Score (`saveFootballScore`) is refused until **both** sides are `named`: "Name both squads first".
- Newly named Users get `challenge_squad_named` and a `game_players` row; removed Users lose the row silently (non-goal: a removal Notification). A removed User who had confirmed nothing yet loses nothing else; removal after a Score is impossible (locked).
- 24 hours before kick-off a job sends `challenge_squad_due` to the Users who act for any side still `empty` or `partial` (skipped if `named`; one per side).
- Padel: the side is `named` at confirm and the door is refused ("Both players are the squad on padel").

## 7. Permissions, in one table

| Door | Who | Refused when |
| --- | --- | --- |
| `challenges.post` | acts for a Team of the sport | padel Roster not two; football Roster below the chosen Format's side **(revised)**; Team already has an open Challenge; Level range inverted; Format not 5, 6 or 7 on football or set on padel |
| `challenges.withdraw` | acts for the posting Team | not open |
| `challenges.propose` | acts for an eligible Team (6.2) | any 6.2 rule fails |
| `challenges.changeProposal`, `withdrawProposal` | acts for the proposing Team | not pending |
| `challenges.confirmProposal`, `declineProposal` | acts for the posting Team | Challenge not open, Proposal not pending, re-check fails |
| `challenges.listOpen`, `byId`, `listMine`, `listPostOptions`, `listProposeOptions` | any signed-in User | — |
| `games.nameChallengeSquad` **(revised)** | acts for that side's Team | not a football Challenge Game; a name is not on that Team's Roster; more than `side_size + 3`; a name is already on the other side (shared Roster member); side locked (Score entered or Match completed); Game cancelled |
| `games.saveFootballScore` on a Challenge Game | Organizer (either Team's acting Users) as today | either side not `named` |
| `teams.byId` | any signed-in User (D5); member-only fields stay member-only | — |
| `teams.setGroupTag` | Captain or an Organizer of the target Group; clearing: either, or any Organizer of the tagged Group | sport differs; **(revised 2026-11-08, owner)** the Captain is not a member of the target Group (also refused by `teams.create` with a `groupId`) |
| `teams.previewPlayerByPhone`, `addPlayerByPhone`, `removeUnclaimedPlayer` | Captain | Roster at 20 (or two on padel); phone not E.164; account holder already invited |
| Existing `games.registerSeat/register/registerTeam/registerWithPartner/createInviteLink/sendLookupInvite/addPlayerByPhone/addGroupMembers/leave/leaveWaitlist/kick/publishFootballTeams` | — | the Game has `challenge_id`: `BAD_REQUEST` "Teams are set by the challenge; captains name the squads" |
| Existing `games.cancel`, `scoreSet`, `confirmMatchResult`, `completeMatch`, `updateName`, `updateWindow`, `updatePricePerPlayer`, `reportWrongScore`, `setFootballRole` (own role) | Organizer, which on a Challenge Game is whoever acts for either Team (`isGameOrganizer` challenge branch); `setFootballRole` the player | as today |
| Existing `games.updateCaps/updateLevelRange/updateSeason` | — | refused on a Challenge Game (the shape is the Challenge's) |
| `canViewGame` **(revised)** | adds: any Roster member of either Team | — |

## 8. API: one endpoint per file

`packages/api/src/routers/challenges/` (new router, mounted as `challenges` in `root.ts`):

| File | Kind | Purpose |
| --- | --- | --- |
| `index.ts` | compose | |
| `listOpen.ts` | query | the Open board: open Challenges, newest first, with filters `{ sport?, levelMinTenths?, levelMaxTenths?, area?, weekday? }`; each row carries poster Team summary (name, initials, first six Roster members, Roster count, Team Level band, record), Format, Level wanted, days/timings label inputs, preferred Venue names, proposal count, `expiresAt`, and `viewer: { eligibleTeams: [...], ineligibleReason }` so the card greys and Accept knows which Teams may propose |
| `byId.ts` | query | one Challenge in its three states: open (poster Team, Format, Level wanted, Venues, days, timings, record, posted by, note, proposal count, viewer's eligible Teams), pending (viewer's Team's Proposal with time, Venue, sent, expires), confirmed (Game summary with squad states, proposed by, confirmed by, Pitch/Court, cost line). Poster view adds the Proposal queue |
| `listMine.ts` | query | the Mine segment in display order: Proposals waiting on the viewer's Teams (as poster) first, then the viewer's Teams' open Challenges with counts and days left, then the viewer's pending Proposals, then confirmed Challenge Games upcoming (with "name your squad" when the viewer's side is not `named`), then played (last 10). Read-time expiry applied |
| `listPostOptions.ts` | query | for the post form: the viewer's Teams that may post (padel complete; football with Roster ≥ 5, listing the Formats each can post **(revised)**, no open Challenge), Venues offering each sport, default duration |
| `listProposeOptions.ts` | query | for the Accept sheet: the viewer's eligible Teams for this Challenge, Venues (preferred first, then every Venue offering the sport), Courts per Venue, and suggested slots from days × timings over the next 14 days plus exact slots |
| `post.ts` | mutation | create a Challenge (+ venues, Format, nudge, expiry job). Returns id |
| `withdraw.ts` | mutation | |
| `propose.ts` | mutation | create a Proposal (+ expiry job, `challenge_proposal_received` to the poster's acting Users) |
| `changeProposal.ts` | mutation | |
| `withdrawProposal.ts` | mutation | |
| `confirmProposal.ts` | mutation | confirm, pass over the rest, create the Challenge Game: padel through the shared Friendly Game create module and seat both pairs; football through `createFootballGame` then two empty sides, the Match and its Score shell written inline **(revised)**; close registration; schedule `challenge_squad_due`; notify. One transaction. Returns `gameId` |
| `declineProposal.ts` | mutation | |

`packages/api/src/routers/teams/` additions:

| File | Kind | Purpose |
| --- | --- | --- |
| `setGroupTag.ts` | mutation | set or clear `group_id` |
| `previewPlayerByPhone.ts`, `addPlayerByPhone.ts`, `removeUnclaimedPlayer.ts` | | the phone door, mirroring `groups/*` (D4) |
| `listGroupMembersToAdd.ts` | query | members of a Group the viewer organizes, for "From a group", marking who is already on the Roster or invited |
| `create.ts` (changed) | mutation | takes optional `groupId`, `inviteUserIds[]`, `phonePlayers[]` so the New team screen creates and invites in one transaction |
| `byId.ts` (changed) | query | open to any signed-in User; adds `record.draws`, `rivals[]`, `form[]`, `challengeGames[]`, `groupTag`, `captainUserId`, `viewerActsForTeam`, `roster: { count, max, formatsPlayable[] }` **(revised)**, member `footballRole/footballPosition/levelBand/level` |
| `mine.ts` (changed) | query | adds record, rival count, Group tag label, Roster count ("12 on the roster") **(revised)** |

`packages/api/src/routers/games/` additions and changes:

| File | Change |
| --- | --- |
| `nameChallengeSquad.ts` **(revised)** | new: `{ gameId, teamId, userIds[] }`; replaces that side's seated players from the Roster; notifies the newly named |
| `byId.ts` | adds `challenge: { id, postedByTeamId, postedAt, proposedBy, confirmedBy, sides: [{ teamId, name, record, headToHead, sideSize, reserveSeats: 3, named: [...], state }], pitch, costLine, viewerCanNameSide: teamId | null } | null` and `isChallengeGame`; `canJoin`, invite and add flags false on a Challenge Game |
| `saveFootballScore.ts` | refuses until both sides `named` on a Challenge Game |
| admit, invite, kick and publish doors listed in section 7 | refuse on `challenge_id` |

Shared server modules (two or more callers):

- `packages/api/src/teams/team-record.ts`: `loadTeamRecord`, `loadTeamRivals`, `loadTeamForm` (moved from `routers/teams/byId.ts`).
- `packages/api/src/teams/acts-for-team.ts`: `userActsForTeam(db, team, userId)` and `actingUserIds(db, team)` (the Notification audience).
- `packages/api/src/teams/team-level.ts`: loads members' Ratings and calls the pure `@repo/domain/team-level`.
- `packages/api/src/games/access.ts`: `isGameOrganizer` and `gameAdminUserIds` gain a `challengeId` branch that resolves to `actingUserIds` of both Teams; `canViewGame` admits Roster members of either Team; `requireNotChallengeGame(game)` for the refusals.
- `packages/api/src/games/challenge-squad.ts` **(revised)**: `loadChallengeSides(db, game)` (both sides with named players and `squadState`), read by `games.byId`, `saveFootballScore`, `challenges.byId`, `challenges.listMine` and the `challenge.squad-due` handler.
- `packages/api/src/jobs/specs.ts` + `handlers/challenge.expire.ts`, `handlers/proposal.expire.ts`, `handlers/challenge.squad-due.ts` **(revised)**.
- `packages/api/src/notifications/notify-challenge.ts`: the Challenge emits (each has one door, but the audience resolution is shared).

**(revised)** `publishFootballTeams` is **not** reused or extracted: a Challenge Game's sides exist from confirm and are filled by `nameChallengeSquad`; `publishFootballTeams` is simply refused on a Challenge Game. `football-lineup.ts` read helpers (`footballSides`, `footballMatch`, `footballScoreSet`) work unchanged because the sides and Match exist from confirm.

`@repo/domain` (pure, client-used): `team-level`, `team-roster` (+ `FOOTBALL_CHALLENGE_SIDE_SIZES = [5, 6, 7]`, `teamCanPostFormat`, `formatsPlayable`), `matchday-squad` **(revised)** (`squadSeatCount(side) = side + 3`, `squadState`, seat labels, "6 of 9 named, 6 + 3 reserves", "4 + 5 to name", sheet counters and the confirm button label), `challenge-clock`, `challenge-card` (card copy: "Football, 6-a-side, avg 2.8, 12 on the roster. Wants C to B−", "2 proposals, 5 days left", days/timings labels), `challenge-slots`, `team-rivals`, `challenge-form` (post-form validation: note ≤ 140, range not inverted, Format vs Roster; review lines incl. "Format 6-a-side. Squads of up to 9 named after confirmation"). `notification-copy` gains the ten types.

`@repo/validators`: nothing new unless the post input ends up parsed by a client form too; otherwise inline in `post.ts`.

## 9. Clients

### 9.1 Mobile (`apps/mobile`)

- **Tab bar**: `TabSlot` gains `challenges` as the third slot; `book` leaves the bar (D13, open question Q1). Booking stays reachable from Home's venue cards and Profile › Bookings; its routes under `app/(app)/book/*` are unchanged.
- **Route group** `app/(app)/challenges/`: `_layout.tsx` (TabStack), `index.tsx` (segments Open / Mine / Teams, counts in the segment labels), `[id].tsx` (detail, three states, Accept sheet), `new.tsx` (post form with Format), `new/review.tsx`, `teams/[id].tsx` (Team detail), `teams/new.tsx`, `teams/new/from-group.tsx`, `players/[userId]/*`. `profile/teams/*` redirect to `challenges/teams/*` so the Invite link landing path keeps working.
- **Screens** follow the v2b mockup: open feed cards with hatched opponent seats (`Hatch`), Accept as the primary `Button`, greyed card when the viewer has no eligible Team; Mine with the one `Surface tone="ink"` for the Proposal waiting on you; Teams segment cards ("Football. 12 on the roster. Gooz of Arad's team"); Team detail with record hero, "Roster 12 of 20", "Plays 5, 6 and 7-a-side", `FormSlot` form, Rivals with Rematch, a **Roster** section with an "Add more … Up to 20" row **(revised)**; Create team with "Football roster up to 20" and the helper "5 needed for 5-a-side, 7 for 7-a-side, 20 max" **(revised)**; Game details Challenge variant and the Name your squad sheet (9.3).
- **Models** sit beside screens as pure `*-model.ts` with tests, like `teams-model.ts`.

### 9.2 Web (`apps/web`)

- **Nav**: sidebar item **Challenges** at `/dashboard/challenges` replaces the Teams item; the web bottom nav (Home, Games, Groups, You) is unchanged. `/dashboard/teams/*` routes stay and are linked from the Teams segment.
- **Routes**: `dashboard/challenges/page.tsx` (segments via `?tab=`), `challenges/[id]/page.tsx`, `challenges/new/page.tsx`, `teams/[id]/page.tsx` (extended), `teams/new/page.tsx` (extended with phone and group squads). Components under `components/challenges/*`, reusing `components/common/*`, `game-seat-grid`, `game-summary-card`, `football-team-columns`.

### 9.3 Game details, Challenge variant (both Apps) **(revised 2026-11-08)**

Diff only, driven by `games.byId.challenge`: CHALLENGE tag in the hero; team-vs-team row (initials crest, Team name, record, head-to-head or "first meeting"); below it, on football, **two squads**: each side shows `side + 3` seats, the first `side` labelled as the side and three labelled Reserve, named players as tiles with role, empty seats hatched, a counter line ("6 of 9 named, 6 + 3 reserves" / "4 + 5 to name, 4 of 9"); an **Edit your squad** (or **Name your squad**) button for a viewer who acts for that side; no "Take the open seat", no Invite, no Add player, no Make teams; details rows "From challenge", "Proposed by … confirmed by …", "Pitch … Book it yourselves" (padel: "Court …"), "Cost 1.500 BD each, pay at the venue" (from the Proposal price; "Split four ways, pay at the venue" when none on padel), "Counts for: Both teams' records and the players named" (padel adds "and rating"). Padel shows the two pairs as player tiles exactly like a team-only Game; no squad sheet.

**Name your squad sheet (6b)**: title "Your squad for Friday", help "6-a-side, so six plus up to three reserves. Name at least six to confirm.", counter "6 of 9 named from 12 on the roster", two counters "side, 6" and "reserves, up to 3", a Roster list with select state (Captain pre-selected, role and Level per row, Unclaimed marked), footer copy about who is told, button "Confirm squad, N named" (enabled at any N ≤ side + 3; the side-state line says when the squad is short). Saving calls `games.nameChallengeSquad` with the full list.

### 9.4 Group page (both Apps)

A small "Teams" row listing Teams tagged to the Group with record, visible to members; Organizers see Create team here (pre-tagged).

## 10. Notifications

| Type | Recipients | Excluded | Links to |
| --- | --- | --- | --- |
| `challenge_proposal_received` | acts for the posting Team | proposer | Challenge detail (poster view) |
| `challenge_proposal_confirmed` | acts for both Teams, plus every padel member (they are seated) | confirmer | the Game (football: "name your squad") |
| `challenge_proposal_declined` | acts for the proposing Team | decider | Challenge detail |
| `challenge_proposal_passed_over` | acts for each other proposing Team | — | Challenge detail |
| `challenge_proposal_expired` | acts for the proposing Team | — (clock) | Challenge detail |
| `challenge_expired` | acts for the posting Team | — (clock) | Challenges › Mine |
| `challenge_rematch_nudge` | acts for the nudged Team | poster | Challenge detail |
| `challenge_squad_named` **(revised)** | each User newly named to a squad | the namer (a Captain naming themself is not told) | the Game |
| `challenge_squad_due` **(revised)** | acts for a side still short 24 h before kick-off | — (clock) | the Game |
| `team_invite_received` | the invited User | inviter | Challenges › Teams (the Lookup invite stays the actionable item) |

**(revised)** `challenge_proposal_confirmed` on football goes to the acting Users only, since nobody else is seated yet; Roster members hear when named. Written through `notify()` in the door's transaction; Unclaimed players are dropped by `notify()` as today; emails follow (ADR-0054). Copy in `@repo/domain/notification-copy` from `notification.ts` catalog keys.

## 11. i18n

New catalog files in both `en/` and `ar/`: `challenge.ts` (shared domain copy: states, card lines, days, timings, Format, Level wanted, Rival, head-to-head, squad counters and seat labels), `mobile-challenge.ts`, `web-challenge.ts`. Additions to `team.ts` (Captain, Roster, "Roster up to 20", the 5/7/20 helper, By phone / On Temba / From a group, tag copy, record labels W–D–L, "Plays 5, 6 and 7-a-side"), `game.ts` and the game-details catalogs (Challenge variant rows, Name your squad sheet), `common.ts` (the Challenges tab label), `notification.ts`. Counts through `plural()`. Arabic is written in the same ticket as English.

## 12. Testing

- Procedure tests through the exported plain functions on PGlite, beside each file: post (one open per Team, inverted range, Format vs Roster **(revised)**), propose (every refusal in 6.2, pending uniqueness), confirm (padel Game seated; football Game with two empty sides, Match and Score shell, `players_allowed = 2 × (side + 3)`, no `game_players` **(revised)**; pass-over; re-check failure writes nothing), decline/withdraw/change (clock reset), expiry handlers (idempotent, Challenge kept alive by a pending Proposal), `nameChallengeSquad` (partial, full, over cap, non-Roster, shared member on both sides, locked after Score, reopened by wrong-score, Notifications only to newly named **(revised)**), `saveFootballScore` refused until both named, access (`isGameOrganizer` for both Teams' acting Users; `canViewGame` for an unnamed Roster member; admit/kick/publish doors refuse), Team record with draws, Rivals and head-to-head from fixtures, Team Level mean, `formatsPlayable`, phone door on Teams (account → Lookup invite; unclaimed → member; football role written to the Unclaimed User; refused at 20), Group tag doors, Notification recipients per type, the squad-due job (skips a named side).
- Domain unit tests beside each pure module (`matchday-squad` seat labels and states included).
- Client model tests (`*-model.test.ts`) for segment ordering, card copy, greyed state, squad grid and sheet counters.
- Seed (`packages/api/scripts/seed.ts`) gains two padel Teams and two football Teams (one with 12 on the Roster), an open Challenge per sport, a pending Proposal, a confirmed football Challenge Game with one side named and one partial, and a played one with a score.
- Gate: `pnpm exec turbo run typecheck lint test`.

## 13. Documentation the tickets will change

- `CONTEXT.md`: add the section 3 terms; edit Team, Team roster rule, Side size, Game, Organizer, Notification, Invite doors, Game admit.
- ADRs (new): "A Challenge is a request and a Game is the result" (model, expiry, groupless Challenge Game, rating at groupless weight: amends ADR-0035's "Rated Games need a Verified Group" for this one Game kind); "A Team's Captain is its creator, and a Group tag does not own the Team" (amends ADR-0038's "no captain role" and the glossary's "belongs to no Group"); **(revised)** "A football Roster is up to twenty and a Matchday squad is named per Game" (amends ADR-0038's roster rule and ADR-0039's "sides picked by the Organizer at publish" for Challenge Games). Draft them in the tickets that make the change; the owner reviews first.
- `.scratch/padel-teams/spec.md` rule 25 (Loose Team home not public) is superseded by D5; note it in the ADR.

## 14. Non-goals

- Temba booking the Court or pitch, holding a slot, or recording which Team booked it (the mockup's "Hidd United booked it" stays copy-free: the row says "Book it yourselves").
- Cost splitting or payment. The cost row is copy from the Proposal's optional price.
- Availability taps from the Roster before the Captain names the squad (the mockup calls this "a natural next step").
- A stored Reserve flag or a Captain choosing *who* is a Reserve; a separate "played" flag for Reserves (D24).
- A Notification to a player removed from a squad.
- Counter-proposals or chat between Teams. Change proposal covers it.
- Challenges for a single User (no Team) or pickup. Accepting one asks you to make a Team.
- A free-text Area; Area is the preferred Venues' city (D15).
- Season lens on Team form; Team Seasons; Team Standings or a Teams leaderboard.
- Transfer of captaincy; captain on padel (both act).
- Share team (the mockup's Share button) beyond the existing Team Invite link.
- Push Notifications (Phase 7).
- Venue console involvement.
- Removing the dead `teams.games_played/wins/losses` columns.
- Changing any existing tRPC procedure path.

## 15. Open questions, settled

The owner accepted every recommended default on 2026-11-08. The bold defaults below are now decisions; the alternatives stay recorded for context.
1. **Mobile tab bar.** The mockup has Home, Games, Challenges, Groups, Profile; today's bar has Book in the third slot. **Default: Challenges takes the slot; Book is reached from Home's venue cards and Profile › Bookings.**
2. **Padel Challenge Games are Rated.** ADR-0035 ties rating to a Verified Group. **Default: Rated at the groupless half weight, since two independent Teams confirm each other's result**; football stays Unrated.
3. ~~Football roster max~~ **Settled by the owner on 2026-11-08: Roster up to 20; the Matchday squad (side + up to 3 Reserves) is named after confirmation.**
4. **One open Challenge per Team.** **Default: yes.**
5. **Group Organizers acting for a tagged Team.** **Default: Challenge doors (incl. naming the squad) only; the Roster stays the Captain's.**
6. **Area = Venue city.** **Default: yes** until Venue gets an area field.
7. **Team detail public to any signed-in User.** **Default: yes**; invites, masked phones and actions stay member-only.
8. ~~Rematch target~~ **Settled by the v2b mockup: any Team you have played.**
9. **Court on a Proposal**: **optional** (default).
10. **Proposal time horizon**: **at least 1 hour ahead, within 30 days** (default).
11. **Should a Team with no rated member be able to post?** **Default: yes, its card shows no band**; it still cannot propose on a Challenge with a Level wanted.
12. **(new)** **Reserves count as played.** The mockup says only named players get the result; a named Reserve is seated and therefore gets the result, Marks, MVP vote and head-to-head like the side. **Default: yes, no "played" flag.** Alternative: a `reserve` boolean on `game_team_players` that Last 10 and Standing-like readers would have to learn.
13. **(new)** **Squad lock point.** **Default: the squad locks when the Score is entered** (the Set has values) and reopens if a wrong-score report clears it. Alternative: lock at kick-off.
14. **(new)** **The 24-hour "name your squad" reminder.** **Default: ship it** (one job per Game, cheap on the existing worker). Alternative: drop it and rely on Mine's "name your squad" line.
15. **(new)** **Proposal price per player.** **Default: optional on the Proposal, copied to the Game**, editable later by either Team's acting Users through `updatePricePerPlayer`. Alternative: no price on Challenge Games.
