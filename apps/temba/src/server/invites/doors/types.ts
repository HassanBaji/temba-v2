import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";
import type { SeatPosition } from "~/server/games/seats";

type AppDb = typeof db;
type AppTx = Parameters<Parameters<AppDb["transaction"]>[0]>[0];

export type InviteDb = AppDb | AppTx | TestDatabase;

export type InviteHostKind = "community" | "group" | "team" | "game";

export type InviteHost = {
  kind: InviteHostKind;
  id: string;
};

export type InvitePhase = "mint" | "accept";

export type FrozenResult = { ok: false; reason: "frozen" | "not_found" };
export type OpenResult = { ok: true };

export type MintLookupResult =
  | {
      ok: true;
      invite: { id: string; hostId: string; userId: string; createdAt: Date };
    }
  | {
      ok: false;
      reason: "frozen" | "not_found" | "unused_exists" | "insert_failed";
    };

export type LookupListItem = {
  id: string;
  createdAt: Date;
  user: { id: string; name: string; email: string };
};

export type RevokeLookupResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "already_accepted" };

export type AcceptSeat = { sideIndex: number; position: SeatPosition };

export type AcceptLookupResult =
  | {
      ok: true;
      alreadyMember: boolean;
      waitlisted?: boolean;
      hostId: string;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "frozen"
        | "wrong_user"
        | "unavailable"
        | "seat_required"
        | "must_be_member";
    };

export type MintLinkResult =
  | {
      ok: true;
      link: {
        id: string;
        token: string;
        createdAt: Date;
        expiresAt: Date;
        shortCode?: string;
      };
    }
  | { ok: false; reason: "frozen" | "not_found" | "insert_failed" };

export type PreviewLinkResult =
  | { ok: true; status: "invalid" }
  | { ok: true; status: "unavailable" }
  | { ok: true; status: "ready"; name: string };

export type AcceptLinkResult =
  | {
      ok: true;
      alreadyMember: boolean;
      waitlisted?: boolean;
      waitingForPartner?: boolean;
      hostId: string;
    }
  | {
      ok: false;
      reason:
        | "not_found"
        | "frozen"
        | "unavailable"
        | "already_member"
        | "seat_required";
    };
