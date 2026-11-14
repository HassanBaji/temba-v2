"use client";

import {
  paymentMark,
  viewerPaymentCard,
  type ViewerPayment,
} from "@repo/domain/game-payments";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { useNow } from "~/hooks/use-now";

import { PaymentMarkIcon } from "./payment-mark";

export function PaymentSectionHead({
  id,
  title,
  meta,
}: {
  id: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-title font-semibold">
        {title}
      </h2>
      {meta ? <p className="text-meta text-muted-foreground">{meta}</p> : null}
    </div>
  );
}

export function PaymentBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-rule bg-paper rounded-card overflow-hidden border">
      {children}
    </div>
  );
}

/** The viewer's share on a Game that tracks payments (design Payments 1a–1e, 3b). */
export function PaymentCard({
  payment,
  priceFils,
  pending,
  onClaim,
  onUnclaim,
}: {
  payment: ViewerPayment;
  priceFils: number;
  pending: boolean;
  onClaim: () => void;
  onUnclaim: () => void;
}) {
  const locale = useLocale();
  const m = useMessages().gamePayments;
  const now = useNow();
  const [claimOpen, setClaimOpen] = React.useState(false);
  const card = viewerPaymentCard(payment, priceFils, locale, now);
  const price = formatPricePerPlayerFils(priceFils, locale) ?? "";
  const canClaim = card.kind === "due" || card.kind === "returned";

  return (
    <section aria-labelledby="payment-title" className="flex flex-col gap-2.5">
      <PaymentSectionHead
        id="payment-title"
        title={m.member.title}
        meta={m.member.each(price)}
      />
      <PaymentBox>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <PaymentMarkIcon
            mark={paymentMark(payment.status, payment.free)}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{card.title}</p>
            <p className="text-eyebrow text-muted-foreground">{card.hint}</p>
          </div>
          {canClaim ? (
            <Button type="button" onClick={() => setClaimOpen(true)}>
              {m.member.claimAction}
            </Button>
          ) : null}
        </div>
        {card.kind === "claimed" ? (
          <p className="border-rule text-eyebrow text-muted-foreground border-t px-4 py-[11px]">
            {m.member.undoPrompt}{" "}
            <button
              type="button"
              disabled={pending}
              onClick={onUnclaim}
              className="text-ink underline underline-offset-2 disabled:opacity-50"
            >
              {m.member.undoAction}
            </button>
          </p>
        ) : card.kind === "paid" ? null : (
          <p className="border-rule text-eyebrow text-muted-foreground border-t px-4 py-[11px]">
            {card.note}
          </p>
        )}
      </PaymentBox>
      <ClaimDialog
        open={claimOpen}
        price={price}
        pending={pending}
        onOpenChange={setClaimOpen}
        onSubmit={() => {
          onClaim();
          setClaimOpen(false);
        }}
      />
    </section>
  );
}

/** One confirmation, then it goes to the Organizer (design Payments 1b). */
function ClaimDialog({
  open,
  price,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  price: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  const m = useMessages().gamePayments.claimSheet;
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{m.title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {m.description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-4 px-4 md:px-0">
          <PaymentBox>
            <dl>
              <div className="flex justify-between gap-3 px-4 py-3">
                <dt className="text-muted-foreground">{m.amount}</dt>
                <dd className="font-semibold tabular-nums">{price}</dd>
              </div>
              <div className="border-rule flex justify-between gap-3 border-t px-4 py-3">
                <dt className="text-muted-foreground">{m.to}</dt>
                <dd>{m.organizer}</dd>
              </div>
            </dl>
          </PaymentBox>
          <p className="text-eyebrow text-muted-foreground">{m.note}</p>
        </div>
        <ResponsiveDialogFooter>
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={pending}
            aria-busy={pending}
            onClick={onSubmit}
          >
            {m.submit}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
