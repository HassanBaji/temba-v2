# Padel Teams — settled decisions

Status: grilling in progress (round 3 open). Spec not written yet.

## Superseded / pending clarification

- **R1-Q2 (immutable Community parent at create)** — **SUPERSEDED**. User round-2 answer for create/link (see R2-Q8) replaces “choose parent at create and never change it.”
- **R1 framing of Club Team / Loose Team as create-time fork** — **PENDING REDEFINE** under link-with-approval.
- **R2-Q9-B (Email accept auto-joins Community)** — Chosen under old “Club Team already has Community” framing. **MUST RE-VALIDATE** in round 3 under link-with-approval + leave-Community-keeps-Team (R2-Q11-C).

## Round 1 (still settled unless noted)

1. **Team identity**: New domain entity **Team**, separate from **Group**.
2. ~~**Community attachment**: Optional parent at create, immutable~~ → **SUPERSEDED** (see Attachment below).
3. **When a Team exists**: Creator creates with themselves as the only member; pending invite for the second seat; seat fills on accept. Incomplete Teams are allowed.
4. **Multiplicity / uniqueness**: A User may belong to many Teams. At most one Team per unordered pair of Users **globally**.
5. **Invite doors (v1)**: In-app invite to an existing User **and** Email invite. (Invite link not yet confirmed as non-goal.)
6. **Stats (v1)**: Team entity + invite + stats UI; stored counters (games / wins / losses / related). Counter **updates** wait for a later Game-completion slice; they ship as 0s until then.
7. **Sport**: Team has a sport field from the start. App UI padel-only; tRPC may still accept football when allowed.

## Round 2 (settled)

8. **Create / Community link (intent, not fully specified)**: User rejected staff-only-at-create and member-create-at-create. Stated model: **create a Team, then link it to a Community with Community admin approval.** This reopens attachment rules — clarified in round 3.
9. **Email + Community (provisional)**: **B** — Email accept also auto-joins invitee as Community Member (stacked admit). **Provisional** until attachment/leave rules are fixed.
10. **Soft-archive**: **A** — Mirror Club Groups for attached Teams (refuse new attach/invites/accept as applicable while archived; members still open Team + stats; unattached Teams untouched; unarchive restores). Exact refuse list depends on link model (round 3).
11. **Leave Community**: **C** — Leave Community **leaves Club Team memberships intact** (does not remove the User from Teams linked to that Community).
12. **Leave seat / dissolve**: **A** — Leave = dissolve Team; revoke pending invites; no partner replace in v1.
13. **Powers**: **A** — Creator manages incomplete seat (invite send/revoke); once full, either member may dissolve; equal view of stats.
14. **Pair lock**: **A** — In-app pending invite reserves (creator, B); Email reserves on accept (refuse if pair already exists).
15. **Open-seat invites**: **A** — At most one unused invite total (in-app **or** Email).
16. **Sport allow-list**: **A** — When a Team is (or becomes) linked to a Community, its sport must be on that Community’s sports allow-list. Timing of the check (create vs link approve) open in round 3.
17. **UI surfaces**: **B** — Personal “My Teams” only; linked Teams **not** listed on Community home.
18. **Game attribution**: **A** — Explicit optional Team id on a Game team (side). Counter **updates** still later; whether the FK ships in this slice is round 3.
19. **Name**: **A** — Optional name; UI fallback to member names when empty/incomplete.

## Known tensions (round 3 must resolve)

1. **Attachment model vs old Club-at-create**: Parent is no longer immutable-at-create; link is a later staff-approved action.
2. **Q9-B stacked Email→Community admit** vs **Teams that may be unattached** when the Email is accepted: when does stacked admit apply?
3. **Q11-C leave Community keeps Team** vs any rule that “Club Team seats require Community membership”: after leave, a User can be on a linked Team without being a Community Member — is that intended?
4. **ADR-0004** (Group parent immutable) does **not** automatically apply to Teams; Teams may deliberately diverge.

## Glossary

`CONTEXT.md` Team wording that claimed immutable-at-create parent is being corrected to match the open link model.
