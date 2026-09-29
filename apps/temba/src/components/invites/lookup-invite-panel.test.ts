import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LookupInvitePanel } from "~/components/invites/lookup-invite-panel";

const invites = [
  {
    id: "invite-a",
    createdAt: new Date("2026-09-01T10:00:00Z"),
    user: { id: "user-a", name: "Sofia Lindqvist", email: "sofia@example.com" },
  },
  {
    id: "invite-b",
    createdAt: new Date("2026-09-02T10:00:00Z"),
    user: { id: "user-b", name: "+46701234567", email: null },
  },
];

function render(revokePendingId?: string) {
  return renderToStaticMarkup(
    createElement(LookupInvitePanel, {
      lookupInvites: invites,
      sendPending: false,
      revokePendingId,
      searchQuery: "",
      onSearchQueryChange: () => undefined,
      searchResults: undefined,
      canSend: false,
      onSendUserIds: () => undefined,
      onRevokeLookup: () => undefined,
    }),
  );
}

function revokeButton(html: string, name: string) {
  const match = new RegExp(
    `<button[^>]*aria-label="Revoke invite for ${name.replace("+", "\\+")}"[^>]*>.*?</button>`,
  ).exec(html);
  expect(match).not.toBeNull();
  return match![0];
}

describe("LookupInvitePanel revoke", () => {
  it("names each invitee on its Revoke button", () => {
    const html = render();

    revokeButton(html, "Sofia Lindqvist");
    revokeButton(html, "+46701234567");
  });

  it("marks only the revoking row as pending", () => {
    const html = render("invite-b");
    const pending = revokeButton(html, "+46701234567");
    const idle = revokeButton(html, "Sofia Lindqvist");

    expect(pending).toContain('aria-busy="true"');
    expect(pending).toContain('disabled=""');
    expect(pending).toContain("Revoking…");
    expect(idle).not.toContain('disabled=""');
    expect(idle).not.toContain("Revoking…");
  });

  it("keeps the confirmation closed until Revoke is pressed", () => {
    const html = render();

    expect(html).not.toContain("Revoke the invite for");
  });

  it("drops the email line for a phone-only invitee", () => {
    const html = render();
    const rows = html.split('data-slot="list-row"').slice(1);
    const phoneRow = rows.find((row) => row.includes("+46701234567"));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("sofia@example.com");
    expect(phoneRow).toBeDefined();
    expect(phoneRow).not.toMatch(/<p class="[^"]*text-meta[^"]*"><\/p>/);
    expect(phoneRow?.match(/<p /g)).toHaveLength(1);
  });
});
