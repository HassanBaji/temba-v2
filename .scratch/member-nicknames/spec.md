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

## Where it shows (mobile)

- Members: nickname first with a tag icon, Temba name under it; search matches both; in Manage, members without one show "Add name"; the member menu has a "Name in this Group" row with the current name on the right; a legend line explains the tag.
- Name in this Group sheet: name field with counter, live preview row, Who sees it, Save and Clear name.
- Standing (all lenses): the nickname with the tag icon.
- Game Add players: nickname first, Temba name in the meta line, search matches both.

## Not yet

- Game line-ups and team making still show Temba names: `games.byId` does not read nicknames.
- The web App gets the fields through shared types; only its Add players dialog shows the nickname (as plain text). No web editor.
