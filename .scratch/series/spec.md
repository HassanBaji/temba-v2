# Series

**Status:** ready for implementation. Decisions: ADR-0105 (wins and Edition numbers are computed) and ADR-0106 (the Series badge is the third place colour appears). Glossary: Series, Edition, Series badge, Series win in `CONTEXT.md`.

**Design (source of truth):** `.scratch/series/design/`

- `screens/*.png`: one screenshot per screen. Section 8 maps each to code.
- `series-flow.copy.txt`: every string, and the designer's notes (A SERIES, ATTACH, WINNING, PROFILE). The notes are product rules.
- `series-flow.source.html`: the markup with exact sizes.
- `badge-geometry.md`: the badge's hexagon, seven emblems, six colours and sizes, extracted from the markup.

**The request, verbatim:** "I want to add something called series, where the group organizer/admin can create a series, and socials can be part of a series, and the user will be able to collect these series on his profile. Only verified groups should be able to create a series. Implement the flow and web and mobile. Follow the attached designs."

---

## 1. Problem

A Verified Group plays the same Social or the same Game again and again: a Sunday Social, a Friday football Game. Nothing ties those days together, and winning one leaves no trace beyond that day's result. Players have nothing to collect for winning the thing their Group plays every week.

## 2. What exists today (discovery)

| Area | What the code does | Where |
| --- | --- | --- |
| Verified | `groupIsVerified(group)`: `verified_at` is set, or the Group has a Venue link | `packages/api/src/groups/group-is-verified.ts`; `groups.byId` returns `verified` |
| Who runs a Group | Group approver: the Group creator or an Appointed Organizer. The same people create and organize the Group's Games | `groups/helpers/is-group-approver.ts`, `games/access.ts` (`mayCreateGameOnGroup`, `assertGameOrganizer`) |
| A Group-level thing a Game links to | Season: `group_seasons`, `games.season_id`, `groups.createSeason`, `games.updateSeason`, locked once a score is confirmed | `packages/api/src/games/season-link.ts`, `routers/games/updateSeason.ts` |
| Group home tabs | Standing, Games, Members on both Apps, `?tab=` on web | `packages/domain/src/group-home-tab.ts`, web `groups/[id]/page.tsx` + `group-home-chrome.tsx`, mobile `groups/group-home-view.tsx` |
| Game kinds a Group creates | padel Friendly game; football Game (a Friendly game); Social (Friendly tournament) in six Tournament shapes: Groups only, Rounds, Groups then knockout, Knockout only, King of the court, Americano. Football has no Social | `routers/games/create.ts`, `createTournament.ts` |
| Create, last step | Step 4 on both Apps: three variants (padel, football, Social). MVP mode is the precedent for a step-4 choice held outside the shared draft | mobile `create-game/details-step.tsx` + `create-model.ts`; web `games/new/page.tsx`, `friendly-game-steps.tsx`, `friendly-tournament-steps.tsx` |
| Edit game | One sheet, model in `@repo/domain/game-edit-form` (draft, sections, save steps). Season is a section with its own save step | mobile `game-details/game-edit-sheet.tsx` + `use-game-edit.ts`; web `games/game-edit-dialog.tsx` + `use-game-edit.ts` |
| Who won | Computed, never stored: `matchOutcome`, `computePoolTables` (`finished`, `winnerGameTeamId`), the Knockout Final, `game_teams.final_place`, `americanoTable` | `@repo/domain/match-outcome`, `pool-table`, `tournament-knockout-view`, `tournament-king`, `tournament-americano` |
| Finished Game | Derived. `notifyIfGameFinished` runs at the end of every Match-settling transaction and writes the `game_finished` Notification | `packages/api/src/notifications/notify-game-finished.ts` |
| A coloured collectible | Marks: coins as data in `@repo/design-tokens/marks`, one `MarkCoin` primitive per App, the cabinet row on the profile, ADR-0056 | `packages/design-tokens/src/marks.ts`, `apps/*/…/marks/mark-coin.tsx`, `cabinet-row.tsx` |
| Latest | One row on Home only: the newest Mark of the last 14 days, hidden per device once opened. The profile has no Latest list | `@repo/domain/home-latest`, `apps/*/…/home/latest-row.tsx`, `use-latest-seen.ts` |
| Profile | Own profile (`you` / `profile`) and the Player profile, both with the Marks row (`CabinetRow`) | web `you/page.tsx`, `players/player-profile.tsx`; mobile `profile/profile-screen.tsx`, `player-profile/player-profile-view.tsx` |

Nothing called Series exists: no table, no procedure, no screen.

## 3. Goals

1. A Group approver of a Verified Group creates a Series: a name and a Series badge.
2. An Organizer attaches a running Series to a Game or a Social, at create or from Edit game.
3. The Game shows its Series and its Edition; the finished Game opens on the winners.
4. Winners collect the Series badge on their profile, with a count.
5. The Series has a page: who has won it most, and every Edition.
6. Both Apps, both Locales, both Color schemes.

## 4. Non-goals

- **Editing a Series after create.** The name and badge are fixed. The design has no edit screen.
- **Reopening an ended Series.**
- **A Latest list on the profile.** The design draws one ("Latest, All 8"); the profile has none today, for Marks either. A Series win is news on Home's Latest row, as a Mark is.
- **A new Notification or Notification email.** The existing Finished Game Notification already brings every player to the Game, which opens on the winners. A stored "you won" notice could not follow a score correction.
- **New Result cards or stickers.** Share on the winners card opens the existing share screen.
- **Series on Game cards other than the Social card** (Friendly game and football Game cards, Match cards, Played cards, Home). The Social card shows its Series (8.6); besides it, only the Game screen, the Series page, the Group's Series screen and the profile show one.
- **A Series across Groups, on a Team, on a Venue, or on a Game with no Group** (Booking Game, Challenge Game, Public Game).
- **Uploads.** A badge is one of seven emblems in one of six colours.
- **Hiding a Series win** with its own switch.
- **A prize, a Level move, Tier points or a Standing change.** A Series win moves nothing.
- **The Venue console.**
- **The design's tab order and tab style.** Series is no tab: it is its own screen, opened from the Group's More menu (8.2).
- **A Series strip on the Games tab.** The design's background draws one; the Group menu's Series row is the one way in.

## 5. Decisions

### 5.1 Words

- **Series**: a named, badged run of a Verified Group's Games.
- **Edition**: one Game attached to a Series, numbered inside that Series.
- **Series badge**: the six-sided coin of a Series.
- **Series win**: a player being among an Edition's winners. Computed.

Product copy says series, edition, badge, win. Arabic: سلسلة, نسخة, شارة, فوز.

### 5.2 Actors and permissions

| Action | Who | Refused when |
| --- | --- | --- |
| See the Group's Series screen and a Series page | Whoever may view the Group (`assertCanViewGroup`) | The Group is not Verified (Series screen and menu row only), or is deleted |
| Create a Series | A Group approver | The Group is not Verified; the name is taken by a running Series of the Group; the Group already runs 10 |
| End a Series | A Group approver | Already ended |
| Attach, change or remove a Game's Series | An Organizer of that Game (`assertGameOrganizer`) | See 5.5 |
| See a player's Series wins | Whoever may open that Player profile (`mayViewPlayer`), unless the owner's Match history visibility excludes them | |

"Admin and organizer" in the design are the Group creator and the Appointed Organizers: the Group approvers. No new role.

### 5.3 A Series

- Belongs to one Group, for good. Its sport is the Group's.
- **Name**: 1 to 40 characters after trimming. Not the name of another running Series of the same Group, compared without case.
- **Badge**: one emblem of `cup`, `crown`, `star`, `bolt`, `flame`, `moon`, `ball`, and one colour of `gold`, `red`, `blue`, `green`, `purple`, `teal`. The form opens on Cup and Gold.
- **Running or ended.** A Group runs at most 10 at a time.
- It has no kind. The same Series may be attached to a Social one week and a Game the next. The Series screen's "Padel social" or "Padel game" reads the kind of its most recent Edition.
- **Ending**: stamps `ended_at`. Nothing can be attached to it any more. Games already attached stay attached and their winners still win it. Badges already won stay.
- **Ending a Series no Game was ever attached to deletes it.** There is nothing to keep, and it would sit under Ended forever.
- **Verified is checked at each door.** A Group that stops being Verified loses the menu's Series row and the pickers, and create and attach are refused. Its Series, their pages and the badges on profiles stay, and a Game already attached is still played for its Series: a Game keeps what it was created with.

