"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { useRequestAnswers } from "~/components/requests/request-answers-provider";
import {
  RequestList,
  RequestRowItem,
} from "~/components/requests/request-card";
import {
  homeRequestsView,
  waitingCountLabel,
  waitingNextLine,
} from "@repo/domain/waiting-requests";
import { REQUESTS_HREF } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";

import { SectionTitle } from "./section-title";

/** Home 1a: the most urgent request first, under the line the last answer left. */
export function HomeRequests() {
  const m = useMessages();
  const locale = useLocale();
  const { rows } = useRequestAnswers();
  const view = homeRequestsView(rows);
  if (!view.visible) {
    return null;
  }
  const next = waitingNextLine(view.rest, locale);
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle
        title={m.requests.title}
        meta={waitingCountLabel(view.waitingCount, locale)}
      />
      <RequestList>
        {view.last ? (
          <RequestRowItem key={view.last.request.id} row={view.last} />
        ) : null}
        {view.current ? (
          <RequestRowItem
            key={view.current.id}
            row={{ request: view.current, answer: null }}
          />
        ) : null}
        {next ? (
          <Link
            href={REQUESTS_HREF}
            className={cn(
              "hover:bg-wash flex min-h-12 items-center justify-between gap-3 px-4 py-3 transition-colors",
              "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
            )}
          >
            <span className="text-meta text-muted-foreground min-w-0 truncate">
              {next}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 font-semibold">
              {m.requests.all}
              <ArrowRight
                aria-hidden="true"
                className="size-4 rtl:-scale-x-100"
              />
            </span>
          </Link>
        ) : null}
      </RequestList>
    </section>
  );
}
