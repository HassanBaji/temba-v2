"use client";

import { useEffect, useState } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { RadioRow } from "~/components/groups/group-form-parts";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { groupMemberTableCaption } from "@repo/domain/group-members-table";
import {
  groupTransferCandidates,
  groupTransferConfirmLabel,
  groupTransferOwnershipCopy,
} from "@repo/domain/group-settings";

export type TransferCandidate = {
  userId: string;
  name: string | null;
  image: string | null;
  isViewer: boolean;
  unclaimed: boolean;
  isOrganizer: boolean;
  lastPlayedAt: Date | string | null | undefined;
  joinedAt: Date | string | null | undefined;
};

export function TransferOwnershipSheet({
  open,
  groupName,
  members,
  pending,
  onTransfer,
  onOpenChange,
}: {
  open: boolean;
  groupName: string | null;
  members: readonly TransferCandidate[];
  pending: boolean;
  onTransfer: (member: { userId: string; name: string }) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [pickedId, setPickedId] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setPickedId(null);
    }
  }, [open]);
  const copy = groupTransferOwnershipCopy(groupName, locale);
  const candidates = groupTransferCandidates(members);
  const picked = candidates.find((member) => member.userId === pickedId);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent showCloseButton>
        <ResponsiveDialogHeader className="pe-14">
          <ResponsiveDialogTitle>{copy.title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {copy.description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-3.5 px-4 pb-4 md:px-0 md:pb-0">
          {candidates.length === 0 ? (
            <p className="text-meta text-muted-foreground">{copy.empty}</p>
          ) : (
            <div
              role="radiogroup"
              aria-label={copy.title}
              className="border-rule divide-rule flex max-h-[50vh] flex-col divide-y overflow-y-auto rounded-[16px] border"
            >
              {candidates.map((member) => {
                const name = member.name ?? m.community.memberFallback;
                return (
                  <RadioRow
                    key={member.userId}
                    title={name}
                    description={groupMemberTableCaption(member, locale)}
                    selected={member.userId === pickedId}
                    disabled={pending}
                    onSelect={() => setPickedId(member.userId)}
                    leading={
                      <UserAvatar name={name} image={member.image} size="lg" />
                    }
                  />
                );
              })}
            </div>
          )}
          <Button
            type="button"
            size="lg"
            pending={pending}
            disabled={!picked}
            onClick={() => {
              if (picked) {
                onTransfer({
                  userId: picked.userId,
                  name: picked.name ?? m.community.memberFallback,
                });
              }
            }}
            className="w-full font-semibold"
          >
            {groupTransferConfirmLabel(picked?.name ?? null, locale)}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
