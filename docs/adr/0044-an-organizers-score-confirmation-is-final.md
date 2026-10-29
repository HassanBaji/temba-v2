# An Organizer's score confirmation is final

**Status:** accepted. Amends ADR-0011, ADR-0040 and the Unclaimed side rule of ADR-0042.

A Match waited on every seated User with an account (padel) or one player from each side (football) before it completed. When players did not respond, an Organizer could force-complete a padel Match through `games.completeMatch`, but could not settle a football Score, and the confirm action on the score card only covered sides with no account holder. Organizers now settle the score from the score card in one step.

## Decision

- **An Organizer's `games.confirmMatchResult` completes the Match at once.** Any Organizer of the Game counts: the Group creator, its Appointed Organizers, Community Owner and Admin on a Club Group, and the creator of a groupless Game. It runs the usual completion effect, so a Rated Match rates and a Knockout winner advances.
- **Entering a score is not a final confirmation.** An Organizer who enters or edits a score is confirmed only for themselves, as any player is, so a typo can still be fixed before they confirm.
- **Seated players confirm as before.** A Match nobody organizes still waits on every required player.
- **`slot` stays on the input** for clients that still confirm for one side. From an Organizer it completes the Match like any other Organizer confirmation; from anyone else it is refused. The per-side confirmation rows are no longer written.
- **Clients show one "Confirm score" action to an Organizer** until the score is final. `games.footballBoard` adds `viewer.canConfirmAsOrganizer`; `games.byId` adds `matchResultConfirmation.confirmedByOrganizer`, true for a final Match that not every required player confirmed. Both are additive.

**Considered Options**: making an Organizer's score entry final on save (one tap less, but a mistyped first Set would rate at once); keeping per-side confirmation and adding a separate force-complete action (two buttons for one intent).

## Consequences

- A Rated Match can rate on one Organizer's word. "Report a wrong score" (ADR-0011) is the correction path, under the same eligibility rule.
- A final Match settled by an Organizer reads "Confirmed by the Organizer" instead of "Confirmed by all four players", with no confirmation date.
