"use client";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";

export function CommunityCreateGroupDialog({
  open,
  onOpenChange,
  pending,
  publicPending,
  privatePending,
  onCreatePublic,
  onCreatePrivate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  publicPending: boolean;
  privatePending: boolean;
  onCreatePublic: (name: string) => void;
  onCreatePrivate: (name: string) => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create Club Group</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Owner or Admin only. Sport is padel.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-8 px-4 pb-4 md:px-0 md:pb-0">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const nameValue = formData.get("name");
              if (typeof nameValue !== "string") {
                return;
              }
              const name = nameValue.trim();
              if (!name) {
                return;
              }
              onCreatePublic(name);
              event.currentTarget.reset();
            }}
          >
            <h3 className="text-title font-semibold">Club Group Public</h3>
            <p className="text-body text-muted-foreground">
              Open to Community members. You join as a Group member.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                name="name"
                required
                maxLength={255}
                placeholder="Group name"
                className="min-h-11 flex-1"
              />
              <Button type="submit" className="min-h-11" disabled={pending}>
                {publicPending ? "Creating…" : "Create Public"}
              </Button>
            </div>
          </form>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const nameValue = formData.get("name");
              if (typeof nameValue !== "string") {
                return;
              }
              const name = nameValue.trim();
              if (!name) {
                return;
              }
              onCreatePrivate(name);
              event.currentTarget.reset();
            }}
          >
            <h3 className="text-title font-semibold">Club Group Private</h3>
            <p className="text-body text-muted-foreground">
              Owner or Admin can send Lookup invites and copy Invite links. The
              Group creator may Lookup existing Members only.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                name="name"
                required
                maxLength={255}
                placeholder="Group name"
                className="min-h-11 flex-1"
              />
              <Button type="submit" className="min-h-11" disabled={pending}>
                {privatePending ? "Creating…" : "Create Private"}
              </Button>
            </div>
          </form>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
