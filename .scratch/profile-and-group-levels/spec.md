# Profile redesign and Group Levels

Design: `Profile redesign.dc.html` (1a–1b profile, 2a–2d settings, 3a–3b Arabic) and the "About you" and "When you play" tasks of `Sign up flow v2.dc.html`, in the Claude Design project synced to this repo.

## Problem

1. A Group that is not Verified plays Unrated Games, so its members get no Level from the Games they play there, and a Verified Group's Level is the Temba Level, shared with every other Group. Organizers want a Level that reads their own Group.
2. The You page shows padel only and settings are a short list under it. Players cannot edit what sign up collects, nor add the details the new sign up asks for.

## Decisions

### Rating scope

Every Game has one **Rating scope**, fixed at create:

| Scope   | Shown as                    | Moves                       | When                                                                                         |
| ------- | --------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `temba` | "Counts for Temba rating"   | Temba Level and Group Level | padel Game on a Verified Group, creator kept it rated                                        |
| `group` | "Counts for group rating"   | Group Level only            | padel Game on a Group that is not Verified, creator kept it rated                            |
| `unrated` | "Unrated"                 | nothing                     | creator chose Unrated, groupless (Booking Game without a Group, legacy), every football Game |

- Stored as two booleans, both snapshots taken at create (ADR-0035 still holds): `games.rated` keeps its meaning, "moves the Temba Level", and new `games.group_rated` means "moves the Group Level". `gameRatingScope` in `@repo/domain/game-rating-scope` is the one reader: `rated` → `temba`, else `group_rated` → `group`, else `unrated`.
- Existing Games get `group_rated = false`, so history is not replayed into Group Levels.
- `games.create`, `games.createTournament` and `bookings.createGame` take an optional `rated` input, default `true`. `false` makes the Game Unrated. The procedure paths and their other inputs are unchanged.
- Outputs gain `ratingScope` next to `rated`; `rated` stays for released clients.

### Group Level

- A **Group Level** is a User's Glicko-2 Rating inside one Group: `group_ratings` (one row per User and Group) and `group_rating_events` (one per User and Match), mirroring `ratings` and `rating_events`.
- A Match on a Game whose scope is `temba` or `group` writes Group rating events for its four Users, in the same transaction as the Temba ones. Weight is 1.
- A User's first Group rating starts from their Temba Rating's μ (or the unknown start), with φ raised to at least `GROUP_RATING_START_PHI` (250), so it is Provisional until a few Group Matches confirm it.
- **Group Level override**: an Organizer of the Group (creator, appointed Organizer, Club Group Owner or Admin) may set a member's Group Level, as `ratings.setGroupLevel`. It is a new baseline, like a Level override, stored in `group_level_overrides`. A Level setter still sets the Temba Level with `ratings.setLevel`.
- A football Group has no Group rating events (football results stay Unrated); its Group Level is the member's football Level until an Organizer sets one.
- "Report a wrong score" reverses Group rating events the way it reverses Temba ones, and is allowed when the Match has either kind of event and no seated User has a later event of that kind.
- A Standing is unchanged (ADR-0045).

### Profile (You)

- Header: avatar, name, home area and "Member since".
- Sport chips for the sports the User set up, a dashed "+ Sport" chip for the other.
- Scope chips: General, then one per Group Level. The hero card, Last 10, tiles, Partners and Recent matches read the chosen scope (General = all Matches of the sport, a Group = that Group's Matches).
- "Levels by group": a scale with each Group Level against General, one row per Group with rank among that Group's rated members, rated Match count, Provisional or "Set by <name>, organizer", and the difference to General.
- No sport set up: a "Set up a sport" card.
- Football: football Level, win rate, goals in Last 10, Last 10, All time record, Group Levels, Teammates.
- Data: new `users.myProfile({ sport, groupId? })` and `ratings.myGroupLevels({ sport })`.

### Settings

One hub at `/profile/settings`: details row, Complete your profile, Sport profiles, Account (mobile, email, password), Playing (When you play, Seat alerts), People and bookings, Language, About, Sign out, Delete account (opens Clerk's account deletion).

- **Your details** (`/profile/details`): photo, first and last name, gender, date of birth, home area, nationality. Others see name, photo and age group only.
- **Padel profile** (`/profile/padel`): locked Level with Group Levels, Preferred side, Match history visibility, Remove padel.
- **Football profile** (`/profile/football`): Usually join as, Preferred position, self-placed Level (until first set), Add or Remove football.
- **When you play** (`/profile/availability`): weekday and weekend × morning, afternoon, evening; Seat alerts toggle.

New `user` columns, all nullable or defaulted: `gender`, `birth_date`, `home_area`, `nationality`, `play_windows`, `seat_alerts`, `match_history_visibility` (`everyone` default, which keeps today's rule, `group_members`, `only_me`). `users.playerProfile` shows only Level and side to a viewer the owner's visibility excludes.

New procedures: `users.profileDetails`, `users.setProfileDetails`, `users.setPlayWindows`, `users.setMatchHistoryVisibility`, `users.setSports`.

### Web

The web App's You page (`/dashboard/you`) gets the same profile and Settings, reading the same procedures, and Create game gets the same rating choice.

## Out of scope

- Seat alert delivery. The toggle and windows are stored; nothing sends alerts yet.
- Replaying past Matches into Group Levels.
- Changing a Game's scope after create.
