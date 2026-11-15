"use client";

import {
  paymentLineupGroups,
  type PaymentLineupGroup,
  type PaymentMark,
} from "@repo/domain/game-payments";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { useLocale, useMessages } from "~/components/locale-provider";

import { PaymentBox, PaymentSectionHead } from "./payment-card";
import { PaymentLegend, PaymentMarkIcon } from "./payment-mark";
import { PlayerTile } from "./player-tile";
import type { TrackedGamePayments } from "./use-game-payments";

const COLLAPSED_ROWS = 5;
const LEGEND_ORDER: readonly PaymentMark[] = ["paid", "claimed", "due", "free"];
const FOOTER_ROW =
  "text-meta hover:bg-wash flex w-full items-center justify-between px-4 py-3 font-semibold";

function LineupGroup({ group }: { group: PaymentLineupGroup }) {
  const m = useMessages().gamePayments;
  const [expanded, setExpanded] = React.useState(false);
  const rows = expanded ? group.rows : group.rows.slice(0, COLLAPSED_ROWS);
  const hidden = group.rows.length - rows.length;
  const headingId = `payments-lineup-${group.key}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <PaymentSectionHead
        id={headingId}
        title={group.title}
        meta={group.paidLine}
      />
      <PaymentBox>
        <ul>
          {rows.map((row) => (
            <li
              key={row.userId}
              className="border-rule flex items-center gap-[11px] border-t px-4 py-2.5 first:border-t-0"
            >
              <PlayerTile
                name={row.name}
                image={row.image}
                viewer={row.isViewer}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {row.displayName}
                </span>
                <span className="text-eyebrow text-muted-foreground block">
                  {row.subline}
                </span>
              </span>
              <PaymentMarkIcon mark={row.mark} />
            </li>
          ))}
        </ul>
        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`border-rule border-t ${FOOTER_ROW}`}
          >
            {m.lineup.more(hidden)}
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </PaymentBox>
    </section>
  );
}

/**
 * What everyone sees on the Game: each side's players with the mark next to
 * each name, no amounts or notes (design Payments 2c). The Organizer gets a
 * way into the full list.
 */
export function PaymentLineup({
  payments,
  manageHref,
}: {
  payments: TrackedGamePayments;
  manageHref?: string;
}) {
  const locale = useLocale();
  const m = useMessages().gamePayments;
  const groups = paymentLineupGroups(payments, locale);
  if (groups.length === 0) {
    return null;
  }
  const present = new Set(payments.players.map((row) => row.mark));

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <LineupGroup key={group.key} group={group} />
      ))}
      <PaymentLegend marks={LEGEND_ORDER.filter((mark) => present.has(mark))} />
      {manageHref ? (
        <PaymentBox>
          <Link href={manageHref} className={FOOTER_ROW}>
            {m.lineup.manage}
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 rtl:-scale-x-100"
            />
          </Link>
        </PaymentBox>
      ) : null}
    </div>
  );
}
