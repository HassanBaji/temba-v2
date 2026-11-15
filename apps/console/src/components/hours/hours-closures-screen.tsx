"use client";

import { ConsolePage } from "~/components/console/console-page";
import { useMessages } from "~/components/locale-provider";
import { PageHeader } from "~/components/console/page-header";

import { ClosuresCard } from "./closures-tab";
import { WeeklyHoursCard } from "./opening-hours-tab";

export function HoursClosuresScreen() {
  const m = useMessages().consoleHours;
  return (
    <ConsolePage className="gap-[26px]">
      <PageHeader title={m.pageTitle} description={m.pageDescription} />
      <div className="grid grid-cols-[1.1fr_1fr] items-start gap-[22px]">
        <WeeklyHoursCard />
        <ClosuresCard />
      </div>
    </ConsolePage>
  );
}
