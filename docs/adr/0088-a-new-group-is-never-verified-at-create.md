# A new Group is never Verified at create

**Status:** accepted. Amends [ADR-0035](./0035-rated-and-public-games-need-a-verified-group.md).

ADR-0035 let a creator with the Clerk `groupCreator` flag get a Verified Group at create, to keep the staff flow from before Verified Groups. That made verification a side effect of who pressed Create, not a decision about the Group. A Group made by staff for testing, or on someone's behalf, could host Rated Games and public Games without anyone choosing that.

## Decision

- `groups.createLoosePublic` and `groups.createLoosePrivate` never set `verified_at` or `verified_by`, whatever the caller's public metadata says.
- An Operator verifies a Group only through `groups.setVerified`, after it exists. A Club Group stays Verified through its Venue link.
- Procedure inputs and outputs are unchanged.

## Consequences

- A Group created by staff plays Unrated, private Games until an Operator verifies it.
- Groups already verified at create keep their verification. An Operator removes it with `groups.setVerified` where it is not wanted.
