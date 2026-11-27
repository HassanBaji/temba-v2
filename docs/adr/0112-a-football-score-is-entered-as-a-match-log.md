# A football Score is entered as a Match log

**Status:** accepted. Builds on ADR-0069 (goals feed OVR) and the design "Football score log".

A football Score was two numbers and an optional list of who scored how many. Nothing recorded an own goal, a card, or when anything happened, and a wrong goal could only be fixed by stepping the numbers.

## Decision

- **The Score is entered as a Match log**, one line per goal, own goal, warning and red card, stored in `match_events` with its side, player, minute of the game, the clock time it was logged, a red card's optional reason, and its place in the log. `side_index` is the side the line counts for: the scoring side for a goal and an own goal, the player's side for a card. A goal nobody saw the scorer of has no player.
- **The Score and the Scorers stay where they are** (the Match's one Set and `match_goals`) and are what the log adds up to. `saveFootballScore` takes an optional `log`; when it is sent, the goals per side must equal the Score and the named goals must equal the Scorers, so OVR (ADR-0069), Live boards, profiles and history read exactly what they read before. An own goal counts for the other side and is not the player's goal.
- **The minute is worked out from kick-off** (`@repo/domain/football-match-log`, `matchMinute`): the first 60 seconds are the 1st minute, and a line logged after the final whistle takes the game's last minute. The clock time stays as logged. Whoever enters the log may change a line's player, minute and a red card's reason, or remove it; Undo brings back the last removal. Changing who a goal is about to a player of the other side makes it an own goal for the same side.
- **A second warning gives a red card on its own**, reason second warning, and the two stay together under every edit: removing either warning takes that red card with it, removing the red card of a player with two warnings takes their latest warning with it, and moving a card to another player settles the rule again for both. A player is sent off at most once and takes no more cards, but may still be given a goal scored earlier. The save refuses a third warning and two warnings without a red card.
- **Lines level on minute and time keep the order they were saved in** (`position`), not the order of their ids, so a second warning stays ahead of its red card and an unchanged log saved again does not ask the other side again.
- **Until the Score is confirmed the log is for those who enter or confirm it**: a player on either side and the Game's Organizers. `footballBoard` returns it to everyone who can see the Game only once the Match is completed.
- **The entry screen cannot build a log the save refuses.** A side stops at 99 goals and the log at 200 lines. When a player in a stored log has left the Game, their goal stays as a goal nobody saw the scorer of, so the Score holds, and their cards go.
- **The log is confirmed with the Score.** A changed log, cards included, asks the other side again as a changed Score does. Whoever may enter the Score (a player on either side, or an Organizer) may edit any line until it is confirmed; after that it is locked with the Score, and Report wrong score clears it with the Score.
- **Older clients keep working.** A save without `log` keeps the stored log while the Score and Scorers are unchanged, and drops it once they change, since it would no longer add up. A Score saved before the log existed opens in the entry screen as one line per goal, at the time the screen was opened.
- **Cards are a record.** They show on the Game and its timeline; there is no automatic ban and no effect on rating. A Group can decide a ban for itself.
- **Card colours are data**, like bib colours: `footballCardColors` in `@repo/design-tokens/marks`, taken from the MVP and Clutch coins, the only colour on the screen.

**Considered options**: replacing `match_goals` with the log as the only store (every reader of goals would move at once, and older clients' saves would need translating); storing only the minute (the design keeps the time each line was tapped); letting only the Organizer edit the log (the person entering the Score already corrects it, and the other side's confirmation guards it).

## Consequences

- A new table and two enums (`match_event_kind`, `red_card_reason`); `match_events.user_id` is merged with an unclaimed player's history and set null if the User is deleted.
- `footballBoard` returns `match.log` (oldest first) and `match.confirmedByName`.
- Both Apps enter the log through one pure editor, `@repo/domain/football-match-log-editor`; the hooks only hold its state and stamp new lines.
- "Entered by" is the first confirmation on the Match. On a private Game a non-playing Organizer's entry records none, so it names the first player who confirmed. Naming the enterer exactly needs who entered stored on the Match.
- "Something is wrong, send it back" from the design is not built: the other side still fixes it by entering the Score again, which asks the enterer to confirm.
