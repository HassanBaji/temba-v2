import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "~/components/ui/button";

function render(props: Parameters<typeof Button>[0]) {
  return renderToStaticMarkup(createElement(Button, props));
}

describe("Button pending", () => {
  it("disables the button, marks it busy and shows a spinner with the pending label", () => {
    const html = render({
      pending: true,
      pendingLabel: "Signing in…",
      children: "Sign in",
    });

    expect(html).toMatch(/<button[^>]*\sdisabled=""/);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("animate-spin");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("Signing in…");
    expect(html).not.toContain(">Sign in<");
  });

  it("keeps the children when pending without a label", () => {
    const html = render({ pending: true, children: "Sign out" });

    expect(html).toContain("Sign out");
    expect(html).toContain("animate-spin");
  });

  it("renders an idle button without busy state or spinner", () => {
    const html = render({ children: "Sign in" });

    expect(html).not.toMatch(/<button[^>]*\sdisabled=""/);
    expect(html).not.toContain("aria-busy");
    expect(html).not.toContain("animate-spin");
  });

  it("stays disabled when disabled is set without pending", () => {
    const html = render({ disabled: true, children: "Verify" });

    expect(html).toMatch(/<button[^>]*\sdisabled=""/);
    expect(html).not.toContain("aria-busy");
  });
});

describe("Button sizes", () => {
  it.each([
    ["sm", "h-9"],
    ["default", "h-11"],
    ["lg", "h-13"],
  ] as const)("renders size %s at %s", (size, height) => {
    const html = render({ size, children: "Go" });

    expect(html).toContain(height);
  });
});
