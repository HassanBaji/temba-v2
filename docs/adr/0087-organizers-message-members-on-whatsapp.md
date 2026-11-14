# Organizers message members on WhatsApp

**Status:** accepted.

ADR-0078 gave Group approvers each member's number and a Call door on the Members tab. Organizers arrange play on WhatsApp more than on calls, and they reach for a player most often from the Game they are arranging, not from the Members tab. So they still copied numbers into WhatsApp by hand.

## Decision

- **A WhatsApp door sits beside Call.** It opens `https://wa.me/<digits>` (`whatsAppHref` in `@repo/domain/phone-number`) with no message filled in. On web it is a row in the member menu; on mobile it is a row in the member sheet.
- **Game rosters carry the number for the same audience.** `games.byId` and `games.footballBoard` send `phoneNumber` (E.164) on each player only when the viewer is a Group approver of the Game's Group, and only for players who are still members of that Group. The viewer's own row, a Game outside a Group and a Challenge Game get `null`. The rule lives in `gameMemberPhoneNumbers`.
- **The player dialog on a Game shows the WhatsApp door.** On web it is a button in the padel and football player dialogs; on mobile, in the played player sheet and the football player sheet. Organizers could already tap players there.
- **The field is additive.** `phoneMasked` is unchanged, so released mobile builds keep working.

## Consequences

- No one sees a number they could not already see on the Members tab, so Terms clause 5.8 covers it and no new notice is needed beyond the one ADR-0078 calls for.
- Leaving the Group stops the number going out on that Group's Games too, including Games already played.
- Tournament player sheets do not get the door yet: their read model does not carry the number.
