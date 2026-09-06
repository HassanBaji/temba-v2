import Link from "next/link";

import { Button } from "~/components/ui/button";
import type { GroupHomeCtaFamily } from "~/lib/group-home-cta";

export function GroupHomeActionBar({
  family,
  groupId,
  joinPending,
  onJoin,
  onInvite,
}: {
  family: GroupHomeCtaFamily;
  groupId: string;
  joinPending: boolean;
  onJoin: () => void;
  onInvite: () => void;
}) {
  if (family.kind === "none") {
    return null;
  }

  return (
    <div className="flex gap-3">
      {family.kind === "join_group" ? (
        <Button
          type="button"
          className="min-h-11 min-w-11 flex-1"
          disabled={joinPending}
          onClick={onJoin}
        >
          {joinPending ? "Joining…" : "Join Group"}
        </Button>
      ) : null}

      {family.kind === "create_game" ? (
        <Button asChild className="min-h-11 min-w-11 flex-1">
          <Link href={`/dashboard/games/new?groupId=${groupId}`}>
            Create game
          </Link>
        </Button>
      ) : null}

      {family.kind === "invite" ? (
        <Button
          type="button"
          className="min-h-11 min-w-11 flex-1"
          onClick={onInvite}
        >
          Invite
        </Button>
      ) : null}

      {family.kind === "join_group" && family.secondary === "create_game" ? (
        <Button asChild variant="outline" className="min-h-11 min-w-11 flex-1">
          <Link href={`/dashboard/games/new?groupId=${groupId}`}>
            Create game
          </Link>
        </Button>
      ) : null}

      {((family.kind === "join_group" && family.secondary === "invite") ||
        (family.kind === "create_game" && family.secondary === "invite")) && (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11 flex-1"
          onClick={onInvite}
        >
          Invite
        </Button>
      )}
    </div>
  );
}
