"use client";

import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";

import { ClosuresCard } from "./closures-tab";
import { WeeklyHoursCard } from "./opening-hours-tab";

export function HoursClosuresScreen() {
  return (
    <ConsolePage className="gap-[26px]">
      <PageHeader
        title="Hours & closures"
        description="Opening hours set what players can book. Closures block courts without touching the hours."
      />
      <div className="grid grid-cols-[1.1fr_1fr] items-start gap-[22px]">
        <WeeklyHoursCard />
        <ClosuresCard />
      </div>
    </ConsolePage>
  );
}
