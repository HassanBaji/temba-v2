"use client";

import { use } from "react";

import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";
import { CustomersList } from "~/components/customers/customers-list";
import { useMessages } from "~/components/locale-provider";

export default function CustomersPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);
  const m = useMessages().consoleVenue.customers;

  return (
    <ConsolePage>
      <PageHeader title={m.title} description={m.description} />
      <CustomersList venueId={venueId} />
    </ConsolePage>
  );
}
