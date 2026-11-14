"use client";

import { Hand, Wallet, type LucideIcon } from "lucide-react";

import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Switch } from "~/components/ui/switch";
import { createPaymentSummary } from "@repo/domain/game-payments";
import {
  formatMajorUnitsFromFils,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";
import type { Locale } from "@repo/i18n/locale";
import type { Messages } from "@repo/i18n/messages";

function pricedFils(price: string, locale: Locale) {
  const parsed = parseOptionalPricePerPlayerFils(price, locale);
  return parsed.ok ? (parsed.fils ?? 0) : 0;
}

function SwitchRow({
  id,
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-rule flex items-center gap-3 border-t px-4 py-3.5 first:border-t-0">
      <span
        aria-hidden="true"
        className="border-rule flex size-9 shrink-0 items-center justify-center rounded-md border"
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span id={`${id}-title`} className="text-body block font-semibold">
          {title}
        </span>
        <span
          id={`${id}-description`}
          className="text-eyebrow text-muted-foreground block"
        >
          {description}
        </span>
      </span>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      />
    </div>
  );
}

/**
 * Create step 4: Track payments, and on football whether keepers play free,
 * shown only once the Game has a price (design Payments 3a).
 */
export function PaymentTrackingField({
  idPrefix,
  price,
  football,
  playersAllowed,
  trackPayments,
  onTrackPayments,
  keepersPlayFree,
  onKeepersPlayFree,
}: {
  idPrefix: string;
  price: string;
  football: boolean;
  /** Seats that pay when the Game is full, before any keepers are left out. */
  playersAllowed: number;
  trackPayments: boolean;
  onTrackPayments: (value: boolean) => void;
  keepersPlayFree: boolean;
  onKeepersPlayFree: (value: boolean) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const copy = m.gamePayments.create;
  const fils = pricedFils(price, locale);
  if (fils <= 0) {
    return null;
  }
  const summary = createPaymentSummary(
    {
      priceFils: fils,
      playersAllowed,
      football,
      keepersPlayFree,
    },
    locale,
  );

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading id={`${idPrefix}-payments-label`} title={copy.whoPays} />
      <div className="border-rule bg-paper rounded-card overflow-hidden border">
        <SwitchRow
          id={`${idPrefix}-track-payments`}
          icon={Wallet}
          title={copy.trackTitle}
          description={copy.trackDescription}
          checked={trackPayments}
          onChange={onTrackPayments}
        />
        {football && trackPayments ? (
          <SwitchRow
            id={`${idPrefix}-keepers-play-free`}
            icon={Hand}
            title={copy.keepersTitle}
            description={copy.keepersDescription}
            checked={keepersPlayFree}
            onChange={onKeepersPlayFree}
          />
        ) : null}
      </div>
      {trackPayments ? (
        <div
          aria-live="polite"
          className="border-rule bg-wash rounded-xl border px-[18px] py-4"
        >
          <p className="text-eyebrow text-muted-foreground">{copy.toCollect}</p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="font-expanded text-display tabular-nums">
              {formatMajorUnitsFromFils(summary.totalFils)}
            </span>
            <span className="text-muted-foreground">
              {m.createGame.price.currency}
            </span>
          </p>
          <p className="border-dimrule text-meta text-muted-foreground mt-3 border-t pt-3">
            {summary.note}
          </p>
        </div>
      ) : (
        <p className="text-eyebrow text-muted-foreground">{copy.notTracked}</p>
      )}
    </section>
  );
}

/** The review card's Payments row, once the Game has a price. */
export function paymentReviewValue(
  args: {
    price: string;
    football: boolean;
    trackPayments: boolean;
    keepersPlayFree: boolean;
  },
  messages: Messages,
  locale: Locale,
) {
  if (pricedFils(args.price, locale) <= 0) {
    return null;
  }
  const copy = messages.gamePayments.create;
  if (!args.trackPayments) {
    return copy.reviewNotTracked;
  }
  return args.football && args.keepersPlayFree
    ? copy.reviewTrackedKeepersFree
    : copy.reviewTracked;
}
