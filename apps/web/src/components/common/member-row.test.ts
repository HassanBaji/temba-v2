import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MemberRow } from "~/components/common/member-row";

function render(props: Parameters<typeof MemberRow>[0]) {
  return renderToStaticMarkup(createElement(MemberRow, props));
}

describe("MemberRow", () => {
  it("keeps the viewer's name and adds the You tag", () => {
    const html = render({ name: "Sofia Lindqvist", isViewer: true });

    expect(html).toContain("Sofia Lindqvist");
    expect(html).toMatch(/>You<\/span>/);
  });

  it("shows no You tag for other members", () => {
    const html = render({ name: "Omar Haddad" });

    expect(html).not.toMatch(/>You<\/span>/);
  });

  it("draws a round avatar", () => {
    const html = render({ name: "Omar Haddad" });

    expect(html).toContain('data-slot="avatar"');
    expect(html).toContain("rounded-full");
    expect(html).not.toContain("rounded-md");
  });

  it("puts the badge and trailing actions after the name", () => {
    const html = render({
      name: "Omar Haddad",
      meta: "omar@example.com",
      badge: createElement("span", null, "Creator"),
      trailing: createElement("button", { type: "button" }, "Remove"),
    });

    expect(html).toContain("omar@example.com");
    expect(html.indexOf("Omar Haddad")).toBeLessThan(html.indexOf("Creator"));
    expect(html.indexOf("Creator")).toBeLessThan(html.indexOf("Remove"));
  });

  it("renders a button row only when it can be selected", () => {
    expect(render({ name: "Omar Haddad" })).not.toContain("<button");
    expect(
      render({ name: "Omar Haddad", onSelect: () => undefined }),
    ).toContain("<button");
  });

  it("renders a link row when it has an href", () => {
    const html = render({
      name: "Omar Haddad",
      href: "/dashboard/groups/abc/members/user_1",
    });

    expect(html).toContain('href="/dashboard/groups/abc/members/user_1"');
    expect(html).not.toContain("<button");
  });
});
