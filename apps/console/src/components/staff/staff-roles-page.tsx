"use client";

import { useUser } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import * as React from "react";

import { ConsolePage } from "~/components/console/console-page";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { PageHeader } from "~/components/console/page-header";
import { Button } from "~/components/ui/button";

import { AddManagerDialog } from "./add-manager-dialog";
import { ManagerCapabilitiesCard } from "./manager-capabilities-card";
import { ManagersTable } from "./managers-table";

export function StaffRolesPage() {
  const venue = useManagedVenue();
  const { user } = useUser();
  const isOperator = user?.publicMetadata.operator === true;
  const [addOpen, setAddOpen] = React.useState(false);

  return (
    <ConsolePage>
      <PageHeader
        title="Staff & roles"
        description="Venue managers sign in with the same Temba account they play with."
        action={
          isOperator ? (
            <Button
              type="button"
              className="rounded-control h-10 min-h-10 px-4"
              onClick={() => setAddOpen(true)}
            >
              <Plus aria-hidden="true" className="size-[15px]" />
              Add manager
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 items-start gap-[22px] lg:grid-cols-[1.4fr_1fr]">
        <ManagersTable
          venueId={venue.id}
          managers={venue.managers}
          viewer={user ? { username: user.username } : null}
          canRemove={isOperator}
        />
        <ManagerCapabilitiesCard />
      </div>

      {isOperator ? (
        <AddManagerDialog
          venueId={venue.id}
          managers={venue.managers}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      ) : null}
    </ConsolePage>
  );
}
