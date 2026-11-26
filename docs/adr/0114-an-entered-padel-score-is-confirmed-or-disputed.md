# An entered padel score is confirmed or disputed

**Status:** accepted. Builds on [ADR-0113](./0113-one-player-from-each-side-confirms-a-padel-score.md) and the design "Score, confirm or dispute", which was drawn for four confirmations and is read here for one player from each side.

Once a padel score was in, the other players still saw open boxes and a Save button. Nothing said the score was waiting on them, a correction looked the same as an entry, and nobody could tell what had been changed or why.

## Decision

- **A score that is in is read-only until someone chooses to change it.** The Set boxes show who won each Set (solid for the side that won it, outline for the side that lost it, hatched for a Set not played), with who won and who entered the score under them.
- **The bottom bar holds the actions.** A player whose side has yet to confirm gets exactly two: **Confirm score**, and **Dispute and edit**. A player whose side is confirmed, the one who entered it and their partner, waits and may **Edit score**; they never confirm their own side's entry. An Organizer's Confirm stays final (ADR-0044) and the bar says so.
- **Dispute and edit opens the boxes with the entered score in them**, so only what is wrong is changed. A changed box is ringed, **Send new score** is live only once something differs, and Cancel puts the score back. A reason is optional, one of four: a set score is wrong, sets are swapped, we did not finish, other.
- **A changed score says what it replaced.** `match_score_changes` keeps, for the score as it stands, who changed it, the Sets it had before and the reason. Everyone asked to confirm reads "Hassan changed set 2 from 0–6 to 3–6" and the reason, and the confirmation rows read Entered it, Changed it, Your turn, Asked again. The next change replaces the note; a score entered afresh through the Set doors, a wrong-score report and an upheld Match dispute drop it.
- **The score is saved in one call.** `games.saveScore` takes every Set and the reason, so the server sees an entry or a correction whole. Both Apps use it for a first entry too. It confirms the saver's side, clears every other confirmation, and on a change tells the other side's account holders with the existing `match_score_to_confirm` Notification. `games.scoreSet` stays for older clients and the other formats.
- **`games.byId` adds `matchResultConfirmation.scoreEntry`**: who put in the score the Match waits on, when, and the change it made, or null.

**Considered options**: keep the actions inside the score card, as the old Confirm button was — rejected, the design's point is that the next step is the bar's one job. Store the reason on the Match — rejected, a change is by someone, from something, and a row says so without four nullable columns. Keep every change as history — rejected for now: only the latest explains the score a player is asked to confirm.

## Consequences

- The design's **Undo** after confirming has no place: the other side's one confirmation completes the Match. A wrong confirmation is corrected as before, by the Organizer's wrong-score report or a Match dispute.
- The design's **Remind the others** is not built. It needs a rule for how often a player may be reminded, which the design does not give.
- The design assumed a second change goes to the Organizer to settle. It does not: each change asks the other side again, and an Organizer can end it at any time by confirming.
- A player who agrees with the score no longer has a Save button to press by mistake: the same score saved again confirms nothing (ADR-0113), and with one call per save the Apps no longer send an unchanged first Set ahead of a corrected one, on a Public Game either.
- The view logic is `@repo/domain/score-review`, shared by both Apps; each App keeps only its boxes and its bar.
