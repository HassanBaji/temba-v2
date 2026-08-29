# Games and Matches — settled decisions

Status: grilling in progress — Rounds 1–4 (Q14–Q17) settled; Round 5 open.

## Settled (round 1)

1. **Breaking rename.** Today’s contest entity is a **Match**. **Game** is the parent event that contains one or more Matches. Rejected: keep Game as the contest and add a parent named Event; nest Match inside today’s Game without renaming.
2. **Registration modes** on the Game: **individual** (Users fill seats) or **team-only** (only a complete persistent **Team** occupies a side). Padel doubles. No third team-like entity. Guests later unless requested.
3. **This slice (provisional — Q20 may amend):** create + registration rules + caps. Configure one set vs several on a Match. No score entry, no live scoring, no Team/User/Group counter updates.

## Settled (round 2)

4. **Formats this slice:** **Friendly game**, **Americano** (individual-only, rotating partners, Matches generated after registration in a later slice), **Friendly tournament** (fixed sides across Matches; organizer adds Matches by hand; individual or team-only). Bracket-style Friendly tournament is later.
5. **Fixture** is another word for **Match**. Not a third entity. Not a glossary term.
6. **Belonging:** optional Group (Club or Loose). Public pickup is a flag on the **Game**. Games still do not belong to a Community directly.
7. **Registration** lives on the Game (not on a Match). Individual cap: **players allowed**, multiple of 4, min 4. Team-only cap: **teams allowed**, integer ≥ 2. Friendly game caps locked in round 4.
8. **Waitlist** once the cap is reached; promote when someone leaves. Registration states: open, full, closed.
9. **Court and time** live on **Match** (Court optional). Game may have an optional window and no Court.

## Settled (round 3)

10. Format A’s product name is **Friendly game**, not Single.
11. **Organizers:** Club Group Game = any Community Owner or Admin. Loose Group Game = any Group member. Groupless public = creator only after create. Soft-archived Club Group: refuse new Games.
12. **Register / waitlist:** Public Game = any authenticated User or complete Team. Non-public Group Game = Group members only. Public Group Game is a real join door. Team-only: **both** partners must already be allowed as individuals.
13. Waitlist: **FIFO**, unbounded, leave waitlist or registered (leave registered → promote). **open** / **full** / **closed**.
14. Individual Friendly tournament: register **with a partner** as an ad-hoc **Game team**.
15. **Courts:** Club Group Game = linked Venue only. Loose/groupless = any live Operator Venue Court. Skip allowed.

## Settled (round 4, Q14–Q17)

16. Friendly game caps **forced 4 players / 2 teams**. Overflow = waitlist.
17. Friendly tournament Matches: add anytime (open/full/closed). Sides optional. Leave clears that side; Match remains.
18. Organizer may cancel a Game (waitlist discarded, Matches cancelled) or a Friendly tournament Match. Cancelling the only Match of a Friendly game cancels the Game. Americano: cancel Game only.
19. After create: format, public flag, individual vs team-only **immutable**. Cap raise anytime; lower not below registered count. Window editable.
20. Home upcoming = **Games** if registered, waitlisted, organizer, or member of the Game’s Group. Public pickup = isPublic Games excluding Soft-archived Club Group Games. Group home = that Group’s Games.

## Overrides in play (round 5)

- **Q18:** sets “as I played” for Friendly games and Matches — collides with Q3 and glossary Set. Not locked until Q20.
- **Q19:** Lookup invite **and** Invite link on a Game (token rules as shipped). Who/what/accept not locked until Q21–Q23.

## Open (round 5)

- Set records vs planned length (amend Q3 or not)
- Who mints Game invites
- What accept does (especially team-only)
- Non-public Club Group Game Invite link: Game only vs also join Group
- Organizer kick
- Reopen + live Games on Soft-archived Community
