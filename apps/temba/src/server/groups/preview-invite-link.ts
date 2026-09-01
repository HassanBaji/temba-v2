import { previewLink } from "~/server/invites/doors";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function previewInviteLink(
  database: DbClient,
  args: { token: string },
) {
  const previewed = await previewLink(database, "group", args.token);
  if (previewed.status === "ready") {
    return { status: "ready" as const, groupName: previewed.name };
  }
  return { status: previewed.status };
}
