# Player profile flow: design reference

Source: Claude Design project `fea56e1b-5966-4cbb-981f-15fe74a0c7fc`, file `Player profile flow.dc.html` (screens 09a–09e). Transcribed from the design file. All values are mock data from the design.

Design brief given to the designer: players can view other players' profiles. The profile shows the last 10 games, overall stats, level, winning streaks and preferred playing position.

Later design change: the "Invite to a game" and "Challenge" buttons were **removed from 09b**. They are still drawn on 09e. The designer offered to remove them there too.

Header note on the canvas: "Any player's name or avatar opens their profile: members lists, game seats, standings and brackets."

Visual language: black and white, hairline `#E6E6E6` borders, radius 14–16 on cards, Archivo with tabular figures, won mark = solid black circle with white arc, lost mark = white circle with black outline and black arc. Hatched backgrounds mean "not yet" or "unavailable". Screens are 390 × 844 phone frames.

## 09a: Entry, tap a member

- Group screen "Tuesday Crew", "Padel, 14 members", segmented control Standing | Games | **Members**.
- Member rows: avatar with initials (the current user's avatar is inverted to black), name, subtitle (Organizer / You / Member since Jan / Joined last week), level letter + rating (`B 4.21`), chevron. Every row links to the profile.
- Footnote: "Tap anyone to open their profile. The same tap works on avatars in game seats, standings and brackets."

## 09b: Player profile

Top block on ink (black) background:
- Back button, `⋯` overflow button.
- Avatar (64px, initials), name "Elin N", subtitle "Padel, plays at Padelhuset Bromma".
- Level card: label LEVEL, "Confirmed, 64 rated matches". Big letter `B`, number `4.21`, trend over last 10 games `+0.15` (sum of rating deltas).
- "0.29 to B+" and "42% through B", with a progress bar through the current band.
- Per-game rating bars for the last 10 (oldest to newest), up or down proportional to delta. (The bar markup is empty in the current file; the data is computed.)
- Level letters: D, D+, C−, C, C+, B−, B, B+, A−, A. Band = floor((rating − 1) / 0.5). Each band is 0.5 wide starting at 1.0.

Paper sections below:
- **Streaks** card, two columns: Current streak `4 wins in a row` with 4 won marks; Best streak `7 wins`, "March 2026".
- **Preferred position** card: a mini court diagram (far half hatched, near half split left/right with the preferred side filled black). Label "Left side" / "Right side" / "Both sides". Subtitle e.g. "Backhand side, 72% of matches. Right-handed".
- **Overall** heading with scope label ("All time" or "This season"). 2×2 grid: Matches 64, Won 41, Win rate 64%, Sets won 61%. (This season: 22, 15, 68%, 63%.)
- **Head-to-head with you** (suggested, shown when `showSuggested`): "You and Elin, all time". As partners `4–1 in 5 games`. Against each other `1–2 to Elin`.
- **Last 10 games** heading with "7 won, 3 lost". Row of 10 won/lost marks, labels under the ends ("Sat 6 Sep" … "Latest", order configurable oldest→newest or newest→oldest).
- 3 most recent games as rows: mark, "vs Sofia L & Adam R", "Thu 2 Oct, Tournament, round 2", score `6–4  6–3`, delta `+0.06`. Rows link to 09c.
- Button "See all 10 games ›" to 09c.

## 09c: Last 10 games

- Back, title "Last 10 games", subtitle "Elin N, 7 won, 3 lost".
- Filter chips: All 10 | Won 7 | Lost 3 (selected chip is black).
- List of rows: mark, "vs Sofia L & Adam R", "with Jonas B, Padelhuset Bromma", "Thu 2 Oct, Tournament, round 2", set scores, rating delta. Tapping a row opens 09d. Selected row tinted `#F4F4F4`.
- Empty state for a filter: "No games here."

## 09d: Game from history (bottom sheet over 09c)

- Title = game kind ("Tuesday Crew", "Friendly game", "Tournament, round 2", "Challenge"), subtitle "Tue 30 Sep, Padelhuset Bromma". Result badge Won (black) / Lost (outline).
- Two team rows: each player with avatar, name, level (`B 4.21`); per-set score chips on the right, black chip for a set that team won, grey for lost.
- Rating card: "Elin's rating", `B 4.17 → B 4.21`, delta `+0.04`.
- Button "Open game ›" (to the full Game screen).

Game kinds in the mock data: group session (named after the group), Friendly game, Tournament round N, Challenge.

## 09e: Profile with history kept to groups (suggested privacy state)

- Same ink header for "Hugo A", level `B 4.05`, "Confirmed, 38 rated matches", no trend or progress bar.
- "Invite to a game" (primary, black) and "Challenge" (outline) buttons. Removed from 09b by request; see the note at the top.
- Preferred position card: "Right side", "Forehand side, left-handed".
- Hatched locked card: "Streaks, stats and games are private". "Hugo shares these with people in his groups. You've played 2 games with him in public matches."

## Suggested additions (designer's notes)

| Where | Title | Note |
| --- | --- | --- |
| 09b | Head-to-head with you | Record as partners and as opponents. |
| 09b | Rating change over the last 10 | Small bars under the level show whether the player is rising or slipping. |
| 09e | Who can see history | Players choose Everyone, Group members or Only me. Level and position stay public so matchmaking still works. |
| not drawn | Mutual groups and clubs | A line under the name, e.g. "Both in Tuesday Crew". |
| not drawn | Usual partners | Top 3 partners with win rate together. |
| not drawn | Report and block | In the ⋯ menu. Needed once profiles are visible outside groups. |

## Design controls (variants the designer exposed)

- `showSuggested` (on/off): head-to-head block and 09e.
- `statsScope`: All time | This season.
- `position`: Left side | Right side | Both sides.
- `formOrder`: Oldest to newest | Newest to oldest.
