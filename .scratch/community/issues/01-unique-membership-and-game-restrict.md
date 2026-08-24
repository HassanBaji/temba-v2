# 01: Unique Group membership and Game-on-Group restrict

**What to build:** A User cannot sit on the same Group twice. A Group that still has Games cannot be deleted. Existing dashboard and Clerk behavior still work.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Parent:** #1 Community: clubs, Groups, sports, and Private invites

- [ ] Group membership is unique per Group and User; a second join of the same pair is refused
- [ ] A Group that still has Games cannot be deleted (database restrict, not cascade)
- [ ] A Game may still exist with no Group
- [ ] Home, login, dashboard Clerk behavior and stub Game tRPC still work
