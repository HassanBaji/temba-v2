"use client";

import { use } from "react";

import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";
import { CustomersList } from "~/components/customers/customers-list";

export default function CustomersPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);

  return (
    <ConsolePage>
      <PageHeader
        title="Customers"
        description="Everyone who has booked here, in the app or at the desk. Guests are yours only."
      />
      <CustomersList venueId={venueId} />
    </ConsolePage>
  );
}
