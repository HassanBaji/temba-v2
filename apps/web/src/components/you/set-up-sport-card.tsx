"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { useMessages } from "~/components/locale-provider";
import { SPORTS } from "@repo/domain/sport";

import { SPORT_SETTINGS_HREF } from "./you-chips";
import { HeroCard } from "./level-hero";
import { YouCard } from "./you-section";

const SETUP_MINUTES = { padel: 2, football: 1 } as const;

/** No sport set up yet: pick one, with a hatched preview of what fills in. */
export function SetUpSportCard() {
  const m = useMessages();
  const copy = m.you.setup;
  const subs = { padel: copy.padelSub, football: copy.footballSub };

  return (
    <div className="grid gap-[26px] lg:grid-cols-2 lg:items-start">
      <HeroCard>
        <div className="flex flex-col gap-2">
          <h2 className="font-expanded text-h2">{copy.title}</h2>
          <p className="text-dim text-meta leading-[1.55]">{copy.body}</p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {SPORTS.map((sport) => (
            <li key={sport}>
              <Link
                href={SPORT_SETTINGS_HREF[sport]}
                className="border-dimrule hover:bg-raised focus-visible:ring-paper/50 flex items-center gap-3 rounded-xl border px-4 py-3.5 outline-none focus-visible:ring-[3px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-lead block font-semibold">
                    {copy[sport]}
                  </span>
                  <span className="text-dim text-eyebrow block">
                    {subs[sport]}
                  </span>
                </span>
                <span className="text-dim text-eyebrow shrink-0">
                  {copy.minutes(SETUP_MINUTES[sport])}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 rtl:-scale-x-100"
                />
              </Link>
            </li>
          ))}
        </ul>
      </HeroCard>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <p className="text-meta text-muted-foreground">{copy.preview}</p>
        <YouCard className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-4">
            <span className="border-rule size-12 shrink-0 rounded-full border-[5px]" />
            <div className="flex flex-1 flex-col gap-2">
              <span className="bg-wash h-2.5 w-2/3 rounded-full" />
              <span className="bg-wash h-2 w-1/2 rounded-full" />
            </div>
          </div>
          <span className="hatch block h-14 rounded-lg" />
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 10 }, (_, index) => (
              <span key={index} className="hatch block h-6 rounded-[6px]" />
            ))}
          </div>
        </YouCard>
      </div>
    </div>
  );
}
