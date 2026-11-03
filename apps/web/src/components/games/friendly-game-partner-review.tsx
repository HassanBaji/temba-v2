"use client";

import { useEffect, useState } from "react";

import { UserAvatar } from "~/components/common/user-avatar";
import type { FriendlyGamePartnerPick } from "~/components/games/friendly-game-partner-picker";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { BackButton } from "~/components/ui/nav-icon-button";
import {
  partnerPlayerMeta,
  partnerReviewDetails,
  partnerReviewGameLine,
  seedPartnerCallerPosition,
} from "@repo/domain/friendly-game-partner";
import type { LevelBand } from "@repo/domain/level-bands";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

type SeatPosition = "left" | "right";

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
        "text-body flex items-center justify-between px-5 py-4",
        !first && "border-rule border-t",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="text-ink text-end">{value}</span>
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
  const locale = useLocale();
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2.5 rounded-xl px-3.5 py-4",
        emphasized ? "border-ink border" : "border-rule border",
      )}
    >
      <UserAvatar name={name} image={image} size="sm" className="shrink-0" />
      <p className="text-body truncate font-semibold">{name}</p>
      <p className="text-muted-foreground text-eyebrow">
        {partnerPlayerMeta({ levelBand, position, locale })}
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
  pricePerPlayerFils,
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
  pricePerPlayerFils?: number | null;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  pending: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onRegister: (position: SeatPosition) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const copy = m.game.joinSheet.partnerReview;
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
  const details = partnerReviewDetails({
    isOrganizer,
    pricePerPlayerFils,
    levelMinTenths,
    levelMaxTenths,
    locale,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-rule shrink-0 border-b px-[22px] pb-0 pt-[22px]">
        <div className="flex items-center justify-between">
          <BackButton variant="boxed" onClick={onBack} />
          <p className="text-muted-foreground text-meta">
            {m.webGame.partnerReview.stepTwoOfTwo}
          </p>
          <span className="size-11" aria-hidden="true" />
        </div>
        <h2 className="font-expanded text-h1-lg mt-6 leading-none tracking-[-0.03em]">
          {copy.title}
        </h2>
        <p className="text-meta mt-2.5 leading-relaxed">
          {partnerReviewGameLine({ windowStart, venueName, locale })}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[26px] overflow-y-auto overscroll-contain px-[22px] pt-[22px]">
        {errorMessage ? <FormErrorSummary message={errorMessage} /> : null}

        <section>
          <h3 className="font-expanded text-title pb-2.5 leading-tight">
            {copy.yourTeam}
          </h3>
          <div className="flex gap-2">
            <PlayerCard
              name={m.common.you}
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
            aria-label={m.webGame.partnerReview.seatSides}
          >
            <button
              type="button"
              aria-pressed={callerPosition === "left"}
              onClick={() => {
                setTouched(true);
                setCallerPosition("left");
              }}
              className={cn(
                "text-body flex-1 py-[15px] font-semibold outline-none",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                callerPosition === "left"
                  ? "bg-ink text-paper"
                  : "text-muted-foreground",
              )}
            >
              {copy.keepSides}
            </button>
            <button
              type="button"
              aria-pressed={callerPosition === "right"}
              onClick={() => {
                setTouched(true);
                setCallerPosition("right");
              }}
              className={cn(
                "border-rule text-body flex-1 border-s py-[15px] font-semibold outline-none",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                callerPosition === "right"
                  ? "bg-ink text-paper"
                  : "text-muted-foreground",
              )}
            >
              {copy.swapSides}
            </button>
          </div>
        </section>

        {details.length > 0 ? (
          <div className="border-rule rounded-card overflow-hidden border">
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

      <div className="border-rule bg-background mt-[22px] flex shrink-0 flex-col gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => onRegister(callerPosition)}
        >
          {pending ? m.webGame.registering : copy.register}
        </Button>
        <p className="text-muted-foreground text-eyebrow text-center leading-relaxed">
          {copy.footnote}
        </p>
      </div>
    </div>
  );
}