### 5.4 Which Games carry a Series

A Game carries a Series when it belongs to a Group and is one of these. `carriesSeries` in `@repo/domain/series` is the one rule.

| Game kind | Carries | The Edition is decided when | Who wins it |
| --- | --- | --- | --- |
| padel Friendly game | Yes | Its Match is completed | Both players of the winning Game team. A drawn Match: nobody |
| football Game | Yes | Its Match is completed | Every player on the winning Football side, substitutes included. A drawn Score: nobody |
| Social, Rounds | Yes | Its Pool table is finished | Both players of the Game team on top of the table |
| Social, Groups only | Yes | Every Pool table is finished | Both players of the Game team on top of each Pool's table. One Pool gives one team; several Pools give one team each, because a Groups only Social has a winner per Pool and no Champion |
| Social, Groups then knockout | Yes | The Final has a winner | The Champion's players |
| Social, Knockout only | Yes | The Final has a winner | The Champion's players |
| Social, King of the court | Yes | The Final order is posted | The players of the Game team placed first |
| Social, Americano | Yes | Every Match is settled, at least one completed | The player in first place of the Americano table. One player: an Americano has no teams |
| Legacy `americano` Game format | No | | Never finishes, and is no longer created |
| Legacy hand-built tournament (no Tournament shape, no Pool count) | No | | Has no table and no Final |
| Booking Game, Challenge Game, Public Game | No | | No Group |

Every kind a Group can create today carries a Series. The two legacy kinds and the groupless Games do not.

A Pool table and an Americano table always have a first place: their own tie-breaks decide it. Only a single Match can be drawn, so "a draw gives it to nobody" applies to a padel Friendly game and a football Game.

The winners are whoever is seated on the winning Game team when the result is read: Users with an account, Unclaimed players and Guest players alike. A Guest player is named among an Edition's winners and nowhere else: not in Most wins, not in the count of different winners, and they have no profile.

### 5.5 Attaching

- One Game has at most one Series: `games.series_id`.
- **At create**: an optional `seriesId` on `games.create` and `games.createTournament`.
- **From Edit game**: `games.updateSeries`, to add, change or remove it.
- **Allowed while** all of these hold:
  - the Game is not cancelled, has a Group, has a window start, and carries a Series (5.4);
  - the Game's Group is Verified;
  - the Series belongs to the Game's Group and is running;
  - **the score is not in**: the Game has no completed Match and, for King of the court, no posted Final order.
- **Once the score is in, the link is locked both ways**: it cannot be added, changed or removed. A wrong-score report that reopens the Match unlocks it again.
- Removing is `seriesId: null` and needs only the Organizer and "the score is not in".
- The picker shows only where it applies: the Game's Group is Verified and has at least one running Series. Otherwise the step and the sheet look as they do today.

### 5.6 Edition numbers

- **Computed, never stored** (ADR-0105). A Game's Edition number is its place among the Series' Games that are not cancelled, ordered by window start, then creation time, then id. The first is 1.
- A cancelled Game is no Edition and holds no number. Removing a Game's Series frees its number.
- So numbers have no gaps, and "11 played, next is edition 12" stays true after an Organizer cancels and recreates next week's Game.
- A played Edition keeps its number in practice: the link is locked once the score is in, a Friendly game with a completed Match cannot be cancelled, and a new Friendly game cannot start in the past. It moves only if an earlier Game is later cancelled (a Social can be cancelled after it was played) or an earlier Game that was never scored is detached.
- A Game whose window ended without a score still holds its number; the Series page's next edition card reads "Edition N is waiting for its result". An Organizer who abandoned it cancels it or removes its Series.
- The create picker's "This will be edition N" is the number the new Game would hold on its day: one more than the Series' Games that start before it.

### 5.7 Series wins

- **Computed, never stored** (ADR-0105): `seriesEditionResult` in `@repo/domain/series-result` reads the Game, its Game teams, Matches and Sets, and answers `upcoming`, `no_winner`, or `won` with the winning Game teams and Users.
- So a win follows everything that changes a result, with no hook to forget: a corrected score, a wrong-score report, an upheld Match dispute, a cancelled Match or Round, an added Round, a corrected Final order, a player the Organizer adds to or removes from a Played game, a claimed or merged Unclaimed player.
- A cancelled Game gives no win. A Game detached from its Series gives no win. An ended Series keeps its wins. A deleted Group's Series keep their wins on profiles; their pages are gone with the Group.
- A player's count for a Series is the number of its Editions they won. Their nth win is counted in Edition order ("Qasim's 3rd").

### 5.8 Who sees what

- **Series screen**: on a Verified Group, the Group's More menu offers it to everyone who can open the Group home, so the menu shows on a Verified Group even for a viewer with no other row. "New series" only to a Group approver.
- **Series page**: whoever may view the Group. A deleted Group's Series page is not found.
- **Profile**: the Series card follows the Marks cabinet's rule: whoever may open the profile sees it unless the owner's Match history visibility excludes them. There is no switch to hide Series wins. A profile with no Series win shows no card.
- **From a profile to a Series**: "See the series" and the rows that open a Game show only when the viewer may view that Series' Group (`canOpenSeries`).

### 5.9 Latest and Notifications

- Home's Latest row shows the newer of the newest Mark and the newest Series win, each only while it is at most 14 days old. Opening it hides it on that device, as today.
- A Series win's age counts from the moment the Edition was decided: the latest completion among its Matches, or the Final order's first post.
- A Series win row opens the Game.
- No new Notification, in the app or by email (section 4).

### 5.10 Colour

The Series badge is data a player earned, like a Mark coin and a Bib: its colours live in `@repo/design-tokens/series` and appear only inside a badge, plus the six swatches of the New series colour picker, which preview one (ADR-0106). An earned badge keeps its light tones in both Color schemes.

---

## 6. Data model

One migration (0137), generated with `pnpm exec turbo run db:generate`. Never edit an existing migration.

### 6.1 `group_series` (new)

