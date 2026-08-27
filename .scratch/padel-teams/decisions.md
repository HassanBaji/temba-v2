# Padel Teams — settled decisions

Status: grilling complete — awaiting user confirmation of shared understanding before `/to-spec`.

## Superseded

- **R1-Q2**: Immutable Community parent at create — superseded by link-with-approval.
- **R2-Q9-B**: Email accept auto-joins Community — withdrawn (Email = Team seat only).
- **R2-Q11-C**: Leave Community leaves Club Team memberships intact — **superseded by R4-Q37-B**: leave Community is **refused** while the User is on any Team linked to that Community.
- **R2-Q17-B**: Linked Teams not listed on Community home — **amended by R4-Q34-A**: Community home lists linked Teams for Community Members; personal My Teams remains.

## Settled (rounds 1–4)

### Entity & membership

1. **Team** is a new entity, separate from **Group**.
2. Exactly two Users when full; create with creator only; pending invite for second seat; incomplete allowed.
3. Many Teams per User; at most one Team per unordered pair of Users **globally**.
4. Leave seat = **dissolve** Team; revoke pending invites; no partner replace.
5. Creator manages incomplete seat (invite send/revoke); once full, either member may dissolve; equal stats view for members.
6. Optional Team name; UI fallback to member names.
7. Sport field on Team; App padel-only UI; tRPC may accept football when allowed.

### Invites

8. Doors in v1: **in-app** (existing User) + **Email invite**. **Invite link = non-goal**.
9. At most **one** unused invite for the open seat (in-app or Email).
10. In-app pending reserves global pair `(creator, B)`; Email reserves on accept (refuse if pair exists).
11. Email accept fills Team seat only; **never** Community membership.

### Community link

12. Every Team is created **unattached** (Loose). Linking is the only path to Club Team.
13. Link request: either member when full; creator only while incomplete.
14. Only **full** Teams may request a link.
15. Owner or Admin approve; Community Public **and** Private.
16. On approve: **auto-admit** any seat not yet a Community Member (including on Private), then attach Team.
17. Sport must be on Community sports allow-list at **link request and approve**. Removing a Community sport refuses while a linked Team of that sport exists.
18. Either Team member may **unlink immediately** (no staff). Unlink cancels pending link requests for that Team; Team may re-link later (same or other Community) subject to Soft-archive and allow-list.
19. **Leave Community is refused** while the User is on any Team linked to that Community. User must unlink or dissolve first.

### Soft-archive

20. While Soft-archived: refuse new link requests and approve/reject of pending link requests; refuse Team invites/accept for **already linked** Teams; unattached Teams unchanged; allowed viewers can still open linked Team + stats; unarchive restores.

### Stats, Games, UI

21. Stats UI + stored counters (games / wins / losses / related); counter **updates** deferred to Game-completion slice (zeros until then).
22. Incomplete Teams show the same stats block (zeros) + waiting-for-partner copy.
23. Any **Community Member** may open a linked Team’s stats.
24. **My Teams** lists Teams you sit on. **Community home** lists Teams linked to that Community (for Community Members).
25. Nullable Team FK on `game_teams` in this slice; explicit attribution; no counter updates yet.

## Explicit non-goals (v1)

- Team Invite link
- Partner replace without dissolve
- Unlink requiring staff approval
- Create Team already linked to a Community
- Link request from incomplete Teams
- Updating win/loss counters from completed Games (depends on Game-completion slice)
- Game create / score UI (out of scope; FK only)

## Open dependencies (not blocking shared understanding)

- Game-completion slice will write counters using the explicit Team id on Game sides.
- Mail for Team Email invites can follow existing Community/Group Email invite stub pattern.

## Divergence from Groups

Teams deliberately diverge from ADR-0004 (Group parent immutable at create): Teams attach/detach via link/unlink with staff approve on link.
