# 02: Create Community and Directory

**What to build:** A signed-in User creates a Community Public or Community Private with a name and type only (no sport picker), becomes Owner, and opens an empty Community home. The App always submits padel on Community sports. The Directory lists only live Community Public clubs — not Community Private, not Groups.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Parent:** #1 Community: clubs, Groups, sports, and Private invites

- [ ] Any authenticated User can create a Community Public or Community Private with a name and type only; the App stores padel on Community sports
- [ ] Create Community has no sport picker and no football copy
- [ ] The creator is Owner; the Community may have zero Groups
- [ ] Create tRPC is refused with zero sports; the App always sends `["padel"]`
- [ ] Directory (signed-in) shows live Community Public clubs only
- [ ] Community Private clubs and Groups do not appear in the Directory
- [ ] Community names are not globally unique
- [ ] Opening a Community home shows an empty club the Owner can return to
- [ ] Route `/public` still redirects to login; Workspace/App layout unchanged
