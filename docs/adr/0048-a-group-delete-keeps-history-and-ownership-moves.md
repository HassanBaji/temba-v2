# A Group delete keeps history, and ownership can move

**Status:** accepted. Extends ADR-0047, which left deleting with the creator.

Deleting a Group used to be a hard delete allowed only while the Group had no Games and no members besides the creator. A Group that had been played in could never be closed, and a creator who stopped playing could neither leave nor hand the Group on: `leave` let them walk away from a Group that still named them as its creator on every door.

## Decision

- **Delete is a Soft-delete.** `groups` gains `deleted_at` and `deleted_by`. `groups.delete` sets them for any Group the owner (or Owner and Admin on a Club Group) chooses to delete, whatever it holds. `requireGroup` and every Group list and Invite link door skip a deleted row, so the Group is gone for everyone. Memberships, the standing and the Games stay in the database, so `games.listMyMatchHistory`, player profiles and ratings keep every played Game. Games that had not started yet are cancelled through the same `cancelGameRecord` the organizer's Cancel uses. Nobody is notified. There is no undo door; an Operator can clear the columns by hand.
- **The Group owner is a term.** The creator owns the Group. Owning is what lets a User edit the Group (`groups.edit`: name, sport until the first Game, visibility and Require approval in one save), reset its Invite link (`groups.resetInviteLink`, which expires every live link), transfer it and delete it. Appointed Organizers run the Group and never own it; `groups.byId` reports `isOwner`, `canEdit`, `canTransferOwnership`, `canChangeSport` and `canDelete` beside the approver flags.
- **Ownership transfers.** `groups.transferOwnership` moves `created_by` to another member who is on Temba (a Community Member on a Club Group). The previous owner stays and becomes an Appointed Organizer, so the people who ran Games keep running them. The owner of a Loose Group cannot Leave; `groups.leave` sends them to transfer or delete instead. A Club Group's creator may still leave, since Owner and Admin stand behind that Group.
- **Mobile puts all of this behind one menu.** Group home carries an Invite button and a More menu (Edit Group, Invite players, Copy Group link, Leave Group). Edit Group holds the photo, name, sport, visibility, joining, Invite link and the Ownership section with Transfer ownership and Delete Group. Delete asks for the Group name typed back. Every Group and member action opens as a bottom sheet with the same list style.

**Considered options**: keeping the hard delete and adding "archive" (two end states to explain, and a hard delete that could never be used on a real Group); deleting the membership rows too (loses who was in the Group for history views and makes an Operator restore impossible); letting the owner leave and promoting someone automatically (picks an owner nobody chose).

## Consequences

- `canDelete` is true for every Group an owner opens, so the web Group page now offers Delete on Groups with Games; it calls the same Soft-delete.
- `mine`, `mineLoose`, `listPublic`, `listForOperator`, `listCreateGroups`, the Community and Venue Group lists, Group link requests, the home carousel and the Invite link doors all filter `deleted_at`.
- The Group name is capped at 40 characters on the new screens and in `groups.edit`; the create doors keep their older limit for the web form.
- A new Drizzle migration (`0071_group_soft_delete`) adds the two columns.
