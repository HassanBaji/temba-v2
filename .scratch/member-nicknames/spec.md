# Member nicknames

Design: "Group names" (screens 1a–1e). Term: **Member nickname** in `CONTEXT.md`.

## What it is

A Group approver (the Group creator or an Appointed Organizer) gives a member a name that belongs to one Group, so the people who run Games can tell players apart. One per member per Group, up to 24 characters, trimmed with inner whitespace collapsed. A blank value clears it.

## Who sees it

| Setting               | Group approvers | Other members | The member it names |
| --------------------- | --------------- | ------------- | ------------------- |
| Organizers only (default) | yes         | no            | no                  |
| Everyone in the Group | yes             | yes           | yes, with a "In this Group you're" card |

Rule: `memberNicknameIsVisible` in `@repo/domain/member-nickname`. The API filters before it answers (`visibleMemberNickname`), so a hidden name never leaves the server.

## Storage

Columns on `group_members` (migration `0102_member_nicknames`): `nickname varchar(24)`, `nickname_visibility` (`approvers` | `group`, default `approvers`), `nickname_updated_by_id` (last editor, set null on delete, reassigned on an Unclaimed player merge), `nickname_updated_at`. The name goes when the membership goes.

## API

- `groups.setMemberNickname({ groupId, userId, nickname | null, visibility })`: Group approvers only. New procedure, additive.
- `nickname: { name, visibility } | null` added to `groups.byId` leaderboard rows, `groups.seasonStanding` rows and `games.listGroupMembersToAdd` members. `groups.byId` also gains `canSetMemberNicknames`.
- On a Game: `nickname` on every player row of `games.byId` (seats, registered and unseated players, Game Team members) and on `games.footballBoard` players. Only a private Game of a Group, and only for a viewer who is a member of that Group (`gameMemberNicknames`); a public Game, a Game with no Group, or a viewer outside the Group gets none.

## Where it shows (mobile)

- Members: nickname first with a tag icon, Temba name under it; search matches both; in Manage, members without one show "Add name"; the member menu has a "Name in this Group" row with the current name on the right; a legend line explains the tag.
- Name in this Group sheet: name field with counter, live preview row, Who sees it, Save and Clear name.
- Standing (all lenses): the nickname with the tag icon.
- Game Add players: nickname first, Temba name in the meta line, search matches both.
- Line-ups: padel court seats and the football pool tiles and team columns show the nickname in full with the tag icon (the viewer's own seat stays "You"). Avatars keep the Temba name's initials.
- Team making: each row shows the nickname with the tag icon and the Temba name under it.
- Share images, the score screen and the player sheet keep Temba names.

## Not yet

- The web App gets the fields through shared types: its Add players dialog shows the nickname as plain text, and its padel line-up shows it with the tag icon. No web editor.
