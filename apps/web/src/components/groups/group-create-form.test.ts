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
  it("has one submit button, disabled until the Group has a name", () => {
    for (const context of ["loose", "club"] as const) {
      const html = render(context);
      const submits = html.match(/<button[^>]*type="submit"[^>]*>/g) ?? [];
      expect(submits).toHaveLength(1);
      expect(submits[0]).toContain("disabled");
    }
  });

  it("orders photo and name, then Sport, Visibility, Joining, then submit", () => {
    const html = render("loose");
    const photo = html.indexOf('aria-label="Add photo"');
    const name = html.indexOf('for="test-name"');
    const sport = html.indexOf('id="test-sport-label"');
    const visibility = html.indexOf('id="test-visibility-label"');
    const approval = html.indexOf('id="test-requires-approval"');
    const submit = html.indexOf('type="submit"');

    expect(photo).toBeGreaterThan(-1);
    expect(photo).toBeLessThan(name);
    expect(name).toBeLessThan(sport);
    expect(sport).toBeLessThan(visibility);
    expect(visibility).toBeLessThan(approval);
    expect(approval).toBeLessThan(submit);
  });

  it("names the submit for the context until a name is typed", () => {
    expect(render("loose")).toContain("Create Group");
    expect(render("club")).toContain("Create Club Group");
  });

  it("can hide the Sport picker for a Community with one sport", () => {
    const html = renderToStaticMarkup(
      createElement(GroupCreateForm, {
        context: "club",
        idPrefix: "test",
        sports: ["padel"],
        showSportPicker: false,
        pending: false,
        onSubmit: () => undefined,
      }),
    );
    expect(html).not.toContain('id="test-sport-label"');
  });
});
