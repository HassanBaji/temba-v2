"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SectionTitle } from "~/components/home/section-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import { useRequestAnswers } from "~/components/requests/request-answers-provider";
import {
  RequestList,
  RequestRowItem,
  RequestsFootnote,
} from "~/components/requests/request-card";
import {
  notificationsRequestsView,
  waitingCountLabel,
} from "@repo/domain/waiting-requests";
import { REQUESTS_HREF } from "~/lib/dashboard-paths";

/** Notifications 2a: requests in their own section, answered in place. */
export function NotificationsRequests() {
  const m = useMessages();
  const locale = useLocale();
  const { rows } = useRequestAnswers();
  const view = notificationsRequestsView(rows);
  if (!view.visible) {
    return null;
  }
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle
        title={m.requests.title}
        meta={waitingCountLabel(view.waitingCount, locale)}
      />
      <RequestList>
        {view.rows.map((row) => (
          <RequestRowItem key={row.request.id} row={row} />
        ))}
        {view.moreCount > 0 ? (
          <Link
            href={REQUESTS_HREF}
            className="hover:bg-wash focus-visible:ring-ring/50 flex min-h-12 items-center justify-between gap-3 px-4 py-3 font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset"
          >
            {m.requests.moreRequests(view.moreCount)}
            <ArrowRight
              aria-hidden="true"
              className="size-4 rtl:-scale-x-100"
            />
          </Link>
        ) : null}
      </RequestList>
      <RequestsFootnote>{m.requests.notificationsNote}</RequestsFootnote>
    </section>
  );
}
