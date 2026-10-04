import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GroupCreateForm } from "~/components/groups/group-create-form";
import type { GroupCreateContext } from "@repo/domain/group-create";

function render(context: GroupCreateContext) {
  return renderToStaticMarkup(
    createElement(GroupCreateForm, {
      context,
      idPrefix: "test",
      pending: false,
      onSubmit: () => undefined,
    }),
  );
}

describe("GroupCreateForm", () => {
  it("has one submit button", () => {
    for (const context of ["loose", "club"] as const) {
      const submits = render(context).match(/type="submit"/g) ?? [];
      expect(submits).toHaveLength(1);
    }
  });

  it("orders Type, then approval, then image, then submit", () => {
    const html = render("club");
    const type = html.indexOf('for="test-type"');
    const approval = html.indexOf('for="test-requires-approval"');
    const image = html.indexOf('for="test-image"');
    const submit = html.indexOf('type="submit"');

    expect(type).toBeGreaterThan(-1);
    expect(type).toBeLessThan(approval);
    expect(approval).toBeLessThan(image);
    expect(image).toBeLessThan(submit);
  });

  it("names the submit for the context", () => {
    expect(render("loose")).toContain("Create Group");
    expect(render("club")).toContain("Create Club Group");
  });
});
