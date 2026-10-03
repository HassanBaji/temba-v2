import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function requireLiveClubCommunity(
  database: DbClient,
  communityId: string,
) {
  const view = await consult(database, { communityId });
  refuseIfFrozen(view, "host", {
    frozenMessage: "Cannot invite into a Group in an archived Community",
  });
}
