"use client";

import { Fragment, type RefObject } from "react";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import type { FriendlyGameOverflowItem } from "~/lib/friendly-game-cta";

export function FriendlyGameOverflowMenu({
  items,
  triggerRef,
  closePending,
  reopenPending,
  onEdit,
  onCloseRegistration,
  onReopenRegistration,
  onInvite,
  onShare,
  onLeave,
  onLeaveWaitlist,
  onCancelGame,
}: {
  items: FriendlyGameOverflowItem[];
  triggerRef?: RefObject<HTMLButtonElement | null>;
  closePending: boolean;
  reopenPending: boolean;
  onEdit: () => void;
  onCloseRegistration: () => void;
  onReopenRegistration: () => void;
  onInvite: () => void;
  onShare: () => void;
  onLeave: () => void;
  onLeaveWaitlist: () => void;
  onCancelGame: () => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ActionMenu triggerRef={triggerRef} label="Game actions">
      {items.map((item, index) => {
        const previous = items[index - 1];
        const showSeparator =
          item === "cancel_game" ||
          ((item === "leave" || item === "leave_waitlist") &&
            previous != null &&
            previous !== "leave" &&
            previous !== "leave_waitlist");

        return (
          <Fragment key={item}>
            {showSeparator ? <ActionMenuSeparator /> : null}
            {item === "edit" ? (
              <ActionMenuItem onSelect={onEdit}>Edit Game</ActionMenuItem>
            ) : null}
            {item === "close_registration" ? (
              <ActionMenuItem
                disabled={closePending}
                onSelect={onCloseRegistration}
              >
                Close registration
              </ActionMenuItem>
            ) : null}
            {item === "reopen_registration" ? (
              <ActionMenuItem
                disabled={reopenPending}
                onSelect={onReopenRegistration}
              >
                Reopen registration
              </ActionMenuItem>
            ) : null}
            {item === "invite" ? (
              <ActionMenuItem onSelect={onInvite}>Invite</ActionMenuItem>
            ) : null}
            {item === "share" ? (
              <ActionMenuItem onSelect={onShare}>Share</ActionMenuItem>
            ) : null}
            {item === "leave" ? (
              <ActionMenuItem variant="destructive" onSelect={onLeave}>
                Leave
              </ActionMenuItem>
            ) : null}
            {item === "leave_waitlist" ? (
              <ActionMenuItem variant="destructive" onSelect={onLeaveWaitlist}>
                Leave waitlist
              </ActionMenuItem>
            ) : null}
            {item === "cancel_game" ? (
              <ActionMenuItem variant="destructive" onSelect={onCancelGame}>
                Cancel Game
              </ActionMenuItem>
            ) : null}
          </Fragment>
        );
      })}
    </ActionMenu>
  );
}
