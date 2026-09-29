import Link from "next/link";
import { PlusIcon, UserPlusIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { PageTitle } from "~/components/layout/page-title";
import { BackButton } from "~/components/ui/nav-icon-button";
import { TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  groupHomeBackTarget,
  groupHomeMetaLine,
} from "~/lib/group-home-chrome";
import type { GroupHomeTab } from "~/lib/group-home-tab";
import { cn } from "~/lib/utils";

/** Full-bleed to the page gutters so the hairline reaches both edges. */
const HEADER_BLEED =
  "-mx-4 px-4 min-[430px]:-mx-5 min-[430px]:px-5 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8";

const ACTION_BOX =
  "border-rule text-ink focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-md border outline-none focus-visible:ring-[3px]";

/**
 * The one Group home header, shared by Standing, Games, and Members: back, a
 * single tab-dependent action box, the Group name, the meta line, and the
 * segmented tab control, all above a hairline.
 *
 * It renders the `TabsList`, so it must sit inside the page's `Tabs` root. It
 * is rendered once, outside `TabsContent`, so switching tabs never remounts or
 * shifts it.
 *
 * The right-hand box is a shortcut, not the only door: Invite and Create
 * stay on the overflow menu exactly as `groupHomeOverflowItems` decides.
 */
export function GroupHomeChrome({
  groupId,
  communityId,
  name,
  imageUrl,
  sport,
  memberCount,
  createdAt,
  tab,
  canInvite,
  canCreateGame,
  onInvite,
  overflow,
}: {
  groupId: string;
  communityId: string | null;
  name: string;
  imageUrl?: string | null;
  sport: string | null;
  memberCount: number | null;
  createdAt: Date | string | null;
  tab: GroupHomeTab;
  canInvite: boolean;
  canCreateGame: boolean;
  onInvite: () => void;
  overflow?: ReactNode;
}) {
  const meta = groupHomeMetaLine({ sport, memberCount, createdAt });
  const back = groupHomeBackTarget(communityId);
  const showCreateBox = tab === "games" && canCreateGame;
  const showInviteBox = tab !== "games" && canInvite;

  return (
    <header className={cn("border-rule border-b pb-5", HEADER_BLEED)}>
      <div className="flex items-center justify-between gap-3">
        <BackButton variant="boxed" href={back.href} label={back.label} />

        <div className="flex items-center gap-2">
          {showInviteBox ? (
            <button
              type="button"
              onClick={onInvite}
              aria-label="Invite members"
              className={ACTION_BOX}
            >
              <UserPlusIcon aria-hidden="true" className="size-[18px]" />
            </button>
          ) : null}

          {showCreateBox ? (
            <Link
              href={`/dashboard/games/new?groupId=${groupId}`}
              aria-label="Create"
              className={ACTION_BOX}
            >
              <PlusIcon aria-hidden="true" className="size-5" />
            </Link>
          ) : null}

          {overflow}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <EntityMonogram name={name} image={imageUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <PageTitle>{name}</PageTitle>
          {meta ? (
            <p className="text-meta text-muted-foreground mt-1 min-w-0 break-words">
              {meta}
            </p>
          ) : null}
        </div>
      </div>

      <TabsList variant="segmented" className="mt-5">
        <TabsTrigger value="standing">Standing</TabsTrigger>
        <TabsTrigger value="games">Games</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
      </TabsList>
    </header>
  );
}
