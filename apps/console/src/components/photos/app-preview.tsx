"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import type { ManagedVenue } from "~/components/console/managed-venue-context";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";
import {
  venueCardImage,
  venuePageImage,
  type VenueBannerImage,
} from "@repo/domain/venue-photos";

import {
  courtCountLabel,
  fromPriceLabel,
  openToLabel,
  todayWindows,
} from "./app-preview-model";

export type AppPreviewScreen = "list" | "page";

/** Sizes follow the mobile App: a 375pt-wide screen, a 120pt card banner, a 200pt page banner. */
const PHONE_WIDTH = 375;
const CARD_BANNER_HEIGHT = 120;
const PAGE_BANNER_HEIGHT = 200;

function Banner({
  image,
  height,
  children,
}: {
  image: VenueBannerImage;
  height: number;
  children?: ReactNode;
}) {
  return (
    <div
      className="bg-wash relative flex items-center justify-center overflow-hidden"
      style={{ height }}
    >
      {image.kind === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element -- previews the exact bytes the App loads
        <img
          src={image.url}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : image.kind === "logo" ? (
        // eslint-disable-next-line @next/next/no-img-element -- previews the exact bytes the App loads
        <img
          src={image.url}
          alt=""
          className="w-[60%] object-contain"
          style={{ height: height * 0.6 }}
        />
      ) : (
        <Hatch className="absolute inset-0" />
      )}
      {children}
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="border-border text-meta rounded-md border px-2.5 py-[5px]">
      {children}
    </span>
  );
}

function VenueListPreview({ venue, now }: { venue: ManagedVenue; now: Date }) {
  const windows = todayWindows(venue.openingHours, now);
  const open = windows.length > 0;
  const price = fromPriceLabel(venue.pricingRules);

  return (
    <div className="flex flex-col gap-3 px-[22px] pb-6 pt-5">
      <p className="font-expanded text-h1">Book a court</p>
      <div className="border-border text-muted-foreground text-meta rounded-control flex h-10 items-center border px-3">
        Area or venue
      </div>
      <div className="border-border bg-paper overflow-hidden rounded-[16px] border">
        <Banner image={venueCardImage(venue)} height={CARD_BANNER_HEIGHT}>
          <span
            className={cn(
              "text-eyebrow rounded-xs absolute bottom-3 left-3 border px-2 py-[3px] font-mono",
              open
                ? "border-ink bg-ink text-paper"
                : "border-border bg-paper text-muted-foreground",
            )}
          >
            {openToLabel(windows)}
          </span>
        </Banner>
        <div className="border-border flex flex-col gap-1 border-t p-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-lead truncate font-semibold">{venue.name}</p>
            {price ? (
              <p className="text-meta shrink-0">
                <span className="text-muted-foreground">from </span>
                <span className="font-semibold">{price}</span>
                <span className="text-muted-foreground">/h</span>
              </p>
            ) : null}
          </div>
          <p className="text-meta text-muted-foreground truncate">
            {`${venue.city} / ${courtCountLabel(venue.courts.length)}`}
          </p>
        </div>
      </div>
      <Hatch className="block h-[120px] rounded-[16px] opacity-60" />
    </div>
  );
}

function VenuePagePreview({ venue, now }: { venue: ManagedVenue; now: Date }) {
  const windows = todayWindows(venue.openingHours, now);

  return (
    <div>
      <Banner image={venuePageImage(venue)} height={PAGE_BANNER_HEIGHT}>
        <span className="border-border bg-paper absolute left-[22px] top-4 flex size-10 items-center justify-center rounded-full border">
          <ChevronLeft aria-hidden="true" className="size-5" />
        </span>
      </Banner>
      <div className="flex flex-col gap-3 px-[22px] pb-6 pt-5">
        <p className="font-expanded text-h1">{venue.name}</p>
        <p className="text-meta text-muted-foreground">
          {[venue.city, venue.country].filter(Boolean).join(", ")}
        </p>
        {venue.description ? (
          <p className="text-meta line-clamp-4">{venue.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Pill>{courtCountLabel(venue.courts.length)}</Pill>
          <Pill>{openToLabel(windows)}</Pill>
        </div>
        <p className="text-eyebrow text-muted-foreground mt-2 font-mono uppercase">
          Day
        </p>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((key) => (
            <Hatch key={key} className="block h-14 w-[62px] rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A phone-sized mock of where the main and details photos show in the mobile App. */
export function AppPreview({
  venue,
  screen,
  now,
}: {
  venue: ManagedVenue;
  screen: AppPreviewScreen;
  now: Date;
}) {
  return (
    <div
      role="img"
      aria-label={
        screen === "list"
          ? "Preview of your venue card in the App's venue list"
          : "Preview of the top of your venue page in the App"
      }
      className="border-ink bg-paper mx-auto w-full overflow-hidden rounded-[28px] border"
      style={{ maxWidth: PHONE_WIDTH }}
    >
      <div aria-hidden="true">
        {screen === "list" ? (
          <VenueListPreview venue={venue} now={now} />
        ) : (
          <VenuePagePreview venue={venue} now={now} />
        )}
      </div>
    </div>
  );
}
