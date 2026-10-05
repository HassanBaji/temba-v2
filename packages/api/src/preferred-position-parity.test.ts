import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { USER_PREFERRED_POSITION_VALUES } from "@repo/db/schema";
import { PREFERRED_POSITIONS } from "@repo/domain/preferred-position";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const positionsMatchSchemaType: Equal<
  (typeof PREFERRED_POSITIONS)[number],
  (typeof USER_PREFERRED_POSITION_VALUES)[number]
> = true;

describe("PREFERRED_POSITIONS", () => {
  it("lists the schema enum values in order", () => {
    assert.ok(positionsMatchSchemaType);
    assert.deepEqual(
      [...PREFERRED_POSITIONS],
      [...USER_PREFERRED_POSITION_VALUES],
    );
  });
});
