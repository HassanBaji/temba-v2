# Padel Teams — settled decisions

Status: grilling in progress (round 1 settled; round 2 open). Spec not written yet.

## Round 1 (settled)

1. **Team identity**: New domain entity **Team**, separate from **Group**. (Not a size-capped Group.)
2. **Community attachment**: Optional Community parent — **Club Team** (has Community) or **Loose Team** (none). Parent chosen at create; immutable thereafter. Same shape as Groups / ADR-0004.
3. **When a Team exists**: Creator creates with themselves as the only member; pending invite for the second seat; seat fills on accept. Incomplete Teams are allowed.
4. **Multiplicity / uniqueness**: A User may belong to many Teams. At most one Team per unordered pair of Users **globally** (not scoped per Community).
5. **Invite doors (v1)**: Both in-app invite to an existing User **and** Email invite. (Invite link not chosen in round 1.)
6. **Stats (v1)**: Ship Team entity + invite + stats UI backed by stored counters (games played, wins, losses, and related). Counters stay at 0 until a later Game-completion slice updates them.
7. **Sport**: Team has a sport field from the start. App UI stays padel-only (same lock as Groups/Communities); tRPC may still accept football when allowed.

## Glossary

Terms **Team**, **Club Team**, **Loose Team**, and **Game team** recorded in root `CONTEXT.md`. Soft-archive wording for Club Teams is still open (round 2).

## Round 2

Open — see grilling session / agent transcript.
