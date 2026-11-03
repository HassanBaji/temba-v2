import { groupOwnershipTransferredToast } from "@repo/domain/group-settings";
import { useState } from "react";

import { useLocale } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

/** The Transfer ownership sheet's state and door, for Group home and Edit Group. */
export function useGroupTransfer(
  groupId: string,
  groupName: string | null | undefined,
  onTransferred?: () => void,
) {
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const transfer = api.groups.transferOwnership.useMutation({
    onError: (error) => toast.show(error.message),
  });

  return {
    open,
    setOpen,
    pending: transfer.isPending,
    transfer: (member: { userId: string; name: string }) =>
      transfer.mutate(
        { groupId, userId: member.userId },
        {
          onSuccess: () => {
            setOpen(false);
            toast.show(
              groupOwnershipTransferredToast(member.name, groupName, locale),
            );
            void Promise.all([
              utils.groups.byId.invalidate({ id: groupId }),
              utils.groups.mine.invalidate(),
              utils.users.home.invalidate(),
            ]).then(() => onTransferred?.());
          },
        },
      ),
  };
}
