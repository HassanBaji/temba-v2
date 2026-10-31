# An Appointed Organizer is a Group approver

**Status:** accepted. Supersedes the "runs Games only" limit in ADR-0043.

ADR-0043 made Appointed Organizers run a Group's Games and nothing else. In practice the people who fill a Game's seats are the same people who bring players into the Group, approve requests and tidy the roster, and every one of those still went back to the creator.

## Decision

- **Appointed Organizers are Group approvers.** `isGroupApprover` and `groupApproverUserIds` include them, so every approver door opens: Require approval, Group join requests, adding players by phone, the Group image, Lookup invites and revoking unused ones, and `groups.setOrganizer` itself, so an Organizer may appoint or dismiss others.
- **The creator is untouchable.** A new `groups.removePlayer` door lets any Group approver remove any member, but never the Group creator and never themself (that is Leave). On a Club Group it also keeps Community Owner and Admin, who outrank every Group approver. `groups.removeUnclaimedPlayer` stays for older clients.
- **Club Group limits are the creator's limits.** An Appointed Organizer may Lookup-invite existing Community Members only and cannot mint a Club Group Invite link or add a non-Member by phone, because those auto-admit a Member seat, which stays with Owner and Admin. On a Loose Group they mint Invite links like the creator.
- **The appointment lapse applies.** On a Club Group every one of these powers exists only while the Organizer is a Community Member, the same rule `isAppointedOrganizer` already applied to Games.
- **Deleting and unlinking stay with the creator** (or Owner and Admin on a Club Group). Those end or move the Group rather than run it.

**Considered Options**: widening only the invite doors (asked for first, then found too narrow once Organizers were trusted with the roster); a separate "Group admin" role beside Organizer (two roles to appoint, explain and lapse, for one set of people).

## Consequences

- An Appointed Organizer now receives the Group join Notifications that reach Group approvers.
- `groups.byId` adds `canRemovePlayers` and reports the approver flags true for an Appointed Organizer; the web and mobile Members tabs show "Remove from Group" on every removable row, not only Unclaimed players.
- `requireLooseCreator` became `requireLooseInviter`.
- The Lookup invite notes on the Group page and Group create form name Organizers beside the creator.
