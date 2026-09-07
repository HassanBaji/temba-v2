"use client";

import Link from "next/link";
import { Fragment, type RefObject } from "react";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import type { GroupHomeOverflowItem } from "~/lib/group-home-cta";

export function GroupHomeOverflowMenu({
  items,
  groupId,
  communityId,
  communityName,
  triggerRef,
  onCopyGroupUrl,
  onManageInvites,
  onLeave,
  onDelete,
}: {
  items: GroupHomeOverflowItem[];
  groupId: string;
  communityId: string | null;
  communityName: string | null;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  onCopyGroupUrl: () => void;
  onManageInvites: () => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ActionMenu triggerRef={triggerRef} label="Group actions">
      {items.map((item, index) => {
        const previous = items[index - 1];
        const showSeparator =
          (item === "leave" || item === "delete") &&
          previous != null &&
          previous !== "leave" &&
          previous !== "delete";

        return (
          <Fragment key={item}>
            {showSeparator ? <ActionMenuSeparator /> : null}
            {item === "open_community" && communityId ? (
              <ActionMenuItem asChild>
                <Link href={`/dashboard/communities/${communityId}`}>
                  Open {communityName ?? "Community"}
                </Link>
              </ActionMenuItem>
            ) : null}
            {item === "all_communities" ? (
              <ActionMenuItem asChild>
                <Link href="/dashboard/communities">All Communities</Link>
              </ActionMenuItem>
            ) : null}
            {item === "create_game" ? (
              <ActionMenuItem asChild>
                <Link href={`/dashboard/games/new?groupId=${groupId}`}>
                  Create Game
                </Link>
              </ActionMenuItem>
            ) : null}
            {item === "copy_group_url" ? (
              <ActionMenuItem onSelect={onCopyGroupUrl}>
                Copy Group URL
              </ActionMenuItem>
            ) : null}
            {item === "manage_invites" ? (
              <ActionMenuItem onSelect={onManageInvites}>
                Manage invites
              </ActionMenuItem>
            ) : null}
            {item === "leave" ? (
              <ActionMenuItem variant="destructive" onSelect={onLeave}>
                Leave Group
              </ActionMenuItem>
            ) : null}
            {item === "delete" ? (
              <ActionMenuItem variant="destructive" onSelect={onDelete}>
                Delete Group
              </ActionMenuItem>
            ) : null}
          </Fragment>
        );
      })}
    </ActionMenu>
  );
}
