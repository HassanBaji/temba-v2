import { is, SQL } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import * as schema from "./index";

const USER_ACTOR =
  "Records who acted. Read through its own row; scanned only when a User is merged or deleted, which is rare.";
const USER_OWN =
  "The User's own row, read through another leading key; scanned only when a User is merged or deleted, which is rare.";
const RARE_PARENT =
  "The parent (a Venue, Court, Venue photo, Team or soft-deleted Group) is rarely hard-deleted, and nothing reads by this column alone.";
const PARTIAL_READS =
  "Every read also filters on the partial unique index's predicate, which serves it; the parent is rarely hard-deleted.";
const COACHING = "Coaching tables have no reader yet.";

/**
 * Foreign keys deliberately left without an index that leads with them.
 * Adding a foreign key means adding an index, or a line here saying why not.
 */
const ALLOWED_UNINDEXED: Record<string, string> = {
  "account.user_id": USER_OWN,
  "session.user_id": USER_OWN,
  "user.added_by_user_id": USER_ACTOR,
  "user_merges.survivor_user_id": USER_OWN,
  "level_overrides.set_by_user_id": USER_ACTOR,
  "group_members.nickname_updated_by_id": USER_ACTOR,
  "level_overrides.group_id": RARE_PARENT,
  "level_overrides.venue_id": RARE_PARENT,
  "group_rating_events.group_id":
    "Reads lead with user_id (user_id, group_id, created_at); Groups are soft-deleted.",
  "group_level_overrides.group_id":
    "Reads lead with user_id (user_id, group_id, created_at); Groups are soft-deleted.",
  "group_level_overrides.set_by_user_id": USER_ACTOR,
  "venues.cover_photo_id": RARE_PARENT,
  "venues.detail_photo_id": RARE_PARENT,
  "venues.partner_by": USER_ACTOR,
  "venue_managers.granted_by_user_id": USER_ACTOR,
  "venue_verifiers.granted_by_user_id": USER_ACTOR,
  "match_verifier_stamps.verifier_user_id": USER_ACTOR,
  "match_verifier_stamps.venue_id": RARE_PARENT,
  "match_disputes.raised_by_user_id": USER_ACTOR,
  "match_disputes.decided_by_user_id": USER_ACTOR,
  "venue_closures.court_id": RARE_PARENT,
  "venue_closures.created_by_user_id": USER_ACTOR,
  "venue_pricing_rules.court_id": RARE_PARENT,
  "bookings.user_id":
    "Reads use the partial (user_id, starts_at) index for non-null holders.",
  "bookings.cancelled_by_user_id": USER_ACTOR,
  "bookings.created_by_user_id": USER_ACTOR,
  "booking_payments.settled_by_user_id": USER_ACTOR,
  "booking_payments.refunded_by_user_id": USER_ACTOR,
  "coach.court_id": COACHING,
  "coach.added_by": COACHING,
  "coaching_session.coach_id": COACHING,
  "coaching_session.court_id": COACHING,
  "coaching_session_players.coaching_session_id": COACHING,
  "coaching_session_players.user_id": COACHING,
  "games.mvp_user_id": USER_ACTOR,
  "game_courts.court_id": RARE_PARENT,
  "matches.court_id": RARE_PARENT,
  "match_result_confirmations.user_id": USER_OWN,
  "game_team_players.side_set_by": USER_ACTOR,
  "match_goals.user_id": USER_OWN,
  "marks.giver_user_id": USER_OWN,
  "game_mvp_votes.voter_user_id": USER_OWN,
  "game_mvp_votes.candidate_user_id": USER_OWN,
  "game_member_invites.user_id": USER_OWN,
  "game_member_invites.invited_by": USER_ACTOR,
  "game_invite_links.created_by": USER_ACTOR,
  "game_invite_link_consents.team_id": RARE_PARENT,
  "game_invite_link_consents.user_id": USER_OWN,
  "game_level_range_requests.user_id": USER_OWN,
  "game_level_range_requests.decided_by": USER_ACTOR,
  "groups.venue_id": RARE_PARENT,
  "groups.created_by": USER_ACTOR,
  "groups.verified_by": USER_ACTOR,
  "groups.deleted_by": USER_ACTOR,
  "group_seasons.closed_by": USER_ACTOR,
  "group_seasons.created_by": USER_ACTOR,
  "teams.created_by": USER_ACTOR,
  "team_member_invites.team_id": PARTIAL_READS,
  "team_member_invites.user_id": USER_OWN,
  "team_member_invites.invited_by": USER_ACTOR,
  "team_email_invites.team_id": PARTIAL_READS,
  "team_email_invites.user_id": USER_OWN,
  "team_email_invites.invited_by": USER_ACTOR,
  "team_invite_links.team_id": RARE_PARENT,
  "team_invite_links.created_by": USER_ACTOR,
  "challenges.posted_by": USER_ACTOR,
  "challenges.nudge_team_id": RARE_PARENT,
  "challenges.confirmed_proposal_id":
    "Proposals are never deleted on their own; their Challenge cascades them.",
  "challenges.game_id":
    "Games are cancelled, not deleted; Challenge Games are found by games.challenge_id.",
  "challenge_venues.venue_id": RARE_PARENT,
  "challenge_proposals.proposed_by": USER_ACTOR,
  "challenge_proposals.venue_id": RARE_PARENT,
  "challenge_proposals.court_id": RARE_PARENT,
  "challenge_proposals.decided_by": USER_ACTOR,
  "group_member_invites.group_id": PARTIAL_READS,
  "group_member_invites.user_id": USER_OWN,
  "group_member_invites.invited_by": USER_ACTOR,
  "group_email_invites.group_id": PARTIAL_READS,
  "group_email_invites.user_id": USER_OWN,
  "group_email_invites.invited_by": USER_ACTOR,
  "group_invite_links.created_by": USER_ACTOR,
  "group_join_requests.decided_by": USER_ACTOR,
  "group_join_requests.invited_by": USER_ACTOR,
  "group_join_requests.held_game_id":
    "Games are cancelled, not deleted; holds are read through the request row.",
  "group_link_requests.group_id": PARTIAL_READS,
  "group_link_requests.venue_id": RARE_PARENT,
  "group_link_requests.requested_by": USER_ACTOR,
  "group_link_requests.decided_by": USER_ACTOR,
  "notifications.actor_user_id": USER_ACTOR,
  "notifications.partner_user_id": USER_ACTOR,
  "notifications.team_id": RARE_PARENT,
  "notifications.level_override_id":
    "Level overrides are deleted only by a User merge, which is rare.",
};

