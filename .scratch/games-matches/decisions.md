# Games and Matches — settled decisions

Status: spec published — `.scratch/games-matches/spec.md` (ready-for-agent). Tickets via `/to-tickets`.

## Settled (round 1)

1. **Breaking rename.** Today’s contest entity is a **Match**. **Game** is the parent event that contains one or more Matches.
2. **Registration modes** on the Game: **individual** or **team-only** (complete persistent **Team**). Padel doubles.
3. **This slice (amended Q20):** create + registration + caps + **static Set records** on Friendly game and Friendly tournament Matches. No point-by-point. No Team/User/Group counter updates. No Americano Matches or Sets this slice.

## Settled (round 2)

4. Formats: **Friendly game**, **Americano**, **Friendly tournament**. Bracket later. Fixture is not a term.
5. Belonging: optional Group; public flag on the Game; not Community-direct.
6. Registration on the Game. Caps: players allowed ×4 min 4; teams allowed ≥ 2 (Friendly game forced 4/2 in round 4).
7. Waitlist FIFO, unbounded; states open / full / closed.
8. Court and time on **Match** (Court optional). Game may have an optional window.

## Settled (round 3)

9. Organizers: Club Group = Owner/Admin or Group creator; Loose Group = Group creator only; groupless = creator. Soft-archive: refuse new Club Group Games.
10. Public is a real join door. Non-public Group Game = Group members only. Team-only: both partners must be allowed as individuals.
11. Individual Friendly tournament: register with a partner as an ad-hoc **Game team**.
12. Courts: Club Group = linked Venue only; Loose/groupless = any live Operator Venue. **Amended:** `.scratch/game-create-venue-court/decisions.md` — Venue required on every Game; unlinked Club Group uses the live catalog at create; after create, Courts follow Game.venueId.

## Settled (round 4)

13. Friendly game caps **4 / 2**. Tournament Matches add anytime; sides optional; leave clears side.
14. Cancel Game or a tournament Match. Format, public, mode immutable. Cap raise ok; lower not below registered.
15. Home/pickup/Group home list **Games**, not Matches.

## Settled (round 5)

16. **Sets:** unbounded records after play; organizer **or** Users on that Match’s two Game teams may add/remove. Counters stay at zero. Planned N gone.
17. Game Lookup invite + Invite link; mint = organizers; token rules as shipped; no Email invite.
18. Individual invite accept = register or waitlist; closed refuses. Team-only Lookup **not offered**. Team-only Invite link = **both** partners accept.
19. **Non-public Club Group Game** Invite link does **not** bypass Group membership (Q23 override).
20. Organizer kick = same as self-leave.
21. Reopen closed (not cancelled, not archived). Soft-archive existing Club Group Games: visible, join doors closed, organizers may still schedule, cannot reopen.

## Settled (round 6)

22. Each Set stores **games won per side**, including a **games-draw**. Unequal games → 1 Set-win; equal games → 0 Set-wins both. Match winner = most Set-wins; tie = Match draw. Complete once ≥1 Set (then freeze).
23. A Match has two ordered slots. Organizer may add a **Set shell** with empty slots; **nobody** may enter or edit games-won until **both** slots have Game teams. Leave/kick clears a slot; Sets stay; scoring frozen until both slots filled again.
24. Invites never widen a non-public Group Game. Groupless non-public = invite-only. Pending Team does not occupy cap.
25. Individual non-Americano: register with a partner as an ad-hoc Game team. Friendly game = two such sides. **Superseded for individual Friendly game / tournament** by `.scratch/individual-game-seats/decisions.md` (solo seat-join + Position). Americano and team-only unchanged.

## ADR / glossary

ADR-0008 records the Game→Match rename. Glossary: Game, Match, Set (may be drawn), Game team, Americano, Friendly tournament, Friendly game, Waitlist; Invite link includes Game; Soft-archive includes Club Group Games.
