# Games and Matches — settled decisions

Status: grilling in progress — Rounds 1–5 settled; Round 6 open.

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

9. Organizers: Club Group = Owner/Admin; Loose Group = any member; groupless = creator. Soft-archive: refuse new Club Group Games.
10. Public is a real join door. Non-public Group Game = Group members only. Team-only: both partners must be allowed as individuals.
11. Individual Friendly tournament: register with a partner as an ad-hoc **Game team**.
12. Courts: Club Group = linked Venue only; Loose/groupless = any live Operator Venue.

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

## Open (round 6)

- Set payload (games-won vs winner only), draw, Match complete
- When Sets may be added (both sides required?)
- Invite fallout: groupless non-public, pending Team slot
- Individual Friendly game: pairs vs four solo Users
