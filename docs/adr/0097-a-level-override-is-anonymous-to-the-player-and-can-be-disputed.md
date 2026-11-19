# A Level override is anonymous to the player, and the player can dispute it

**Status:** accepted. Amends [ADR-0073](./0073-every-manual-rating-change-carries-who-and-why.md) for Level overrides; Tier adjustments are unchanged.

ADR-0073 had every manual change name the person and the reason to the player. For a Level override the owner now wants the opposite: the player reads that their Level was adjusted based on their performance, never who did it, by which door, or why. In return the player gets a way to push back that reaches Temba staff, not the person who set it.

## Decision

- **The player's copy is anonymous.** The `level_set` Notification reads "Your Level was adjusted to C+ 3.8 based on your performance", in the list, the Notification email and on both Apps, for every door (Level setter, Operator, Verifier). Its subline says it can be disputed. The Notification list sends no actor, reason, note or Venue for it; Rating history sends no setter, role, Venue, reason or note on a Level override line, which reads "Level adjusted based on your performance".
- **`level_overrides` still records who and why.** Nothing about the audit row changes, and Operators read it when they decide a dispute.
- **A Level dispute** (`level_disputes`) is the player's claim that one of their Level overrides is wrong, with a required note of up to 280 characters. They raise it from that override's line in Rating history, which a `level_set` Notification opens. It may be raised once per override, only on the player's newest override in that sport, within 14 days of it, and not on an override they set themselves or one an upheld dispute wrote.
- **Every Operator is told** by a `level_dispute_raised` Notification (found through `user.is_operator`, ADR-0081), and decides it on the Operator disputes page of the web App, which shows the setter, the door, the reason and the note.
- **Upholding takes the adjustment's move back**, not the Rating's whole state: a new Level override in the Operator's name, reason "correcting a mistake", sets the Level to today's Level minus what the disputed override moved, so Rated Matches since keep their moves. It is refused once the Level was set by hand again; the Operator dismisses and sets it by hand instead. Dismissing leaves the Level. Either way the player is told by a `level_dispute_decided` Notification, which names nobody.

**Considered Options**: restoring the before-values stored on the override (simple to explain, but erases every Rated Match since); sending the dispute to the person who set the Level (the owner wants it to reach Temba, and it would reveal who that was); letting Operators only close the dispute as reviewed (the player would hear nothing back).

## Consequences

- A player can no longer tell a Verifier's calibration from an Operator's or a Level setter's change.
- A Tier adjustment still names the Organizer, so the Rating history footnote now speaks of Tier changes only.
- The override an upheld dispute writes is a Level override like any other: it confirms the Level and sets Reliability back to 100.
