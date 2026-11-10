import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PaymentBadge } from "~/components/bookings/payment-badge";
import { LocaleProvider } from "~/components/locale-provider";
import type { Locale } from "@repo/i18n/locale";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));
vi.mock("~/lib/set-locale-action", () => ({
  setLocaleAction: async () => undefined,
}));

function renderIn(locale: Locale, child: React.ReactElement) {
  return renderToStaticMarkup(
    createElement(LocaleProvider, { locale, children: child }),
  );
}

describe("LocaleProvider", () => {
  it("writes console copy in the request's language", () => {
    const badge = createElement(PaymentBadge, { status: "pending" });
    expect(renderIn("en", badge)).toContain("Unpaid");
    expect(renderIn("ar", badge)).toContain("غير مدفوع");
  });
});
