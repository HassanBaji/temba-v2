"use client";

import { use } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { BookingSettingsTab } from "./booking-settings-tab";
import { CancellationPolicyTab } from "./cancellation-policy-tab";
import { ClosuresTab } from "./closures-tab";
import { CourtsTab } from "./courts-tab";
import { DetailsTab } from "./details-tab";
import { OpeningHoursTab } from "./opening-hours-tab";

export default function ManageSettingsPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);

  return (
    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="courts">Courts</TabsTrigger>
        <TabsTrigger value="hours">Opening hours</TabsTrigger>
        <TabsTrigger value="closures">Closures</TabsTrigger>
        <TabsTrigger value="cancellation">Cancellation policy</TabsTrigger>
        <TabsTrigger value="booking">Booking settings</TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="space-y-6">
        <DetailsTab venueId={venueId} />
      </TabsContent>
      <TabsContent value="courts" className="space-y-6">
        <CourtsTab venueId={venueId} />
      </TabsContent>
      <TabsContent value="hours" className="space-y-6">
        <OpeningHoursTab venueId={venueId} />
      </TabsContent>
      <TabsContent value="closures" className="space-y-6">
        <ClosuresTab venueId={venueId} />
      </TabsContent>
      <TabsContent value="cancellation" className="space-y-6">
        <CancellationPolicyTab venueId={venueId} />
      </TabsContent>
      <TabsContent value="booking" className="space-y-6">
        <BookingSettingsTab venueId={venueId} />
      </TabsContent>
    </Tabs>
  );
}
