import { z } from "zod";

import { SPORTS } from "@repo/domain/sport";

export const sportSchema = z.enum(SPORTS);
