Spec: `.scratch/group-creator-ui-gate/spec.md`

# 02: AND `groupCreator` with Club Group and Group Game create UI

**What to build:** Create Club Group on Community home and Create Game on Group home follow the same Clerk `groupCreator` hide as hub create, without widening who may create. Owner or Admin of a live Community see Create Club Group only when the flag is `true` and `canCreateClubGroup` is already true. A Group creator, or Owner or Admin on a Club Group, see Create Game only when the flag is `true` and `canCreateGame` is already true. Other Community staff actions stay. Create procedures and those `canCreate*` values stay as they are.

**Blocked by:** 01: Gate hub Create Community, Create Group, and Create Game on Clerk `groupCreator`

**Status:** ready-for-agent

- [ ] Create Club Group on Community home (actions card, Groups tab header, Groups tab empty state) shows only when `publicMetadata.groupCreator === true` **and** `canCreateClubGroup`. The create dialog is not available unless both are true.
- [ ] An Owner or Admin of a live Community without the flag has no Create Club Group control and cannot open the create dialog.
- [ ] An Owner or Admin of a live Community with the flag still sees Create Club Group wherever `canCreateClubGroup` is true.
- [ ] A Member who is not Owner or Admin does not see Create Club Group even when the flag is `true`.
- [ ] An Owner or Admin of a Soft-archived Community still has no Create Club Group (`canCreateClubGroup` stays false).
- [ ] Invites, Soft-archive, Venue link, and other Community staff actions stay available under existing rules when Create Club Group is hidden.
- [ ] Create Game on Group home (header menu and actions card) shows only when `publicMetadata.groupCreator === true` **and** `canCreateGame`.
- [ ] A Group creator, or an Owner or Admin on a Club Group, without the flag has no Create Game on Group home.
- [ ] A Group creator, or an Owner or Admin on a Club Group, with the flag still sees Create Game on Group home wherever `canCreateGame` is true.
- [ ] A Group member who is not an organizer does not see Create Game on Group home even when the flag is `true`.
- [ ] `canCreateClubGroup` and `canCreateGame` payloads are unchanged. `groups.createClubPublic`, `groups.createClubPrivate`, and `games.create` are not modified. This ticket does not add an organizer check to `/dashboard/games/new` itself (flagged Users who type that URL with a `groupId` still see the form; the existing create procedure still refuses the write if they may not organize).
- [ ] Manual check from the spec: Owner/Admin with and without the flag; flagged Member who is not Owner or Admin; organizer with and without the flag; flagged Group member who is not an organizer.
