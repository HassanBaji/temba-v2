import { sizes } from "@repo/design-tokens";
import { describe, expect, it } from "vitest";

import { buttonGeometry, type ButtonSize } from "./button-target";

describe("buttonGeometry", () => {
  it.each(["sm", "default", "lg", "icon"] as ButtonSize[])(
    "keeps the %s button touchable at the 44-point target",
    (size) => {
      const { height, hitSlop } = buttonGeometry(size);
      expect(height + hitSlop * 2).toBeGreaterThanOrEqual(sizes.touchTarget);
    },
  );
});
