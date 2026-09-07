"use client";

import { Fragment, type RefObject } from "react";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import type { FriendlyGameOverflowItem } from "~/lib/friendly-game-cta";

/**
 * Organizer overflow menu (game-details redesign, TEM-184 note: "Edit game",
 * "Cancel game", and "Leave" no longer render here — those destructive/editing
 * actions live only in the new bottom-of-page organiser actions footer. This
 * menu now carries only the non-destructive registration/invite tools plus
 * "Leave waitlist", a distinct action from "Leave game" that this ticket does
 * not touch.
 */
export function FriendlyGameOverflowMenu({
  items,
  triggerRef,
  closePending,
  reopenPending,
  onCloseRegistration,
  onReopenRegistration,
  onInvite,
  onShare,
  onLeaveWaitlist,
}: {
  items: FriendlyGameOverflowItem[];
  triggerRef?: RefObject<HTMLButtonElement | null>;
  closePending: boolean;
  reopenPending: boolean;
  onCloseRegistration: () => void;
  onReopenRegistration: () => void;
  onInvite: () => void;
  onShare: () => void;
  onLeaveWaitlist: () => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ActionMenu triggerRef={triggerRef} label="Game actions">
      {items.map((item, index) => {
        const previous = items[index - 1];
        const showSeparator = item === "leave_waitlist" && previous != null;

        return (
          <Fragment key={item}>
            {showSeparator ? <ActionMenuSeparator /> : null}
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
            {item === "leave_waitlist" ? (
              <ActionMenuItem variant="destructive" onSelect={onLeaveWaitlist}>
                Leave waitlist
              </ActionMenuItem>
            ) : null}
          </Fragment>
        );
      })}
    </ActionMenu>
  );
}
