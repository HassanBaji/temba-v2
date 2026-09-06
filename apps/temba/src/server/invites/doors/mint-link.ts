import {
  communityInviteLinks,
  gameInviteLinks,
  groupInviteLinks,
  teamInviteLinks,
} from "@repo/db";

import { isUniqueViolation } from "~/server/db/is-unique-violation";
import { writeDb } from "~/server/invites/doors/helpers/write-db";
import { inviteLinkExpiresAt } from "~/server/invites/invite-link-expiry";
import {
  createGameInviteShortCode,
  createOpaqueToken,
} from "~/server/invites/tokens";
import { assertInviteOpen } from "~/server/invites/doors/consult";
import type {
  InviteDb,
  InviteHost,
  MintLinkResult,
} from "~/server/invites/doors/utils";

const INVITE_SHORT_CODE_ATTEMPTS = 8;

type ShortCodeLinkRow = {
  id: string;
  token: string;
  shortCode: string | null;
  createdAt: Date;
  expiresAt: Date;
};

async function insertLinkWithShortCode(
  insert: (shortCode: string) => Promise<ShortCodeLinkRow | undefined>,
): Promise<MintLinkResult> {
  for (let attempt = 0; attempt < INVITE_SHORT_CODE_ATTEMPTS; attempt++) {
    try {
      const created = await insert(createGameInviteShortCode());
      if (!created?.shortCode) {
        return { ok: false, reason: "insert_failed" };
      }
      return {
        ok: true,
        link: {
          id: created.id,
          token: created.token,
          shortCode: created.shortCode,
          createdAt: created.createdAt,
          expiresAt: created.expiresAt,
        },
      };
    } catch (error) {
      if (
        !isUniqueViolation(error) ||
        attempt === INVITE_SHORT_CODE_ATTEMPTS - 1
      ) {
        if (isUniqueViolation(error)) {
          return { ok: false, reason: "insert_failed" };
        }
        throw error;
      }
    }
  }
  return { ok: false, reason: "insert_failed" };
}

export async function mintLink(
  database: InviteDb,
  host: InviteHost,
  args: { createdBy: string },
): Promise<MintLinkResult> {
  const open = await assertInviteOpen(database, host, "mint");
  if (!open.ok) {
    return open;
  }
  const createdAt = new Date();
  const values = {
    createdBy: args.createdBy,
    token: createOpaqueToken(),
    createdAt,
    expiresAt: inviteLinkExpiresAt(createdAt),
  };

  if (host.kind === "community") {
    const [created] = await writeDb(database)
      .insert(communityInviteLinks)
      .values({ ...values, communityId: host.id })
      .returning();
    if (!created) {
      return { ok: false, reason: "insert_failed" };
    }
    return {
      ok: true,
      link: {
        id: created.id,
        token: created.token,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
      },
    };
  }
  if (host.kind === "group") {
    return insertLinkWithShortCode(async (shortCode) => {
      const [created] = await writeDb(database)
        .insert(groupInviteLinks)
        .values({
          ...values,
          token: createOpaqueToken(),
          shortCode,
          groupId: host.id,
        })
        .returning();
      return created;
    });
  }
  if (host.kind === "team") {
    const [created] = await writeDb(database)
      .insert(teamInviteLinks)
      .values({ ...values, teamId: host.id })
      .returning();
    if (!created) {
      return { ok: false, reason: "insert_failed" };
    }
    return {
      ok: true,
      link: {
        id: created.id,
        token: created.token,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
      },
    };
  }
  return insertLinkWithShortCode(async (shortCode) => {
    const [created] = await writeDb(database)
      .insert(gameInviteLinks)
      .values({
        ...values,
        token: createOpaqueToken(),
        shortCode,
        gameId: host.id,
      })
      .returning();
    return created;
  });
}
