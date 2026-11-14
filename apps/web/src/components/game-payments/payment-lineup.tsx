"use client";

import type { PaymentMark } from "@repo/domain/game-payments";
import { initials } from "@repo/domain/initials";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import { PaymentBox, PaymentSectionHead } from "./payment-card";
import { PaymentLegend, PaymentMarkIcon } from "./payment-mark";
import type { TrackedGamePayments } from "./use-game-payments";

const COLLAPSED_ROWS = 5;
const LEGEND_ORDER: readonly PaymentMark[] = ["paid", "claimed", "due", "free"];

/**
 * What everyone sees on the Game: the mark next to each name, no amounts or
 * notes (design Payments 2c). The Organizer gets a way into the full list.
 */
export function PaymentLineup({
  payments,
  manageHref,
}: {
  payments: TrackedGamePayments;
  manageHref?: string;
}) {
  const m = useMessages().gamePayments;
  const [expanded, setExpanded] = React.useState(false);
  if (payments.players.length === 0) {
    return null;
  }
  const rows = expanded
    ? payments.players
    : payments.players.slice(0, COLLAPSED_ROWS);
  const hidden = payments.players.length - rows.length;
  const present = new Set(payments.players.map((row) => row.mark));

  return (
    <section
      aria-labelledby="payments-lineup-title"
      className="flex flex-col gap-2.5"
    >
      <PaymentSectionHead
        id="payments-lineup-title"
        title={m.organizer.title}
        meta={m.lineup.paidCount(payments.tally.paid, payments.tally.payers)}
      />
      <PaymentBox>
        <ul>
          {rows.map((row) => {
            const name = row.isViewer ? m.organizer.you : row.name;
            return (
              <li
                key={row.userId}
                className="border-rule flex items-center gap-[11px] border-t px-4 py-2.5 first:border-t-0"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-eyebrow flex size-8 shrink-0 items-center justify-center rounded-[9px] border font-semibold",
                    row.isViewer
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-paper text-ink",
                  )}
                >
                  {initials(row.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{name}</span>
                  <span className="text-eyebrow text-muted-foreground block">
                    {m.mark[row.mark]}
                  </span>
                </span>
                <PaymentMarkIcon mark={row.mark} />
              </li>
            );
          })}
        </ul>
        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="border-rule text-meta hover:bg-wash flex w-full items-center justify-between border-t px-4 py-3 font-semibold"
          >
            {m.lineup.more(hidden)}
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
        {manageHref ? (
          <Link
            href={manageHref}
            className="border-rule text-meta hover:bg-wash flex w-full items-center justify-between border-t px-4 py-3 font-semibold"
          >
            {m.lineup.manage}
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 rtl:-scale-x-100"
            />
          </Link>
        ) : null}
      </PaymentBox>
      <PaymentLegend marks={LEGEND_ORDER.filter((mark) => present.has(mark))} />
    </section>
  );
}
