import { z } from "zod";

import {
  FOOTBALL_POSITIONS,
  FOOTBALL_ROLES,
} from "@repo/domain/football-lineup";

export const footballRoleSchema = z.enum(FOOTBALL_ROLES);

export const footballPositionSchema = z.enum(FOOTBALL_POSITIONS);
