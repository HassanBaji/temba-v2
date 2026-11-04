"use client";

import {
  LockIcon,
  LockOpenIcon,
  LogOutIcon,
  Share2Icon,
  UserRoundPlusIcon,
} from "lucide-react";
import type { RefObject } from "react";

import {
  GameActionsSheet,
  type GameActionsSheetRow,
} from "~/components/games/game-actions-sheet";
import {
  CLOSE_REGISTRATION_ACTION,
  REOPEN_REGISTRATION_ACTION,
} from "@repo/domain/game-copy";
import type { FriendlyGameOverflowItem } from "@repo/domain/friendly-game-cta";

/**
 * Organizer overflow menu (game-details redesign, TEM-184 note: "Edit Game",
 * "Cancel Game", and "Leave" no longer render here — those destructive/editing
 * actions live only in the new bottom-of-page organiser actions footer. This
 * menu now carries only the non-destructive registration/invite tools plus
 * "Leave waitlist", a distinct action from "Leave Game" that this ticket does
 * not touch.
 */
export function FriendlyGameOverflowMenu({
  items,
  title,
  description,
  triggerRef,
  triggerClassName,
  closePending,
  reopenPending,
  onCloseRegistration,
  onReopenRegistration,
  onInvite,
  onShare,
  onLeaveWaitlist,
}: {
  items: FriendlyGameOverflowItem[];
  title: string;
  description?: string | null;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  triggerClassName?: string;
  closePending: boolean;
  reopenPending: boolean;
  onCloseRegistration: () => void;
  onReopenRegistration: () => void;
  onInvite: () => void;
  onShare: () => void;
  onLeaveWaitlist: () => void;
}) {
  const rowFor = (item: FriendlyGameOverflowItem): GameActionsSheetRow => {
    switch (item) {
      case "close_registration":
        return {
          key: item,
          label: CLOSE_REGISTRATION_ACTION,
          icon: LockIcon,
          disabled: closePending,
          onSelect: onCloseRegistration,
        };
      case "reopen_registration":
        return {
          key: item,
          label: REOPEN_REGISTRATION_ACTION,
          icon: LockOpenIcon,
          disabled: reopenPending,
          onSelect: onReopenRegistration,
        };
      case "invite":
        return {
          key: item,
          label: "Invite",
          icon: UserRoundPlusIcon,
          onSelect: onInvite,
        };
      case "share":
        return {
          key: item,
          label: "Share",
          icon: Share2Icon,
          onSelect: onShare,
        };
      case "leave_waitlist":
        return {
          key: item,
          label: "Leave waitlist",
          icon: LogOutIcon,
          tone: "danger",
          onSelect: onLeaveWaitlist,
        };
    }
  };

  return (
    <GameActionsSheet
      title={title}
      description={description}
      triggerRef={triggerRef}
      triggerClassName={triggerClassName}
      groups={[
        items.filter((item) => item !== "leave_waitlist").map(rowFor),
        items.filter((item) => item === "leave_waitlist").map(rowFor),
      ]}
    />
  );
}