Schema file `packages/db/src/schema/group-series.ts`, exported from `schema/index.ts` as `groupSeries`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` pk, default random | |
| `group_id` | `uuid` not null → `groups.id`, on delete cascade | |
| `name` | `varchar(40)` not null | |
| `emblem` | enum `series_emblem` not null | `cup`, `crown`, `star`, `bolt`, `flame`, `moon`, `ball` |
| `colour` | enum `series_colour` not null | `gold`, `red`, `blue`, `green`, `purple`, `teal` |
| `ended_at` | `timestamp` null | |
| `ended_by` | `uuid` null → `user.id`, on delete set null | |
| `created_by` | `uuid` not null → `user.id`, on delete restrict | |
| `created_at`, `updated_at` | `timestamp` not null, default now | |

- Index `group_series_group_id_idx (group_id)`.
- Export `SERIES_EMBLEM_VALUES` and `SERIES_COLOUR_VALUES` beside the enums, as `MARK_KIND_VALUES` is.
- `created_by` and `ended_by` get a line in `ALLOWED_UNINDEXED` of `schema/foreign-key-indexes.test.ts` (the `USER_ACTOR` reason).
- Name uniqueness and the cap of 10 are checked in `series.create` under a lock on the Group row, as `groups.createSeason` checks its dates. No database constraint.

### 6.2 `games.series_id` (new column)

- `series_id uuid null → group_series.id, on delete set null`.
- Index `games_series_id_window_start_idx (series_id, window_start)`: every read orders a Series' Games by start.
- Relation `series` on `gameRelations`.

No table for wins, Editions or counts. Nothing is backfilled.

---

## 7. Server design

### 7.1 `@repo/domain` (pure, with unit tests beside each)

| Module | Holds | Callers |
| --- | --- | --- |
| `series.ts` | `SERIES_EMBLEMS`, `SERIES_COLOURS`, `DEFAULT_SERIES_EMBLEM` (`cup`), `DEFAULT_SERIES_COLOUR` (`gold`), `SERIES_NAME_MAX_LENGTH` (40), `SERIES_RUNNING_MAX` (10), `seriesNameError(name, runningNames, locale)`, `carriesSeries(game)`, `seriesWinRule(game)` | both clients, `@repo/api` |
| `series-result.ts` | `seriesEditionResult(game)`: the winner rule of 5.4 | `@repo/api` (five procedures) |
| `series-copy.ts` | The view-model lines both Apps draw: `seriesRowLine`, `seriesWinnersLine`, `seriesRuleLine`, `seriesWonLastLine`, `seriesWinOrdinal`, `seriesWinTally`, `seriesWinWho`, `seriesWinWithLine` (each takes `locale` last) | both clients |
| `series-fact-row.ts` | `seriesFactRows(series, messages)` and `withSeriesFactRow(rows, groupLabel, series, messages)`: the "Series" row of a Game's facts | both clients |
| `home-latest.ts` (extend) | `latestSeriesWin(...)` and `latestUpdate(mark, seriesWin)`; `LatestMark` becomes one arm of a `Latest` union | both clients |
| `group-home-cta.ts`, `group-settings.ts` (extend) | `"series"` joins `GroupHomeOverflowItem` (web) and `GroupMenuItem` (mobile), right after `"edit"`, on a Verified Group; `groupMenuSeriesHint(runningCount, locale)` is its "{n} running" | both clients |
| `game-edit-form.ts` (extend) | `seriesId` on the draft and the saved Game, a `series` section, a `{ kind: "series"; seriesId }` save step, its changed phrase | both clients |

`series-result.ts` sits in `@repo/domain` beside `pool-table`, `tournament-knockout-view` and `tournament-americano`, the pure rules it composes; five procedures reach it through the one loader of 7.2.

`seriesWinRule` answers which rule a Game's Edition is won by, for `seriesEditionResult` and for copy: `side` (padel Friendly game, football Game), `table` (Rounds, or Groups only planned with one Pool), `tables` (Groups only with more than one Pool), `champion`, `king`, `americano`.

`seriesEditionResult` contract:

```ts
type SeriesEditionGame = {
  format: string;
  sport: string;
  tournamentShape: string | null;
  poolCount: number | null;
  roundCount: number | null;
  cancelledAt: Date | null;
  drawPostedAt: Date | null;
  finalOrderPostedAt: Date | null;
  gameTeams: readonly {
    id: string;
    poolIndex: number | null;
    sideIndex: number | null;
    finalPlace: number | null;
    userIds: readonly string[];
  }[];
  matches: readonly {
    id: string;
    status: string | null;
    roundNumber: number | null;
    knockoutRound: number | null;
    knockoutPosition: number | null;
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
    walkoverGameTeamId: string | null;
    startTime: Date | null;
    sets: readonly { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
  }[];
  /** Americano only; null on every other kind. */
  americano: {
    /** `americanoDayFinished` over the Game's Matches. */
    finished: boolean;
    /** Game player ids in the order they took a seat: the table's last tie-break. */
    playerIds: readonly string[];
    userIdByPlayerId: Readonly<Record<string, string | null>>;
    /** `americanoResults` over the Game's Matches. */
    results: readonly AmericanoResult[];
  } | null;
};

type SeriesEditionResult =
  | { state: "upcoming" }
  | { state: "no_winner" }
  | { state: "won"; gameTeamIds: string[]; userIds: string[] };
```

Rules, by kind. Reuse the existing pure functions; do not write a second table or a second outcome rule.

- Cancelled, or a kind that does not carry: `upcoming`.
- **Friendly game** (padel and football): the one Match with status `completed`. `matchOutcome(sets)`: `draw` gives `no_winner`; otherwise the winning slot's Game team. No completed Match: `upcoming`.
- **Rounds and Groups only**: `computePoolTables` with `storedRoundCount: game.roundCount`. Not `finished`: `upcoming`. Finished: every Pool's `winnerGameTeamId` that is not null. None: `no_winner`.
- **Groups then knockout and Knockout only**: the Final is the Knockout Match with the highest `knockoutRound`. Its winner is `walkoverGameTeamId`, else the slot `matchOutcome` names when its status is `completed`. No winner yet: `upcoming`. A unit test pins this to `knockoutChampion(postedKnockoutRounds(...))` on the same fixture.
- **King of the court**: `finalOrderPostedAt` null: `upcoming`. Otherwise the Game team with `finalPlace === 1`; none: `no_winner`.
- **Americano**: not `americano.finished`: `upcoming`. Then `americanoTable(playerIds, results)`; the winner is the row with `place === 1`, the same row the Standings tab shows first. `gameTeamIds` is empty. The loader fills `americano` with the shared helpers of `packages/api/src/games/americano-matches.ts` (`americanoDayFinished`, `americanoResults`, players in seat order), so the rule and the tab cannot disagree.
- `userIds` are the winning Game teams' `userIds`, without duplicates.

### 7.2 Shared server modules (`packages/api/src/series/`)

Each is used by two or more procedures, so it is a shared module, not a twin of one.

| Module | Holds | Used by |
| --- | --- | --- |
| `series-link.ts` | `requireSeries(db, id, locale)`; `seriesLinkLocked(db, game)` (the score is in); `resolveGameSeriesLink(db, { game, group, seriesId, locale })`, which applies 5.5 and throws the localized refusal; `gameSeriesSummary(db, game)`, the Game's Series with its Edition number, or null; `seriesEditionAt(db, { seriesId, windowStart, excludeGameId? })`, the number a Game starting then would hold | `games.create`, `games.createTournament`, `games.updateSeries`, `games.byId`, `series.attachOptions` |
| `edition-order.ts` | The order Editions are numbered in (5.6), as SQL: `editionNumber` (the row number inside a Series), `editionsBefore(gameId, windowStart?)`, `editionsBeforeNewGame(windowStart)` and `isEdition` (not cancelled); `loadEditionNumbers(db, seriesIds)` and `withSeriesEditions(db, rows)`, which give many Games their numbers in one query. The one place the order is written | `series-link.ts`, `load-series-editions.ts`, `games/helpers/hub-list.ts`, `groups.byId` |
| `load-series-editions.ts` | `loadSeriesEditions(db, { seriesIds } \| { gameIds })`: in a fixed number of queries, the Games (not cancelled), their Game teams with players, Matches with Sets, and Americano seats; then per Game its Edition number, `seriesEditionResult`, the winners' names and images, the winning side's Bib, the Venue's name, the Game's caps, the field's size, who played, the winners' points on a Rounds table or an Americano, the single Match's score, and the moment it was decided | `series.listForGroup`, `series.byId`, `series.edition`, `series.forPlayer`, `series.playerWins` |

`loadSeriesEditions` never loops a query per Game. `packages/api/src/live-boards/board-content.ts` and `routers/games/poolTables.ts` show how the rows feed `computePoolTables` and `americanoTable`. When it is given `gameIds`, it still numbers Editions against every Game of their Series, from one light query of `(id, series_id, window_start, created_at)`.

### 7.3 Procedures

A new router `series` at `packages/api/src/routers/series/`, one procedure per file, composed in `index.ts`, added to `root.ts` and to `app-router-shape.ts`. Each file exports a db-taking function for its PGlite test. Schemas stay inline: none has two callers.

| Path | Kind | Input | Who | Returns |
| --- | --- | --- | --- | --- |
| `series.create` | mutation | `{ groupId, name, emblem, colour }` | Group approver of a Verified Group | `{ id }` |
| `series.end` | mutation | `{ id }` | Group approver | `{ ended: true } \| { deleted: true }` |
| `series.listForGroup` | query | `{ groupId }` | may view the Group | see below |
| `series.byId` | query | `{ id }` | may view the Group | see below |
| `series.attachOptions` | query | `{ groupId, windowStart, gameId? }` | may organize the Group's Games | `{ options: { id, name, emblem, colour, edition }[] }`; empty when the Group is not Verified |
| `series.edition` | query | `{ gameId }` | may view the Game (`canViewGame`) | see below; `null` when the Game has no Series |
| `series.forPlayer` | query | `{ userId }` | may view the player | see below |
| `series.playerWins` | query | `{ userId, seriesId }` | may view the player | see below |
| `games.updateSeries` | mutation | `{ gameId, seriesId: uuid \| null }` | Organizer of the Game | `{ ok: true, seriesId }` |

Changed, additively:

- `games.create` and `games.createTournament`: optional `seriesId`. It is resolved with `resolveGameSeriesLink` before the Game is created, so a refusal creates nothing, and written after, as the Season link is.
- `groups.byId`: adds `runningSeriesCount: number`, the Group's Series with no `ended_at` (one `count()`), 0 when the Group is not Verified. The Group menu's Series row shows it as "{n} running".
- `games.byId`: adds `series: { id, name, emblem, colour, edition } | null` and `canChangeSeries: boolean` (Organizer, not cancelled, carries a Series, Group Verified, score not in). `canChangeSeries` says whether the Game may join a Series; removing needs less (5.5), so `seriesScoreLocked: boolean` (the viewer is an Organizer, the Game has a Series and the score is in) is what locks the Edit game row, and an Organizer of a Game whose Group is no longer Verified can still remove its Series.

No procedure path is renamed.

**`series.listForGroup`**

```ts
{
  groupName: string | null;  // the Series screen's title
  enabled: boolean;          // the Group is Verified
  canManage: boolean;        // enabled and the viewer is a Group approver
  running: Row[];            // those with a next Edition first, soonest first; then by name
  ended: Row[];              // most recently ended first
}
type Row = {
  id; name; emblem; colour;
  sport: "padel" | "football";
  kind: "social" | "game" | null;   // of the most recent Edition; null with none
  playedCount: number;               // Editions whose result is not `upcoming`
  next: { gameId; edition; startsAt } | null;
  endedAt: Date | null;
};
```

`next` is the earliest Edition that is `upcoming` and whose window has not ended. `enabled: false` returns empty lists.

**`series.byId`**

```ts
{
  id; name; emblem; colour; sport;
  group: { id; name };
  endedAt: Date | null;
  createdAt: Date;                     // "running since"
  canEnd: boolean;                     // Group approver and still running
  endRemoves: boolean;                 // no Game points at it, cancelled ones included: ending deletes it (5.3)
  playedCount: number;                 // decided Editions
  differentWinners: number;            // distinct Users with a win, Guest players left out
  mostWins: { userId; name; image; wins; lastWonEdition; isViewer }[];
  holders: {                           // the latest won Edition's winners, Guest players left out; null before a win
    edition: number;
    players: { userId; name; image; isViewer }[];
  } | null;
  nextEdition: {                       // the earliest Edition not decided; null with none, or once ended
    gameId; edition;
    startsAt: Date | null; endsAt: Date | null;
    state: "upcoming" | "live" | "awaiting";
    venueName: string | null;
    taken: number;                     // Game players
    capacity: number | null;           // players allowed, else two per team allowed
  } | null;
  viewer: {
    name; image;
    played: number;                    // decided Editions the viewer played: on a Game team, a Football side or an Americano seat
    decided: number;
    wins: number;
    lastWonEdition: number | null;
  };
  editions: {
    gameId; edition; startsAt;
    state: "upcoming" | "awaiting" | "no_winner" | "won";
    winners: { userId; name; image; isGuest; isViewer }[];
    winnerBib: FootballBib | null;
    field: { unit: "teams" | "players"; count: number } | null;  // players on an Americano, teams otherwise, null on football
    points: number | null;             // the winners' points on a Rounds table, games won on an Americano
    score: { winner: number; loser: number } | null;             // a won football Game, from the winning side
  }[];                                  // newest first
}
```

- `awaiting`: the result is `upcoming` and the Game's window has ended. On `nextEdition`, `live` means its window has started and not ended.
- A later `no_winner` Edition does not clear the holders.
- `mostWins` is ordered by wins, then the higher `lastWonEdition`, then name. It lists every winner; the clients show four and expand.
- Every field is additive to the first shape; nothing was removed or renamed.

**`series.edition`** (the Game screen's card)

```ts
{
  series: { id; name; emblem; colour; groupName; endedAt };
  edition: number;
  rule: "side" | "table" | "tables" | "champion" | "king" | "americano";
  state: "upcoming" | "no_winner" | "won";
  lastWinners: { edition: number; winners: { name }[]; winnerBib } | null;  // the latest earlier Edition that was won
  winners: {
    userId; name; image; isViewer; isGuest;
    gameTeamId: string | null;              // the winning Game team they sit on; null on an Americano
    winCount: number;                       // this win included
    tally: "new" | "most" | "level" | null;
    levelWith: { name: string } | { count: number } | null;
  }[];
  winnerBib: FootballBib | null;
  canOpenSeries: boolean;
} | null
```

`tally`: `new` when `winCount` is 1; `most` when nobody has as many; `level` when it is the most and shared, with the one other name or the number of others; else null.

**`series.forPlayer`** (the profile card, and Home's Latest)

```ts
| { hidden: true }
| {
    hidden: false;
    totalWins: number;
    badges: { seriesId; name; emblem; colour; groupName; wins; lastWonAt; canOpenSeries }[];  // most recent win first
    wins: {
      gameId; seriesId; edition;
      playedAt: Date;                 // the Game's window start
      wonAt: Date;                    // when the Edition was decided
      ordinal: number;                // the player's nth win of this Series
      with: { names: string[]; bib: FootballBib | null; score: { mine: number; theirs: number } | null };
    }[];                               // newest first
  }
```

- It loads only the player's own Series Games (`loadSeriesEditions({ gameIds })`).
- `with.names` holds the one partner's name on a two-player team, and is empty otherwise. `with.bib` and `with.score` are set on a football Game.
- `hidden: true` when the owner's Match history visibility excludes the viewer (`matchHistoryHidden`).

**`series.playerWins`** (the sheet behind one badge)

```ts
{
  series: { id; name; emblem; colour; groupName };
  wins: number;
  playedBySeries: number;     // "of 12"
  playedByPlayer: number;     // "played 9": decided Editions the player was seated on
  editions: { gameId; edition; playedAt; with }[];   // the wins, newest first
  canOpenSeries: boolean;
}
```

A Series the viewer may not open (`canOpenSeries` false) answers only for a player with a win in it, so the badge a Private or deleted Group left on a profile still opens. With no win there it is the Series' `notFound` (5.8).

### 7.4 Refusals

All from `messagesFor(locale).series.errors`, thrown as `TRPCError`:

| Key | Code | When |
| --- | --- | --- |
| `notFound` | NOT_FOUND | No such Series, or its Group is deleted or not viewable |
| `verifiedOnly` | FORBIDDEN | Create or attach on a Group that is not Verified |
| `nameRequired`, `nameTooLong` | BAD_REQUEST | The name is empty, or longer than 40 characters |
| `nameTaken` | BAD_REQUEST | A running Series of the Group has that name |
| `tooMany` | BAD_REQUEST | The Group already runs 10 |
| `createFailed` | INTERNAL_SERVER_ERROR | The insert returned no row |
| `alreadyEnded` | BAD_REQUEST | Ending an ended Series |
| `ended` | BAD_REQUEST | Attaching an ended Series |
| `notInGroup` | BAD_REQUEST | The Series is another Group's, or the Game has no Group |
| `cannotCarry` | BAD_REQUEST | The Game's kind does not carry a Series |
| `scoreIn` | BAD_REQUEST | Changing the link once the score is in |
| `needsDay` | BAD_REQUEST | The Game has no window start |

Group approver and Organizer refusals reuse `assertGroupApprover` and `assertGameOrganizer`. A cancelled Game reuses `game.errors.editCancelled`.

---

## 8. Screens

Web paths are under `apps/web/src`, mobile under `apps/mobile`. New mobile code goes in `apps/mobile/src/series/`, new web components in `apps/web/src/components/series/`. Both Apps render the same view-model lines from `@repo/domain/series-copy`; do not fork the logic.

Rules for every screen:

- The badge is drawn only through `SeriesBadge`. It is decorative to assistive technology; the text beside it carries the name.
- "Not yet" is `Hatch`: the "Not part of a series" tile and the Edition that has not been played.
- A selected choice is Solid (`control`).
- No new mount animation.
- Mobile: colours from `useColors()`, text through `Text`, sizes from `@repo/design-tokens`, hairlines, no hex literal, no shadow.
- Web: the phone layout inside `DashboardShell width="content"`; it does not gain a desktop-only layout.

### 8.1 `SeriesBadge` (both Apps)

- Props: `emblem`, `colour`, `size` (a key of `seriesBadgeSizes`), optional `count`.
- Mobile: `react-native-svg`, modelled on `src/marks/mark-coin.tsx`. Web: inline SVG, modelled on `components/marks/mark-coin.tsx`.
- `count` draws the pill of `badge-geometry.md`: fill `ink`, digits `paper`, a ring in the surface's colour; on the trailing bottom corner, so it mirrors in Arabic. On the mobile App's focused surface, which is still inverted in light (ADR-0084), the pill takes the ink tone's roles instead: fill `onFocus`, digits and ring `focus`, so it never sinks into the card. Digits are Latin and tabular.
- A gallery of all 42 badges at every size joins the existing design pages: web `/dashboard/design/series`, mobile `(app)/profile/design/series`, beside the Marks set.

### 8.2 1a, the Group's Series screen

`screens/1a-group-series-tab.png` drew it as a fourth tab; it is now its own screen.

- **The way in**: a **Series** row in the Group's More menu, right after Edit Group, with the Trophy icon and "{n} running" (`groupMenuSeriesHint`) under it while one runs. On a Verified Group only, to everyone who sees the menu. Web `components/groups/group-home-overflow-menu.tsx` (`groupHomeOverflowItems`), mobile `src/groups/group-menu-sheet.tsx` (`groupMenuItems`). There is no Series tab; a stale `?tab=series` opens Standing.
- **Routes**: web `/dashboard/groups/[id]/series` (`groupSeriesHref`), `components/series/group-series-page.tsx`. Mobile `(app)/groups/series?groupId=` (`groupSeriesPath`), `app/(app)/groups/series/index.tsx` beside the Series page's `series/[id].tsx`, drawing `src/series/group-series-screen.tsx`.
- **Header**: back to the Group, "Series" centred in the bar, then the Group's name as the page title (`series.listForGroup` returns `groupName`) with the note under it: "A series is a social or a game this group plays again and again. Whoever wins one gets its badge on their profile."
- **Running**, with its count: one card, a row per running Series: badge (`list`), name, the line from `seriesRowLine`, and on the trailing side "Next" over the date. A row opens the Series page.
- **Ended**, with its count: the same rows, the line ending "ended in March" (with the year when it is not this year), the trailing side "Badges stay". Hidden when there are none.
- Under the last card, for a Group approver only: "Open a series to end it."
- **New series**: a full-width Solid button pinned at the bottom of the screen, only when `canManage`.
- Empty: "No series yet." under the note. A Group approver also sees New series.
- Line copy: "Padel social. 11 played, next is edition 12", "Padel game. 31 played", and with no Edition yet "Padel series. Not played yet".

### 8.3 1b, New series

`screens/1b-new-series-live.png`

- Web route `/dashboard/groups/[id]/series/new`. Mobile route `(app)/groups/new-series?groupId=`. Modelled on New season (`groups/[id]/seasons/new/page.tsx`, `src/groups/new-season-screen.tsx`).
- A lifted preview card: the badge (`preview`), the name as typed (the placeholder "Series name" in muted while empty), the Group's name, a hairline, then the small badge with a count of 1 and "How it sits on a winner's profile". The preview follows the form live.
- **Name**: one text field, 40 characters, with "What players will see on the game and on their profile."
- **Emblem**: seven chips in one row, each the emblem in ink on paper; the picked one has a 2px ink border. The picked emblem's name sits on the trailing side of the heading.
- **Colour**: six chips, each a dot of the colour's `disc` value; same selection and trailing name.
- A three-row card: "In a social / The top team wins it", "In a game / The winning side wins it", "A draw / Nobody wins that one".
- **Create series**: Solid, pinned at the bottom, disabled while the name is empty; "Attach it to a game or a social when you create one." under it.
- On success: back to the Group's Series screen, with the list refreshed. A refusal of the name (`nameRequired`, `nameTooLong`, `nameTaken`) shows under the name field: `series.create` throws it with a `ZodError` cause on the `name` path, so it reaches the form as `zodError.fieldErrors.name`, which each App reads with its `splitTrpcFormError`. Other refusals show as a toast.
- The emblem and colour pickers are radio groups for assistive technology, each chip labelled with its name ("Cup", "Gold").

### 8.4 2a, Create, last step

`screens/2a-create-attach-a-series.png`

- Web: `app/dashboard/games/new/page.tsx`, `friendly-game-steps.tsx`, `friendly-tournament-steps.tsx`, a new `_parts/series-field.tsx`. Mobile: `src/create-game/details-step.tsx`, `create-model.ts`, `create-screen.tsx`, a new `series-field.tsx`.
- The picked `seriesId` is create state held outside the shared draft, as `mvpMode` is: not stored with the draft, cleared when the Group changes or Public is chosen, merged into the request at submit.
- `series.attachOptions({ groupId, windowStart })` runs once the Group is picked, the Group is Verified and the day and start time are valid. The section shows only when it returns at least one Series.
- **Placement**: a **Series** section marked Optional. On a Social it is the first section of step 4, above "Who can enter". On a padel Friendly game and a football Game it sits directly above the Level range section, or where that section would be when it is hidden.
- Rows, one choice: "Not part of a series / A one-off" with a hatched tile, picked by default; then each running Series with its badge (`list`), its name and "This would be edition N". The picked row is Solid with a check and reads "This will be edition N".
- Under the rows: "Series of {Group}. The winners get the badge on their profile."
- The review card gains "Series / {name}, edition N" when one is picked.
- If the day or time changes, the numbers refetch. If the picked Series is no longer in the options, the choice falls back to "Not part of a series".

### 8.5 Edit game

No frame; the designer's ATTACH note: "The organizer can add, change or remove the series from Edit game until the score is in."

- Web: `components/games/game-edit-dialog.tsx`, `use-game-edit.ts`. Mobile: `src/game-details/game-edit-sheet.tsx`, `use-game-edit.ts`. Model: `@repo/domain/game-edit-form`. The Season section is the pattern to copy.
- A **Series** section, shown when the Game has a Series, or when `canChangeSeries` and `series.attachOptions({ groupId, windowStart, gameId })` returns at least one.
- It shows the current choice as a row; tapping opens the same picker as Create (with "Not part of a series").
- When `seriesScoreLocked` is true, the row is locked with "The score is in, so the series stays." When the Game has a Series, the score is not in and `canChangeSeries` is false (the Group is no longer Verified), the row stays open and the picker offers "Not part of a series" and the current Series only.
- Saving sends `games.updateSeries` as its own step. The save line says "Series added", "Series changed" or "Series removed".

### 8.6 2b and 2c, the Game before it is played

`screens/2b-social-with-a-series.png`, `screens/2c-game-with-a-series.png`

Three additions on every Game screen whose `games.byId` returns a `series`:

1. **The series line on the lifted card**: the badge (`line`), the Series name in semibold, "edition N" in muted. Under the venue lines and above the hairline, as drawn.
2. **The "Part of" card**, a paper card directly under the lifted card: the badge (`list`), "Part of {name}", the rule line, and "See series" on the trailing side. Data from `series.edition`.
3. **A "Series" row** in the facts list: "{name}, edition N".

The rule line (`seriesRuleLine`):

| `rule` | Line |
| --- | --- |
| `side` | "Every player on the winning side gets the badge. A draw gives it to nobody." |
| `table` | "Top of the table wins edition N and the badge." |
| `tables` | "Top of each group wins edition N and the badge." |
| `champion` | "The champion wins edition N and the badge." |
| `king` | "The king of the court wins edition N and the badge." |
| `americano` | "Top of the standings wins edition N and the badge." |

When `lastWinners` is set, the line gains a second sentence: "{winners} won the last one." (`seriesWonLastLine`, through `seriesWinnersLine`).

"See series" opens the Series page; it is hidden when `canOpenSeries` is false. The card is never shown on a cancelled Game.

**The Social card** (the Games hub and a Group's Scheduled list) shows the same series line under its venue line, above "Final order to come" and the hairline. A hub row carries `series` (`id`, `name`, `emblem`, `colour`, `edition`), or null when the Game is no Edition; `queryHubGames` and `groups.byId` read the numbers through `withSeriesEditions`. The line is not a link: the card opens the Game. Web `tournament-summary-card.tsx`, mobile `src/games/tournament-cards.tsx`.

Where: web `app/dashboard/games/[id]/page.tsx` and `friendly-game-details-hero.tsx` (padel), `football-game-details.tsx` and `football-game-hero.tsx`, `tournament-home.tsx` and `tournament-hero.tsx`, with the facts in `game-overview-panel.tsx`, `football-info-rows.tsx`, `tournament-detail-rows.tsx`. Mobile `src/game-details/details-screen.tsx`, `game-hero.tsx`, `details-content.tsx`, `football-details-screen.tsx`, `football-hero.tsx`, `src/tournament/tournament-content.tsx` and its views (`predraw-view.tsx`, `alone-social.tsx`, `standings-view.tsx`, `king-view.tsx`, `americano-view.tsx`).

### 8.7 3a, the Edition is won

`screens/3a-series-won.png`

When `series.edition` answers `won`, the Game screen leads with the winners.

- **On a Social** the winners card is the screen's one lifted card, first on the screen:
  - "{Series}, edition N" and the date on one line.
  - The badge (`sheet`), "Winners", and the winners' names large, one per line.
  - Under a hairline, one block per winner: "{First name}'s 3rd" (`seriesWinOrdinal`) and a muted line (`seriesWinTally`): "new on the profile", "most of anyone", "most of anyone, level with Layla", "most of anyone, level with 3 others", or nothing.
  - **Share** (Solid) and **See the series** (outline). Share opens the existing share screen of the Game (`/games/[id]/share`).
  - With more than two winners (a Groups only Social with several Pools): the names are the teams, one per line, in short names ("Qasim A & Ahmed B"), and the only ordinal block is the viewer's own, when they won.
- **On a Played game** (padel Friendly game, football Game) the result hero stays the screen's focus. Directly under it, a paper card: the badge (`list`), "{Series}, edition N", "Won by {winners}" (`seriesWinnersLine`: the two short names, or the winning side's Bib colour on a football Game), the viewer's own ordinal when they won ("Your 2nd"), and "See the series". The result hero also carries the series line.
- **`no_winner`**: the same paper card on a Played game, reading "A draw. Nobody wins edition N."
- **The winner's row of the final table** on a Social carries the small badge (`line`) before the points, on a Pool table and the Americano table.
- The note under the table: "The series goes to the top of the table once the last round is saved. If the organizer corrects a score, it follows the table." (the `table`, `tables` and `americano` rules only).
- The "Part of" card of 8.6 is replaced by these once the Edition is decided.

### 8.8 05, the Series page

`design/` section 05 (frames 5a, 5b, 5c). It replaced design 3b.

- Web route `/dashboard/series/[id]`. Mobile route `series/[id]` in every tab stack (`(home)`, `games`, `groups`, `challenges`, `profile`), each a one-line re-export of `src/series/series-screen.tsx`, with a `seriesPath(segments, id)` helper modelled on `playerPath` so Back returns to the row that opened it.
- Each App splits the page into a loading wrapper and a view that takes the `series.byId` data (`SeriesPageView`, `SeriesScreenView`). The web view is previewed with 5a and 5b fixtures on the dev-only `/dashboard/design/series` page.
- Header: back, the title "Series", and a menu.
- **The lifted card**, the screen's one focus: the badge (`page`), the name, the Group's name (opens the Group).
  - **Holders** (`holders`), under a hairline: the holders' squares, overlapping (the photo, else initials; solid for the viewer); "Holders"; each holder's full name on its own line ("(You)" after the viewer's); "since edition N" on the trailing side. No row before a win.
  - Three figures: "{n} editions played" ("edition played" for 1), "{n} players have won it" ("player has won it" for 1), and "{Mon} running since" (the year too when it is not this year). An ended Series reads "{Mon} ended" as its third figure.
- **The next edition** (`nextEdition`), a paper card: a hatched block on the leading side with "edition" over the number; the title and a muted line from `seriesNextEditionLines`; "Open game" (solid in `ink`), which opens the Game.
  - `upcoming`: "Edition 13, Sun 6 Dec" and "11:00 AM, World Padel Academy. 9 of 16 in." ("9 in" with no cap).
  - `live`: "Edition 2 is on now" and "Today, 8:00 PM. Winners become holders."
  - `awaiting`: "Edition N is waiting for its result" and the day and time, "Winners become holders."
  - No card with no undecided Edition, or once the Series ended. It leaves the Editions list.
- **You in this series** (`viewer`), a paper card shown to every viewer: the viewer's square, "You in this series", the line from `seriesViewerLine` ("Won 2 of 9 played. Last in edition 10.", "Played 1 of 1. No win yet.", "Not played yet."), and on the trailing side the small badges and the win count.
- **Small badges**: the Series' own badge at `tally` (12px), one per win up to three (`seriesSmallBadgeCount`), then only the count.
- **Winners**, meta "{n} editions" ("1 edition so far"): the rank (`seriesWinnerRanks`: ties share it, 1, 1, 3, 3), the square, the full name ("(You)" after the viewer's, whose row is on the wash), "Last won edition N" ("Won edition N" for one win, `seriesWinnerLine`), the small badges and the count. Four rows, then "All N winners", which expands the list in place. A row opens the Player profile. Hidden when nobody has won. Guest players stay out.
- **Editions**, the decided ones only, meta "newest first" ("{n} played" with one row): the Edition number, the winners' squares (three at most), their full names one per line, then "{day}. {field}" from `seriesEditionFieldLine`: "8 teams, 19 points" on a Rounds table, "8 players, 32 games won" on an Americano, "6 teams" otherwise, the score from the winning side ("5–3") on a football Game, whose names line is its Bib colour. `no_winner` reads "Nobody won". Four rows, then "All N editions", which expands in place. A row opens the Game.
- Empty, with neither a decided nor a next Edition: "No editions yet. Attach this series when you create a game or a social."
- **Menu**: "End series", only when `canEnd`. It confirms: "End {name}? Nothing can be attached to it any more. Badges already won stay on profiles." When ending would delete the Series (`endRemoves`: no Game was ever attached, 5.3) the confirmation reads "This series has no editions, so it will be removed." After `deleted`, go back to the Group's Series screen. After `ended`, stay; the page shows the ended figure, the next edition card and the menu are gone.

### 8.9 4a, 4b and 4c, the profile

`screens/4a-profile-series.png`, `screens/4b-profile-series-sheet.png`, `screens/4c-profile-series-dark.png`

- **The Series card** (`series.forPlayer`), on the own profile and on the Player profile. It is not split by sport.
  - Own profile: above the sport chips. Web `app/dashboard/you/page.tsx` (after `MyNotesLink`). Mobile `src/profile/profile-screen.tsx` (after `MyNotesRow`).
  - Player profile: directly above the Marks row. Web `components/players/player-profile.tsx`. Mobile `src/player-profile/player-profile-view.tsx` and `player-profile-screen.tsx`.
  - Heading "Series" with "5 wins in 3" (`series.profile.meta`).
  - Three badges to a row (`card`), each with its count pill, the Series name and the Group's name under it, most recent win first. Every badge is shown; the grid wraps.
  - A last row, "All series wins".
  - No card when the player has no win, or when `hidden`.
- **The badge sheet** (4b), opened by tapping a badge; a bottom sheet on mobile (`primitives/sheet.tsx`) and on web (`components/ui/sheet.tsx`). `series.playerWins`.
  - The badge (`sheet`) with its count pill, the Series name, the Group's name, a close button.
  - "Won 2 of 12" with "played 9" on the trailing side.
  - One row per win, newest first: the Edition number in mono (two digits, "07"), "With Khalid Janahi" (`seriesWinWithLine`: the partner; "With Black, 5–3", the Bib colour and the score, on a football Game; nothing after the number for an Americano), the date with the year, a chevron. A row opens the Game when `canOpenSeries`.
  - "See the series", when `canOpenSeries`.
- **"All series wins"** opens the same sheet in its all mode: the heading "Series wins" with "5 wins in 3", and every win newest first, each with its small badge, "{Series}, edition N", the with-line and the date.
- **Dark** (4c): every colour is a Color role; the badge keeps its own tones; the count pill is `ink` on a ring of the surface. Nothing is `#ffffff`.

### 8.10 Home's Latest row

- Web `app/dashboard/page.tsx`, `components/home/latest-row.tsx`. Mobile `src/home/home-screen.tsx`, `home-model.ts`, `latest-row.tsx`.
- Home also reads `series.forPlayer` for the signed-in User. `latestUpdate` picks the newer of the Mark and the Series win.
- A Series win row: the badge (`latest`), "Series win: {Series}", and the line "Edition 30 with Black, 5–3. Your 2nd": the Edition, `seriesWinWho` in its short form (left out with its "with" when there is nobody to name), then `seriesWinOrdinal`. One catalog message holds the three parts. It opens the Game and is marked seen under the key `series:{gameId}`.

---

## 9. Design tokens

`packages/design-tokens/src/series.ts`, exported as `@repo/design-tokens/series` (add the export to `package.json`). Transcribed from `badge-geometry.md`.

- `seriesBadgeViewBox` (120), `seriesBadgeHex` (the polygon), `seriesBadgeColours` (six, each `disc` and `shade`), `seriesEmblems` (seven, each a list of elements painting `shade`, `paper` or `ink`), `seriesBadgeSizes`.
- Reuse the `CoinElement` shape of `marks.ts` for the elements, so both `SeriesBadge` primitives draw them the way `MarkCoin` does.
- `seriesBadgeToneColors(colour)`: `disc` and `shade` from the colour, `ink` and `paper` from the light palette in both schemes, as an earned coin.
- A test beside it guards: seven emblems, six colours, every element paints one of the three tones, the colours match `badge-geometry.md`.
- A test in each App pins the tokens' keys to `SERIES_EMBLEMS` and `SERIES_COLOURS` of `@repo/domain/series`, as `mark-coin.test.ts` pins coins to `COIN_KINDS`. `packages/api/src/domain-enum-parity.ts` pins the domain lists to the database enums.

---

## 10. i18n

One catalog file owns the feature: `packages/i18n/src/messages/en/series.ts` and `ar/series.ts`, exported as `series` from both `index.ts` files. Every string in section 8 and every refusal in 7.4 lives there. Counts go through `plural()`.

Suggested top-level shape:

```text
series.noun            series, edition, badge
series.emblems         cup … ball
series.colours         gold … teal
series.tab             title, running(n), runningTitle, ended, note, empty, newSeries, badgesStay, next, endHint, row lines
series.create          title, namePlaceholder, nameLabel, nameHint, emblem, colour, previewNote, rules, submit, submitNote
series.attach          title, none, noneHint, willBe(n), wouldBe(n), note(group), review(name, n), locked, edit phrases
series.game            partOf(name), rule lines, wonLast(winners), seeSeries, facts label, winners, wonBy, draw, tableNote
series.win             ordinal(name, n), yourOrdinal(n), tally lines
series.page            title, editionsPlayed(n), playersWon(n), runningSince, ended, holders, sinceEdition(n), next lines, openGame, you lines, winners, winnersMeta(n), rank(n), viewerName, wonEdition(n), lastWon(n), allWinners(n), editions, newestFirst, editionsMeta(n), nobodyWon, field lines, allEditions(n), empty, end, endConfirm, endRemoves
series.profile         title, meta(wins, series), allWins, sheetWon(wins, of), played(n), with(name), withBib(bib, score), seeSeries, winsTitle
series.latest          title(name), line
series.errors          7.4
```

- Ordinals reuse `tournamentRounds.shareCard.ordinal` in both Locales, as `tournament-americano.ts` does.
- Existing files gain only three changed phrases in `create-game.ts` beside the Season ones ("series added", "series changed", "series removed").
- Bib colour names come from the existing football catalog.
- The Arabic copy is new. Write it in the register of the existing `ar/` files; it is for the owner to confirm.

## 11. Dark mode and RTL

- Name Color roles; never branch on the scheme. The lifted cards are `focus`; plain cards are `paper` with a `rule` hairline; a selected row is `control`.
- The badge is data: same tones in light and dark (ADR-0064, ADR-0106).
- The count pill reads `ink` and `paper`, so it turns light on dark as 4c shows.
- Arabic lays out right to left. Arrows and chevrons mirror (`mirrorInRtl` on mobile, `rtl:-scale-x-100` on web). The badge does not mirror. The count pill sits on the trailing corner. Edition numbers, counts and scores are Latin digits, and a score reads left to right.
- Names are user content: isolate them the way the existing catalogs do (`bidi.ts`).

## 12. States and edge cases

| Case | Behaviour |
| --- | --- |
| The Group is not Verified | No menu row, no picker, no mention. `series.create` and attach refuse with `verifiedOnly` |
| The Group stops being Verified with Series running | The menu row and pickers go. Attached Games keep their Series and are still won. Pages and profiles are unchanged. Verified again: everything returns |
| The Group is deleted | Its upcoming Games are cancelled (existing rule), so they are no Editions. Wins stay on profiles with the Group's name. `series.byId` is not found; `canOpenSeries` is false |
| A Series is ended with an upcoming Game attached | The Game stays an Edition and is won as usual. Edit game can still remove the Series, not add an ended one |
| The Organizer moves the Game's day | Edition numbers follow the new order. Nothing to confirm |
| The Game is cancelled | It is no Edition and gives no win. Every later Edition moves up one |
| A score is corrected, a Match reopened, a Round added or cancelled | The result is read again: the win moves, appears or goes. The link is unlocked while no Match is completed |
| The single Match is drawn | The Edition is played and nobody wins it |
| A football side has substitutes | Everyone on the winning side wins |
| The Organizer adds or removes a player on a Played game | The winners are whoever is on the winning side now |
| A winner is an Unclaimed player | They win like anyone; claiming the row keeps the wins |
| A winner is a Guest player | Named on the Game and the Series page's Edition. No profile, not in Winners or the holders |
| King of the court: the Final order is corrected inside its 24 hours | The win follows the team placed first |
| A Groups only Social is drawn into several Pools | One winning team per Pool |
| A Game's window ended and nobody entered a score | The next edition card reads "Edition N is waiting for its result"; it holds its Edition number until it is scored, cancelled or detached |
| Two Organizers create a Series with the same name at once | The Group row lock makes the second fail with `nameTaken` |
| The viewer may open a profile but not the Series' Group | The badge and its sheet show; "See the series" and the Game links do not |
| The owner's Match history visibility excludes the viewer | No Series card |
| The picked Series ends while the Organizer is on step 4 | Submit is refused with `ended`; the options refetch and the choice falls back |

## 13. Testing

- **Domain** (Vitest beside each module):
  - `series-result`: one case per row of 5.4, each for not decided, decided, and where it applies drawn; a parity case against `knockoutChampion`; a walkover Final; a Groups only Social with two Pools; a cancelled Game.
  - `series`: `carriesSeries` for every kind including the legacy ones; `seriesNameError`. Edition numbers with equal starts, a cancelled Game left out and a moved day are tested through the procedures, against `packages/api/src/series/edition-order.ts`.
  - `series-copy`: every line in English and Arabic for the counts 0, 1, 2, 3, 11.
  - `home-latest`: the newer of a Mark and a Series win; the 14-day cut; the key.
  - `game-edit-form`: the `series` section and step.
- **Procedures** (PGlite, through the function each file exports):
  - `series.create`: approver only, Verified only, name taken, the cap.
  - `series.end`: ends; deletes a Series with no Game; not twice.
  - attach: at create for a padel Friendly game, a football Game and a Social; `games.updateSeries` add, change, remove; each refusal of 7.4; locked once a Match completes; unlocked after `reportWrongScore`.
  - results end to end: a padel Friendly game won and drawn; a football Game; a Rounds Social to the last Round; a correction that changes the table's top team moves the win; a cancelled Game drops out and the numbers close up.
  - `series.listForGroup`, `series.byId`, `series.edition`, `series.forPlayer`, `series.playerWins`: shape, order, counts, visibility.
  - `app-router-shape.ts` lists the new paths.
- **Database**: the migration applies on PGlite; `foreign-key-indexes.test.ts` and `constraints.test.ts` pass.
- **Tokens and primitives**: the tokens test; a render test of `SeriesBadge` on web for every emblem and colour; the key parity tests.
- **Clients**: where a screen has a model file, its logic is tested there (as `cabinet-model.test.ts` is). Screens are checked against the PNG by eye, in English and Arabic, light and dark.
- The gate for every ticket: `pnpm exec turbo run typecheck lint test`.

## 14. Assumptions

Made on the owner's behalf, because the design or the request left them open.

1. "Admin and organizer" are the Group approvers: the Group creator and the Appointed Organizers.
2. A Series has no kind and no sport of its own: it takes the Group's sport, and may be attached to a Social or a Game alike.
3. Every Game kind a Group can create carries a Series, with the winner each kind already names (5.4). A Groups only Social with several Pools gives one winning team per Pool. An Americano gives one player.
4. A Series win and an Edition number are computed, not stored (ADR-0105).
5. "Until the score is in" means until a Match of the Game is completed, or a King of the court's Final order is posted; the same line the Season link uses.
6. A Series cannot be renamed, re-badged or reopened. Ending one that was never attached removes it.
7. A Group runs at most 10 Series at a time; a name is 40 characters at most and unique among the Group's running Series.
8. An ended Series keeps the Games already attached to it.
9. Series wins follow the Marks cabinet's visibility: whoever may open the profile, unless Match history visibility excludes them. No separate switch.
10. The profile gets no Latest list; Home's Latest row carries the news. No Notification is sent.
11. The Group's Series is its own screen, opened from the Group's More menu; Group home has no Series tab.
12. On a Played game the result hero stays the one focus and the Series win is a paper card under it; on a Social the winners card is the focus.
13. "Running since" is the month the Series was created.
14. "All N winners", "All N editions" expand in place; "All series wins" opens the sheet in its all mode. None is a new page.
15. The winners line under an ordinal reads "new on the profile", not "new on his profile": the product does not know a player's gender.
16. A Group that stops being Verified keeps its Series and the Games attached to them.

## 15. Risks

- **Read cost.** Every Series read computes results from Matches. `loadSeriesEditions` must stay at a fixed number of queries. The heaviest reads are the Group's Series screen (every Game of every Series of the Group) and a Series page, on the scale of the Standing tab's read today. If one is ever slow, the same pure function can fill a table; nothing else changes.
- **Six shapes, one rule.** `seriesEditionResult` must agree with what each finished screen already shows. The parity tests against `computePoolTables`, `knockoutChampion` and `americanoTable` are the guard.
- **The profile in the design is not the profile in the code.** The frames draw a Latest list and a four-coin Marks card that do not exist. The Series card is placed against the real profile.
- **Create step 4 is three variants on two Apps.** The Series field is one component per App, placed three times.
- **Arabic copy** is new and unreviewed.
- **Edition numbers can move** when an earlier Game is cancelled after later Editions were played (5.6): a played Social that is cancelled takes its win with it and every later Edition moves up one. Rare, and it is what cancelling means, but a number someone remembers can change.

## 16. Tickets

In Linear, team Temba, labelled `ready-for-agent` and `Feature`. Build them in this order; each is blocked by the ones named. A mobile ticket is also blocked by its web twin, which adds the shared catalog strings.

| # | Linear | Title | Blocked by |
| --- | --- | --- | --- |
| S-1 | [TEM-479](https://linear.app/temba-app/issue/TEM-479) | The Series badge as tokens, and a `SeriesBadge` primitive on both Apps | |
| S-2 | [TEM-480](https://linear.app/temba-app/issue/TEM-480) | A Group approver creates and ends a Series (API) | S-1 |
| S-3 | [TEM-481](https://linear.app/temba-app/issue/TEM-481) | An Organizer attaches a Series when creating a Game or a Social (API) | S-2 |
| S-4 | [TEM-482](https://linear.app/temba-app/issue/TEM-482) | An Organizer adds, changes or removes a Game's Series until the score is in (API and the Edit game model) | S-3 |
| S-5 | [TEM-483](https://linear.app/temba-app/issue/TEM-483) | Who won an Edition: the result rule, the Series page read and the Group's Series list (API) | S-4 |
| S-6 | [TEM-484](https://linear.app/temba-app/issue/TEM-484) | A Game's Series card and a player's Series wins (API) | S-5 |
| S-7 | [TEM-485](https://linear.app/temba-app/issue/TEM-485) | Web: the Series page, and ending a Series from its menu | S-1, S-5 |
| S-8 | [TEM-486](https://linear.app/temba-app/issue/TEM-486) | Mobile: the Series page, and ending a Series from its menu | S-7 |
| S-9 | [TEM-487](https://linear.app/temba-app/issue/TEM-487) | Web: the Group's Series tab and New series | S-7 |
| S-10 | [TEM-488](https://linear.app/temba-app/issue/TEM-488) | Mobile: the Group's Series tab and New series | S-8, S-9 |
| S-11 | [TEM-489](https://linear.app/temba-app/issue/TEM-489) | Web: attach a Series on the last step of Create and in Edit game | S-1, S-4 |
| S-12 | [TEM-490](https://linear.app/temba-app/issue/TEM-490) | Mobile: attach a Series on the last step of Create and in Edit game | S-11 |
| S-13 | [TEM-491](https://linear.app/temba-app/issue/TEM-491) | Web: a Game shows its Series and Edition before it is played | S-6, S-7 |
| S-14 | [TEM-492](https://linear.app/temba-app/issue/TEM-492) | Mobile: a Game shows its Series and Edition before it is played | S-8, S-13 |
| S-15 | [TEM-493](https://linear.app/temba-app/issue/TEM-493) | Web: the finished Game opens on the Series winners | S-13 |
| S-16 | [TEM-494](https://linear.app/temba-app/issue/TEM-494) | Mobile: the finished Game opens on the Series winners | S-14, S-15 |
| S-17 | [TEM-495](https://linear.app/temba-app/issue/TEM-495) | Web: Series wins on the profile, and on Home's Latest | S-6, S-7 |
| S-18 | [TEM-496](https://linear.app/temba-app/issue/TEM-496) | Mobile: Series wins on the profile, and on Home's Latest | S-8, S-17 |

What each ticket owns, so two never write the same thing:

- `@repo/domain/series` grows across S-1 (the lists), S-2 (the name rule), S-3 (`carriesSeries`), S-5 (`seriesWinRule`).
- `@repo/domain/series-copy` starts in S-5 (`seriesRowLine`, `seriesWinnersLine`) and is finished in S-6.
- `packages/api/src/series/series-link.ts` starts in S-2 (`requireSeries`) and is finished in S-3; `load-series-editions.ts` is S-5.
- The `series` catalog files start in S-1. API tickets add `series.errors` and the lines' strings; each web ticket adds its screen's strings (`series.page` S-7, `series.tab` and `series.create` S-9, `series.attach` S-11, `series.game` S-13, `series.win` S-15, `series.profile` and `series.latest` S-17); its mobile twin reuses them.

## Comments
