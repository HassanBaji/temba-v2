import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "~/components/ui/button";

function hasClass(html: string, name: string) {
  const classAttr = /class="([^"]*)"/.exec(html)?.[1] ?? "";
  return classAttr.split(/\s+/).includes(name);
}

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

describe("Button touch targets", () => {
  it("renders the icon size at 44px without a pseudo hit area", () => {
    const html = render({ size: "icon", "aria-label": "Close" });

    expect(html).toContain("size-11");
    expect(html).not.toContain("after:min-h-11");
  });

  it.each(["xs", "sm", "icon-xs", "icon-sm", "icon-lg"] as const)(
    "gives size %s a hit area of at least 44px",
    (size) => {
      const html = render({ size, "aria-label": "Go" });

      expect(hasClass(html, "relative")).toBe(true);
      expect(html).toContain("after:min-h-11");
      expect(html).toContain("after:min-w-11");
    },
  );

  it("lets a positioned caller replace the relative anchor", () => {
    const html = render({ size: "sm", className: "absolute", children: "Go" });

    expect(hasClass(html, "absolute")).toBe(true);
    expect(hasClass(html, "relative")).toBe(false);
    expect(html).toContain("after:min-h-11");
  });
});
