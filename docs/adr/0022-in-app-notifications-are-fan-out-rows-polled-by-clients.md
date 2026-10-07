# In-app Notifications are fan-out rows written in the event's transaction, and clients poll for them

Game admins and Group approvers need to hear about joins, leaves and finished Games, and players
need to hear that their Game finished. We store one `notifications` row per recipient, written in
the same transaction as the event by one shared module (`packages/api/src/notifications`).
Audiences are resolved at write time. The Game admin audience is the union of the Organizer and
Group approver rules, minus a Club Group creator who has left the Community, and empty while the
Community is Soft-archived. These exclusions decide who is notified, never who may act. Clients
poll an unread count, every 60 s on web while visible, and fetch the list on demand.

**Considered options.** (1) Fan-out on read: compute a User's feed from Groups and Games they run.
Rejected: needs per-type queries over many tables on every poll, and has no natural home for
per-User read state. (2) An outbox table plus a worker that fans out after commit. Rejected for
now: no job runner exists, and audiences are small. (3) SSE or WebSocket from Hono. Rejected for
now: the Next rewrite and several Railway instances would need Postgres LISTEN/NOTIFY or a broker,
and the product needs only about one minute of freshness. (4) Notify every current Organizer as
`isGameOrganizer` defines them. Rejected: it notifies Club Group creators who left the Community
and runs during Soft-archive. (5) Time-based Finished Game via a scheduler. Deferred, together with
Americano.

**Consequences.** A Notification exists only if its event committed. Phase 7 push can read the
same rows after commit, or hang off `notify()`, without changing the procedures. Changing roles
does not move existing Notifications. Moving to real-time later replaces polling on the client
only.
