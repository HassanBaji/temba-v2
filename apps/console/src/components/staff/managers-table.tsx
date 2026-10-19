"use client";

import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ActionMenuItem } from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { PersonMonogram } from "./person-monogram";
import { managerSubtitle, type ViewerIdentity } from "./staff-model";

type Manager = {
  id: string;
  userId: string;
  name: string;
  username: string | null;
  image: string | null;
};

const rowGrid = "grid grid-cols-[1.6fr_120px_40px] items-center gap-3";

export function ManagersTable({
  venueId,
  managers,
  viewer,
  canRemove,
}: {
  venueId: string;
  managers: readonly Manager[];
  viewer: ViewerIdentity;
  canRemove: boolean;
}) {
  const utils = api.useUtils();
  const [removeUserId, setRemoveUserId] = React.useState<string | null>(null);

  const removeManager = api.venues.removeManager.useMutation({
    onSuccess: async () => {
      toast.success("Venue manager removed");
      await utils.venues.managedById.invalidate({ venueId });
      await utils.venues.listManaged.invalidate();
    },
  });

  const removeName =
    managers.find((manager) => manager.userId === removeUserId)?.name ??
    "this User";

  return (
    <>
      <section
        aria-label="Venue managers"
        className="border-border rounded-card overflow-hidden border text-[13px]"
      >
        <div
          aria-hidden="true"
          className={cn(rowGrid, "border-border border-b px-[18px] py-3")}
        >
          <span className="eyebrow-mono">Person</span>
          <span className="eyebrow-mono">Role</span>
          <span />
        </div>

        {managers.length === 0 ? (
          <p className="text-muted-foreground px-[18px] py-[13px]">
            No Venue managers yet.
          </p>
        ) : null}

        <ul className="divide-border divide-y">
          {managers.map((manager) => {
            const subtitle = managerSubtitle(manager, viewer);
            return (
              <li
                key={manager.id}
                className={cn(rowGrid, "px-[18px] py-[13px]")}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <PersonMonogram name={manager.name} image={manager.image} />
                  <span className="min-w-0">
                    <span className="block truncate">{manager.name}</span>
                    {subtitle ? (
                      <span className="text-muted-foreground block truncate">
                        {subtitle}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span>
                  <span className="border-ink inline-flex rounded-[6px] border px-[7px] py-0.5 text-[11px] leading-4">
                    Manager
                  </span>
                </span>
                <span className="flex justify-end">
                  {canRemove ? (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger
                        aria-label={`Actions for ${manager.name}`}
                        className="text-muted-foreground hover:bg-wash focus-visible:ring-ring/50 rounded-block flex size-8 items-center justify-center outline-none focus-visible:ring-[3px]"
                      >
                        <MoreHorizontal aria-hidden="true" className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="z-[60] min-w-40"
                      >
                        <ActionMenuItem
                          variant="destructive"
                          onSelect={() => setRemoveUserId(manager.userId)}
                        >
                          Remove
                        </ActionMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <ConfirmDialog
        open={removeUserId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveUserId(null);
          }
        }}
        title={`Remove ${removeName}?`}
        description="They lose access to this Venue's console."
        confirmLabel="Remove Venue manager"
        pending={removeManager.isPending}
        onConfirm={async () => {
          if (!removeUserId) {
            return;
          }
          await removeManager.mutateAsync({ venueId, userId: removeUserId });
        }}
      />
    </>
  );
}
