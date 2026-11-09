"use client";

import { Plus } from "lucide-react";
import * as React from "react";

import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

import { BookingRulesCard } from "./booking-settings-tab";
import { CancellationPolicyCard } from "./cancellation-policy-tab";
import { inkButtonClass } from "./classes";
import { AddCourtDialog, CourtCards } from "./courts-tab";
import { RateCard } from "./pricing-tab";

export function CourtsPricingScreen() {
  const m = useMessages().consoleCourts;
  const [adding, setAdding] = React.useState(false);

  return (
    <ConsolePage className="gap-[26px]">
      <PageHeader
        title={m.pageTitle}
        description={m.pageDescription}
        action={
          <Button
            type="button"
            className={inkButtonClass}
            onClick={() => setAdding(true)}
          >
            <Plus aria-hidden="true" className="size-[15px]" />
            {m.addCourt}
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
