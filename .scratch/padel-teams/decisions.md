# Padel Teams — settled decisions

Status: grilling in progress (round 4 open — discovery / Private admit / unlink / leave leftovers). Spec not written yet.

## Superseded

- **R1-Q2**: Immutable Community parent at create — **superseded** by link-with-approval.
- **R2-Q9-B**: Email accept auto-joins Community — **withdrawn**; replaced by **R3-Q25-A** (Email = Team seat only).

## Settled (rounds 1–3)

### Entity & membership

1. **Team** is a new entity, separate from **Group**.
2. Exactly two Users when full; create with creator only; pending invite for second seat; incomplete allowed.
3. Many Teams per User; at most one Team per unordered pair of Users **globally**.
4. Leave seat = **dissolve** Team; revoke pending invites; no partner replace.
5. Creator manages incomplete seat (invite send/revoke); once full, either member may dissolve; equal stats view for members.
6. Optional Team name; UI fallback to member names.
7. Sport field on Team; App padel-only UI; tRPC may accept football when allowed.

### Invites

8. Doors in v1: **in-app** (existing User) + **Email invite**. **Invite link = non-goal** (R3-Q31-A).
9. At most **one** unused invite for the open seat (in-app or Email).
10. In-app pending reserves global pair `(creator, B)`; Email reserves on accept (refuse if pair exists).
11. Email accept fills Team seat only; **never** Community membership (R3-Q25-A).

### Community link (replaces create-time parent)

12. Every Team is created **unattached** (Loose). Linking is the only path to Club Team (R3-Q20-A).
13. Link request: either member when full; creator only while incomplete (R3-Q21-B).
14. Only **full** Teams may request a link (R3-Q27-A).
15. Owner or Admin approve; Community Public **and** Private (R3-Q22-A, Q23-A).
16. On approve: **auto-admit** any seat not yet a Community Member, then attach Team (R3-Q24-B). *(Private-club intentionality confirmed in round 4.)*
17. Sport must be on Community sports allow-list at **link request and approve** (R3-Q28-B). Removing a Community sport refuses while a linked Team of that sport exists.
18. Either Team member may **unlink immediately** (no staff) (R3-Q26-C). *(Aftermath in round 4.)*
19. Leave Community **does not** remove the User from Teams linked to that Community (R2-Q11-C). *(Visibility after leave in round 4.)*

### Soft-archive

20. While Soft-archived: refuse new link requests and approve/reject of pending link requests; refuse Team invites/accept for **already linked** Teams; unattached Teams unchanged; members can still open linked Team + stats; unarchive restores (R3-Q29-A).

### Stats, Games, UI

21. Stats UI + stored counters (games / wins / losses / related); counter **updates** deferred to Game-completion slice (zeros until then).
22. Incomplete Teams show the same stats block (zeros) + waiting-for-partner copy (R3-Q33-A).
23. Any **Community Member** may open a linked Team’s stats (R3-Q32-B). *(Discovery surface vs “not on Community home” open in round 4.)*
24. Personal **My Teams** surface; linked Teams **not** listed on Community home per R2-Q17-B — may be amended if discovery requires a Community list (round 4).
25. Nullable Team FK on `game_teams` in this slice (R3-Q30-A); explicit attribution; no counter updates yet.

## Open (round 4)

- How Community Members discover linked Teams if they are not on Community home (Q32-B vs Q17-B).
- Confirm Q24-B auto-admit on Private Communities.
- Unlink aftermath: pending link requests, re-link, Soft-archive.
- After leave Community while still on a linked Team: My Teams + Community Member visibility; re-link auto-admit.

## Divergence from Groups

Teams deliberately diverge from ADR-0004 (Group parent immutable at create): Teams attach/detach via link/unlink.
