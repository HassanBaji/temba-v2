# Individual Game seats — settled decisions

Status: grilling complete — shared understanding confirmed; spec at `.scratch/individual-game-seats/spec.md`.

Amends games-matches Stories 15–16 and Decision 25. Does not replace `.scratch/games-matches/spec.md`.

## Settled (rounds 1–4)

### Formats

1. Solo seat-join on individual **Friendly game** and individual **Friendly tournament**.
2. **Americano** stays pool-only (no sides until Match generation).
3. **Team-only** unchanged: complete Team → Game team → Match slot. No left/right, no 4-seat picker.

### Court model

4. Two sides of the net = two **Game teams** = Match slot 1 vs slot 2.
5. Each Game team has **left** and **right**, from that side facing the net.
6. Friendly game: four seats. That one Match’s 2v2 **is** the join UI.
7. Tournament: join is Game-scoped. Game home is N sides × 2 Positions, N = players allowed / 2. Each Match **shows** a 4-seat 2v2 of the Game teams in its slots. Organizer still assigns Game teams to Match slots.
8. Do not invent a second “side” noun. Do not call the 2v2 diagram a **Court**.

### Join

9. A Game team may be incomplete (1 of 2 Positions). The second User on that side is the partner. No Story 16 unpaired pool going forward. Not two Game teams in one Match slot.
10. Two paths: **seat-pick** (solo into a vacant Position) and **register-with-partner** (both Positions on **one fully vacant** side). Caller picks that side and their Position; partner gets the other.
11. Refuse partner-register if that side has anyone. Refuse if there is no fully vacant side even when the Game is open — they seat-pick solo. Do not waitlist a pair while seats exist.
12. Empty sides are **UI placeholders**. Create the Game team on first join. Friendly game placeholders **are** the one Match’s slot 1 and slot 2. Tournament: numbered 1..N; first join to *k* stays side *k* (grid does not compact). No ghost empty Game team rows.

### Leave / move

13. Leave or kick vacates **only that Position**; partner stays. Kick = that User leaving.
14. Last User on a Game team: **delete** the Game team; clear every Match slot that pointed at it; the placeholder stays.
15. The seated User may **move** to any vacant Position while the Game is not closed/cancelled, and not if they sit on a completed Match.
16. No occupant swap (including swapping left/right with a partner). Move does not waitlist and does not change occupied count. Full ⇒ nothing to move to.
17. Only that User may move themselves. Organizer does not drag or swap seats.

### Waitlist / invites

18. Full = occupied seats ≥ players allowed (Friendly game: 4). Two incomplete Game teams do **not** make it full. Drop “two Game teams ⇒ full” on individual Friendly game.
19. On leave/kick, first eligible waitlisted User is auto-promoted into **that exact vacated Position**. Closed: no new waitlist; existing line still promotes.
20. `registerWithPartner` waitlist stays two separate FIFO User rows. Each promotes alone; a pair may split.
21. Lookup / Invite link accept **requires picking a vacant Position**. None vacant → waitlist (no seat), then the same promotion rule. Closed / join-gate still refuse.

### Tournament / cap

22. Raise players allowed: N grows; new empty placeholders appear; no shell rows. Waitlist is not auto-promoted on raise (already shipped).
23. Lower: still not below registered count, multiple of 4, min 4, **and refuse** if the highest occupied side index is greater than new N. Empty high-index placeholders may disappear; occupied ones may not. No compacting.

### Scoring

24. Organizer may still add Set shells with empty Match slots.
25. Enter games-won or complete only if **both Match slots have Game teams and both Game teams are complete** (2 Positions). Incomplete = scoring frozen.

## Derived (do not re-open)

- Friendly game: picking slot 2 / right creates that Game team and sets `slot_2`; do **not** rewrite Match slots by Game team `createdAt`.
- Join, move, invite, and partner-register onto an empty placeholder: first occupant creates the Game team (partner-register creates it complete).
- After last-leave, promotion still targets that side/Position identity and creates a Game team if needed.
- Organizer cannot remap Friendly game Match slots (already refused; slots are the seats people picked). Tournament slot assignment stays.
- Organizer may assign an incomplete Game team to a tournament Match; scoring stays frozen until both sides are complete.
- Cap raise does not pull the Waitlist (shipped). Kick of a seated User is leave, then promote into that position.

## Explicit non-goals

- Americano sides / generation
- Team-only left/right
- Organizer placing or swapping Users
- Bound-pair Waitlist
- Occupant swap
- Ghost empty Game team rows
- Compacting tournament side indexes
- Scoring 1v2
- Story 16 unpaired pool as a going-forward path
- Replacing the games-matches spec
