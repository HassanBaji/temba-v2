"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { GroupCreateForm } from "~/components/groups/group-create-form";

export function CommunityCreateGroupDialog({
  open,
  onOpenChange,
  pending,
  error,
  onCreatePublic,
  onCreatePrivate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error?: { message: string; data?: { zodError?: unknown } | null } | null;
  onCreatePublic: (
    name: string,
    requiresApproval: boolean,
    image: File | null,
  ) => void;
  onCreatePrivate: (name: string, image: File | null) => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create Club Group</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            A padel Group inside this Community.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="px-4 pb-4 md:px-0 md:pb-0">
          <GroupCreateForm
            context="club"
            idPrefix="club-group"
            pending={pending}
            error={error}
            onSubmit={(values) => {
              if (values.type === "private") {
                onCreatePrivate(values.name, values.image);
                return;
              }
              onCreatePublic(
                values.name,
                values.requiresApproval,
                values.image,
              );
            }}
          />
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
