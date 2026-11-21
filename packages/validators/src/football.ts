import { z } from "zod";

import {
  FOOTBALL_BIBS,
  FOOTBALL_POSITIONS,
  FOOTBALL_ROLES,
} from "@repo/domain/football-lineup";

export const footballRoleSchema = z.enum(FOOTBALL_ROLES);

export const footballPositionSchema = z.enum(FOOTBALL_POSITIONS);

/** The two Football sides and their bibs, as Make teams sends them to publish or save as a draft. */
export const footballSidesInputSchema = z.object({
  bibs: z.object({
    slot1: z.enum(FOOTBALL_BIBS),
    slot2: z.enum(FOOTBALL_BIBS),
  }),
  slot1: z.array(z.string().uuid()).max(40),
  slot2: z.array(z.string().uuid()).max(40),
});

/** Each side's Side captain by User, or null for none (ADR-0108). */
export const footballSideCaptainsInputSchema = z.object({
  slot1: z.string().uuid().nullable(),
  slot2: z.string().uuid().nullable(),
});
