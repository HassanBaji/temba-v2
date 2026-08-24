# 05: Club Group Public: create, join, leave Group

**What to build:** Owner or Admin create a Club Group Public inside a Community with exactly one sport from Community sports, and are members of it. Community members join that Club Group with no extra request. Outsiders cannot join. Members cannot create Club Groups. Leaving the Group leaves the User in the Community.

**Blocked by:** 01: Unique Group membership and Game-on-Group restrict; 02: Create Community and Directory; 03: Request to join Community Public

**Status:** ready-for-agent

**Parent:** #1 Community: clubs, Groups, sports, and Private invites

- [ ] Owner or Admin can create a Club Group Public with a name, public type, and exactly one sport that is on Community sports; the creator is a Group member
- [ ] Create is refused if the sport is not on the allow-list
- [ ] A Community Member can join a Club Group Public with no extra request
- [ ] A User who is not a member of the Community cannot join any of its Club Groups
- [ ] A Member who is not Owner or Admin cannot create a Club Group
- [ ] Leaving the Club Group leaves the User in the Community (possibly with zero Groups)
- [ ] The same User cannot join the same Group twice
- [ ] Club Groups do not appear in the Directory
