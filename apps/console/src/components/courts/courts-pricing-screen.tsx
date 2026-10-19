"use client";

import { Plus } from "lucide-react";
import * as React from "react";

import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";
import { Button } from "~/components/ui/button";

import { BookingRulesCard } from "./booking-settings-tab";
import { CancellationPolicyCard } from "./cancellation-policy-tab";
import { inkButtonClass } from "./classes";
import { AddCourtDialog, CourtCards } from "./courts-tab";
import { RateCard } from "./pricing-tab";

export function CourtsPricingScreen() {
  const [adding, setAdding] = React.useState(false);

  return (
    <ConsolePage className="gap-[26px]">
      <PageHeader
        title="Courts & pricing"
        description="Courts come from the Temba venue catalog. Pricing is yours: a rate per 60 minutes per time band, per court."
        action={
          <Button
            type="button"
            className={inkButtonClass}
            onClick={() => setAdding(true)}
          >
            <Plus aria-hidden="true" className="size-[15px]" />
            Add court
          </Button>
        }
      />
      <CourtCards />
      <div className="grid grid-cols-[1.5fr_1fr] items-start gap-[22px]">
        <RateCard />
        <div className="flex flex-col gap-3.5 self-stretch">
          <BookingRulesCard />
          <CancellationPolicyCard />
        </div>
      </div>
      <AddCourtDialog open={adding} onOpenChange={setAdding} />
    </ConsolePage>
  );
}
