import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RequestRow } from "~/components/invites/request-row";

function render(props: Partial<Parameters<typeof RequestRow>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(RequestRow, {
      title: "Sofia Lindqvist",
      onApprove: () => undefined,
      onReject: () => undefined,
      ...props,
    }),
  );
}

describe("RequestRow", () => {
  it("names the requester on Approve and Reject", () => {
    const html = render();

    expect(html).toContain(
      'aria-label="Approve Sofia Lindqvist&#x27;s request"',
    );
    expect(html).toContain(
      'aria-label="Reject Sofia Lindqvist&#x27;s request"',
    );
  });

  it("keeps the confirmation closed until Reject is pressed", () => {
    const html = render();

    expect(html).not.toContain("Reject Sofia Lindqvist&#x27;s request?");
    expect(html).not.toContain('role="dialog"');
  });

  it("shows only the pending action as busy", () => {
    const html = render({ rejectPending: true });

    expect(html).toContain("Rejecting…");
    expect(html).not.toContain("Approving…");
    expect(html.match(/aria-busy="true"/g)).toHaveLength(1);
  });

  it("leaves an idle row enabled", () => {
    const html = render();

    expect(html).not.toMatch(/<button[^>]*\sdisabled=""/);
    expect(html).not.toContain('aria-busy="true"');
  });
});
