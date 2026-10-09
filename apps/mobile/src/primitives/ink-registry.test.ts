import { describe, expect, it, vi } from "vitest";

import { createInkRegistry } from "./ink-registry";

describe("createInkRegistry", () => {
  it("stays quiet for one ink Surface", () => {
    const warn = vi.fn();
    createInkRegistry(warn).register();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns when a second ink Surface registers", () => {
    const warn = vi.fn();
    const registry = createInkRegistry(warn);
    registry.register();
    registry.register();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("allows a new ink Surface once the first has unmounted", () => {
    const warn = vi.fn();
    const registry = createInkRegistry(warn);
    const release = registry.register();
    release();
    release();
    registry.register();
    expect(warn).not.toHaveBeenCalled();
  });
});
