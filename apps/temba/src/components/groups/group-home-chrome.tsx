import Link from "next/link";
import { ChevronLeftIcon, PlusIcon, UserPlusIcon } from "lucide-react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { TabsList, TabsTrigger } from "~/components/ui/tabs";
import { groupHomeMetaLine } from "~/lib/group-home-chrome";
import type { GroupHomeTab } from "~/lib/group-home-tab";
import { cn } from "~/lib/utils";

/** Full-bleed to the page gutters so the hairline reaches both edges. */
const HEADER_BLEED =
  "-mx-4 px-4 min-[430px]:-mx-5 min-[430px]:px-5 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8";

const ACTION_BOX =
  "border-rule text-ink focus-visible:ring-ring/50 inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px]";

const TAB_SEGMENT =
  "border-rule text-muted-foreground h-11 min-h-11 min-w-11 flex-1 rounded-none border-0 border-l first:border-l-0 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none data-[state=active]:bg-ink data-[state=active]:text-paper data-[state=active]:font-semibold";

/**
 * The one Group home header, shared by Standing, Games, and Members: back, a
 * single tab-dependent action box, the Group name, the meta line, and the
 * segmented tab control, all above a hairline.
 *
 * It renders the `TabsList`, so it must sit inside the page's `Tabs` root. It
 * is rendered once, outside `TabsContent`, so switching tabs never remounts or
 * shifts it.
 *
 * The right-hand box is a shortcut, not the only door: Invite and Create game
 * stay on the overflow menu exactly as `groupHomeOverflowItems` decides.
 */
export function GroupHomeChrome({
  groupId,
  name,
  imageUrl,
  sport,
  memberCount,
  createdAt,
  tab,
  canInvite,
  canCreateGame,
  onInvite,
}: {
  groupId: string;
  name: string;
  imageUrl?: string | null;
  sport: string | null;
  memberCount: number | null;
  createdAt: Date | string | null;
  tab: GroupHomeTab;
  canInvite: boolean;
  canCreateGame: boolean;
  onInvite: () => void;
}) {
  const meta = groupHomeMetaLine({ sport, memberCount, createdAt });
  const showCreateBox = tab === "games" && canCreateGame;
  const showInviteBox = tab !== "games" && canInvite;

  return (
    <header className={cn("border-rule border-b pb-5", HEADER_BLEED)}>
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/groups"
          aria-label="Back to Groups"
          className={ACTION_BOX}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </Link>

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
            aria-label="Create game"
            className={ACTION_BOX}
          >
            <PlusIcon aria-hidden="true" className="size-5" />
          </Link>
        ) : null}
      </div>

      <div className="mt-5 flex items-start gap-3">
        <EntityMonogram name={name} image={imageUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 min-w-0 break-words font-bold tracking-[-0.01em]">
            {name}
          </h1>
          {meta ? (
            <p className="text-meta text-muted-foreground mt-1 min-w-0 break-words">
              {meta}
            </p>
          ) : null}
        </div>
      </div>

      <TabsList className="border-rule bg-paper mt-5 w-full max-w-full justify-stretch overflow-hidden rounded-[12px] border p-0 group-data-[orientation=horizontal]/tabs:h-auto">
        <TabsTrigger value="standing" className={TAB_SEGMENT}>
          Standing
        </TabsTrigger>
        <TabsTrigger value="games" className={TAB_SEGMENT}>
          Games
        </TabsTrigger>
        <TabsTrigger value="members" className={TAB_SEGMENT}>
          Members
        </TabsTrigger>
      </TabsList>
    </header>
  );
}