function columnName(column: unknown): string | null {
  if (is(column, SQL)) {
    return null;
  }
  if (column && typeof column === "object" && "name" in column) {
    return typeof column.name === "string" ? column.name : null;
  }
  return null;
}

/** Key column lists a lookup on the foreign key can use: full (not partial) indexes and constraints. */
function keyColumnLists(config: ReturnType<typeof getTableConfig>) {
  const lists: (string | null)[][] = [];
  for (const index of config.indexes) {
    if (!index.config.where) {
      lists.push(index.config.columns.map(columnName));
    }
  }
  for (const constraint of config.uniqueConstraints) {
    lists.push(constraint.columns.map((column) => column.name));
  }
  for (const key of config.primaryKeys) {
    lists.push(key.columns.map((column) => column.name));
  }
  for (const column of config.columns) {
    if (column.primary || column.isUnique) {
      lists.push([column.name]);
    }
  }
  return lists;
}

function foreignKeys() {
  return (Object.values(schema) as unknown[])
    .filter((value): value is PgTable => is(value, PgTable))
    .flatMap((table) => {
      const config = getTableConfig(table);
      const lists = keyColumnLists(config);
      return config.foreignKeys.map((foreignKey) => {
        const columns = foreignKey
          .reference()
          .columns.map((column) => column.name);
        return {
          key: `${config.name}.${columns.join(",")}`,
          indexed: lists.some((list) =>
            columns.every((name, position) => list[position] === name),
          ),
        };
      });
    });
}

describe("foreign key indexes", () => {
  const keys = foreignKeys();

  it("finds the schema's foreign keys", () => {
    expect(keys.length).toBeGreaterThan(100);
  });

  it("leads some full index with every foreign key, outside the allowlist", () => {
    const missing = keys
      .filter((key) => !key.indexed && !(key.key in ALLOWED_UNINDEXED))
      .map((key) => key.key);
    expect(missing).toEqual([]);
  });

  it("keeps the allowlist to foreign keys that exist and still lack an index", () => {
    const unindexed = new Set(
      keys.filter((key) => !key.indexed).map((key) => key.key),
    );
    const stale = Object.keys(ALLOWED_UNINDEXED).filter(
      (key) => !unindexed.has(key),
    );
    expect(stale).toEqual([]);
  });
});
