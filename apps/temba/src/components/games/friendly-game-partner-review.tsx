"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { UserAvatar } from "~/components/common/user-avatar";
import type { FriendlyGamePartnerPick } from "~/components/games/friendly-game-partner-picker";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { formatGameCardDay } from "~/lib/format-game-start";
import { seedPartnerCallerPosition } from "~/lib/friendly-game-partner";
import { formatHomeKickoff } from "~/lib/home-countdown";
import { displayLabelFromStoredBand, type LevelBand } from "~/lib/level-bands";
import { formatLevelRangeLabel } from "~/lib/level-range";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import { cn } from "~/lib/utils";

type SeatPosition = "left" | "right";

function seatPhrase(position: SeatPosition) {
  return position === "left" ? "left seat" : "right seat";
}

function gameLine(args: {
  windowStart?: Date | string | null;
  venueName?: string | null;
}) {
  const start =
    args.windowStart == null
      ? null
      : args.windowStart instanceof Date
        ? args.windowStart
        : new Date(args.windowStart);
  const venue = args.venueName?.trim();
  const when = start
    ? `${formatGameCardDay(start)}, ${formatHomeKickoff(start).time}${
        formatHomeKickoff(start).meridiem
          ? ` ${formatHomeKickoff(start).meridiem}`
          : ""
      }`
    : null;
  if (when && venue) {
    return `${when} at ${venue}. Two seats, one for each of you.`;
  }
  if (when) {
    return `${when}. Two seats, one for each of you.`;
  }
  if (venue) {
    return `Two seats at ${venue}, one for each of you.`;
  }
  return "Two seats, one for each of you.";
}

function playerMeta(args: {
  levelBand: LevelBand | null | undefined;
  position: SeatPosition;
}) {
  const seat = seatPhrase(args.position);
  if (args.levelBand) {
    return `${displayLabelFromStoredBand(args.levelBand)}, ${seat}`;
  }
  return seat;
}

function DetailRow({
  label,
  value,
  first,
}: {
  label: string;
  value: string;
  first: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 py-4 text-sm",
        !first && "border-rule border-t",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  );
}

function PlayerCard({
  name,
  image,
  levelBand,
  position,
  emphasized,
}: {
  name: string;
  image: string | null;
  levelBand: LevelBand | null | undefined;
  position: SeatPosition;
  emphasized: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2.5 rounded-xl px-3.5 py-4",
        emphasized ? "border-ink border" : "border-rule border",
      )}
    >
      <UserAvatar name={name} image={image} size="sm" className="shrink-0" />
      <p className="truncate text-[15px] font-semibold">{name}</p>
      <p className="text-muted-foreground text-xs">
        {playerMeta({ levelBand, position })}
      </p>
    </div>
  );
}

export function FriendlyGamePartnerReview({
  partner,
  viewerPreferredPosition,
  viewerLevelBand,
  windowStart,
  venueName,
  isOrganizer,
  pricePerPlayerCents,
  levelMinTenths,
  levelMaxTenths,
  pending,
  errorMessage,
  onBack,
  onRegister,
}: {
  partner: FriendlyGamePartnerPick;
  viewerPreferredPosition: string | null | undefined;
  viewerLevelBand?: LevelBand | null;
  windowStart?: Date | string | null;
  venueName?: string | null;
  isOrganizer?: boolean;
  pricePerPlayerCents?: number | null;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  pending: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onRegister: (position: SeatPosition) => void;
}) {
  const [touched, setTouched] = useState(false);
  const [callerPosition, setCallerPosition] = useState<SeatPosition>(() =>
    seedPartnerCallerPosition({
      viewerPreferred: viewerPreferredPosition,
      partnerPreferred: partner.preferredPosition,
    }),
  );

  useEffect(() => {
    if (touched) {
      return;
    }
    setCallerPosition(
      seedPartnerCallerPosition({
        viewerPreferred: viewerPreferredPosition,
        partnerPreferred: partner.preferredPosition,
      }),
    );
  }, [touched, viewerPreferredPosition, partner.preferredPosition]);

  const partnerPosition: SeatPosition =
    callerPosition === "left" ? "right" : "left";
  const priceLabel = formatPricePerPlayerCents(pricePerPlayerCents);
  const levelLabel = formatLevelRangeLabel(levelMinTenths, levelMaxTenths);
  const details: { label: string; value: string }[] = [];
  if (isOrganizer) {
    details.push({ label: "Organizer", value: "You" });
  }
  if (priceLabel) {
    details.push({ label: "Price per player", value: `${priceLabel} each` });
  }
  details.push({ label: "Counts for rating", value: "Yes, as a pair" });
  if (levelLabel) {
    details.push({ label: "Level", value: `${levelLabel}, you both fit` });
  }

  return (
    <div className="flex flex-col">
      <div className="border-rule border-b px-[22px] pb-0 pt-[22px]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="border-rule text-ink focus-visible:ring-ring/50 flex size-10 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px]"
            aria-label="Back"
          >
            <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
          <p className="text-muted-foreground text-[13px]">Step 2 of 2</p>
          <span className="size-10" aria-hidden="true" />
        </div>
        <h2 className="font-expanded mt-6 text-[32px] leading-none tracking-[-0.03em]">
          Register the team
        </h2>
        <p className="text-meta mt-2.5 leading-relaxed">
          {gameLine({ windowStart, venueName })}
        </p>
      </div>

      <div className="flex flex-col gap-[26px] px-[22px] pt-[22px]">
        {errorMessage ? <FormErrorSummary message={errorMessage} /> : null}

        <section>
          <h3 className="font-expanded pb-2.5 text-[19px] leading-tight">
            Your team
          </h3>
          <div className="flex gap-2">
            <PlayerCard
              name="You"
              image={null}
              levelBand={viewerLevelBand}
              position={callerPosition}
              emphasized
            />
            <PlayerCard
              name={partner.name}
              image={partner.image}
              levelBand={partner.levelBand}
              position={partnerPosition}
              emphasized={false}
            />
          </div>
          <div
            className="border-rule mt-2.5 flex overflow-hidden rounded-xl border"
            role="group"
            aria-label="Seat sides"
          >
            <button
              type="button"
              aria-pressed={callerPosition === "left"}
              onClick={() => {
                setTouched(true);
                setCallerPosition("left");
              }}
              className={cn(
                "flex-1 py-[15px] text-[15px] font-semibold outline-none",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                callerPosition === "left"
                  ? "bg-ink text-paper"
                  : "text-muted-foreground",
              )}
            >
              Keep sides
            </button>
            <button
              type="button"
              aria-pressed={callerPosition === "right"}
              onClick={() => {
                setTouched(true);
                setCallerPosition("right");
              }}
              className={cn(
                "border-rule flex-1 border-l py-[15px] text-[15px] font-semibold outline-none",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                callerPosition === "right"
                  ? "bg-ink text-paper"
                  : "text-muted-foreground",
              )}
            >
              Swap sides
            </button>
          </div>
        </section>

        {details.length > 0 ? (
          <div className="border-rule overflow-hidden rounded-[14px] border">
            {details.map((row, index) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={row.value}
                first={index === 0}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-rule mt-[22px] flex flex-col gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        <Button
          type="button"
          className="h-[52px] w-full"
          disabled={pending}
          onClick={() => onRegister(callerPosition)}
        >
          {pending ? "Registering…" : "Register us as a team"}
        </Button>
        <p className="text-dim text-center text-xs leading-relaxed">
          Both seats are booked straight away. Your partner is in now.
        </p>
      </div>
    </div>
  );
}
