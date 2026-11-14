# Member nicknames

Design: "Group names" (screens 1a–1e). Term: **Member nickname** in `CONTEXT.md`.

## What it is

A Group approver (the Group creator or an Appointed Organizer) gives a member a name that belongs to one Group, so the people who run Games can tell players apart. One per member per Group, up to 24 characters, trimmed with inner whitespace collapsed. A blank value clears it and puts "who sees it" back to the default. An approver may name themselves.

## Who sees it

| Setting                   | Group approvers (their own name included) | Other members | The member it names, if not an approver | Anyone outside the Group |
| ------------------------- | ----------------------------------------- | ------------- | --------------------------------------- | ------------------------ |
| Organizers only (default) | yes                                       | no            | no                                      | no                       |
| Everyone in the Group     | yes                                       | yes           | yes, with an "In this Group you're" card | no                       |

The rule lives in `visibleMemberNickname` (`packages/api/src/groups/helpers/`). The API filters before it answers, so a hidden name never leaves the server. On a Game, `gameMemberNicknames` gives names only to a viewer who is a member of the Game's Group, and only for players in that Group; this holds for public and private Games alike. Challenge Games have no Group, so none.

## Storage

Columns on `group_members` (migration `0103_member_nicknames`): `nickname varchar(24)`, `nickname_visibility` (`approvers` | `group`, default `approvers`), `nickname_updated_by_id` (last editor, set null on delete, reassigned on an Unclaimed player merge), `nickname_updated_at`. The name goes when the membership goes. When an Unclaimed player is merged into an account already in the same Group, the Unclaimed player's nickname moves to the account's membership unless that already has one.

## API

- `groups.setMemberNickname({ groupId, userId, nickname | null, visibility })`: Group approvers only. New procedure, additive.
- `nickname: { name, visibility } | null` on `groups.byId` leaderboard rows, `groups.seasonStanding` rows and `games.listGroupMembersToAdd` members. `groups.byId` also gains `canSetMemberNicknames`.
- `nickname` on every player row of `games.byId` (seats, registered and unseated players, Game Team members) and on `games.footballBoard` players.

## Where it shows

Both Apps show the same places. Every one marks the nickname with the tag icon. Only the Members list puts the Temba name under it; everywhere else the nickname stands alone, and avatars keep the Temba name's initials.

- Members: nickname first, Temba name under it; search matches both. In Manage, a member without one shows "Add name", the approver's own row included. The member menu has a "Name in this Group" row with the current name on the right. A legend line explains the tag.
- Name in this Group (a sheet on mobile, a dialog on web): name field with counter, live preview row (nickname over Temba name), Who sees it, Save and Clear name. Naming yourself reads "For you" and its own notes. The copy lives in `group.nickname` and the view in `@repo/domain/member-nickname-sheet`, shared by both Apps.
- The player's own card: only for a name set for the whole Group.
- Standing (all lenses). The viewer's own row keeps their Temba name ("You" on mobile).
- Line-ups: padel court seats and football pool tiles and team columns. The viewer's own seat stays "You".
- Team making.
- Game Add players: nickname alone; search matches both names. The picked-players summary uses nicknames.
- Share images, the score screen and the player sheet keep Temba names.
