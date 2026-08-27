# 10: Change Community sports

**What to build:** Community home has no add/remove Community sports section. tRPC `addSport` / `removeSport` stay (padel or football). Removing a sport is refused while any Club Group of that sport exists in that Community. New Club Groups from the App always submit padel and still must be on the allow-list.

**Blocked by:** 05: Club Group Public: create, join, leave Group

**Status:** ready-for-agent

**Parent:** #1 Community: clubs, Groups, sports, and Private invites

- [ ] Community home has no add/remove Community sports controls and no “add football later” copy
- [ ] tRPC `addSport` can still add a sport (padel or football) that is not already on the allow-list
- [ ] tRPC `removeSport` is refused while any Club Group of that sport exists in that Community
- [ ] Members cannot change Community sports
- [ ] New Club Groups from the App always submit padel and still may only use a sport on the allow-list
