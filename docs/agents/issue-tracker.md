# Issue tracker: Linear tickets, local specs

Specs stay in this repo as markdown. Implementation tickets (and wayfinding issues) live in Linear.

Do not create a Linear issue for a spec. Do not write ticket files under `.scratch/` when publishing approved tickets.

## Specs (local)

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Comments and conversation history on a spec append under a `## Comments` heading

When a skill says **publish to the issue tracker** and the artifact is a **spec** (`/to-spec`): write or update `.scratch/<feature-slug>/spec.md`. Creating the directory if needed. Do not open a Linear issue for it.

When a skill says **fetch** a spec: read that path. The user will normally pass the path.

## Tickets (Linear)

Use a connected Linear MCP if one is available. Otherwise use Linear's GraphQL API at `https://api.linear.app/graphql` with `LINEAR_API_KEY` from the environment. Never commit the key. If neither MCP nor an API key is available, stop and ask to connect Linear before creating or fetching tickets.

Infer the Linear team from the connected workspace. If more than one team exists, ask which team to use.

Ticket identifiers are Linear issue ids (`TEAM-123`). Prefer the issue title in human-facing text, with the id and URL inside the name.

### Conventions

- **Create a ticket**: create a Linear issue (title, description, team). Publish in dependency order (blockers first) so blocking edges can reference real ids.
- **Read a ticket**: fetch the issue by identifier, including description, comments, labels, and `blockedBy` / `blocks` relations.
- **List tickets**: query the team's issues with state, labels, and blocking relations as needed.
- **Comment**: add a Linear comment on the issue.
- **Close**: move the issue to a completed/done state.
- **Blocking**: Linear's native issue relations. After creating the blocked ticket, create a `blocks` relation from each blocker to it. A ticket is unblocked when it has no open `blockedBy` relations.

Each Linear ticket body should use the issue template from `/to-tickets`: What to build, Acceptance criteria, Blocked by. Link the local spec (`.scratch/<feature-slug>/spec.md`) at the top when one exists.

### When a skill says "publish to the issue tracker"

If the artifact is an **implementation ticket** (`/to-tickets`): create a Linear issue. Use native `blocks` relations for blocking edges.

If the artifact is a **spec**: write the local spec file (see above). Do not create a Linear issue.

### When a skill says "fetch the relevant ticket"

Fetch the Linear issue by identifier (`TEAM-123` or URL). For a spec path, read the local file.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a Linear issue; **child** tickets are Linear issues related to it.

- **Map**: a Linear issue titled for the effort, labelled `wayfinder:map` if labels are in use, holding the Destination / Notes / Decisions-so-far / Fog body.
- **Child ticket**: a Linear issue, related to the map (parent/sub-issue if the workspace supports it; otherwise a `Part of TEAM-n` line at the top of the child body plus a link from the map). Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`) when labels are in use. Once claimed, assign the ticket to the driving user.
- **Blocking**: native Linear `blocks` relations. A ticket is unblocked when every blocker is completed.
- **Frontier query**: list the map's open children, drop any with an open blocker or an assignee; first in map order wins.
- **Claim**: assign the issue to the current user, the session's first write.
- **Resolve**: comment the answer, complete the issue, then append a context pointer to the map's Decisions-so-far.
