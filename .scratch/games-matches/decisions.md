# Games and Matches — settled decisions

Status: grilling in progress — Rounds 1–3 settled; Round 4 open.

## Settled (round 1)

1. **Breaking rename.** Today’s contest entity is a **Match**. **Game** is the parent event that contains one or more Matches. Rejected: keep Game as the contest and add a parent named Event; nest Match inside today’s Game without renaming.
2. **Registration modes** on the Game: **individual** (Users fill seats) or **team-only** (only a complete persistent **Team** occupies a side). Padel doubles. No third team-like entity. Guests later unless requested.
3. **This slice:** create + registration rules + caps. Configure one set vs several on a Match. No score entry, no live scoring, no Team/User/Group counter updates.

## Settled (round 2)

4. **Formats this slice:** **Friendly game** (name locked in round 3), **Americano** (individual-only, rotating partners, Matches generated after registration in a later slice), **Friendly tournament** (fixed sides across Matches; organizer adds Matches by hand; individual or team-only). Bracket-style Friendly tournament is later.
5. **Fixture** is another word for **Match**. Not a third entity. Not a glossary term.
6. **Belonging:** optional Group (Club or Loose). Public pickup is a flag on the **Game**. Games still do not belong to a Community directly.
7. **Registration** lives on the Game (not on a Match). Individual cap: **players allowed**, multiple of 4, min 4. Team-only cap: **teams allowed**, integer ≥ 2.
8. **Waitlist** once the cap is reached; promote when someone leaves. Registration states: open, full, closed (open until organizer closes, Game window, or cap).
9. **Court and time** live on **Match** (Court optional). Game may have an optional window and no Court. Set length is a Game default; per-Match override later.

## Settled (round 3)

10. Format A’s product name is **Friendly game**, not Single.
11. **Organizers:** Club Group Game = any Community Owner or Admin (Members cannot). Loose Group Game = any Group member. Groupless public = creator only after create (any authenticated User may create). Soft-archived Club Group: refuse new Games. Same people create, add Friendly tournament Matches, close registration, assign Courts.
12. **Register / waitlist:** Public Game = any authenticated User or complete Team. Non-public Group Game = Group members only. Public Group Game is a real join door without Group membership. Team-only: **both** partners must already be allowed as individuals. Incomplete Teams never enter.
13. Waitlist: **FIFO**, unbounded, leave waitlist or registered (leave registered → promote). **open** / **full** (waitlist grows) / **closed** (no new seats or waitlist; existing waitlist still promotes).
14. Individual Friendly tournament: register **with a partner** as an ad-hoc **Game team**. Game team = Game-level side (Team or ad-hoc pair), reused on Matches. Americano: User pool only this slice.
15. **Courts:** Club Group Game = Courts on the Community’s linked Venue only (no link → no Court). Loose/groupless = any Court on a live Operator Venue. Skip allowed. Archived Venues not pickable.

## Glossary / ADR

Applied: Game, Match (avoid fixture), Set, Game team, Americano, Friendly tournament, Friendly game, Waitlist. ADR-0008 records the Game→Match rename.

## Open (round 4)

- Friendly game caps (forced 4/2 vs organizer-chosen)
- When/how Friendly tournament Matches get sides
- Cancel and edit rules
- Home / pickup / Group lists
- Set length values (one set vs best of 3)
- Game invites this slice

## Later (round 5+)

- Organizer kick
- Reopen closed registration
- Live Games on a Soft-archived Community
