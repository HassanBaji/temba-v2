"use client";

import { use } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { CourtsTab } from "./courts-tab";
import { DetailsTab } from "./details-tab";

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
      </TabsList>
      <TabsContent value="details" className="space-y-6">
        <DetailsTab venueId={venueId} />
      </TabsContent>
      <TabsContent value="courts" className="space-y-6">
        <CourtsTab venueId={venueId} />
      </TabsContent>
    </Tabs>
  );
}
