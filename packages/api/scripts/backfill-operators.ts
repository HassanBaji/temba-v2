/**
 * Copies Clerk's `publicMetadata.operator` onto `user.is_operator` for every
 * Clerk User, once, for the accounts Clerk has not sent a user.updated for
 * since the column shipped (ADR-0075). After that the Clerk webhook keeps the
 * column in step. Safe to rerun: each run writes what Clerk says now.
 *
 * Needs CLERK_SECRET_KEY and DATABASE_URL (read from .env if present).
 *
 * Run: pnpm --filter @repo/api db:backfill-operators
 */
import { createClerkClient } from "@clerk/backend";
import { and, eq, inArray } from "drizzle-orm";

import { user } from "@repo/db";

import { isOperatorPublicMetadata } from "#src/auth/require-operator";
import { db } from "#src/db";

const CLERK_USER_PAGE = 500;

function databaseHost() {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "an unknown host";
  }
}

async function setOperator(clerkIds: string[], isOperator: boolean) {
  if (clerkIds.length === 0) {
    return 0;
  }
  const rows = await db
    .update(user)
    .set({ isOperator })
    .where(
      and(inArray(user.clerkId, clerkIds), eq(user.isOperator, !isOperator)),
    )
    .returning({ id: user.id });
  return rows.length;
}

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set");
  }
  const clerk = createClerkClient({ secretKey });
  console.log(`Copying the Operator flag from Clerk into ${databaseHost()}…`);

  const operators: string[] = [];
  let granted = 0;
  let revoked = 0;
  for (let offset = 0; ; offset += CLERK_USER_PAGE) {
    const page = await clerk.users.getUserList({
      limit: CLERK_USER_PAGE,
      offset,
    });
    const operatorIds = page.data
      .filter((clerkUser) => isOperatorPublicMetadata(clerkUser.publicMetadata))
      .map((clerkUser) => clerkUser.id);
    const otherIds = page.data
      .filter((clerkUser) => !operatorIds.includes(clerkUser.id))
      .map((clerkUser) => clerkUser.id);
    operators.push(...operatorIds);
    granted += await setOperator(operatorIds, true);
    revoked += await setOperator(otherIds, false);
    if (page.data.length < CLERK_USER_PAGE) {
      break;
    }
  }

  console.log(`Clerk lists ${operators.length} Operators.`);
  console.log(`Marked ${granted} Users as Operators, cleared ${revoked}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
