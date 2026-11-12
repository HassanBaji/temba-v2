# A Group approver sees members' phone numbers

**Status:** accepted.

Organizers arrange Games over the phone and WhatsApp. Temba already holds every member's number, but a Group creator could see only a masked number (`+973 •••• 4408`), and only for an Unclaimed player. So Organizers asked members for their numbers outside the App.

## Decision

- **`groups.byId` sends `phoneNumber` (E.164) on each leaderboard entry to a Group approver**: the Group creator and Appointed Organizers (ADR-0047). It goes out for every member with a number, whether or not they have an account. Every other viewer gets `null`, including members, Venue managers and Operators.
- **The member menu shows the number and a Call door.** On web it is the row menu in Manage mode, with a `tel:` link. On mobile it is the member sheet, which opens for any member with a number. The list itself still shows only the masked number of an Unclaimed player, so a screen shared at the court does not show everyone's number.
- **`phoneMasked` is unchanged.** The field is additive, so released mobile builds keep working.
- **The Terms say so.** Clause 5.8 says who sees the number and limits its use to organizing play in that Group. Clause 10.4 names it under "Who sees it", and the Terms date moves to 12 November 2026.

## Consequences

- Joining a Group shares your number with its creator and Organizers. Leaving the Group stops that.
- Appointing an Organizer also hands them the number of every member.
- This is a significant change under Terms 17.2. Users must be told in the App or by email 14 days before it takes effect. This ADR does not send that notice.
